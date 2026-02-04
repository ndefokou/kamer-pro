use crate::routes::listings::ListingWithDetails;
use actix_cors::Cors;
use actix_files as fs;
use actix_web::{middleware::Compress, web, App, HttpServer};
use dotenv::dotenv;
use moka::future::Cache;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::Executor;
use std::env;
use std::str::FromStr;
use std::time::{Duration, Instant};

mod middleware;
mod routes;
mod s3;
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let start = Instant::now();

    let fast_start = env::var("FAST_START")
        .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE"))
        .unwrap_or(false);

    if !fast_start {
        println!("🟡 Rust application starting...");
    }

    if !fast_start {
        dotenv().ok();
        env_logger::init();
        println!("Logger initialized. Starting server...");
    }

    let mut database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    if !database_url.contains("prepare_threshold") {
        let separator = if database_url.contains('?') { "&" } else { "?" };
        database_url.push_str(&format!("{}prepare_threshold=0", separator));
    }

    if !database_url.contains("statement_cache_capacity") {
        let separator = if database_url.contains('?') { "&" } else { "?" };
        database_url.push_str(&format!("{}statement_cache_capacity=0", separator));
    }

    // Ensure the uploads directory exists (idempotent)
    let uploads_dir = std::path::Path::new("public").join("uploads");
    std::fs::create_dir_all(&uploads_dir).expect("Failed to create uploads directory");

    let max_conns: u32 = env::var("DATABASE_MAX_CONNECTIONS")
        .ok()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(10);

    if !fast_start {
        println!(
            "Initializing database pool: max_connections={} (set DATABASE_MAX_CONNECTIONS to change)",
            max_conns
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
        .acquire_timeout(Duration::from_secs(30))
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                conn.execute("DEALLOCATE ALL").await?;
                Ok(())
            })
        })
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

    // Initialize S3 storage in background to avoid blocking startup
    if !fast_start {
        println!("Initializing S3 storage in background...");
    }
    let s3_storage = match s3::S3Storage::new() {
        Ok(storage) => {
            if !fast_start {
                println!("S3 storage initialized successfully.");
            }
            storage
        }
        Err(e) => {
            // Log warning but don't panic - allow server to start
            eprintln!("Warning: Failed to initialize S3 storage: {}", e);
            eprintln!("Image uploads may not work. Please check S3 configuration.");
            // Create a dummy storage that will fail gracefully on use
            s3::S3Storage::new().unwrap_or_else(|_| panic!("S3 storage initialization failed"))
        }
    };

    let uploads_dir_clone = uploads_dir.clone();

    // Initialize listing cache (key: query string, value: results)
    // Capacity: 500 unique queries (increased from 100), TTL: 15 minutes (increased from 5)
    let listing_cache: Cache<String, Vec<ListingWithDetails>> = Cache::builder()
        .max_capacity(500)
        .time_to_live(Duration::from_secs(900))
        .build();

    // Initialize single listing cache (key: listing ID, value: listing details)
    // Capacity: 2000 items (increased from 500), TTL: 15 minutes (increased from 5)
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
                    .service(
                        web::scope("/auth")
                            .service(routes::auth::registration_start)
                            .service(routes::auth::registration_complete)
                            .service(routes::auth::authentication_start)
                            .service(routes::auth::authentication_complete)
                            .service(routes::auth::simple_register)
                            .service(routes::auth::simple_login)
                            .service(routes::auth::logout),
                    )
                    .service(
                        web::scope("/roles")
                            .service(routes::roles::get_user_role)
                            .service(routes::roles::set_user_role),
                    )
                    .service(
                        web::scope("/listings")
                            .service(routes::listings::get_all_listings)
                            .service(routes::listings::get_towns)
                            .service(routes::listings::get_host_listings)
                            .service(routes::listings::get_reviews)
                            .service(routes::listings::add_review)
                            .service(routes::listings::create_listing)
                            .service(routes::listings::get_my_listings)
                            .service(routes::listings::get_listing)
                            .service(routes::listings::update_listing)
                            .service(routes::listings::delete_listing)
                            .service(routes::listings::publish_listing)
                            .service(routes::listings::unpublish_listing)
                            .service(routes::listings::add_amenities)
                            .service(routes::listings::sync_photos)
                            .service(routes::listings::add_video),
                    )
                    .service(
                        web::scope("/upload")
                            .service(routes::upload::upload_images)
                            .service(routes::upload::upload_images_standalone),
                    )
                    .service(
                        web::scope("/messages")
                            .service(routes::messages::create_conversation)
                            .service(routes::messages::get_conversations)
                            .service(routes::messages::get_messages)
                            .service(routes::messages::send_message)
                            .service(routes::messages::get_unread_count)
                            .service(routes::messages::get_message_templates),
                    )
                    .service(
                        web::scope("/account")
                            .service(routes::account::get_me)
                            .service(routes::account::get_user_by_id)
                            .service(routes::account::update_account),
                    )
                    .service(
                        web::scope("/wishlist")
                            .service(routes::wishlist::get_wishlist)
                            .service(routes::wishlist::add_to_wishlist)
                            .service(routes::wishlist::remove_from_wishlist)
                            .service(routes::wishlist::remove_from_wishlist_by_product)
                            .service(routes::wishlist::check_wishlist),
                    )
                    .service(
                        web::scope("/bookings")
                            .service(routes::bookings::create_booking)
                            .service(routes::bookings::get_today_bookings)
                            .service(routes::bookings::get_upcoming_bookings)
                            .service(routes::bookings::get_my_bookings)
                            .service(routes::bookings::approve_booking)
                            .service(routes::bookings::decline_booking)
                            .service(routes::bookings::cancel_booking),
                    )
                    .service(
                        web::scope("/calendar")
                            .service(routes::calendar::get_calendar)
                            .service(routes::calendar::update_calendar_dates)
                            .service(routes::calendar::get_settings)
                            .service(routes::calendar::update_settings),
                    )
                    .service(web::scope("/reports").service(routes::reports::create_report))
                    .service(routes::translate::translate_text)
                    .service(
                        web::scope("/admin")
                            .service(routes::admin::get_hosts)
                            .service(routes::admin::delete_host)
                            .service(routes::admin::get_reports),
                    ),
            )
            // Serve static files from /uploads route
            .service(fs::Files::new("/uploads", uploads_dir_clone.clone()).show_files_listing())
    });

    if !fast_start {
        println!("🚀 Server fully initialized in {:?}", start.elapsed());
    }

    let workers: usize = env::var("SERVER_WORKERS")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(1);

    server.workers(workers).bind("0.0.0.0:8082")?.run().await
}
