use actix_cors::Cors;
use actix_files as fs;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

mod routes;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:8081")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec![
                "Content-Type",
                "Authorization",
                "X-Requested-With",
            ])
            .supports_credentials();

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
                                    .route(web::post().to(routes::products::create_product))
                            )
                            .service(
                                web::resource("/{id}")
                                    .route(web::get().to(routes::products::get_product))
                                    .route(web::put().to(routes::products::update_product))
                                    .route(web::delete().to(routes::products::delete_product))
                            )
                    )
                    .service(
                        web::scope("/upload").service(routes::upload::upload_images),
                    )
                    .service(
                        web::scope("/wishlist")
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
                        web::scope("/shop")
                            .service(routes::shops::get_my_shop)
                            .service(routes::shops::get_shop_by_id)
                            .service(routes::shops::create_or_update_shop)
                            .service(routes::shops::delete_shop),
                    ),
            )
            .service(fs::Files::new("/uploads", "./public/uploads"))
    })
    .bind("127.0.0.1:8082")?
    .run()
    .await
}
