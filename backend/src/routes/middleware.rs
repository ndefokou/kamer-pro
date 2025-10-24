use actix_web::Error;
use actix_web::error::ErrorUnauthorized;

pub fn extract_user_id_from_token(token: &str) -> Result<i32, Error> {
    // Extract user_id from token format: "token_{uuid}_{user_id}"
    // This is a simple implementation - in production use proper JWT
    log::debug!("Attempting to extract user_id from token: {}", token);
    if let Some(user_id_str) = token.strip_prefix("token_") {
        let parts: Vec<&str> = user_id_str.split('_').collect();
        if let Some(user_id_part) = parts.last() {
            if let Ok(user_id) = user_id_part.parse::<i32>() {
                log::debug!("Successfully extracted user_id: {}", user_id);
                return Ok(user_id);
            }
        }
    }
    log::error!("Invalid token format: {}", token);
    Err(ErrorUnauthorized("Invalid token"))
}
