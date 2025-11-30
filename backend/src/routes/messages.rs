use actix_web::{get, web, HttpResponse, Responder};
use sqlx::SqlitePool;

#[get("")]
async fn get_messages(_pool: web::Data<SqlitePool>) -> impl Responder {
    // Placeholder implementation
    HttpResponse::Ok().json(serde_json::json!([]))
}

#[get("/unread-count")]
async fn get_unread_count(_pool: web::Data<SqlitePool>) -> impl Responder {
    // Placeholder implementation
    HttpResponse::Ok().json(serde_json::json!({ "count": 0 }))
}

#[get("/templates")]
async fn get_message_templates(_pool: web::Data<SqlitePool>) -> impl Responder {
    // Placeholder implementation
    HttpResponse::Ok().json(serde_json::json!([]))
}
