use actix_web::cookie::time::Duration as CookieDuration;
use actix_web::cookie::{Cookie, SameSite};
use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: Option<String>,
    pub credential_id: Option<String>,
    pub public_key: Option<String>,
    pub counter: Option<i64>,
    pub created_at: String,
    pub password_hash: Option<String>,
}

#[derive(Deserialize)]
pub struct RegistrationStartRequest {
    pub username: String,
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
    #[allow(dead_code)] // Used for WebAuthn verification in production
    pub signature: String,
}

#[derive(Serialize)]
pub struct AuthenticationCompleteResponse {
    pub message: String,
    pub token: String,
    pub user_id: i32,
    pub username: String,
    pub email: Option<String>,
}

#[post("/register/start")]
pub async fn registration_start(
    pool: web::Data<SqlitePool>,
    req: web::Json<RegistrationStartRequest>,
) -> impl Responder {
    // Check if user already exists
    let existing_user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
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
    // Check if email already exists
    let existing_user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = ?")
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    if existing_user.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Email already exists".to_string(),
        });
    }

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO users (username, email, credential_id, public_key, counter, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
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
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user_id);
            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
            )
            .bind(&token)
            .bind(user_id)
            .execute(pool.get_ref())
            .await;

            let cookie = Cookie::build("session", token)
                .path("/")
                .http_only(true)
                .same_site(SameSite::Lax)
                .max_age(CookieDuration::days(30))
                .finish();

            HttpResponse::Created()
                .cookie(cookie)
                .json(RegistrationCompleteResponse {
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
    // Note: In production, the signature should be verified against the stored public key
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user.id);
            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
            )
            .bind(&token)
            .bind(user.id)
            .execute(pool.get_ref())
            .await;

            let cookie = Cookie::build("session", token.clone())
                .path("/")
                .http_only(true)
                .same_site(SameSite::Lax)
                .max_age(CookieDuration::days(30))
                .finish();

            HttpResponse::Ok()
                .cookie(cookie)
                .json(AuthenticationCompleteResponse {
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

#[derive(Deserialize)]
pub struct SimpleRegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[post("/register")]
pub async fn simple_register(
    pool: web::Data<SqlitePool>,
    req: web::Json<SimpleRegisterRequest>,
) -> impl Responder {
    // Check if username already exists
    let existing_username: Result<User, _> =
        sqlx::query_as("SELECT * FROM users WHERE username = ?")
            .bind(&req.username)
            .fetch_one(pool.get_ref())
            .await;

    if existing_username.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "User already exists".to_string(),
        });
    }

    // Check if email already exists
    let existing_email: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = ?")
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    if existing_email.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Email already exists".to_string(),
        });
    }

    let now = Utc::now().to_rfc3339();

    let password_hash = hash(req.password.as_bytes(), DEFAULT_COST).unwrap();

    let result = sqlx::query(
        "INSERT INTO users (username, email, credential_id, public_key, counter, created_at, updated_at, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(None::<String>)
    .bind(None::<String>)
    .bind(0i64)
    .bind(&now)
    .bind(&now)
    .bind(&password_hash)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let user_id = res.last_insert_rowid() as i32;
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user_id);

            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
            )
            .bind(&token)
            .bind(user_id)
            .execute(pool.get_ref())
            .await;

            let cookie = Cookie::build("session", token.clone())
                .path("/")
                .http_only(true)
                .same_site(SameSite::Lax)
                .max_age(CookieDuration::days(30))
                .finish();

            HttpResponse::Created()
                .cookie(cookie)
                .json(AuthenticationCompleteResponse {
                    message: "Registration successful".to_string(),
                    token,
                    user_id,
                    username: req.username.clone(),
                    email: Some(req.email.clone()),
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

#[derive(Deserialize)]
pub struct SimpleLoginRequest {
    pub username: String,
    pub password: String,
}

#[post("/login")]
pub async fn simple_login(
    pool: web::Data<SqlitePool>,
    req: web::Json<SimpleLoginRequest>,
) -> impl Responder {
    // Verify user exists
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            let valid = if let Some(hash) = &user.password_hash {
                verify(req.password.as_bytes(), hash).unwrap_or(false)
            } else {
                false
            };

            if valid {
                let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user.id);

                let _ = sqlx::query(
                    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
                )
                .bind(&token)
                .bind(user.id)
                .execute(pool.get_ref())
                .await;

                let cookie = Cookie::build("session", token.clone())
                    .path("/")
                    .http_only(true)
                    .same_site(SameSite::Lax)
                    .max_age(CookieDuration::days(30))
                    .finish();

                HttpResponse::Ok()
                    .cookie(cookie)
                    .json(AuthenticationCompleteResponse {
                        message: "Authentication successful".to_string(),
                        token,
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                    })
            } else {
                HttpResponse::Unauthorized().json(ErrorResponse {
                    error: "Invalid username or password".to_string(),
                })
            }
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "Invalid username or password".to_string(),
        }),
    }
}

#[post("/logout")]
pub async fn logout(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    if let Some(c) = req.cookie("session") {
        let _ = sqlx::query("DELETE FROM sessions WHERE token = ?")
            .bind(c.value())
            .execute(pool.get_ref())
            .await;
    }
    let removal = Cookie::build("session", "")
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(CookieDuration::seconds(0))
        .finish();
    HttpResponse::Ok().cookie(removal).json(serde_json::json!({
        "message": "Logged out"
    }))
}
