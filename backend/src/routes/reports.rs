use crate::middleware::auth::extract_user_id_from_token;
use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
pub struct CreateReportRequest {
    pub host_id: i32,
    pub listing_id: Option<String>,
    pub reason: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Report {
    pub id: i32,
    pub reporter_id: i32,
    pub host_id: i32,
    pub listing_id: Option<String>,
    pub reason: String,
    pub status: String,
    pub created_at: Option<String>,
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

#[post("")]
pub async fn create_report(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    report_data: web::Json<CreateReportRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let result = sqlx::query(
        r#"
        INSERT INTO reports (reporter_id, host_id, listing_id, reason)
        VALUES (?, ?, ?, ?)
        "#,
    )
    .bind(user_id)
    .bind(report_data.host_id)
    .bind(&report_data.listing_id)
    .bind(&report_data.reason)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created()
            .json(serde_json::json!({ "message": "Report submitted successfully" })),
        Err(e) => {
            log::error!("Failed to create report: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to submit report" }))
        }
    }
}
