use actix_multipart::Multipart;
use actix_web::{post, web, Error, HttpRequest, HttpResponse};
use futures_util::stream::{StreamExt, TryStreamExt};
use serde::Serialize;
use sqlx::PgPool;
use image::{imageops::FilterType, DynamicImage, GenericImageView};
use std::io::Cursor;

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

fn limit_image_dimensions(img: DynamicImage, max_w: u32, max_h: u32) -> DynamicImage {
    let (w, h) = img.dimensions();
    if w <= max_w && h <= max_h {
        return img;
    }
    img.resize(max_w, max_h, FilterType::Lanczos3)
}

fn encode_webp(img: &DynamicImage, out: &mut Vec<u8>) -> Result<(), image::ImageError> {
    use image::codecs::webp::WebPEncoder;
    let mut cursor = Cursor::new(out);
    let encoder = WebPEncoder::new_lossless(&mut cursor);
    let rgba = img.to_rgba8();
    encoder.encode(&rgba, rgba.width(), rgba.height(), image::ColorType::Rgba8)
}

#[derive(Serialize)]
struct UploadResponse {
    urls: Vec<String>,
}

// New endpoint for uploading images without product ID (for host onboarding)
#[post("/images")]
pub async fn upload_images_standalone(
    mut payload: Multipart,
    s3: web::Data<crate::s3::S3Storage>,
) -> Result<HttpResponse, Error> {
    let mut file_urls = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        if let Some(filename) = content_disposition.get_filename() {
            // Clone filename and content_type to avoid borrow issues
            let filename = filename.to_string();
            let content_type = field.content_type().to_string();

            // Read file data into memory
            let mut file_data = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(|e| {
                    eprintln!("Failed to read chunk: {}", e);
                    actix_web::error::ErrorInternalServerError("Failed to read file")
                })?;
                file_data.extend_from_slice(&data);
            }

            // If it's an image, resize and create a WebP variant
            let is_image = content_type.starts_with("image/");
            if is_image {
                if let Ok(img) = image::load_from_memory(&file_data) {
                    let resized = limit_image_dimensions(img, 1600, 1600);
                    // Encode WebP
                    let mut webp_buf = Vec::new();
                    if encode_webp(&resized, &mut webp_buf).is_ok() {
                        if let Ok(webp_url) = s3
                            .upload_file(webp_buf, &format!("{}.webp", filename), "image/webp")
                            .await
                        {
                            file_urls.push(webp_url);
                        }
                    }
                }
            }

            // Upload original
            match s3.upload_file(file_data, &filename, &content_type).await {
                Ok(url) => {
                    println!("Successfully uploaded file to S3: {}", url);
                    file_urls.push(url);
                }
                Err(e) => {
                    eprintln!("Failed to upload to S3: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                        message: format!("Failed to upload file: {}", e),
                    }));
                }
            }
        }
    }

    Ok(HttpResponse::Ok().json(UploadResponse { urls: file_urls }))
}

#[post("/upload/{productId}")]
pub async fn upload_images(
    _req: HttpRequest,
    _pool: web::Data<PgPool>,
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
