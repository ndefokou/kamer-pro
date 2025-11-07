use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Shop {
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub logo_url: Option<String>,
    pub banner_url: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct ShopWithProducts {
    #[serde(flatten)]
    pub shop: Shop,
    pub product_count: i32,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

fn get_user_id_from_headers(req: &HttpRequest) -> Result<i32, actix_web::Error> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token);
            }
        }
    }
    Err(actix_web::error::ErrorUnauthorized(
        "Missing or invalid authorization header",
    ))
}

// Get current user's shop
#[get("")]
pub async fn get_my_shop(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: e.to_string(),
            })
        }
    };

    let shop_option = match sqlx::query_as::<_, Shop>("SELECT * FROM shops WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(shop) => shop,
        Err(e) => {
            eprintln!("Failed to fetch shop: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch shop".to_string(),
            });
        }
    };

    if let Some(mut shop) = shop_option {
        // Convert relative URLs to absolute
        if let Some(ref logo) = shop.logo_url {
            shop.logo_url = Some(logo.replace("/public", ""));
        }
        if let Some(ref banner) = shop.banner_url {
            shop.banner_url = Some(banner.replace("/public", ""));
        }

        // Get product count
        let count: Result<(i32,), _> =
            sqlx::query_as("SELECT COUNT(*) FROM products WHERE user_id = ?")
                .bind(user_id)
                .fetch_one(pool.get_ref())
                .await;

        let product_count = count.unwrap_or((0,)).0;

        HttpResponse::Ok().json(ShopWithProducts {
            shop,
            product_count,
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse {
            message: "Shop not found".to_string(),
        })
    }
}

// Get shop by ID (public)
#[get("/{shop_id}")]
pub async fn get_shop_by_id(pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let shop_id = path.into_inner();

    let shop_option = match sqlx::query_as::<_, Shop>("SELECT * FROM shops WHERE id = ?")
        .bind(shop_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(shop) => shop,
        Err(e) => {
            eprintln!("Failed to fetch shop: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch shop".to_string(),
            });
        }
    };

    if let Some(mut shop) = shop_option {
        if let Some(ref logo) = shop.logo_url {
            shop.logo_url = Some(format!(
                "http://localhost:8081{}",
                logo.replace("/public", "")
            ));
        }
        if let Some(ref banner) = shop.banner_url {
            shop.banner_url = Some(format!(
                "http://localhost:8081{}",
                banner.replace("/public", "")
            ));
        }

        let count: Result<(i32,), _> =
            sqlx::query_as("SELECT COUNT(*) FROM products WHERE user_id = ?")
                .bind(shop.user_id)
                .fetch_one(pool.get_ref())
                .await;

        let product_count = count.unwrap_or((0,)).0;

        HttpResponse::Ok().json(ShopWithProducts {
            shop,
            product_count,
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse {
            message: "Shop not found".to_string(),
        })
    }
}

// Create or update shop
#[post("")]
pub async fn create_or_update_shop(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = get_user_id_from_headers(&req)?;

    let mut name = String::new();
    let mut email = String::new();
    let mut phone = String::new();
    let mut location = String::new();
    let mut description = String::new();
    let mut logo_path: Option<String> = None;
    let mut banner_path: Option<String> = None;

    while let Some(mut field) = payload.try_next().await? {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "name" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    bytes.extend_from_slice(&chunk);
                }
                name = String::from_utf8(bytes).unwrap_or_default();
            }
            "email" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    bytes.extend_from_slice(&chunk);
                }
                email = String::from_utf8(bytes).unwrap_or_default();
            }
            "phone" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    bytes.extend_from_slice(&chunk);
                }
                phone = String::from_utf8(bytes).unwrap_or_default();
            }
            "location" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    bytes.extend_from_slice(&chunk);
                }
                location = String::from_utf8(bytes).unwrap_or_default();
            }
            "description" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    bytes.extend_from_slice(&chunk);
                }
                description = String::from_utf8(bytes).unwrap_or_default();
            }
            "logo" => {
                let filename = format!("shop_logo_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                let mut f = std::fs::File::create(&filepath)?;
                while let Some(chunk) = field.try_next().await? {
                    f.write_all(&chunk)?;
                }
                logo_path = Some(format!("/uploads/{}", filename));
            }
            "banner" => {
                let filename = format!("shop_banner_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                let mut f = std::fs::File::create(&filepath)?;
                while let Some(chunk) = field.try_next().await? {
                    f.write_all(&chunk)?;
                }
                banner_path = Some(format!("/uploads/{}", filename));
            }
            _ => {}
        }
    }

    // Check if shop exists
    let existing = match sqlx::query_as::<_, Shop>("SELECT * FROM shops WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(shop) => shop,
        Err(e) => return Err(actix_web::error::ErrorInternalServerError(e)),
    };

    match existing {
        Some(shop) => {
            // Update existing shop
            let final_logo = logo_path.or(shop.logo_url);
            let final_banner = banner_path.or(shop.banner_url);

            let updated_shop = sqlx::query_as::<_, Shop>(
                "UPDATE shops SET name = ?, email = ?, phone = ?, location = ?, description = ?, logo_url = ?, banner_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING *"
            )
            .bind(if name.is_empty() { &shop.name } else { &name })
            .bind(if email.is_empty() { &shop.email } else { &email })
            .bind(if phone.is_empty() { &shop.phone } else { &phone })
            .bind(if location.is_empty() { &shop.location } else { &location })
            .bind(if description.is_empty() { shop.description.as_ref() } else { Some(&description) })
            .bind(&final_logo)
            .bind(&final_banner)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            // After updating the shop, update all of its products with the new info
            let final_location = if location.is_empty() {
                &shop.location
            } else {
                &location
            };
            let final_phone = if phone.is_empty() {
                &shop.phone
            } else {
                &phone
            };
            let final_email = if email.is_empty() {
                &shop.email
            } else {
                &email
            };

            sqlx::query("UPDATE products SET location = ?, contact_phone = ?, contact_email = ? WHERE user_id = ?")
                .bind(final_location)
                .bind(final_phone)
                .bind(final_email)
                .bind(user_id)
                .execute(pool.get_ref())
                .await
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            Ok(HttpResponse::Ok().json(updated_shop))
        }
        None => {
            // Create new shop
            let new_shop = sqlx::query_as::<_, Shop>(
                "INSERT INTO shops (user_id, name, email, phone, location, description, logo_url, banner_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
            )
            .bind(user_id)
            .bind(&name)
            .bind(&email)
            .bind(&phone)
            .bind(&location)
            .bind(if description.is_empty() { None } else { Some(&description) })
            .bind(&logo_path)
            .bind(&banner_path)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            Ok(HttpResponse::Created().json(new_shop))
        }
    }
}

// Delete shop
#[delete("")]
pub async fn delete_shop(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: e.to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM shops WHERE user_id = ?")
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Shop not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Shop deleted successfully"
                }))
            }
        }
        Err(e) => {
            eprintln!("Failed to delete shop: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to delete shop".to_string(),
            })
        }
    }
}
