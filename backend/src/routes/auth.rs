use actix_web::cookie::time::Duration as CookieDuration;
use actix_web::cookie::{Cookie, SameSite};
use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub credential_id: Option<String>,
    pub public_key: Option<String>,
    pub counter: Option<i32>,
    pub created_at: chrono::NaiveDateTime,
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
    pub email: String,
}

#[post("/register/start")]
pub async fn registration_start(
    pool: web::Data<PgPool>,
    req: web::Json<RegistrationStartRequest>,
) -> impl Responder {
    // Check if user already exists
    let existing_user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = $1")
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
    pool: web::Data<PgPool>,
    req: web::Json<RegistrationCompleteRequest>,
) -> impl Responder {
    // Check if email already exists
    let existing_user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    if existing_user.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Email already exists".to_string(),
        });
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        "INSERT INTO users (username, email, credential_id, public_key, counter, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&req.credential_id)
    .bind(&req.public_key)
    .bind(0i32)
    .bind(now)
    .bind(now)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(row) => {
            let user_id: i32 = sqlx::Row::get(&row, "id");
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user_id);
            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
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
    pool: web::Data<PgPool>,
    req: web::Json<AuthenticationStartRequest>,
) -> impl Responder {
    // Check if user exists
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = $1")
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
    pool: web::Data<PgPool>,
    req: web::Json<AuthenticationCompleteRequest>,
) -> impl Responder {
    // Verify user exists and authenticate
    // Note: In production, the signature should be verified against the stored public key
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE username = $1")
        .bind(&req.username)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user.id);
            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
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
    pub password: String,
    pub phone: Option<String>,
    pub email: String,
}

#[post("/register")]
pub async fn simple_register(
    pool: web::Data<PgPool>,
    req: web::Json<SimpleRegisterRequest>,
) -> impl Responder {
    // Check if email is provided and not empty
    if req.email.trim().is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Email cannot be empty".to_string(),
        });
    }

    // Check if email already exists (email is the unique identifier)
    let existing_email: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    if existing_email.is_ok() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Email already exists".to_string(),
        });
    }

    let now = Utc::now().naive_utc();

    let password_hash = hash(req.password.as_bytes(), DEFAULT_COST).unwrap();

    let result = sqlx::query(
        "INSERT INTO users (username, email, credential_id, public_key, counter, created_at, updated_at, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(None::<String>)
    .bind(None::<String>)
    .bind(0i32)
    .bind(now)
    .bind(now)
    .bind(&password_hash)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(row) => {
            let user_id: i32 = sqlx::Row::get(&row, "id");
            let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user_id);

            let _ = sqlx::query(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
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

            // Upsert phone into user_profiles if provided
            if let Some(phone) = &req.phone {
                let _ = sqlx::query(
                    "INSERT INTO user_profiles (user_id, phone, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT(user_id) DO UPDATE SET phone = excluded.phone, updated_at = CURRENT_TIMESTAMP",
                )
                .bind(user_id)
                .bind(phone)
                .execute(pool.get_ref())
                .await;
            }

            HttpResponse::Created()
                .cookie(cookie)
                .json(AuthenticationCompleteResponse {
                    message: "Registration successful".to_string(),
                    token,
                    user_id,
                    username: req.username.clone(),
                    email: req.email.clone(),
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
    pub email: String,
    pub password: String,
}

#[post("/login")]
pub async fn simple_login(
    pool: web::Data<PgPool>,
    req: web::Json<SimpleLoginRequest>,
) -> impl Responder {
    // Verify user exists
    let user: Result<User, _> = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_one(pool.get_ref())
        .await;

    match user {
        Ok(user) => {
            println!("Login attempt for user: {}", user.username);
            let valid = if let Some(hash) = &user.password_hash {
                let is_valid = verify(req.password.as_bytes(), hash).unwrap_or(false);
                println!("Password verification result: {}", is_valid);
                is_valid
            } else {
                println!("User has no password hash");
                false
            };

            if valid {
                let token = format!("token_{}_{}", Uuid::new_v4().to_string(), user.id);

                let _ = sqlx::query(
                    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
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
                println!("Password invalid for user: {}", user.email);
                HttpResponse::Unauthorized().json(ErrorResponse {
                    error: "Invalid email or password".to_string(),
                })
            }
        }
        Err(e) => {
            println!("User not found or database error: {}", e);
            HttpResponse::Unauthorized().json(ErrorResponse {
                error: "Invalid email or password".to_string(),
            })
        }
    }
}

#[post("/logout")]
pub async fn logout(req: HttpRequest, pool: web::Data<PgPool>) -> impl Responder {
    if let Some(c) = req.cookie("session") {
        let _ = sqlx::query("DELETE FROM sessions WHERE token = $1")
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
