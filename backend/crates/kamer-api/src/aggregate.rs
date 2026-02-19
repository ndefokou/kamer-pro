use actix_web::{get, web, HttpRequest, HttpResponse};
use serde::Serialize;
use sha1::{Digest, Sha1};
use sqlx::PgPool;

#[derive(Serialize, Default)]
pub struct DashboardSummary {
    pub unread_messages: i64,
    pub wishlist_count: i64,
    pub upcoming_bookings: i64,
}

// Local extract_user_id removed in favor of kamer_auth::extract_user_id

#[get("/v1/dashboard-summary")]
pub async fn dashboard_summary(pool: web::Data<PgPool>, req: HttpRequest) -> HttpResponse {
    let user_id = kamer_auth::extract_user_id(&req, pool.get_ref()).await.ok();

    let Some(user_id) = user_id else {
        // Anonymous users get empty summary (cacheable)
        let body = DashboardSummary::default();
        let json = match serde_json::to_vec(&body) {
            Ok(v) => v,
            Err(_) => Vec::new(),
        };
        let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
        if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
            if tag.to_str().ok() == Some(etag.as_str()) {
                return HttpResponse::NotModified().finish();
            }
        }
        return HttpResponse::Ok()
            .insert_header((actix_web::http::header::ETAG, etag))
            .insert_header(("Cache-Control", "public, max-age=60"))
            .json(body);
    };

    let unread_fut = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND is_read = FALSE",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref());

    let wishlist_fut =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM wishlist WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(pool.get_ref());

    let upcoming_fut = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM bookings WHERE guest_id = $1 AND status = 'confirmed' AND check_in >= CURRENT_DATE",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref());

    let (unread_messages, wishlist_count, upcoming_bookings) =
        match tokio::join!(unread_fut, wishlist_fut, upcoming_fut) {
            (Ok(u), Ok(w), Ok(b)) => (u, w, b),
            _ => (0, 0, 0),
        };

    let summary = DashboardSummary {
        unread_messages,
        wishlist_count,
        upcoming_bookings,
    };

    let accept = req
        .headers()
        .get(actix_web::http::header::ACCEPT)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
        if let Ok(bytes) = rmp_serde::to_vec(&summary) {
            let etag = format!("\"{}\"", hex::encode(Sha1::digest(&bytes)));
            if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
                if tag.to_str().ok() == Some(etag.as_str()) {
                    return HttpResponse::NotModified().finish();
                }
            }
            return HttpResponse::Ok()
                .insert_header((
                    actix_web::http::header::CONTENT_TYPE,
                    "application/x-msgpack",
                ))
                .insert_header((actix_web::http::header::ETAG, etag))
                .insert_header(("Cache-Control", "public, max-age=60"))
                .body(bytes);
        }
    }

    let json = serde_json::to_vec(&summary).unwrap_or_default();
    let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
    if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
        if tag.to_str().ok() == Some(etag.as_str()) {
            return HttpResponse::NotModified().finish();
        }
    }
    HttpResponse::Ok()
        .insert_header((actix_web::http::header::ETAG, etag))
        .insert_header(("Cache-Control", "public, max-age=60"))
        .json(summary)
}

#[get("/health")]
pub async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({ "status": "ok" }))
}
