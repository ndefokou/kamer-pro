use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Company {
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
pub struct CompanyWithProducts {
    #[serde(flatten)]
    pub company: Company,
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

// Get current user's company
#[get("")]
pub async fn get_my_company(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: e.to_string(),
            })
        }
    };

    let company_option = match sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(company) => company,
        Err(e) => {
            eprintln!("Failed to fetch company: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch company".to_string(),
            });
        }
    };

    if let Some(mut company) = company_option {
        // Convert relative URLs to absolute
        if let Some(ref logo) = company.logo_url {
            company.logo_url = Some(logo.replace("/public", ""));
        }
        if let Some(ref banner) = company.banner_url {
            company.banner_url = Some(banner.replace("/public", ""));
        }

        // Get product count
        let count: Result<(i32,), _> =
            sqlx::query_as("SELECT COUNT(*) FROM products WHERE user_id = ?")
                .bind(user_id)
                .fetch_one(pool.get_ref())
                .await;

        let product_count = count.unwrap_or((0,)).0;

        HttpResponse::Ok().json(CompanyWithProducts {
            company,
            product_count,
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse {
            message: "Company not found".to_string(),
        })
    }
}

// Get company by ID (public)
#[get("/{company_id}")]
pub async fn get_company_by_id(pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let company_id = path.into_inner();

    let company_option = match sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = ?")
        .bind(company_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(company) => company,
        Err(e) => {
            eprintln!("Failed to fetch company: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch company".to_string(),
            });
        }
    };

    if let Some(mut company) = company_option {
        if let Some(ref logo) = company.logo_url {
            company.logo_url = Some(format!(
                "http://localhost:8081{}",
                logo.replace("/public", "")
            ));
        }
        if let Some(ref banner) = company.banner_url {
            company.banner_url = Some(format!(
                "http://localhost:8081{}",
                banner.replace("/public", "")
            ));
        }

        let count: Result<(i32,), _> =
            sqlx::query_as("SELECT COUNT(*) FROM products WHERE user_id = ?")
                .bind(company.user_id)
                .fetch_one(pool.get_ref())
                .await;

        let product_count = count.unwrap_or((0,)).0;

        HttpResponse::Ok().json(CompanyWithProducts {
            company,
            product_count,
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse {
            message: "Company not found".to_string(),
        })
    }
}

// Create or update company
#[post("")]
pub async fn create_or_update_company(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = get_user_id_from_headers(&req)?;
    println!("Attempting to create or update company for user_id: {}", user_id);

    // Verify user exists before proceeding
    let user_exists: (i32,) = sqlx::query_as("SELECT 1 FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
        .unwrap_or((0,));

    if user_exists.0 != 1 {
        return Ok(HttpResponse::BadRequest().json(ErrorResponse {
            message: "User not found".to_string(),
        }));
    }

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
                let filename = format!("company_logo_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                println!("Attempting to save logo to: {}", filepath);
                let mut f = match std::fs::File::create(&filepath) {
                    Ok(file) => file,
                    Err(e) => {
                        eprintln!("Failed to create logo file: {}. Error: {}", filepath, e);
                        return Err(actix_web::error::ErrorInternalServerError(e));
                    }
                };
                while let Some(chunk) = field.try_next().await? {
                    if let Err(e) = f.write_all(&chunk) {
                        eprintln!("Failed to write to logo file: {}. Error: {}", filepath, e);
                        return Err(actix_web::error::ErrorInternalServerError(e));
                    }
                }
                logo_path = Some(format!("/uploads/{}", filename));
            }
            "banner" => {
                let filename = format!("company_banner_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                println!("Attempting to save banner to: {}", filepath);
                let mut f = match std::fs::File::create(&filepath) {
                    Ok(file) => file,
                    Err(e) => {
                        eprintln!("Failed to create banner file: {}. Error: {}", filepath, e);
                        return Err(actix_web::error::ErrorInternalServerError(e));
                    }
                };
                while let Some(chunk) = field.try_next().await? {
                    if let Err(e) = f.write_all(&chunk) {
                        eprintln!("Failed to write to banner file: {}. Error: {}", filepath, e);
                        return Err(actix_web::error::ErrorInternalServerError(e));
                    }
                }
                banner_path = Some(format!("/uploads/{}", filename));
            }
            _ => {}
        }
    }

    // Check if company exists
    let existing = match sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(company) => company,
        Err(e) => return Err(actix_web::error::ErrorInternalServerError(e)),
    };

    match existing {
        Some(company) => {
            // Update existing company
            let final_logo = logo_path.or(company.logo_url);
            let final_banner = banner_path.or(company.banner_url);

            let updated_company = sqlx::query_as::<_, Company>(
                "UPDATE companies SET name = ?, email = ?, phone = ?, location = ?, description = ?, logo_url = ?, banner_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING *"
            )
            .bind(if name.is_empty() { &company.name } else { &name })
            .bind(if email.is_empty() { &company.email } else { &email })
            .bind(if phone.is_empty() { &company.phone } else { &phone })
            .bind(if location.is_empty() { &company.location } else { &location })
            .bind(if description.is_empty() { company.description.as_ref() } else { Some(&description) })
            .bind(&final_logo)
            .bind(&final_banner)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            // After updating the company, update all of its products with the new info
            let final_location = if location.is_empty() {
                &company.location
            } else {
                &location
            };
            let final_phone = if phone.is_empty() {
                &company.phone
            } else {
                &phone
            };
            let final_email = if email.is_empty() {
                &company.email
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

            Ok(HttpResponse::Ok().json(updated_company))
        }
        None => {
            // Create new company
            let new_company = sqlx::query_as::<_, Company>(
                "INSERT INTO companies (user_id, name, email, phone, location, description, logo_url, banner_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
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
            .map_err(|e| {
                eprintln!("Failed to create company: {}", e);
                actix_web::error::ErrorInternalServerError(e)
            })?;

            Ok(HttpResponse::Created().json(new_company))
        }
    }
}

// Delete company
#[delete("")]
pub async fn delete_company(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: e.to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM companies WHERE user_id = ?")
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "company not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "company deleted successfully"
                }))
            }
        }
        Err(e) => {
            eprintln!("Failed to delete company: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to delete company".to_string(),
            })
        }
    }
}
