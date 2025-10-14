use actix_multipart::Multipart;
use actix_web::{post, web, Error, HttpMessage, HttpRequest, HttpResponse};
use futures_util::stream::{StreamExt, TryStreamExt};
use serde::Serialize;
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

#[post("/upload/{productId}")]
pub async fn upload_images(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    mut payload: Multipart,
) -> Result<HttpResponse, Error> {
    let product_id = path.into_inner();
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return Ok(HttpResponse::InternalServerError().finish()),
    };

    // Check if the user is authorized to upload images for this product
    let product: Result<super::products::Product, _> =
        sqlx::query_as("SELECT * FROM products WHERE id = ?")
            .bind(product_id)
            .fetch_one(pool.get_ref())
            .await;

    match product {
        Ok(product) => {
            if product.user_id != user_id {
                return Ok(HttpResponse::Forbidden().json(ErrorResponse {
                    message: "You are not authorized to upload images for this product".to_string(),
                }));
            }
        }
        Err(_) => {
            return Ok(HttpResponse::NotFound().json(ErrorResponse {
                message: "Product not found".to_string(),
            }));
        }
    }

    let mut file_paths = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        if let Some(filename) = content_disposition.get_filename() {
            let unique_filename = format!("{}-{}", Uuid::new_v4().to_string(), filename);
            let filepath = format!("./public/uploads/{}", unique_filename);

            // Create a new file and write the content to it
            let mut f = web::block(move || std::fs::File::create(filepath)).await??;
            while let Some(chunk) = field.next().await {
                let data = chunk.unwrap();
                f = web::block(move || f.write_all(&data).map(|_| f)).await??;
            }
            // Store with leading slash so frontend can use it directly
            file_paths.push(format!("/public/uploads/{}", unique_filename));
        }
    }

    let mut tx = pool.begin().await.unwrap();
    for file_path in file_paths.iter() {
        sqlx::query("INSERT INTO product_images (image_url, product_id) VALUES (?, ?)")
            .bind(file_path)
            .bind(product_id)
            .execute(&mut *tx)
            .await
            .unwrap();
    }
    tx.commit().await.unwrap();

    Ok(HttpResponse::Ok().json(file_paths))
}
