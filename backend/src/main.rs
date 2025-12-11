use actix_cors::Cors;
use actix_files as fs;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

mod middleware;
mod routes;
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Rust application starting...");
    dotenv().ok();
    env_logger::init();
    println!("Logger initialized. Starting server...");

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_path_str = database_url
        .strip_prefix("sqlite:")
        .unwrap_or(&database_url);
    let db_path = std::path::Path::new(db_path_str);
    if !db_path.exists() {
        if let Some(parent) = db_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).expect("Failed to create database directory");
            }
        }
        std::fs::File::create(db_path).expect("Failed to create database file");
    }

    // Create the uploads directory if it doesn't exist
    let uploads_dir = std::path::Path::new("public").join("uploads");

    println!("Uploads directory: {}", uploads_dir.display());

    if !uploads_dir.exists() {
        std::fs::create_dir_all(&uploads_dir).expect("Failed to create uploads directory");
        println!("Created uploads directory");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    // Run migrations
    println!("Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    println!("Migrations completed successfully.");

    let uploads_dir_clone = uploads_dir.clone();

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
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
                            .service(routes::messages::get_messages)
                            .service(routes::messages::get_unread_count)
                            .service(routes::messages::get_message_templates),
                    )
                    .service(
                        web::scope("/account")
                            .service(routes::account::get_me)
                            .service(routes::account::update_account),
                    )
                    .service(web::scope("/wishlist").service(routes::wishlist::get_wishlist))
                    .service(
                        web::scope("/bookings")
                            .service(routes::bookings::get_today_bookings)
                            .service(routes::bookings::get_upcoming_bookings),
                    )
                    .service(
                        web::scope("/calendar")
                            .service(routes::calendar::get_calendar)
                            .service(routes::calendar::update_calendar_dates)
                            .service(routes::calendar::get_settings)
                            .service(routes::calendar::update_settings),
                    ),
            )
            // Serve static files from /uploads route
            .service(fs::Files::new("/uploads", uploads_dir_clone.clone()).show_files_listing())
    })
    .bind("0.0.0.0:8082")?
    .run()
    .await
}
