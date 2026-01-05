use crate::middleware::auth::extract_user_id_from_token;
use crate::routes::reports::Report;
use actix_web::{delete, get, web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use sqlx::SqlitePool;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Host {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub created_at: String,
    pub listing_count: i32,
}

fn extract_user_id(req: &HttpRequest) -> Result<i32, HttpResponse> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token).map_err(|e| {
                    log::error!("Failed to extract user ID from token: {:?}", e);
                    HttpResponse::Unauthorized().json(serde_json::json!({
                        "error": "Invalid or expired token"
                    }))
                });
            }
        }
    }
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value()).map_err(|e| {
            log::error!("Failed to extract user ID from cookie: {:?}", e);
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired token"
            }))
        });
    }
    Err(HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Missing or invalid authorization header"
    })))
}

async fn is_admin(pool: &SqlitePool, user_id: i32) -> bool {
    let count: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_roles WHERE user_id = ? AND role = 'admin'")
            .bind(user_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    count > 0
}

#[get("/hosts")]
pub async fn get_hosts(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    if !is_admin(pool.get_ref(), user_id).await {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "Admin access required" }));
    }

    let query = r#"
        SELECT 
            u.id, u.username, u.email, u.created_at,
            (SELECT COUNT(*) FROM listings WHERE host_id = u.id) as listing_count
        FROM users u
        WHERE EXISTS (SELECT 1 FROM listings WHERE host_id = u.id)
    "#;

    match sqlx::query_as::<_, Host>(query)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(hosts) => HttpResponse::Ok().json(hosts),
        Err(e) => {
            log::error!("Failed to fetch hosts: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to fetch hosts" }))
        }
    }
}

#[delete("/hosts/{id}")]
pub async fn delete_host(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<i32>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    if !is_admin(pool.get_ref(), user_id).await {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "Admin access required" }));
    }

    let host_id = path.into_inner();

    // Manually delete dependencies to avoid foreign key constraints

    // 0. Delete messages and conversations
    // First delete all messages in conversations involving this user (as host or guest)
    let _ = sqlx::query("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE host_id = ? OR guest_id = ?)")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // Then delete the conversations themselves
    let _ = sqlx::query("DELETE FROM conversations WHERE host_id = ? OR guest_id = ?")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 1. Delete reports related to this host
    let _ = sqlx::query("DELETE FROM reports WHERE host_id = ? OR reporter_id = ?")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 2. Delete bookings for the host's listings
    let _ = sqlx::query(
        "DELETE FROM bookings WHERE listing_id IN (SELECT id FROM listings WHERE host_id = ?)",
    )
    .bind(host_id)
    .execute(pool.get_ref())
    .await;

    // 3. Delete listing amenities, photos, videos
    let _ = sqlx::query("DELETE FROM listing_amenities WHERE listing_id IN (SELECT id FROM listings WHERE host_id = ?)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    let _ = sqlx::query("DELETE FROM listing_photos WHERE listing_id IN (SELECT id FROM listings WHERE host_id = ?)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    let _ = sqlx::query("DELETE FROM listing_videos WHERE listing_id IN (SELECT id FROM listings WHERE host_id = ?)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 4. Delete listings
    let _ = sqlx::query("DELETE FROM listings WHERE host_id = ?")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 5. Delete user roles
    let _ = sqlx::query("DELETE FROM user_roles WHERE user_id = ?")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 6. Delete sessions
    let _ = sqlx::query("DELETE FROM sessions WHERE user_id = ?")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 7. Delete user profile
    let _ = sqlx::query("DELETE FROM user_profiles WHERE user_id = ?")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // Finally, delete the user
    match sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(host_id)
        .execute(pool.get_ref())
        .await
    {
        Ok(_) => {
            HttpResponse::Ok().json(serde_json::json!({ "message": "Host deleted successfully" }))
        }
        Err(e) => {
            log::error!("Failed to delete host: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to delete host" }))
        }
    }
}

#[get("/reports")]
pub async fn get_reports(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    if !is_admin(pool.get_ref(), user_id).await {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "Admin access required" }));
    }

    let query = "SELECT * FROM reports ORDER BY created_at DESC";

    match sqlx::query_as::<_, Report>(query)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(reports) => HttpResponse::Ok().json(reports),
        Err(e) => {
            log::error!("Failed to fetch reports: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to fetch reports" }))
        }
    }
}
