use actix_web::{get, put, web, HttpRequest, HttpResponse, Responder};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CalendarPricing {
    pub id: i32,
    pub listing_id: String,
    pub date: chrono::NaiveDate,
    pub price: f64,
    pub is_available: bool,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ListingSettings {
    pub id: i32,
    pub listing_id: String,
    pub base_price: Option<f64>,
    pub weekend_price: Option<f64>,
    pub smart_pricing_enabled: bool,
    pub weekly_discount: f64,
    pub monthly_discount: f64,
    pub min_nights: i32,
    pub max_nights: i32,
    pub advance_notice: String,
    pub same_day_cutoff_time: String,
    pub preparation_time: String,
    pub availability_window: i32,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CalendarQuery {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCalendarDatesRequest {
    pub dates: Vec<String>,
    pub price: Option<f64>,
    pub is_available: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub base_price: Option<f64>,
    pub weekend_price: Option<f64>,
    pub smart_pricing_enabled: Option<bool>,
    pub weekly_discount: Option<f64>,
    pub monthly_discount: Option<f64>,
    pub min_nights: Option<i32>,
    pub max_nights: Option<i32>,
    pub advance_notice: Option<String>,
    pub same_day_cutoff_time: Option<String>,
    pub preparation_time: Option<String>,
    pub availability_window: Option<i32>,
}

// ============================================================================
// Helper Functions
// ============================================================================

// Local extract_user_id removed in favor of crate::middleware::auth::extract_user_id

async fn verify_listing_ownership(
    pool: &PgPool,
    listing_id: &str,
    user_id: i32,
) -> Result<(), HttpResponse> {
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(listing_id)
        .fetch_optional(pool)
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => Ok(()),
        Ok(Some(_)) => Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to modify this listing"
        }))),
        Ok(None) => Err(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        }))),
        Err(e) => Err(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        }))),
    }
}

// ============================================================================
// API Endpoints
// ============================================================================

/// GET /api/calendar/:listing_id - Get calendar data for date range
#[get("/{listing_id}")]
pub async fn get_calendar(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<CalendarQuery>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let listing_id = path.into_inner();

    if let Err(response) = verify_listing_ownership(pool.get_ref(), &listing_id, user_id).await {
        return response;
    }

    // Parse dates
    let start_date = match NaiveDate::parse_from_str(&query.start_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "Invalid start_date format" }))
        }
    };
    let end_date = match NaiveDate::parse_from_str(&query.end_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "Invalid end_date format" }))
        }
    };

    // Fetch calendar pricing for date range
    let query_str = r#"
        SELECT * FROM calendar_pricing
        WHERE listing_id = $1 AND date >= $2 AND date <= $3
        ORDER BY date ASC
    "#;

    match sqlx::query_as::<_, CalendarPricing>(query_str)
        .bind(&listing_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(pricing) => HttpResponse::Ok().json(pricing),
        Err(e) => {
            log::error!("Failed to fetch calendar data: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}

/// PUT /api/calendar/:listing_id/dates - Update pricing/availability for specific dates
#[put("/{listing_id}/dates")]
pub async fn update_calendar_dates(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateCalendarDatesRequest>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let listing_id = path.into_inner();

    if let Err(response) = verify_listing_ownership(pool.get_ref(), &listing_id, user_id).await {
        return response;
    }

    // Get base price from listing or settings
    let base_price: f64 = match sqlx::query_scalar::<_, Option<f64>>(
        "SELECT base_price FROM listing_settings WHERE listing_id = $1",
    )
    .bind(&listing_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(Some(bp)) => bp,
        _ => sqlx::query_scalar::<_, Option<f64>>(
            "SELECT price_per_night FROM listings WHERE id = $1",
        )
        .bind(&listing_id)
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(None)
        .unwrap_or(0.0),
    };

    let price = body.price.unwrap_or(base_price);
    let is_available: bool = body.is_available.unwrap_or(true);

    // Update or insert pricing for each date
    for date_str in &body.dates {
        let date = match NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": format!("Invalid date format: {}", date_str)
                }));
            }
        };

        // If caller did not provide a price, we should not overwrite existing price on update.
        // We still need a price value for inserts; use base price fallback for that.
        let result = if body.price.is_some() {
            // Explicit price provided: upsert both price and availability
            sqlx::query(
                r#"
                INSERT INTO calendar_pricing (listing_id, date, price, is_available, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT(listing_id, date) DO UPDATE SET
                    price = EXCLUDED.price,
                    is_available = EXCLUDED.is_available,
                    updated_at = CURRENT_TIMESTAMP
                "#,
            )
            .bind(&listing_id)
            .bind(date)
            .bind(price)
            .bind(is_available)
            .execute(pool.get_ref())
            .await
        } else {
            // No price provided: only toggle availability on update; keep existing price.
            // On insert, use base price fallback.
            sqlx::query(
                r#"
                INSERT INTO calendar_pricing (listing_id, date, price, is_available, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT(listing_id, date) DO UPDATE SET
                    is_available = EXCLUDED.is_available,
                    updated_at = CURRENT_TIMESTAMP
                "#,
            )
            .bind(&listing_id)
            .bind(date)
            .bind(price)
            .bind(is_available)
            .execute(pool.get_ref())
            .await
        };

        if let Err(e) = result {
            log::error!("Failed to update calendar date {}: {:?}", date_str, e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to update date {}: {}", date_str, e)
            }));
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Calendar dates updated successfully"
    }))
}

/// GET /api/calendar/:listing_id/settings - Get listing settings
#[get("/{listing_id}/settings")]
pub async fn get_settings(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let listing_id = path.into_inner();

    if let Err(response) = verify_listing_ownership(pool.get_ref(), &listing_id, user_id).await {
        return response;
    }

    match sqlx::query_as::<_, ListingSettings>(
        "SELECT * FROM listing_settings WHERE listing_id = $1",
    )
    .bind(&listing_id)
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(settings)) => HttpResponse::Ok().json(settings),
        Ok(None) => {
            // Create default settings
            let result = sqlx::query(
                r#"
                INSERT INTO listing_settings (listing_id)
                VALUES ($1)
                "#,
            )
            .bind(&listing_id)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    // Fetch the newly created settings
                    match sqlx::query_as::<_, ListingSettings>(
                        "SELECT * FROM listing_settings WHERE listing_id = $1",
                    )
                    .bind(&listing_id)
                    .fetch_one(pool.get_ref())
                    .await
                    {
                        Ok(settings) => HttpResponse::Ok().json(settings),
                        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                            "error": format!("Failed to fetch settings: {}", e)
                        })),
                    }
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create settings: {}", e)
                })),
            }
        }
        Err(e) => {
            log::error!("Failed to fetch settings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}

/// PUT /api/calendar/:listing_id/settings - Update listing settings
#[put("/{listing_id}/settings")]
pub async fn update_settings(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateSettingsRequest>,
) -> impl Responder {
    let user_id = match crate::middleware::auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let listing_id = path.into_inner();

    if let Err(response) = verify_listing_ownership(pool.get_ref(), &listing_id, user_id).await {
        return response;
    }

    // Build dynamic update query
    let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
        sqlx::QueryBuilder::new("UPDATE listing_settings SET updated_at = CURRENT_TIMESTAMP");

    if let Some(base_price) = body.base_price {
        query_builder.push(", base_price = ");
        query_builder.push_bind(base_price);
    }
    if let Some(weekend_price) = body.weekend_price {
        query_builder.push(", weekend_price = ");
        query_builder.push_bind(weekend_price);
    }
    if let Some(smart_pricing) = body.smart_pricing_enabled {
        query_builder.push(", smart_pricing_enabled = ");
        query_builder.push_bind(smart_pricing);
    }
    if let Some(weekly_discount) = body.weekly_discount {
        query_builder.push(", weekly_discount = ");
        query_builder.push_bind(weekly_discount);
    }
    if let Some(monthly_discount) = body.monthly_discount {
        query_builder.push(", monthly_discount = ");
        query_builder.push_bind(monthly_discount);
    }
    if let Some(min_nights) = body.min_nights {
        query_builder.push(", min_nights = ");
        query_builder.push_bind(min_nights);
    }
    if let Some(max_nights) = body.max_nights {
        query_builder.push(", max_nights = ");
        query_builder.push_bind(max_nights);
    }
    if let Some(ref advance_notice) = body.advance_notice {
        query_builder.push(", advance_notice = ");
        query_builder.push_bind(advance_notice);
    }
    if let Some(ref cutoff_time) = body.same_day_cutoff_time {
        query_builder.push(", same_day_cutoff_time = ");
        query_builder.push_bind(cutoff_time);
    }
    if let Some(ref prep_time) = body.preparation_time {
        query_builder.push(", preparation_time = ");
        query_builder.push_bind(prep_time);
    }
    if let Some(window) = body.availability_window {
        query_builder.push(", availability_window = ");
        query_builder.push_bind(window);
    }

    query_builder.push(" WHERE listing_id = ");
    query_builder.push_bind(&listing_id);

    match query_builder.build().execute(pool.get_ref()).await {
        Ok(_) => {
            // Fetch updated settings
            match sqlx::query_as::<_, ListingSettings>(
                "SELECT * FROM listing_settings WHERE listing_id = $1",
            )
            .bind(&listing_id)
            .fetch_one(pool.get_ref())
            .await
            {
                Ok(settings) => HttpResponse::Ok().json(settings),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch updated settings: {}", e)
                })),
            }
        }
        Err(e) => {
            log::error!("Failed to update settings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to update settings: {}", e)
            }))
        }
    }
}
