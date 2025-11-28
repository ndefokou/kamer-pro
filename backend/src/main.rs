use actix_cors::Cors;
use actix_files as fs;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

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
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let uploads_dir = std::path::Path::new(manifest_dir)
        .join("public")
        .join("uploads");

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
                            .service(routes::auth::authentication_complete),
                    )
                    .service(
                        web::scope("/roles")
                            .service(routes::roles::get_user_role)
                            .service(routes::roles::set_user_role),
                    )
                    .service(
                        web::scope("/products")
                            .service(routes::products::get_products)
                            .route("/seller", web::get().to(routes::products::get_my_products))
                            .service(
                                web::resource("")
                                    .route(web::post().to(routes::products::create_product)),
                            )
                            .service(
                                web::resource("/{id}")
                                    .route(web::get().to(routes::products::get_product))
                                    .route(web::put().to(routes::products::update_product))
                                    .route(web::delete().to(routes::products::delete_product)),
                            ),
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
                            .service(routes::listings::add_photo)
                            .service(routes::listings::delete_photo)
                            .service(routes::listings::set_cover_photo)
                            .service(routes::listings::add_video),
                    )
                    .service(
                        web::scope("/upload")
                            .service(routes::upload::upload_images)
                            .service(routes::upload::upload_images_standalone),
                    )
                    .service(
                        web::scope("/wishlist")
                            .service(routes::wishlist::clear_wishlist)
                            .service(routes::wishlist::get_wishlist)
                            .service(routes::wishlist::add_to_wishlist)
                            .service(routes::wishlist::remove_from_wishlist)
                            .service(routes::wishlist::remove_from_wishlist_by_product),
                    )
                    .service(
                        web::scope("/reviews")
                            .service(routes::reviews::get_product_reviews)
                            .service(routes::reviews::create_review),
                    )
                    .service(
                        web::scope("/messages")
                            .service(routes::messages::get_conversations)
                            .service(routes::messages::get_messages)
                            .service(routes::messages::send_message)
                            .service(routes::messages::get_message_templates)
                            .service(routes::messages::get_unread_count),
                    )
                    .service(
                        web::scope("/companies")
                            .service(routes::company::get_my_company)
                            .service(routes::company::get_company_by_id)
                            .service(routes::company::create_or_update_company)
                            .service(routes::company::delete_company),
                    )
                    .service(web::scope("/architect-companies").route(
                        "",
                        web::get().to(routes::architect::get_all_architect_companies),
                    ))
                    .service(
                        web::scope("/architect-company")
                            .route("", web::get().to(routes::architect::get_architect_company))
                            .route(
                                "",
                                web::post()
                                    .to(routes::architect::create_or_update_architect_company),
                            )
                            .route(
                                "/{id}",
                                web::get().to(routes::architect::get_architect_company_by_id),
                            ),
                    )
                    .service(
                        web::scope("/architect-projects")
                            .route("", web::get().to(routes::architect::get_architect_projects))
                            .route(
                                "/company/{id}",
                                web::get().to(routes::architect::get_architect_projects_by_company),
                            )
                            .route(
                                "",
                                web::post().to(routes::architect::create_architect_project),
                            )
                            .route(
                                "/all",
                                web::get().to(routes::architect::get_all_architect_projects),
                            )
                            .route(
                                "/{id}",
                                web::put().to(routes::architect::update_architect_project),
                            )
                            .route(
                                "/{id}",
                                web::delete().to(routes::architect::delete_architect_project),
                            ),
                    ),
            )
            // Serve static files from /uploads route
            .service(fs::Files::new("/uploads", uploads_dir_clone.clone()).show_files_listing())
    })
    .bind("0.0.0.0:8082")?
    .run()
    .await
}
