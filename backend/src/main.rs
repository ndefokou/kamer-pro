use actix_cors::Cors;
use actix_web::{
    middleware::{Compress, DefaultHeaders},
    web, App, HttpServer,
};
use dotenv::dotenv;
use kamer_listings::ListingWithDetails;
use moka::future::Cache;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::env;
use std::str::FromStr;
use std::time::{Duration, Instant};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let start = Instant::now();

    dotenv().ok();

    let fast_start = env::var("FAST_START")
        .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE"))
        .unwrap_or(false);

    if !fast_start {
        env_logger::init();
        println!("🟡 Rust application starting...");
    }

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Keep pool very small by default to avoid Supabase session limits
    let max_conns: u32 = env::var("DATABASE_MAX_CONNECTIONS")
        .ok()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(1);

    // How long to wait for a free connection in the pool before timing out
    let acquire_timeout_ms: u64 = env::var("DATABASE_ACQUIRE_TIMEOUT_MS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(20_000);

    if !fast_start {
        println!(
            "Initializing database pool: max_connections={} acquire_timeout_ms={} (set DATABASE_MAX_CONNECTIONS / DATABASE_ACQUIRE_TIMEOUT_MS to change)",
            max_conns, acquire_timeout_ms
        );
    }

    let connection_options = PgConnectOptions::from_str(&database_url)
        .map_err(|e| {
            eprintln!("CRITICAL ERROR: Failed to parse DATABASE_URL. This usually means there are special characters (like @ or $) in the password that need to be percent-encoded.");
            eprintln!("Parse error: {}", e);
            e
        })
        .expect("Malformed DATABASE_URL")
        .statement_cache_capacity(0);

    if !fast_start {
        println!("Database connection properties: statement_cache_capacity=0, prepare_threshold=0");
    }

    // Create a lazy pool so startup doesn't block on establishing DB connections.
    // Actual connections will be opened on first use.
    let pool = PgPoolOptions::new()
        .max_connections(max_conns)
        .min_connections(0)
        .acquire_timeout(Duration::from_millis(acquire_timeout_ms))
        .connect_lazy_with(connection_options);

    // Optionally run migrations on startup when explicitly enabled.
    // Default is to skip to avoid blocking startup; set MIGRATE_ON_START=true to enable.
    if env::var("MIGRATE_ON_START").unwrap_or_else(|_| "false".into()) == "true" {
        if !fast_start {
            println!("MIGRATE_ON_START=true: running migrations in background...");
        }
        let pool_clone = pool.clone();
        tokio::spawn(async move {
            let start = std::time::Instant::now();
            match sqlx::migrate::Migrator::new(std::path::Path::new("./migrations")).await {
                Ok(mut migrator) => {
                    migrator.set_ignore_missing(true);
                    if let Err(e) = migrator.run(&pool_clone).await {
                        eprintln!("Failed to run migrations: {}", e);
                    } else if !fast_start {
                        println!(
                            "Migrations completed successfully in {:?}.",
                            start.elapsed()
                        );
                    }
                }
                Err(e) => eprintln!("Failed to load migrations: {}", e),
            }
        });
    } else {
        if !fast_start {
            println!("MIGRATE_ON_START not set; skipping migrations at startup.");
        }
    }

    // Initialize S3 storage
    let s3_storage = match kamer_storage::S3Storage::new() {
        Ok(storage) => storage,
        Err(e) => {
            if !fast_start {
                eprintln!("Warning: Failed to initialize S3 storage components: {}", e);
            }
            // Create a placeholder that will fail on use but allows startup
            kamer_storage::S3Storage::new().unwrap_or_else(|_| {
                // Final fallback if env vars are missing
                panic!(
                    "Critical: S3 initialization failed and fallback also failed: {}",
                    e
                )
            })
        }
    };

    // Initialize listing cache (key: query string, value: results)
    // Capacity: 500 unique queries, TTL: 15 minutes
    let listing_cache: Cache<String, Vec<ListingWithDetails>> = Cache::builder()
        .max_capacity(500)
        .time_to_live(Duration::from_secs(900))
        .build();

    // Initialize single listing cache (key: listing ID, value: listing details)
    // Capacity: 2000 items, TTL: 15 minutes
    let single_listing_cache: Cache<String, ListingWithDetails> = Cache::builder()
        .max_capacity(2000)
        .time_to_live(Duration::from_secs(900))
        .build();

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_method()
            .allow_any_header()
            .allowed_origin_fn(|_, _| true)
            .supports_credentials();
        App::new()
            .wrap(cors)
            .wrap(Compress::default())
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(s3_storage.clone()))
            .app_data(web::Data::new(listing_cache.clone()))
            .app_data(web::Data::new(single_listing_cache.clone()))
            .service(
                web::scope("/api")
                    .wrap(DefaultHeaders::new().add(("X-Robots-Tag", "noindex, nofollow")))
                    .configure(kamer_api::configure_routes),
            )
    });

    if !fast_start {
        println!("🚀 Server fully initialized in {:?}", start.elapsed());
    }

    let workers: usize = env::var("SERVER_WORKERS")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or_else(|| num_cpus::get().max(1));

    server.workers(workers).bind("0.0.0.0:8082")?.run().await
}
