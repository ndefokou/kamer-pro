use actix_cors::Cors;
use actix_files as fs;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use dotenv::dotenv;
use log::info;
use sqlx::sqlite::SqlitePool;
use std::env;
use std::io;

mod routes;

use routes::auth::{
    authentication_complete, authentication_start, registration_complete, registration_start,
};
use routes::products::{
    create_product, delete_product, get_my_products, get_product, get_products, update_product,
};
use routes::roles::{get_user_role, set_user_role};
use routes::upload::upload_images;

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
    let database_url =
        env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:dev.sqlite3".to_string());
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
                    .service(web::scope("/upload").service(upload_images)),
            )
            // Serve static files from the public directory
            .service(fs::Files::new("/public", "./public").show_files_listing())
    })
    .bind("127.0.0.1:8082")?
    .run()
    .await
}
