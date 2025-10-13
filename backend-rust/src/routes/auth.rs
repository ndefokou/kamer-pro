use actix_web::{post, web, HttpResponse, Responder};
use bcrypt::{hash, verify};
use jsonwebtoken::{encode, Header, EncodingKey};
use log::{info, error};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{Utc, Duration, DateTime};
use std::env;

#[derive(Deserialize)]
pub struct AuthPayload {
    username: String,
    email: String,
    password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    token: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct User {
    id: i32,
    username: String,
    email: String,
    password: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct Claims {
    sub: i32,
    exp: i64,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

#[post("/register")]
pub async fn register(
    pool: web::Data<SqlitePool>,
    payload: web::Json<AuthPayload>,
) -> impl Responder {
    info!("Attempting to register user with email: {}", &payload.email);
    // Check if user already exists
    // Check if user already exists
    let existing_user: Result<Option<User>, _> = sqlx::query_as("SELECT * FROM users WHERE email = ? OR username = ?")
        .bind(&payload.email)
        .bind(&payload.username)
        .fetch_optional(pool.get_ref())
        .await;

    match existing_user {
        Ok(Some(user)) => {
            if user.email == payload.email {
                info!("User with email already exists: {}", &payload.email);
                return HttpResponse::Conflict().json(ErrorResponse {
                    message: "Email already in use".to_string(),
                });
            }
            if user.username == payload.username {
                info!("User with username already exists: {}", &payload.username);
                return HttpResponse::Conflict().json(ErrorResponse {
                    message: "Username already taken".to_string(),
                });
            }
        }
        Ok(None) => {
            // User does not exist, continue
        }
        Err(e) => {
            error!("Database error when checking for existing user: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to query database".to_string(),
            });
        }
    }

    // Hash password
    let hashed_password = match hash(&payload.password, 10) {
        Ok(h) => h,
        Err(e) => {
            error!("Failed to hash password: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to hash password".to_string(),
            });
        }
    };

    // Insert new user into the database
    // Insert new user into the database
    let result = sqlx::query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
        .bind(&payload.username)
        .bind(&payload.email)
        .bind(&hashed_password)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            let user_id = res.last_insert_rowid() as i32;
            info!("User created successfully with ID: {}", user_id);
            // Create JWT token
            let exp = (Utc::now() + Duration::hours(1)).timestamp();
            let claims = Claims { sub: user_id, exp };
            let secret = match env::var("JWT_SECRET") {
                Ok(s) => s,
                Err(_) => {
                    error!("JWT_SECRET is not set on the server");
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        message: "JWT_SECRET is not set on the server".to_string(),
                    });
                }
            };
            let token = match encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())) {
                Ok(t) => t,
                Err(e) => {
                    error!("Failed to create token: {}", e);
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        message: "Failed to create token".to_string(),
                    });
                }
            };
            info!("Token created for user ID: {}", user_id);
            HttpResponse::Ok().json(AuthResponse { token })
        }
        Err(e) => {
            error!("Failed to create user: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to create user".to_string(),
            })
        }
    }
}

#[post("/login")]
pub async fn login(
    pool: web::Data<SqlitePool>,
    payload: web::Json<AuthPayload>,
) -> impl Responder {
    info!("Attempting to log in user with email: {}", &payload.email);
    // Find user by email
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            info!("User found: {}", &user.email);
            // Compare passwords
            let is_valid = match verify(&payload.password, &user.password) {
                Ok(v) => v,
                Err(_) => {
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        message: "Error verifying password".to_string(),
                    });
                }
            };

            if is_valid {
                // Create JWT token
                let exp = (Utc::now() + Duration::hours(1)).timestamp();
                let claims = Claims { sub: user.id, exp };
                let secret = match env::var("JWT_SECRET") {
                    Ok(s) => s,
                    Err(_) => {
                        return HttpResponse::InternalServerError().json(ErrorResponse {
                            message: "JWT_SECRET is not set on the server".to_string(),
                        });
                    }
                };
                let token = match encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())) {
                    Ok(t) => t,
                    Err(_) => {
                        return HttpResponse::InternalServerError().json(ErrorResponse {
                            message: "Failed to create token".to_string(),
                        });
                    }
                };
                HttpResponse::Ok().json(AuthResponse { token })
            } else {
                HttpResponse::Unauthorized().json(ErrorResponse {
                    message: "Invalid credentials".to_string(),
                })
            }
        }
        Err(_) => {
            info!("User not found for email: {}", &payload.email);
            HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Invalid credentials".to_string(),
            })
        }
    }
}