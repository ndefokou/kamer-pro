use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder, HttpMessage};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

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

#[get("/roles")]
pub async fn get_user_role(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return HttpResponse::InternalServerError().finish(),
    };

    let user_role: Result<UserRole, _> = sqlx::query_as("SELECT * FROM user_roles WHERE user_id = ?")
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

#[post("/roles")]
pub async fn set_user_role(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<SetRolePayload>,
) -> impl Responder {
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return HttpResponse::InternalServerError().finish(),
    };

    // Check if user already has a role
    let existing_role: Result<UserRole, _> = sqlx::query_as("SELECT * FROM user_roles WHERE user_id = ?")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await;

    if existing_role.is_ok() {
        return HttpResponse::Conflict().json(ErrorResponse {
            message: "User already has a role".to_string(),
        });
    }

    let result = sqlx::query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)")
        .bind(user_id)
        .bind(&payload.role)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            let role_id = res.last_insert_rowid() as i32;
            let user_role: UserRole = sqlx::query_as("SELECT * FROM user_roles WHERE id = ?")
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