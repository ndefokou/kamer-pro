use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

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

// Local extract_user_id removed in favor of crate::middleware::auth::extract_user_id

#[post("")]
pub async fn create_report(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    report_data: web::Json<CreateReportRequest>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let result = sqlx::query(
        r#"
        INSERT INTO reports (reporter_id, host_id, listing_id, reason)
        VALUES ($1, $2, $3, $4)
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
