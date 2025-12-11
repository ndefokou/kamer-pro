use actix_web::{get, put, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::middleware::auth::extract_user_id_from_token;

fn extract_user_id(req: &HttpRequest) -> Result<i32, HttpResponse> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token).map_err(|_| {
                    HttpResponse::Unauthorized().json(serde_json::json!({
                        "error": "Invalid or expired token"
                    }))
                });
            }
        }
    }
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value()).map_err(|_| {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired token"
            }))
        });
    }
    Err(HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Missing or invalid authorization header"
    })))
}

#[derive(Serialize, sqlx::FromRow, Debug, Clone)]
struct UserRow {
    id: i32,
    username: String,
    email: String,
    credential_id: Option<String>,
    public_key: Option<String>,
    counter: Option<i64>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, sqlx::FromRow, Debug, Clone, Default)]
struct ProfileRow {
    user_id: i32,
    legal_name: Option<String>,
    preferred_first_name: Option<String>,
    phone: Option<String>,
    residential_address: Option<String>,
    mailing_address: Option<String>,
    identity_verified: Option<i32>,
    language: Option<String>,
    currency: Option<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
    notify_email: Option<i32>,
    notify_sms: Option<i32>,
    privacy_profile_visibility: Option<String>,
    tax_id: Option<String>,
    payout_method: Option<String>,
    travel_for_work: Option<i32>,
}

#[derive(Serialize)]
pub struct AccountResponse {
    user: UserRow,
    profile: ProfileRow,
}

#[get("/me")]
pub async fn get_me(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    let user: Result<UserRow, _> = sqlx::query_as(
        "SELECT id, username, email, credential_id, public_key, counter, created_at, updated_at FROM users WHERE id = ?",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let user = match user {
        Ok(u) => u,
        Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "User not found"
            }))
        }
    };

    let profile: Result<ProfileRow, _> = sqlx::query_as(
        "SELECT user_id, legal_name, preferred_first_name, phone, residential_address, mailing_address, identity_verified, language, currency, created_at, updated_at, notify_email, notify_sms, privacy_profile_visibility, tax_id, payout_method, travel_for_work FROM user_profiles WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let profile = profile.unwrap_or_else(|_| ProfileRow {
        user_id,
        ..Default::default()
    });

    HttpResponse::Ok().json(AccountResponse { user, profile })
}

#[derive(Deserialize, Debug)]
pub struct UpdateAccountRequest {
    // users table
    username: Option<String>,
    email: Option<String>,
    // profile fields
    legal_name: Option<String>,
    preferred_first_name: Option<String>,
    phone: Option<String>,
    residential_address: Option<String>,
    mailing_address: Option<String>,
    language: Option<String>,
    currency: Option<String>,
    notify_email: Option<bool>,
    notify_sms: Option<bool>,
    privacy_profile_visibility: Option<String>,
    tax_id: Option<String>,
    payout_method: Option<String>,
    travel_for_work: Option<bool>,
}

#[put("/update")]
pub async fn update_account(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    body: web::Json<UpdateAccountRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    // Update username/email if provided
    if body.username.is_some() || body.email.is_some() {
        let mut query = String::from("UPDATE users SET ");
        let mut sets: Vec<&str> = Vec::new();
        if body.username.is_some() {
            sets.push("username = ?");
        }
        if body.email.is_some() {
            sets.push("email = ?");
        }
        query.push_str(&sets.join(", "));
        query.push_str(" WHERE id = ?");

        let mut q = sqlx::query(&query);
        if let Some(u) = &body.username {
            q = q.bind(u);
        }
        if let Some(e) = &body.email {
            q = q.bind(e);
        }
        q = q.bind(user_id);
        let _ = q.execute(pool.get_ref()).await;
    }

    // Upsert profile
    let _ = sqlx::query(
        "INSERT INTO user_profiles (user_id, legal_name, preferred_first_name, phone, residential_address, mailing_address, language, currency, notify_email, notify_sms, privacy_profile_visibility, tax_id, payout_method, travel_for_work, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           legal_name=excluded.legal_name,
           preferred_first_name=excluded.preferred_first_name,
           phone=excluded.phone,
           residential_address=excluded.residential_address,
           mailing_address=excluded.mailing_address,
           language=excluded.language,
           currency=excluded.currency,
           notify_email=excluded.notify_email,
           notify_sms=excluded.notify_sms,
           privacy_profile_visibility=excluded.privacy_profile_visibility,
           tax_id=excluded.tax_id,
           payout_method=excluded.payout_method,
           travel_for_work=excluded.travel_for_work,
           updated_at=CURRENT_TIMESTAMP",
    )
    .bind(user_id)
    .bind(&body.legal_name)
    .bind(&body.preferred_first_name)
    .bind(&body.phone)
    .bind(&body.residential_address)
    .bind(&body.mailing_address)
    .bind(&body.language)
    .bind(&body.currency)
    .bind(body.notify_email.map(|b| if b { 1 } else { 0 }))
    .bind(body.notify_sms.map(|b| if b { 1 } else { 0 }))
    .bind(&body.privacy_profile_visibility)
    .bind(&body.tax_id)
    .bind(&body.payout_method)
    .bind(body.travel_for_work.map(|b| if b { 1 } else { 0 }))
    .execute(pool.get_ref())
    .await;

    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}
