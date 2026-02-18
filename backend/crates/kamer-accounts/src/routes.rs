use actix_web::{get, put, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

// Local extract_user_id removed in favor of kamer_auth::extract_user_id

#[derive(Serialize, sqlx::FromRow, Debug, Clone)]
struct UserRow {
    id: i32,
    username: String,
    email: String,
    credential_id: Option<String>,
    public_key: Option<String>,
    counter: Option<i32>,
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
    identity_verified: Option<bool>,
    language: Option<String>,
    currency: Option<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
    notify_email: Option<bool>,
    notify_sms: Option<bool>,
    privacy_profile_visibility: Option<String>,
    tax_id: Option<String>,
    payout_method: Option<String>,
    travel_for_work: Option<bool>,
    avatar: Option<String>,
    location: Option<String>,
    languages_spoken: Option<String>,
    pub bio: Option<String>,
}

#[derive(Serialize)]
pub struct AccountResponse {
    user: Option<UserRow>,
    profile: Option<ProfileRow>,
}

#[get("/me")]
pub async fn get_me(req: HttpRequest, pool: web::Data<PgPool>) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Unauthorized",
                "message": err.to_string()
            }))
        }
    };

    let user: Result<UserRow, _> = sqlx::query_as(
        "SELECT id, username, email, credential_id, public_key, counter, created_at::TEXT, updated_at::TEXT FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let user = match user {
        Ok(u) => u,
        Err(_) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "User not found"
            }))
        }
    };

    let profile: Result<ProfileRow, _> = sqlx::query_as(
        "SELECT user_id, legal_name, preferred_first_name, phone, residential_address, mailing_address, identity_verified, language, currency, created_at::TEXT, updated_at::TEXT, notify_email, notify_sms, privacy_profile_visibility, tax_id, payout_method, travel_for_work, avatar, location, languages_spoken, bio FROM user_profiles WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let profile = profile.unwrap_or_else(|_| ProfileRow {
        user_id,
        ..Default::default()
    });

    HttpResponse::Ok().json(AccountResponse {
        user: Some(user),
        profile: Some(profile),
    })
}

#[get("/user/{id}")]
pub async fn get_user_by_id(path: web::Path<i32>, pool: web::Data<PgPool>) -> impl Responder {
    let user_id = path.into_inner();

    let user: Result<UserRow, _> = sqlx::query_as(
        "SELECT id, username, email, credential_id, public_key, counter, created_at::TEXT, updated_at::TEXT FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let user = match user {
        Ok(u) => u,
        Err(_) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "User not found"
            }))
        }
    };

    let profile: Result<ProfileRow, _> = sqlx::query_as(
        "SELECT user_id, legal_name, preferred_first_name, phone, residential_address, mailing_address, identity_verified, language, currency, created_at::TEXT, updated_at::TEXT, notify_email, notify_sms, privacy_profile_visibility, tax_id, payout_method, travel_for_work, avatar, location, languages_spoken FROM user_profiles WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    let profile = profile.unwrap_or_else(|_| ProfileRow {
        user_id,
        ..Default::default()
    });

    HttpResponse::Ok().json(AccountResponse {
        user: Some(user),
        profile: Some(profile),
    })
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
    avatar: Option<String>,
    location: Option<String>,
    languages_spoken: Option<String>,
    bio: Option<String>,
}

#[put("/update")]
pub async fn update_account(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<UpdateAccountRequest>,
) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    // Update username/email if provided
    if body.username.is_some() || body.email.is_some() {
        let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
            sqlx::QueryBuilder::new("UPDATE users SET updated_at = CURRENT_TIMESTAMP");

        if let Some(ref username) = body.username {
            query_builder.push(", username = ");
            query_builder.push_bind(username);
        }
        if let Some(ref email) = body.email {
            query_builder.push(", email = ");
            query_builder.push_bind(email);
        }

        query_builder.push(" WHERE id = ");
        query_builder.push_bind(user_id);

        let _ = query_builder.build().execute(pool.get_ref()).await;
    }

    // Upsert profile
    let result = sqlx::query(
        "INSERT INTO user_profiles (user_id, legal_name, preferred_first_name, phone, residential_address, mailing_address, language, currency, notify_email, notify_sms, privacy_profile_visibility, tax_id, payout_method, travel_for_work, avatar, location, languages_spoken, bio, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           legal_name=COALESCE(excluded.legal_name, user_profiles.legal_name),
           preferred_first_name=COALESCE(excluded.preferred_first_name, user_profiles.preferred_first_name),
           phone=COALESCE(excluded.phone, user_profiles.phone),
           residential_address=COALESCE(excluded.residential_address, user_profiles.residential_address),
           mailing_address=COALESCE(excluded.mailing_address, user_profiles.mailing_address),
           language=COALESCE(excluded.language, user_profiles.language),
           currency=COALESCE(excluded.currency, user_profiles.currency),
           notify_email=COALESCE(excluded.notify_email, user_profiles.notify_email),
           notify_sms=COALESCE(excluded.notify_sms, user_profiles.notify_sms),
           privacy_profile_visibility=COALESCE(excluded.privacy_profile_visibility, user_profiles.privacy_profile_visibility),
           tax_id=COALESCE(excluded.tax_id, user_profiles.tax_id),
           payout_method=COALESCE(excluded.payout_method, user_profiles.payout_method),
           travel_for_work=COALESCE(excluded.travel_for_work, user_profiles.travel_for_work),
           avatar=COALESCE(excluded.avatar, user_profiles.avatar),
           location=COALESCE(excluded.location, user_profiles.location),
           languages_spoken=COALESCE(excluded.languages_spoken, user_profiles.languages_spoken),
           bio=COALESCE(excluded.bio, user_profiles.bio),
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
    .bind(body.notify_email)
    .bind(body.notify_sms)
    .bind(&body.privacy_profile_visibility)
    .bind(&body.tax_id)
    .bind(&body.payout_method)
    .bind(body.travel_for_work)
    .bind(&body.avatar)
    .bind(&body.location)
    .bind(&body.languages_spoken)
    .bind(&body.bio)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = result {
        eprintln!("Error updating profile: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update profile",
            "details": e.to_string()
        }));
    }

    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}
