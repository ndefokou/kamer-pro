use actix_web::error::{ErrorUnauthorized};
use actix_web::{Error, HttpRequest};
use sqlx::PgPool;
use crate::middleware::supabase_auth::{get_or_create_local_user, SupabaseClaims};
use crate::middleware::jwks;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use std::env;
use base64::{Engine as _, engine::general_purpose};

pub fn extract_user_id_from_token(token: &str) -> Result<i32, Error> {
    // Extract user_id from token format: "token_{uuid}_{user_id}"
    if let Some(user_id_str) = token.strip_prefix("token_") {
        if let Some(parts) = user_id_str.rsplit_once('_') {
            if let Ok(user_id) = parts.1.parse::<i32>() {
                return Ok(user_id);
            }
        }
    }
    Err(ErrorUnauthorized("Invalid token"))
}

pub async fn extract_user_id(req: &HttpRequest, pool: &PgPool) -> Result<i32, Error> {
    // 1. Try Authorization header
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                // Try legacy token first
                if token.starts_with("token_") {
                    return extract_user_id_from_token(token);
                }

                // If not legacy, try Supabase JWT
                if let Ok(header) = jsonwebtoken::decode_header(token) {
                    let decoding_key = if header.alg == Algorithm::ES256 {
                        // Asymmetric validation using JWKS
                        if let Some(kid) = &header.kid {
                            jwks::get_decoding_key(kid).await.ok_or_else(|| {
                                log::error!("Missing public key for kid: {}", kid);
                                ErrorUnauthorized("Authentication failed: public key not found")
                            })?
                        } else {
                            log::error!("ES256 token missing kid in header");
                            return Err(ErrorUnauthorized("Invalid token header"));
                        }
                    } else {
                        // Symmetric validation using secret (HS256)
                        let jwt_secret = env::var("SUPABASE_JWT_SECRET")
                            .map_err(|_| ErrorUnauthorized("SUPABASE_JWT_SECRET not configured"))?;
                        let jwt_secret = jwt_secret.trim();
                        
                        if let Ok(decoded) = general_purpose::STANDARD.decode(jwt_secret.as_bytes()) {
                            DecodingKey::from_secret(&decoded)
                        } else {
                            DecodingKey::from_secret(jwt_secret.as_bytes())
                        }
                    };

                    let mut validation = Validation::new(header.alg);
                    validation.validate_exp = true;
                    validation.set_audience(&["authenticated"]); 
                    
                    match decode::<SupabaseClaims>(
                        token,
                        &decoding_key,
                        &validation,
                    ) {
                        Ok(token_data) => {
                            let claims = token_data.claims;
                            if let Some(email) = claims.email {
                                return get_or_create_local_user(pool, &claims.sub, &email, None).await;
                            } else {
                                log::error!("Supabase token missing email claim for sub: {}", claims.sub);
                            }
                        }
                        Err(e) => {
                            log::error!("Supabase JWT decoding failed: {:?}", e);
                        }
                    }
                } else {
                    log::error!("Failed to decode JWT header");
                }
                
                // Final fallback
                return extract_user_id_from_token(token);
            }
        }
    }
    // 2. Try session cookie (mostly legacy)
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value());
    }
    Err(ErrorUnauthorized("Missing authorization"))
}
