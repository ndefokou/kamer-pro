use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

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

/// GET /api/bookings/my - Get bookings for the authenticated guest (history)
#[derive(Debug, sqlx::FromRow)]
struct BookingRow {
    id: String,
    listing_id: String,
    guest_id: i32,
    check_in: String,
    check_out: String,
    guests: i32,
    total_price: f64,
    status: String,
    created_at: Option<String>,
    updated_at: Option<String>,
    guest_name: String,
    guest_email: String,
    guest_phone: Option<String>,
    listing_title: String,
    listing_city: Option<String>,
    listing_country: Option<String>,
    listing_photo: Option<String>,
}

#[get("/my")]
pub async fn get_my_bookings(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let query = r#"
        SELECT
            b.id, b.listing_id, b.guest_id, b.check_in::TEXT as check_in, b.check_out::TEXT as check_out, b.guests, b.total_price, b.status, b.created_at::TEXT as created_at, b.updated_at::TEXT as updated_at,
            u.username as guest_name,
            u.email as guest_email,
            up.phone as guest_phone,
            l.title as listing_title,
            l.city as listing_city,
            l.country as listing_country,
            (SELECT url FROM listing_photos WHERE listing_id = b.listing_id ORDER BY is_cover DESC, display_order LIMIT 1) as listing_photo
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        INNER JOIN users u ON b.guest_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE b.guest_id = $1
        ORDER BY b.created_at DESC
    "#;

    match sqlx::query_as::<_, BookingRow>(query)
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => {
            let bookings: Vec<BookingWithDetails> = rows
                .into_iter()
                .map(|row| BookingWithDetails {
                    booking: Booking {
                        id: row.id,
                        listing_id: row.listing_id,
                        guest_id: row.guest_id,
                        check_in: row.check_in,
                        check_out: row.check_out,
                        guests: row.guests,
                        total_price: row.total_price,
                        status: row.status,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    },
                    guest_name: row.guest_name,
                    guest_email: row.guest_email,
                    guest_phone: row.guest_phone,
                    listing_title: row.listing_title,
                    listing_city: row.listing_city,
                    listing_country: row.listing_country,
                    listing_photo: row.listing_photo,
                })
                .collect();

            HttpResponse::Ok().json(bookings)
        }
        Err(e) => {
            log::error!("Failed to fetch my bookings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BookingWithDetails {
    pub booking: Booking,
    pub guest_name: String,
    pub guest_email: String,
    pub guest_phone: Option<String>,
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

// Local extract_user_id removed in favor of crate::middleware::auth::extract_user_id

// ============================================================================
// API Endpoints
// ============================================================================

/// POST /api/bookings - Create a new booking
#[post("")]
pub async fn create_booking(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    booking_data: web::Json<CreateBookingRequest>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let id = uuid::Uuid::new_v4().to_string();

    // Fetch listing price, instant_book, host_id and max_guests
    let listing_info_result = sqlx::query_as::<_, (f64, bool, i32, i32)>(
        "SELECT COALESCE(price_per_night, 0), COALESCE(instant_book, FALSE), host_id, COALESCE(max_guests, 0) FROM listings WHERE id = $1"
    )
    .bind(&booking_data.listing_id)
    .fetch_optional(pool.get_ref())
    .await;

    let (price_per_night, instant_book, host_id, max_guests) = match listing_info_result {
        Ok(Some(info)) => info,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({ "error": "Listing not found" }));
        }
        Err(e) => {
            log::error!("Failed to fetch listing info: {:?}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Database error" }));
        }
    };

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
    let overlap_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM bookings
        WHERE listing_id = $1
        AND status = 'confirmed'
        AND check_in < $2 AND check_out > $3
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

    // Check for host-blocked dates (calendar_pricing.is_available = 0) within the requested range
    // We treat the date range as [check_in, check_out) so check_out itself is not counted
    let blocked_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM calendar_pricing
        WHERE listing_id = $1
          AND date >= $2
          AND date < $3
          AND is_available = 0
        "#,
    )
    .bind(&booking_data.listing_id)
    .bind(&booking_data.check_in)
    .bind(&booking_data.check_out)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if blocked_count > 0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": "Selected dates are unavailable" }));
    }

    let status = if instant_book { "confirmed" } else { "pending" };

    let result = sqlx::query(
        r#"
        INSERT INTO bookings (id, listing_id, guest_id, check_in, check_out, guests, total_price, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#
    )
    .bind(&id)
    .bind(&booking_data.listing_id)
    .bind(user_id)
    .bind(check_in_date)
    .bind(check_out_date)
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
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };
    let booking_id = path.into_inner();

    // Verify host owns the listing
    let is_owner: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.id = $1 AND l.host_id = $2
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

    let result = sqlx::query("UPDATE bookings SET status = 'confirmed' WHERE id = $1")
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
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<DeclineBookingRequest>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };
    let booking_id = path.into_inner();

    // Verify host owns the listing and get guest_id/listing_id
    let booking_info: Option<(i32, String)> = sqlx::query_as(
        r#"
        SELECT b.guest_id, b.listing_id
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE b.id = $1 AND l.host_id = $2
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

    let result = sqlx::query("UPDATE bookings SET status = 'declined' WHERE id = $1")
        .bind(&booking_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Find or create conversation
            let conversation_id = match sqlx::query_scalar::<_, String>(
                "SELECT id FROM conversations WHERE listing_id = $1 AND guest_id = $2 AND host_id = $3"
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
                        "INSERT INTO conversations (id, listing_id, guest_id, host_id) VALUES ($1, $2, $3, $4)"
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
                "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES ($1, $2, $3, $4)"
            )
            .bind(&message_id)
            .bind(&conversation_id)
            .bind(user_id)
            .bind(&message_content)
            .execute(pool.get_ref())
            .await;

            // Update conversation timestamp
            let _ = sqlx::query(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            )
            .bind(&conversation_id)
            .execute(pool.get_ref())
            .await;

            HttpResponse::Ok().json(serde_json::json!({ "status": "declined" }))
        }
        Err(e) => {
            log::error!("Failed to decline booking: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to decline booking" }))
        }
    }
}

/// GET /api/bookings/host/today - Get today's reservations for host
#[get("/host/today")]
pub async fn get_today_bookings(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let query = r#"
        SELECT
            b.id, b.listing_id, b.guest_id, b.check_in::TEXT as check_in, b.check_out::TEXT as check_out, b.guests, b.total_price, b.status, b.created_at::TEXT as created_at, b.updated_at::TEXT as updated_at,
            u.username as guest_name,
            u.email as guest_email,
            up.phone as guest_phone,
            l.title as listing_title,
            l.city as listing_city,
            l.country as listing_country,
            (SELECT url FROM listing_photos WHERE listing_id = b.listing_id ORDER BY is_cover DESC, display_order LIMIT 1) as listing_photo
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        INNER JOIN users u ON b.guest_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE l.host_id = $1
        AND (DATE(b.check_in) = DATE('now') OR b.status = 'pending')
        ORDER BY CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END, b.check_in ASC
    "#;

    match sqlx::query_as::<_, BookingRow>(query)
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => {
            let bookings: Vec<BookingWithDetails> = rows
                .into_iter()
                .map(|row| BookingWithDetails {
                    booking: Booking {
                        id: row.id,
                        listing_id: row.listing_id,
                        guest_id: row.guest_id,
                        check_in: row.check_in,
                        check_out: row.check_out,
                        guests: row.guests,
                        total_price: row.total_price,
                        status: row.status,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    },
                    guest_name: row.guest_name,
                    guest_email: row.guest_email,
                    guest_phone: row.guest_phone,
                    listing_title: row.listing_title,
                    listing_city: row.listing_city,
                    listing_country: row.listing_country,
                    listing_photo: row.listing_photo,
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
pub async fn get_upcoming_bookings(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let query = r#"
        SELECT
            b.id, b.listing_id, b.guest_id, b.check_in::TEXT as check_in, b.check_out::TEXT as check_out, b.guests, b.total_price, b.status, b.created_at::TEXT as created_at, b.updated_at::TEXT as updated_at,
            u.username as guest_name,
            u.email as guest_email,
            up.phone as guest_phone,
            l.title as listing_title,
            l.city as listing_city,
            l.country as listing_country,
            (SELECT url FROM listing_photos WHERE listing_id = b.listing_id ORDER BY is_cover DESC, display_order LIMIT 1) as listing_photo
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        INNER JOIN users u ON b.guest_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE l.host_id = $1
        AND DATE(b.check_in) > DATE('now')
        AND b.status != 'pending'
        ORDER BY b.check_in ASC
    "#;

    match sqlx::query_as::<_, BookingRow>(query)
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => {
            let bookings: Vec<BookingWithDetails> = rows
                .into_iter()
                .map(|row| BookingWithDetails {
                    booking: Booking {
                        id: row.id,
                        listing_id: row.listing_id,
                        guest_id: row.guest_id,
                        check_in: row.check_in,
                        check_out: row.check_out,
                        guests: row.guests,
                        total_price: row.total_price,
                        status: row.status,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    },
                    guest_name: row.guest_name,
                    guest_email: row.guest_email,
                    guest_phone: row.guest_phone,
                    listing_title: row.listing_title,
                    listing_city: row.listing_city,
                    listing_country: row.listing_country,
                    listing_photo: row.listing_photo,
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

/// POST /api/bookings/{id}/cancel - Cancel a booking
#[post("/{id}/cancel")]
pub async fn cancel_booking(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };
    let booking_id = path.into_inner();

    // Verify user is the guest of the booking
    let booking_info: Option<(i32, String, String)> = sqlx::query_as(
        r#"
        SELECT guest_id, listing_id, status
        FROM bookings
        WHERE id = $1
        "#,
    )
    .bind(&booking_id)
    .fetch_optional(pool.get_ref())
    .await
    .unwrap_or(None);

    let (guest_id, listing_id, status) = match booking_info {
        Some(info) => info,
        None => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Booking not found"
            }));
        }
    };

    if guest_id != user_id {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You do not have permission to cancel this booking"
        }));
    }

    if status == "cancelled" || status == "declined" {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Booking is already cancelled or declined"
        }));
    }

    let result = sqlx::query("UPDATE bookings SET status = 'cancelled' WHERE id = $1")
        .bind(&booking_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Get host_id
            let host_id: i32 = sqlx::query_scalar("SELECT host_id FROM listings WHERE id = $1")
                .bind(&listing_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap_or(0);

            if host_id != 0 {
                // Find or create conversation
                let conversation_id = match sqlx::query_scalar::<_, String>(
                    "SELECT id FROM conversations WHERE listing_id = $1 AND guest_id = $2 AND host_id = $3"
                )
                .bind(&listing_id)
                .bind(user_id) // guest is user_id
                .bind(host_id)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None)
                {
                    Some(id) => id,
                    None => {
                        let new_id = uuid::Uuid::new_v4().to_string();
                        let _ = sqlx::query(
                            "INSERT INTO conversations (id, listing_id, guest_id, host_id) VALUES ($1, $2, $3, $4)"
                        )
                        .bind(&new_id)
                        .bind(&listing_id)
                        .bind(user_id)
                        .bind(host_id)
                        .execute(pool.get_ref())
                        .await;
                        new_id
                    }
                };

                // Send cancel message
                let message_content = "Booking cancelled by guest.";
                let message_id = uuid::Uuid::new_v4().to_string();

                let _ = sqlx::query(
                    "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES ($1, $2, $3, $4)"
                )
                .bind(&message_id)
                .bind(&conversation_id)
                .bind(user_id)
                .bind(message_content)
                .execute(pool.get_ref())
                .await;

                // Update conversation timestamp
                let _ = sqlx::query(
                    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                )
                .bind(&conversation_id)
                .execute(pool.get_ref())
                .await;
            }

            HttpResponse::Ok().json(serde_json::json!({ "status": "cancelled" }))
        }
        Err(e) => {
            log::error!("Failed to cancel booking: {:?}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Failed to cancel booking" }))
        }
    }
}
