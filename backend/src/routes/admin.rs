use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Admin {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectProfile {
    pub id: i32,
    pub user_id: Option<i32>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub registration_number: Option<String>,
    pub password_hash: Option<String>,
    pub is_active: i32,
    pub logo_url: Option<String>,
    pub banner_url: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct AdminLoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AdminLoginResponse {
    pub message: String,
    pub token: String,
    pub admin_id: i32,
    pub username: String,
}

#[derive(Deserialize)]
pub struct CreateArchitectRequest {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub registration_number: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct UpdateArchitectRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub registration_number: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

fn get_admin_id_from_headers(req: &HttpRequest) -> Result<i32, actix_web::Error> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_admin_id_from_token(token);
            }
        }
    }
    Err(actix_web::error::ErrorUnauthorized(
        "Missing or invalid authorization header",
    ))
}

fn extract_admin_id_from_token(token: &str) -> Result<i32, actix_web::Error> {
    if let Some(admin_id_str) = token.strip_prefix("admin_token_") {
        if let Some(parts) = admin_id_str.rsplit_once('_') {
            if let Ok(admin_id) = parts.1.parse::<i32>() {
                return Ok(admin_id);
            }
        }
    }
    Err(actix_web::error::ErrorUnauthorized("Invalid admin token"))
}

#[post("/login")]
pub async fn admin_login(
    pool: web::Data<SqlitePool>,
    req: web::Json<AdminLoginRequest>,
) -> impl Responder {
    let admin: Result<Admin, _> = sqlx::query_as("SELECT * FROM admins WHERE username = ?")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match admin {
        Ok(admin) => {
            // Verify password
            match verify(&req.password, &admin.password_hash) {
                Ok(valid) => {
                    if valid {
                        // Generate admin token
                        let token =
                            format!("admin_token_{}_{}", Uuid::new_v4().to_string(), admin.id);

                        HttpResponse::Ok().json(AdminLoginResponse {
                            message: "Admin login successful".to_string(),
                            token,
                            admin_id: admin.id,
                            username: admin.username,
                        })
                    } else {
                        HttpResponse::Unauthorized().json(ErrorResponse {
                            message: "Invalid credentials".to_string(),
                        })
                    }
                }
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Password verification failed".to_string(),
                }),
            }
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            message: "Invalid credentials".to_string(),
        }),
    }
}

#[get("/architects")]
pub async fn get_all_architects(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    // Verify admin authentication
    if let Err(e) = get_admin_id_from_headers(&req) {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: e.to_string(),
        });
    }

    let architects: Result<Vec<ArchitectProfile>, _> =
        sqlx::query_as("SELECT * FROM architect_companies ORDER BY created_at DESC")
            .fetch_all(pool.get_ref())
            .await;

    match architects {
        Ok(architects) => HttpResponse::Ok().json(architects),
        Err(e) => {
            eprintln!("Failed to fetch architects: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch architects".to_string(),
            })
        }
    }
}

#[post("/architects")]
pub async fn create_architect(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<CreateArchitectRequest>,
) -> impl Responder {
    // Verify admin authentication
    if let Err(e) = get_admin_id_from_headers(&req) {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: e.to_string(),
        });
    }

    // Check if email already exists
    let existing: Result<ArchitectProfile, _> =
        sqlx::query_as("SELECT * FROM architect_companies WHERE email = ?")
            .bind(&payload.email)
            .fetch_one(pool.get_ref())
            .await;

    if existing.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            message: "Email already exists".to_string(),
        });
    }

    // Hash password
    let password_hash = match hash(&payload.password, DEFAULT_COST) {
        Ok(hash) => hash,
        Err(_) => {
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to hash password".to_string(),
            });
        }
    };

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO architect_companies (name, email, phone, location, registration_number, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&payload.phone)
    .bind(&payload.location)
    .bind(&payload.registration_number)
    .bind(&password_hash)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let architect_id = res.last_insert_rowid() as i32;
            let architect: ArchitectProfile =
                sqlx::query_as("SELECT * FROM architect_companies WHERE id = ?")
                    .bind(architect_id)
                    .fetch_one(pool.get_ref())
                    .await
                    .unwrap();

            HttpResponse::Created().json(architect)
        }
        Err(e) => {
            eprintln!("Failed to create architect: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to create architect".to_string(),
            })
        }
    }
}

#[put("/architects/{id}")]
pub async fn update_architect(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<UpdateArchitectRequest>,
) -> impl Responder {
    // Verify admin authentication
    if let Err(e) = get_admin_id_from_headers(&req) {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: e.to_string(),
        });
    }

    let architect_id = path.into_inner();

    // Fetch existing architect
    let existing: Result<ArchitectProfile, _> =
        sqlx::query_as("SELECT * FROM architect_companies WHERE id = ?")
            .bind(architect_id)
            .fetch_one(pool.get_ref())
            .await;

    let existing = match existing {
        Ok(arch) => arch,
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                message: "Architect not found".to_string(),
            });
        }
    };

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "UPDATE architect_companies 
         SET name = ?, email = ?, phone = ?, location = ?, registration_number = ?, is_active = ?, updated_at = ?
         WHERE id = ?"
    )
    .bind(payload.name.as_ref().unwrap_or(&existing.name))
    .bind(payload.email.as_ref().unwrap_or(&existing.email))
    .bind(payload.phone.as_ref().unwrap_or(&existing.phone))
    .bind(payload.location.as_ref().unwrap_or(&existing.location))
    .bind(payload.registration_number.as_ref().or(existing.registration_number.as_ref()))
    .bind(payload.is_active.map(|v| if v { 1 } else { 0 }).unwrap_or(existing.is_active))
    .bind(&now)
    .bind(architect_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let updated: ArchitectProfile =
                sqlx::query_as("SELECT * FROM architect_companies WHERE id = ?")
                    .bind(architect_id)
                    .fetch_one(pool.get_ref())
                    .await
                    .unwrap();

            HttpResponse::Ok().json(updated)
        }
        Err(e) => {
            eprintln!("Failed to update architect: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to update architect".to_string(),
            })
        }
    }
}

#[delete("/architects/{id}")]
pub async fn delete_architect(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    // Verify admin authentication
    if let Err(e) = get_admin_id_from_headers(&req) {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: e.to_string(),
        });
    }

    let architect_id = path.into_inner();

    let result = sqlx::query("DELETE FROM architect_companies WHERE id = ?")
        .bind(architect_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Architect deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Architect not found".to_string(),
                })
            }
        }
        Err(e) => {
            eprintln!("Failed to delete architect: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to delete architect".to_string(),
            })
        }
    }
}

#[post("/architects/{id}/reset-password")]
pub async fn reset_architect_password(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<ResetPasswordRequest>,
) -> impl Responder {
    // Verify admin authentication
    if let Err(e) = get_admin_id_from_headers(&req) {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: e.to_string(),
        });
    }

    let architect_id = path.into_inner();

    // Hash new password
    let password_hash = match hash(&payload.new_password, DEFAULT_COST) {
        Ok(hash) => hash,
        Err(_) => {
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to hash password".to_string(),
            });
        }
    };

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "UPDATE architect_companies SET password_hash = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&password_hash)
    .bind(&now)
    .bind(architect_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Password reset successfully"
                }))
            } else {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Architect not found".to_string(),
                })
            }
        }
        Err(e) => {
            eprintln!("Failed to reset password: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to reset password".to_string(),
            })
        }
    }
}
