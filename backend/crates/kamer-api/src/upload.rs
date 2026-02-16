use actix_multipart::Multipart;
use actix_web::{post, web, Error, HttpRequest, HttpResponse};
use futures_util::stream::{StreamExt, TryStreamExt};
use image::{imageops::FilterType, DynamicImage, GenericImageView};
use serde::Serialize;
use sqlx::PgPool;
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
    s3: web::Data<kamer_storage::S3Storage>,
) -> Result<HttpResponse, Error> {
    let mut file_urls = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        if let Some(filename) = content_disposition.get_filename() {
            // Clone filename to avoid borrow issues
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

            // Only process images
            if content_type.starts_with("image/") {
                if let Ok(img) = image::load_from_memory(&file_data) {
                    // Resize to HD quality (good balance for mobile/web)
                    let resized = limit_image_dimensions(img, 1280, 1280);

                    // Encode to WebP
                    let mut webp_buf = Vec::new();
                    if encode_webp(&resized, &mut webp_buf).is_ok() {
                        // Change extension to .webp for the storage path
                        let new_filename = std::path::Path::new(&filename)
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("image");
                        let webp_filename = format!("{}.webp", new_filename);

                        match s3.upload_file(webp_buf, &webp_filename, "image/webp").await {
                            Ok(url) => {
                                println!("Successfully uploaded optimized WebP to S3: {}", url);
                                file_urls.push(url);
                            }
                            Err(e) => {
                                eprintln!("Failed to upload WebP to S3: {}", e);
                                // Fallback: try uploading original if optimization/upload failed?
                                // For now, return error to encourage fixing the issue
                                return Ok(HttpResponse::InternalServerError().json(
                                    ErrorResponse {
                                        message: format!("Failed to upload optimized image: {}", e),
                                    },
                                ));
                            }
                        }
                    } else {
                        // Fallback if WebP encoding fails (unlikely)
                        eprintln!("WebP encoding failed, uploading original");
                        match s3.upload_file(file_data, &filename, &content_type).await {
                            Ok(url) => file_urls.push(url),
                            Err(e) => {
                                return Ok(HttpResponse::InternalServerError().json(
                                    ErrorResponse {
                                        message: format!("Failed to upload original image: {}", e),
                                    },
                                ))
                            }
                        }
                    }
                } else {
                    // Not a valid image format for image-rs, upload as is
                    match s3.upload_file(file_data, &filename, &content_type).await {
                        Ok(url) => file_urls.push(url),
                        Err(e) => {
                            return Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                                message: format!("Failed to upload file: {}", e),
                            }))
                        }
                    }
                }
            } else {
                // Not an image (e.g. PDF?), upload as is
                match s3.upload_file(file_data, &filename, &content_type).await {
                    Ok(url) => file_urls.push(url),
                    Err(e) => {
                        return Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                            message: format!("Failed to upload file: {}", e),
                        }))
                    }
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
