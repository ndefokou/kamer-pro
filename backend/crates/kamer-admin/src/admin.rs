use crate::reports::Report;
use actix_web::{delete, get, web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Host {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub created_at: String,
    pub listing_count: i32,
}

// Local extract_user_id removed in favor of kamer_auth::extract_user_id

async fn is_admin(pool: &PgPool, user_id: i32) -> bool {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_roles WHERE user_id = $1 AND role = 'admin'")
            .bind(user_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    count > 0
}

#[get("/hosts")]
pub async fn get_hosts(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    if !is_admin(pool.get_ref(), user_id).await {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "Admin access required" }));
    }

    let query_safe = r#"
        SELECT 
            u.id, u.username, u.email, u.created_at,
            (SELECT COUNT(*)::int FROM listings WHERE host_id = u.id) as listing_count
        FROM users u
        WHERE EXISTS (SELECT 1 FROM listings WHERE host_id = u.id)
    "#;

    match sqlx::query_as::<_, Host>(query_safe)
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
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<i32>,
) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    if !is_admin(pool.get_ref(), user_id).await {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "Admin access required" }));
    }

    let host_id = path.into_inner();

    // 0. Delete messages and conversations
    // First delete all messages in conversations involving this user (as host or guest)
    let _ = sqlx::query("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE host_id = $1 OR guest_id = $2)")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // Then delete the conversations themselves
    let _ = sqlx::query("DELETE FROM conversations WHERE host_id = $1 OR guest_id = $2")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 1. Delete reports related to this host
    let _ = sqlx::query("DELETE FROM reports WHERE host_id = $1 OR reporter_id = $2")
        .bind(host_id)
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 2. Delete bookings for the host's listings
    let _ = sqlx::query(
        "DELETE FROM bookings WHERE listing_id IN (SELECT id FROM listings WHERE host_id = $1)",
    )
    .bind(host_id)
    .execute(pool.get_ref())
    .await;

    // 3. Delete listing amenities, photos, videos
    let _ = sqlx::query("DELETE FROM listing_amenities WHERE listing_id IN (SELECT id FROM listings WHERE host_id = $1)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    let _ = sqlx::query("DELETE FROM listing_photos WHERE listing_id IN (SELECT id FROM listings WHERE host_id = $1)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    let _ = sqlx::query("DELETE FROM listing_videos WHERE listing_id IN (SELECT id FROM listings WHERE host_id = $1)")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 4. Delete listings
    let _ = sqlx::query("DELETE FROM listings WHERE host_id = $1")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 5. Delete user roles
    let _ = sqlx::query("DELETE FROM user_roles WHERE user_id = $1")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 6. Delete sessions
    let _ = sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // 7. Delete user profile
    let _ = sqlx::query("DELETE FROM user_profiles WHERE user_id = $1")
        .bind(host_id)
        .execute(pool.get_ref())
        .await;

    // Finally, delete the user
    match sqlx::query("DELETE FROM users WHERE id = $1")
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
pub async fn get_reports(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
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
