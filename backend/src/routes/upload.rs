use actix_multipart::Multipart;
use actix_web::{post, web, Error, HttpRequest, HttpResponse};
use futures_util::stream::{StreamExt, TryStreamExt};
use serde::Serialize;
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

#[derive(Serialize)]
struct UploadResponse {
    urls: Vec<String>,
}

// New endpoint for uploading images without product ID (for host onboarding)
#[post("/images")]
pub async fn upload_images_standalone(mut payload: Multipart) -> Result<HttpResponse, Error> {
    let mut file_paths = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        if let Some(filename) = content_disposition.get_filename() {
            let unique_filename = format!("{}-{}", Uuid::new_v4().to_string(), filename);
            let filepath = format!("./public/uploads/{}", unique_filename);

            // Create the uploads directory if it doesn't exist
            if let Some(p) = std::path::Path::new(&filepath).parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p).map_err(|e| {
                        eprintln!("Failed to create directory for {}: {}", filepath, e);
                        actix_web::error::ErrorInternalServerError("Failed to save file")
                    })?;
                }
            }

            let mut f = web::block(move || std::fs::File::create(filepath)).await??;
            while let Some(chunk) = field.next().await {
                let data = chunk.unwrap();
                f = web::block(move || f.write_all(&data).map(|_| f)).await??;
            }

            // Return URL that can be accessed via the /uploads route
            file_paths.push(format!("/uploads/{}", unique_filename));
        }
    }

    Ok(HttpResponse::Ok().json(UploadResponse { urls: file_paths }))
}

#[post("/upload/{productId}")]
pub async fn upload_images(
    _req: HttpRequest,
    _pool: web::Data<SqlitePool>,
    _path: web::Path<i32>,
    _payload: Multipart,
) -> Result<HttpResponse, Error> {
    // This endpoint was for the old products table which used integer IDs.
    // Since we moved to listings with UUIDs, this endpoint is deprecated.
    // We return a BadRequest to inform the client.

    return Ok(HttpResponse::BadRequest().json(ErrorResponse {
        message:
            "This endpoint is deprecated. Please use /api/listings/{id}/photos for listing photos."
                .to_string(),
    }));
}
