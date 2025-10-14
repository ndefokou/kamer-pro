use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub credential_id: Option<String>,
    pub public_key: Option<String>,
    pub counter: Option<i64>,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct RegistrationStartRequest {
    pub username: String,
    pub email: String,
}

#[derive(Serialize)]
pub struct RegistrationStartResponse {
    pub challenge: String,
    pub user_id: String,
    pub username: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Deserialize)]
pub struct RegistrationCompleteRequest {
    pub username: String,
    pub email: String,
    pub credential_id: String,
    pub public_key: String,
}

#[derive(Serialize)]
pub struct RegistrationCompleteResponse {
    pub message: String,
    pub user_id: i32,
}

#[derive(Deserialize)]
pub struct AuthenticationStartRequest {
    pub username: String,
}

#[derive(Serialize)]
pub struct AuthenticationStartResponse {
    pub challenge: String,
    pub username: String,
}

#[derive(Deserialize)]
pub struct AuthenticationCompleteRequest {
    pub username: String,
    pub signature: String,
}

#[derive(Serialize)]
pub struct AuthenticationCompleteResponse {
    pub message: String,
    pub token: String,
    pub user_id: i32,
    pub username: String,
    pub email: String,
}

#[post("/register/start")]
pub async fn registration_start(
    pool: web::Data<SqlitePool>,
    req: web::Json<RegistrationStartRequest>,
) -> impl Responder {
    // Check if user already exists
    let existing_user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ? OR email = ?")
        .bind(&req.username)
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    if existing_user.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "User already exists".to_string(),
        });
    }

    // Generate challenge for WebAuthn
    let challenge = Uuid::new_v4().to_string();
    let user_id = Uuid::new_v4().to_string();

    HttpResponse::Ok().json(RegistrationStartResponse {
        challenge,
        user_id,
        username: req.username.clone(),
    })
}

#[post("/register/complete")]
pub async fn registration_complete(
    pool: web::Data<SqlitePool>,
    req: web::Json<RegistrationCompleteRequest>,
) -> impl Responder {
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO users (username, email, credential_id, public_key, counter, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&req.credential_id)
    .bind(&req.public_key)
    .bind(0i64)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let user_id = res.last_insert_rowid() as i32;
            HttpResponse::Created().json(RegistrationCompleteResponse {
                message: "Registration successful".to_string(),
                user_id,
            })
        }
        Err(e) => {
            eprintln!("Registration error: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Registration failed".to_string(),
            })
        }
    }
}

#[post("/login/start")]
pub async fn authentication_start(
    pool: web::Data<SqlitePool>,
    req: web::Json<AuthenticationStartRequest>,
) -> impl Responder {
    // Check if user exists
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            let challenge = Uuid::new_v4().to_string();

            HttpResponse::Ok().json(AuthenticationStartResponse {
                challenge,
                username: user.username,
            })
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "User not found".to_string(),
        }),
    }
}

#[post("/login/complete")]
pub async fn authentication_complete(
    pool: web::Data<SqlitePool>,
    req: web::Json<AuthenticationCompleteRequest>,
) -> impl Responder {
    // Verify user exists and authenticate
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            // Generate a simple JWT token (in production, use proper JWT with secret)
            let token = format!("token_{}", Uuid::new_v4().to_string());

            HttpResponse::Ok().json(AuthenticationCompleteResponse {
                message: "Authentication successful".to_string(),
                token,
                user_id: user.id,
                username: user.username,
                email: user.email,
            })
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "Authentication failed".to_string(),
        }),
    }
}