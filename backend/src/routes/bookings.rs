use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Booking {
    pub id: String,
    pub listing_id: String,
    pub guest_id: i32,
    pub check_in: String,
    pub check_out: String,
    pub guests: i32,
    pub total_price: f64,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BookingWithDetails {
    pub booking: Booking,
    pub guest_name: String,
    pub guest_email: String,
    pub listing_title: String,
    pub listing_photo: Option<String>,
    pub listing_city: Option<String>,
    pub listing_country: Option<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

use crate::middleware::auth::extract_user_id_from_token;

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

// ============================================================================
// API Endpoints
// ============================================================================

/// GET /api/bookings/host/today - Get today's reservations for host
#[get("/host/today")]
pub async fn get_today_bookings(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let query = r#"
        SELECT 
            b.*,
            u.username as guest_name,
            u.email as guest_email,
            l.title as listing_title,
            l.city as listing_city,
            l.country as listing_country,
            (SELECT url FROM listing_photos WHERE listing_id = b.listing_id ORDER BY is_cover DESC, display_order LIMIT 1) as listing_photo
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        INNER JOIN users u ON b.guest_id = u.id
        WHERE l.host_id = ?
        AND DATE(b.check_in) = DATE('now')
        ORDER BY b.check_in ASC
    "#;

    match sqlx::query_as::<
        _,
        (
            String,
            String,
            i32,
            String,
            String,
            i32,
            f64,
            String,
            Option<String>,
            Option<String>,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >(query)
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(rows) => {
            let bookings: Vec<BookingWithDetails> = rows
                .into_iter()
                .map(|row| BookingWithDetails {
                    booking: Booking {
                        id: row.0,
                        listing_id: row.1,
                        guest_id: row.2,
                        check_in: row.3,
                        check_out: row.4,
                        guests: row.5,
                        total_price: row.6,
                        status: row.7,
                        created_at: row.8,
                        updated_at: row.9,
                    },
                    guest_name: row.10,
                    guest_email: row.11,
                    listing_title: row.12,
                    listing_city: row.13,
                    listing_country: row.14,
                    listing_photo: row.15,
                })
                .collect();

            HttpResponse::Ok().json(bookings)
        }
        Err(e) => {
            log::error!("Failed to fetch today's bookings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}

/// GET /api/bookings/host/upcoming - Get upcoming reservations for host
#[get("/host/upcoming")]
pub async fn get_upcoming_bookings(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let query = r#"
        SELECT 
            b.*,
            u.username as guest_name,
            u.email as guest_email,
            l.title as listing_title,
            l.city as listing_city,
            l.country as listing_country,
            (SELECT url FROM listing_photos WHERE listing_id = b.listing_id ORDER BY is_cover DESC, display_order LIMIT 1) as listing_photo
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        INNER JOIN users u ON b.guest_id = u.id
        WHERE l.host_id = ?
        AND DATE(b.check_in) > DATE('now')
        ORDER BY b.check_in ASC
    "#;

    match sqlx::query_as::<
        _,
        (
            String,
            String,
            i32,
            String,
            String,
            i32,
            f64,
            String,
            Option<String>,
            Option<String>,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >(query)
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(rows) => {
            let bookings: Vec<BookingWithDetails> = rows
                .into_iter()
                .map(|row| BookingWithDetails {
                    booking: Booking {
                        id: row.0,
                        listing_id: row.1,
                        guest_id: row.2,
                        check_in: row.3,
                        check_out: row.4,
                        guests: row.5,
                        total_price: row.6,
                        status: row.7,
                        created_at: row.8,
                        updated_at: row.9,
                    },
                    guest_name: row.10,
                    guest_email: row.11,
                    listing_title: row.12,
                    listing_city: row.13,
                    listing_country: row.14,
                    listing_photo: row.15,
                })
                .collect();

            HttpResponse::Ok().json(bookings)
        }
        Err(e) => {
            log::error!("Failed to fetch upcoming bookings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}
