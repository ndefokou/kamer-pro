use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use chrono::NaiveDate;
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

#[derive(Debug, Deserialize)]
pub struct CreateBookingRequest {
    pub listing_id: String,
    pub check_in: String,
    pub check_out: String,
    pub guests: i32,
}

#[derive(Debug, Deserialize)]
pub struct DeclineBookingRequest {
    pub reason: String,
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

/// POST /api/bookings - Create a new booking
#[post("")]
pub async fn create_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    booking_data: web::Json<CreateBookingRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let id = uuid::Uuid::new_v4().to_string();

    // Fetch listing price, instant_book, host_id and max_guests
    let listing_info: Option<(f64, i32, i32, i32)> =
        sqlx::query_as(
            "SELECT COALESCE(price_per_night, 0), COALESCE(instant_book, 0), host_id, COALESCE(max_guests, 0) FROM listings WHERE id = ?"
        )
            .bind(&booking_data.listing_id)
            .fetch_optional(pool.get_ref())
            .await
            .unwrap_or(None);

    let (price_per_night, instant_book, host_id, max_guests) = listing_info.unwrap_or((0.0, 0, -1, 0));

    // Forbid booking own listing
    if host_id == user_id {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "You cannot book your own listing" }));
    }

    // Validate guests count
    if booking_data.guests <= 0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": "Guests must be at least 1" }));
    }

    // Enforce maximum guests configured by host
    if max_guests > 0 && booking_data.guests > max_guests {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": format!("Guest count exceeds maximum allowed ({})", max_guests) }));
    }

    // Calculate total price
    let check_in_date = match NaiveDate::parse_from_str(&booking_data.check_in, "%Y-%m-%d") {
        Ok(date) => date,
        Err(_) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "Invalid check-in date format" }))
        }
    };

    let check_out_date = match NaiveDate::parse_from_str(&booking_data.check_out, "%Y-%m-%d") {
        Ok(date) => date,
        Err(_) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "Invalid check-out date format" }))
        }
    };

    let days = (check_out_date - check_in_date).num_days();
    if days <= 0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": "Check-out must be after check-in" }));
    }

    let total_price = price_per_night * days as f64;

    // Check for overlapping bookings
    let overlap_count: i32 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM bookings 
        WHERE listing_id = ? 
        AND status = 'confirmed'
        AND check_in < ? AND check_out > ?
        "#,
    )
    .bind(&booking_data.listing_id)
    .bind(&booking_data.check_out)
    .bind(&booking_data.check_in)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if overlap_count > 0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": "Selected dates are already booked" }));
    }

    let status = if instant_book == 1 {
        "confirmed"
    } else {
        "pending"
    };

    let result = sqlx::query(
        r#"
        INSERT INTO bookings (id, listing_id, guest_id, check_in, check_out, guests, total_price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&booking_data.listing_id)
    .bind(user_id)
    .bind(&booking_data.check_in)
    .bind(&booking_data.check_out)
    .bind(booking_data.guests)
    .bind(total_price)
    .bind(status)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "id": id,
            "status": status,
            "total_price": total_price
        })),
        Err(e) => {
            log::error!("Failed to create booking: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to create booking" }))
        }
    }
}

/// POST /api/bookings/{id}/approve - Approve a booking
#[post("/{id}/approve")]
pub async fn approve_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let booking_id = path.into_inner();

    // Verify host owns the listing
    let is_owner: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.id = ? AND l.host_id = ?
        )
        "#,
    )
    .bind(&booking_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if !is_owner {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You do not have permission to approve this booking"
        }));
    }

    let result = sqlx::query("UPDATE bookings SET status = 'confirmed' WHERE id = ?")
        .bind(&booking_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({ "status": "confirmed" })),
        Err(e) => {
            log::error!("Failed to approve booking: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to approve booking" }))
        }
    }
}

/// POST /api/bookings/{id}/decline - Decline a booking
#[post("/{id}/decline")]
pub async fn decline_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<DeclineBookingRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let booking_id = path.into_inner();

    // Verify host owns the listing and get guest_id/listing_id
    let booking_info: Option<(i32, String)> = sqlx::query_as(
        r#"
        SELECT b.guest_id, b.listing_id
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE b.id = ? AND l.host_id = ?
        "#,
    )
    .bind(&booking_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    .unwrap_or(None);

    let (guest_id, listing_id) = match booking_info {
        Some(info) => info,
        None => {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "error": "You do not have permission to decline this booking"
            }));
        }
    };

    let result = sqlx::query("UPDATE bookings SET status = 'declined' WHERE id = ?")
        .bind(&booking_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Find or create conversation
            let conversation_id = match sqlx::query_scalar::<_, String>(
                "SELECT id FROM conversations WHERE listing_id = ? AND guest_id = ? AND host_id = ?"
            )
            .bind(&listing_id)
            .bind(guest_id)
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await
            .unwrap_or(None) 
            {
                Some(id) => id,
                None => {
                    let new_id = uuid::Uuid::new_v4().to_string();
                    let _ = sqlx::query(
                        "INSERT INTO conversations (id, listing_id, guest_id, host_id) VALUES (?, ?, ?, ?)"
                    )
                    .bind(&new_id)
                    .bind(&listing_id)
                    .bind(guest_id)
                    .bind(user_id)
                    .execute(pool.get_ref())
                    .await;
                    new_id
                }
            };

            // Send decline message
            let message_content = format!("Booking declined: {}", body.reason);
            let message_id = uuid::Uuid::new_v4().to_string();
            
            let _ = sqlx::query(
                "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)"
            )
            .bind(&message_id)
            .bind(&conversation_id)
            .bind(user_id)
            .bind(&message_content)
            .execute(pool.get_ref())
            .await;

            // Update conversation timestamp
            let _ = sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(&conversation_id)
                .execute(pool.get_ref())
                .await;

            HttpResponse::Ok().json(serde_json::json!({ "status": "declined" }))
        },
        Err(e) => {
            log::error!("Failed to decline booking: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to decline booking" }))
        }
    }
}

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
        AND (DATE(b.check_in) = DATE('now') OR b.status = 'pending')
        ORDER BY CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END, b.check_in ASC
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
        AND b.status != 'pending'
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
