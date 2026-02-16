use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web::error::{ErrorUnauthorized};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::env;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SupabaseClaims {
    pub sub: String,  // User ID (UUID)
    pub email: Option<String>,
    pub phone: Option<String>,
    pub app_metadata: Option<serde_json::Value>,
    pub user_metadata: Option<serde_json::Value>,
    pub role: Option<String>,
    pub aal: Option<String>,
    pub amr: Option<Vec<serde_json::Value>>,
    pub session_id: Option<String>,
    pub exp: usize,  // Expiration time
    pub iat: usize,  // Issued at
    pub iss: Option<String>,  // Issuer
    pub aud: Option<String>,  // Audience
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: String,
    pub email: Option<String>,
    pub user_metadata: Option<serde_json::Value>,
}

/// Validates a Supabase JWT token and extracts user information
pub async fn validate_supabase_token(req: &ServiceRequest) -> Result<AuthenticatedUser, Error> {
    // Extract Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| ErrorUnauthorized("Missing Authorization header"))?;

    // Check if it starts with "Bearer "
    if !auth_header.starts_with("Bearer ") {
        return Err(ErrorUnauthorized("Invalid Authorization header format"));
    }

    // Extract the token
    let token = &auth_header[7..];

    // Get Supabase JWT secret from environment
    let jwt_secret = env::var("SUPABASE_JWT_SECRET")
        .map_err(|_| ErrorUnauthorized("SUPABASE_JWT_SECRET not configured"))?;

    // Decode and validate the JWT
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    
    // Optionally validate issuer and audience
    if let Ok(supabase_url) = env::var("SUPABASE_URL") {
        validation.set_issuer(&[&supabase_url]);
    }

    let token_data = decode::<SupabaseClaims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|e| {
        eprintln!("JWT validation error: {:?}", e);
        ErrorUnauthorized("Invalid or expired token")
    })?;

    let claims = token_data.claims;

    // Create authenticated user
    let auth_user = AuthenticatedUser {
        id: claims.sub.clone(),
        email: claims.email.clone(),
        user_metadata: claims.user_metadata.clone(),
    };

    // Insert user into request extensions for later use
    req.extensions_mut().insert(auth_user.clone());

    Ok(auth_user)
}

/// Helper function to extract authenticated user from request
/// Use this in your route handlers after validating the token
pub fn get_authenticated_user(req: &actix_web::HttpRequest) -> Option<AuthenticatedUser> {
    req.extensions().get::<AuthenticatedUser>().cloned()
}

/// Extract user ID from Supabase token (convenience function)
/// Returns the user's UUID as a String
pub async fn extract_user_id(req: &actix_web::HttpRequest) -> Result<String, Error> {
    // Try to validate from ServiceRequest
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| ErrorUnauthorized("Missing Authorization header"))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(ErrorUnauthorized("Invalid Authorization header format"));
    }

    let token = &auth_header[7..];
    let jwt_secret = std::env::var("SUPABASE_JWT_SECRET")
        .map_err(|_| ErrorUnauthorized("SUPABASE_JWT_SECRET not configured"))?;

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<SupabaseClaims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|_| ErrorUnauthorized("Invalid or expired token"))?;

    Ok(token_data.claims.sub)
}

/// Syncs a Supabase user with the local database and returns their local integer ID.
pub async fn get_or_create_local_user(
    pool: &PgPool,
    supabase_uuid: &str,
    email: &str,
    username: Option<&str>,
) -> Result<i32, Error> {
    // 1. Try to find user by supabase_id
    let existing_by_uuid: Result<Option<(i32,)>, sqlx::Error> =
        sqlx::query_as("SELECT id FROM users WHERE supabase_id = $1")
            .bind(supabase_uuid)
            .fetch_optional(pool)
            .await;

    if let Ok(Some((id,))) = existing_by_uuid {
        return Ok(id);
    }

    // 2. Try to find user by email and update their supabase_id (linking existing local account)
    let existing_by_email: Result<Option<(i32,)>, sqlx::Error> =
        sqlx::query_as("SELECT id FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(pool)
            .await;

    if let Ok(Some((id,))) = existing_by_email {
        // Update the user with the supabase_id
        let _ = sqlx::query("UPDATE users SET supabase_id = $1 WHERE id = $2")
            .bind(supabase_uuid)
            .bind(id)
            .execute(pool)
            .await;
        return Ok(id);
    }

    // 3. Create a new user if not found
    let name = username.unwrap_or_else(|| email.split('@').next().unwrap_or("user"));
    let result = sqlx::query("INSERT INTO users (username, email, supabase_id) VALUES ($1, $2, $3) RETURNING id")
        .bind(name)
        .bind(email)
        .bind(supabase_uuid)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            eprintln!("Failed to create local user for Supabase auth: {}", e);
            actix_web::error::ErrorInternalServerError("Database error during user sync")
        })?;

    let id: i32 = sqlx::Row::get(&result, "id");
    Ok(id)
}
