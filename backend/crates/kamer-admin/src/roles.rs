use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct UserRole {
    id: i32,
    user_id: i32,
    role: String,
}

#[derive(Deserialize)]
pub struct SetRolePayload {
    role: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

fn get_user_id_from_headers(req: &HttpRequest) -> Result<i32, actix_web::Error> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token);
            }
        }
    }
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value());
    }
    Err(actix_web::error::ErrorUnauthorized(
        "Missing or invalid authorization",
    ))
}

fn extract_user_id_from_token(token: &str) -> Result<i32, actix_web::Error> {
    if let Some(user_id_str) = token.strip_prefix("token_") {
        if let Some(parts) = user_id_str.rsplit_once('_') {
            if let Ok(user_id) = parts.1.parse::<i32>() {
                return Ok(user_id);
            }
        }
    }
    Err(actix_web::error::ErrorUnauthorized("Invalid token"))
}

#[get("")]
pub async fn get_user_role(req: HttpRequest, pool: web::Data<PgPool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let user_role: Result<UserRole, _> =
        sqlx::query_as("SELECT * FROM user_roles WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    match user_role {
        Ok(user_role) => HttpResponse::Ok().json(user_role),
        Err(_) => HttpResponse::NotFound().json(ErrorResponse {
            message: "Role not found".to_string(),
        }),
    }
}

#[post("")]
pub async fn set_user_role(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    payload: web::Json<SetRolePayload>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    // Check if user already has a role
    let existing_role: Result<Option<UserRole>, _> =
        sqlx::query_as("SELECT * FROM user_roles WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await;

    match existing_role {
        Ok(Some(_)) => {
            // User has a role, update it
            let result = sqlx::query("UPDATE user_roles SET role = $1 WHERE user_id = $2")
                .bind(&payload.role)
                .bind(user_id)
                .execute(pool.get_ref())
                .await;
            match result {
                Ok(_) => {
                    let updated_role: UserRole =
                        sqlx::query_as("SELECT * FROM user_roles WHERE user_id = $1")
                            .bind(user_id)
                            .fetch_one(pool.get_ref())
                            .await
                            .unwrap();
                    HttpResponse::Ok().json(updated_role)
                }
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to update user role".to_string(),
                }),
            }
        }
        Ok(None) => {
            // User does not have a role, insert it
            let result: Result<(i32,), _> = sqlx::query_as(
                "INSERT INTO user_roles (user_id, role) VALUES ($1, $2) RETURNING id",
            )
            .bind(user_id)
            .bind(&payload.role)
            .fetch_one(pool.get_ref())
            .await;

            match result {
                Ok(row) => {
                    let role_id = row.0;
                    let user_role: UserRole =
                        sqlx::query_as("SELECT * FROM user_roles WHERE id = $1")
                            .bind(role_id)
                            .fetch_one(pool.get_ref())
                            .await
                            .unwrap();
                    HttpResponse::Created().json(user_role)
                }
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to set user role".to_string(),
                }),
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to check for user role".to_string(),
        }),
    }
}
