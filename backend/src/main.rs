use actix_cors::Cors;
use actix_files as fs;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use dotenv::dotenv;
use log::info;
use sqlx::sqlite::SqlitePool;
use std::env;
use std::fs::File;
use std::io;

mod routes;

use routes::auth::{
    authentication_complete, authentication_start, registration_complete, registration_start,
};
use routes::cart::{
    add_to_cart, clear_cart, get_cart, get_cart_count, remove_from_cart, update_cart_item,
};
use routes::products::{
    create_product, delete_product, get_my_products, get_product, get_products, update_product,
};
use routes::reviews::{
    add_seller_response, create_review, delete_review, get_product_reviews, get_review_stats,
    vote_review,
};
use routes::roles::{get_user_role, set_user_role};
use routes::upload::upload_images;
use routes::wishlist::{
    add_to_wishlist, check_wishlist, get_wishlist, get_wishlist_count, remove_from_wishlist,
    remove_from_wishlist_by_product,
};
use routes::messages::{
    create_conversation, delete_conversation, get_conversations, get_message_templates,
    get_messages, get_unread_count, send_image_message, send_message,
};
use routes::shops::{create_or_update_shop, get_shop};

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();
    let current_dir = env::current_dir().map_err(|e| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("Failed to get current directory: {}", e),
        )
    })?;
    info!("Current working directory: {:?}", current_dir);
    let db_path = current_dir.join("dev.sqlite3");
    if !db_path.exists() {
        File::create(&db_path).expect("Failed to create database file");
    }
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| format!("sqlite:{}", db_path.to_str().unwrap()));
    info!("Connecting to database at: {}", &database_url);
    let pool = SqlitePool::connect(&database_url)
        .await
        .expect("Failed to create pool.");

    // Run migrations
    info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    info!("Database migrations completed successfully.");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:8081")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .service(hello)
            .service(
                web::scope("/api")
                    .service(
                        web::scope("/auth")
                            .service(registration_start)
                            .service(registration_complete)
                            .service(authentication_start)
                            .service(authentication_complete),
                    )
                    .service(
                        web::scope("/products")
                            .service(get_my_products)
                            .service(get_products)
                            .service(get_product)
                            .service(delete_product)
                            .route("", web::post().to(create_product))
                            .route("/{id}", web::put().to(update_product)),
                    )
                    .service(
                        web::scope("/roles")
                            .service(get_user_role)
                            .service(set_user_role),
                    )
                    .service(
                        web::scope("/cart")
                            .service(get_cart)
                            .service(get_cart_count)
                            .service(add_to_cart)
                            .service(update_cart_item)
                            .service(remove_from_cart)
                            .service(clear_cart),
                    )
                    .service(
                        web::scope("/wishlist")
                            .service(get_wishlist)
                            .service(get_wishlist_count)
                            .service(add_to_wishlist)
                            .service(remove_from_wishlist)
                            .service(remove_from_wishlist_by_product)
                            .service(check_wishlist),
                    )
                    .service(web::scope("/upload").service(upload_images))
                    .service(
                        web::scope("/reviews")
                            .service(get_product_reviews)
                            .service(get_review_stats)
                            .service(create_review)
                            .service(vote_review)
                            .service(add_seller_response)
                            .service(delete_review),
                    )
                    .service(
                       web::scope("/messages")
                           .service(get_conversations)
                           .service(create_conversation)
                           .service(get_messages)
                           .service(send_message)
                           .service(send_image_message)
                           .service(delete_conversation)
                           .service(get_message_templates)
                           .service(get_unread_count),
                   )
                     .service(
                        web::scope("/shop")
                            .service(get_shop)
                            .service(create_or_update_shop),
                    ),
            )
            // Serve static files from the public directory
            .service(fs::Files::new("/uploads", "./public/uploads").show_files_listing())
    })
    .bind("127.0.0.1:8082")?
    .run()
    .await
}
