use actix_web::error::ErrorUnauthorized;
use actix_web::{dev::ServiceRequest, Error};

pub fn extract_user_id_from_token(token: &str) -> Result<i32, Error> {
    // Extract user_id from token format: "token_{uuid}_{user_id}"
    // This is a simple implementation - in production use proper JWT
    if let Some(user_id_str) = token.strip_prefix("token_") {
        if let Some(parts) = user_id_str.rsplit_once('_') {
            if let Ok(user_id) = parts.1.parse::<i32>() {
                return Ok(user_id);
            }
        }
    }
    Err(ErrorUnauthorized("Invalid token"))
}
