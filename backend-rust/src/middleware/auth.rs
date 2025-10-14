use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web::error::ErrorUnauthorized;

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

pub fn get_user_id_from_request(req: &ServiceRequest) -> Result<i32, Error> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token);
            }
        }
    }
    Err(ErrorUnauthorized("Missing or invalid authorization header"))
}