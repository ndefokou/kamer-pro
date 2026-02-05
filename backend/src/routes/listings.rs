use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Listing {
    pub id: String,
    pub host_id: i32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub property_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latitude: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub longitude: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price_per_night: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cleaning_fee: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_guests: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bedrooms: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub beds: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bathrooms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instant_book: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_nights: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_nights: Option<i32>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub safety_devices: Option<String>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub house_rules: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<chrono::NaiveDateTime>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancellation_policy: Option<String>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub getting_around: Option<String>,
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenic_views: Option<String>,
}

// ============================================================================
// Aggregation: Dashboard summary
// ============================================================================
#[derive(Debug, Serialize, Default)]
pub struct DashboardSummary {
    pub unread_messages: i64,
    pub wishlist_count: i64,
    pub upcoming_bookings: i64,
}

/// GET /api/v1/dashboard-summary
#[get("/v1/dashboard-summary")]
pub async fn dashboard_summary(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    // Anonymous users: empty, cacheable
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(_) => {
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
                .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                .json(body);
        }
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
                .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
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
        .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
        .json(summary)
}

#[derive(Debug, Deserialize)]
pub struct PageParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/listings/{id}/reviews - List reviews for a listing (with usernames)
#[get("/{id}/reviews")]
pub async fn get_reviews(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let listing_id = path.into_inner();

    let query = r#"
        SELECT r.id, r.listing_id, r.guest_id, r.ratings, r.comment, r.created_at,
               u.username as username,
               p.avatar as avatar
        FROM reviews r
        LEFT JOIN users u ON u.id = r.guest_id
        LEFT JOIN user_profiles p ON p.user_id = r.guest_id
        WHERE r.listing_id = $1
        ORDER BY r.created_at DESC
    "#;

    match sqlx::query_as::<_, ReviewRow>(query)
        .bind(listing_id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => {
            let accept = req
                .headers()
                .get(actix_web::http::header::ACCEPT)
                .and_then(|h| h.to_str().ok())
                .unwrap_or("");

            // Serialize as JSON by default, or MessagePack if client accepts it
            if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
                match rmp_serde::to_vec(&rows) {
                    Ok(bytes) => {
                        let etag = format!("\"{}\"", hex::encode(Sha1::digest(&bytes)));
                        if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH)
                        {
                            if tag.to_str().ok() == Some(etag.as_str()) {
                                return HttpResponse::NotModified().finish();
                            }
                        }
                        HttpResponse::Ok()
                            .insert_header((
                                actix_web::http::header::CONTENT_TYPE,
                                "application/x-msgpack",
                            ))
                            .insert_header((actix_web::http::header::ETAG, etag))
                            .body(bytes)
                    }
                    Err(e) => {
                        log::error!("msgpack serialize error: {:?}", e);
                        HttpResponse::Ok().json(rows)
                    }
                }
            } else {
                let json = match serde_json::to_vec(&rows) {
                    Ok(v) => v,
                    Err(_) => Vec::new(),
                };
                let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
                if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
                    if tag.to_str().ok() == Some(etag.as_str()) {
                        return HttpResponse::NotModified().finish();
                    }
                }
                HttpResponse::Ok()
                    .insert_header((actix_web::http::header::ETAG, etag))
                    .json(rows)
            }
        }
        Err(e) => {
            log::error!("Failed to fetch reviews: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }))
        }
    }
}

/// POST /api/listings/{id}/reviews - Create a review for a listing
#[post("/{id}/reviews")]
pub async fn add_review(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<CreateReviewRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();
    // Prevent duplicate review from the same user for the same listing
    match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM reviews WHERE listing_id = $1 AND guest_id = $2 LIMIT 1",
    )
    .bind(&listing_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(_)) => {
            return HttpResponse::Conflict().json(serde_json::json!({
                "error": "You have already reviewed this listing"
            }));
        }
        Ok(None) => {}
        Err(e) => {
            log::error!("Failed to check existing review: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    }
    let ratings_json = body.ratings.to_string();

    let insert = sqlx::query(
        "INSERT INTO reviews (listing_id, guest_id, ratings, comment) VALUES ($1, $2, $3, $4) RETURNING id",
    )
    .bind(&listing_id)
    .bind(user_id)
    .bind(&ratings_json)
    .bind(&body.comment)
    .fetch_one(pool.get_ref())
    .await;

    let result = match insert {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("{:?}", e);
            if msg.contains("UNIQUE") {
                return HttpResponse::Conflict().json(serde_json::json!({
                    "error": "You have already reviewed this listing"
                }));
            }
            log::error!("Failed to insert review: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to save review"
            }));
        }
    };

    let new_id: i32 = sqlx::Row::get(&result, "id");

    let select = r#"
        SELECT r.id, r.listing_id, r.guest_id, r.ratings, r.comment, r.created_at,
               u.username as username,
               p.avatar as avatar
        FROM reviews r
        LEFT JOIN users u ON u.id = r.guest_id
        LEFT JOIN user_profiles p ON p.user_id = r.guest_id
        WHERE r.id = $1
    "#;

    match sqlx::query_as::<_, ReviewRow>(select)
        .bind(new_id)
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(row) => HttpResponse::Ok().json(row),
        Err(e) => {
            log::error!("Failed to read inserted review: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to load saved review"
            }))
        }
    }
}

/// GET /api/listings/host/{id} - Get host's published listings (paginated, lightweight)
#[get("/host/{id}")]
pub async fn get_host_listings(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<i32>,
    query: web::Query<PageParams>,
) -> impl Responder {
    let started = std::time::Instant::now();
    let host_id = path.into_inner();

    let mut qb: sqlx::QueryBuilder<sqlx::Postgres> =
        sqlx::QueryBuilder::new("SELECT * FROM listings WHERE status = 'published' AND host_id = ");
    qb.push_bind(host_id);
    qb.push(" ORDER BY created_at DESC");

    let mut limit = query.limit.unwrap_or(20);
    if limit < 1 {
        limit = 1;
    }
    if limit > 100 {
        limit = 100;
    }
    let offset = query.offset.unwrap_or(0).max(0);
    qb.push(" LIMIT ");
    qb.push_bind(limit);
    if offset > 0 {
        qb.push(" OFFSET ");
        qb.push_bind(offset);
    }

    let listings = match qb
        .build_query_as::<Listing>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }));
        }
    };

    if listings.is_empty() {
        return HttpResponse::Ok().json(Vec::<ListingWithDetails>::new());
    }

    // Batch top photos per listing
    let ids: Vec<String> = listings.iter().map(|l| l.id.clone()).collect();
    let photo_rows = match sqlx::query_as::<_, ListingPhoto>(
        r#"
        WITH ranked AS (
            SELECT id, listing_id, url, caption, room_type, COALESCE(is_cover, FALSE) as is_cover, COALESCE(display_order, 0) as display_order, uploaded_at,
                   ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY COALESCE(is_cover, FALSE) DESC, COALESCE(display_order, 0), id) AS rn
            FROM listing_photos
            WHERE listing_id = ANY($1)
        )
        SELECT id, listing_id, url, caption, room_type, is_cover, display_order, uploaded_at
        FROM ranked
        WHERE rn <= 4
        ORDER BY listing_id, rn
        "#,
    )
    .bind(&ids)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to load photos: {}", e)
            }));
        }
    };

    let mut photos_map: HashMap<String, Vec<ListingPhoto>> = HashMap::new();
    for p in photo_rows.into_iter() {
        photos_map.entry(p.listing_id.clone()).or_default().push(p);
    }

    // Fetch host profile once
    let profile_row = sqlx::query("SELECT phone, avatar FROM user_profiles WHERE user_id = $1")
        .bind(host_id)
        .fetch_optional(pool.get_ref())
        .await
        .ok()
        .flatten();
    let (contact_phone, host_avatar): (Option<String>, Option<String>) =
        if let Some(row) = profile_row {
            (
                sqlx::Row::get(&row, "phone"),
                sqlx::Row::get(&row, "avatar"),
            )
        } else {
            (None, None)
        };

    let mut out: Vec<ListingWithDetails> = Vec::with_capacity(listings.len());
    for l in listings {
        let sid = l.id.clone();
        let safety_items: Vec<String> = l
            .safety_devices
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        out.push(ListingWithDetails {
            listing: l,
            amenities: Vec::new(),
            photos: photos_map.remove(&sid).unwrap_or_default(),
            videos: Vec::new(),
            safety_items,
            unavailable_dates: Vec::new(),
            contact_phone: contact_phone.clone(),
            host_avatar: host_avatar.clone(),
            host_username: None,
        });
    }

    // Content negotiation + ETag for better caching over slow networks
    let accept = req
        .headers()
        .get(actix_web::http::header::ACCEPT)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
        if let Ok(bytes) = rmp_serde::to_vec(&out) {
            let etag = format!("\"{}\"", hex::encode(Sha1::digest(&bytes)));
            if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
                if tag.to_str().ok() == Some(etag.as_str()) {
                    log::info!(
                        "get_host_listings latency_ms={} (304)",
                        started.elapsed().as_millis()
                    );
                    return HttpResponse::NotModified().finish();
                }
            }
            log::info!(
                "get_host_listings latency_ms={}",
                started.elapsed().as_millis()
            );
            return HttpResponse::Ok()
                .insert_header((
                    actix_web::http::header::CONTENT_TYPE,
                    "application/x-msgpack",
                ))
                .insert_header((actix_web::http::header::ETAG, etag))
                .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                .body(bytes);
        }
    }

    let json = serde_json::to_vec(&out).unwrap_or_default();
    let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
    if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
        if tag.to_str().ok() == Some(etag.as_str()) {
            log::info!(
                "get_host_listings latency_ms={} (304)",
                started.elapsed().as_millis()
            );
            return HttpResponse::NotModified().finish();
        }
    }
    log::info!(
        "get_host_listings latency_ms={}",
        started.elapsed().as_millis()
    );
    HttpResponse::Ok()
        .insert_header((actix_web::http::header::ETAG, etag))
        .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
        .body(json)
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct UnavailableDateRange {
    pub check_in: chrono::NaiveDate,
    pub check_out: chrono::NaiveDate,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListingWithDetails {
    pub listing: Listing,
    pub amenities: Vec<String>,
    pub photos: Vec<ListingPhoto>,
    pub videos: Vec<ListingVideo>,
    pub safety_items: Vec<String>,
    pub unavailable_dates: Vec<UnavailableDateRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contact_phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_avatar: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ListingPhoto {
    pub id: i32,
    pub listing_id: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caption: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub room_type: Option<String>,
    pub is_cover: bool,
    pub display_order: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uploaded_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ListingVideo {
    pub id: i32,
    pub listing_id: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uploaded_at: Option<chrono::NaiveDateTime>,
}

// Reviews
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewRow {
    pub id: i32,
    pub listing_id: String,
    pub guest_id: i32,
    pub ratings: Option<String>,
    pub comment: Option<String>,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReviewRequest {
    pub ratings: serde_json::Value,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ListingAmenity {
    pub id: i32,
    pub listing_id: String,
    pub amenity_type: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateListingRequest {
    pub property_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateListingRequest {
    pub property_type: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub price_per_night: Option<f64>,
    pub currency: Option<String>,
    pub cleaning_fee: Option<f64>,
    pub max_guests: Option<i32>,
    pub bedrooms: Option<i32>,
    pub beds: Option<i32>,
    pub bathrooms: Option<f64>,
    pub instant_book: Option<bool>,
    pub min_nights: Option<i32>,

    pub max_nights: Option<i32>,
    pub house_rules: Option<String>,
    pub safety_items: Option<Vec<String>>,
    pub cancellation_policy: Option<String>,
    pub getting_around: Option<String>,
    pub scenic_views: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct AddAmenitiesRequest {
    pub amenities: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncPhotosRequest {
    pub photos: Vec<AddPhotoRequest>,
}

#[derive(Debug, Deserialize)]
pub struct AddPhotoRequest {
    pub url: String,
    pub caption: Option<String>,
    pub room_type: Option<String>,
    pub is_cover: Option<bool>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct AddVideoRequest {
    pub url: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ListingFilters {
    pub search: Option<String>,
    pub category: Option<String>,
    pub location: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub guests: Option<i32>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CityCount {
    pub city: String,
    pub count: i64,
}

#[get("/towns")]
pub async fn get_towns(pool: web::Data<PgPool>) -> impl Responder {
    let result = sqlx::query_as::<_, CityCount>(
        "SELECT city as city, COUNT(*) as count
         FROM listings
         WHERE status = 'published' AND city IS NOT NULL AND TRIM(city) != ''
         GROUP BY city
         ORDER BY count DESC",
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(rows) => HttpResponse::Ok()
            .insert_header((
                "Cache-Control",
                "public, max-age=300, stale-while-revalidate=600",
            ))
            .json(rows),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
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

async fn get_listing_with_details(
    pool: &PgPool,
    listing_id: &str,
) -> Result<ListingWithDetails, sqlx::Error> {
    // Get listing
    let listing = sqlx::query_as::<_, Listing>("SELECT * FROM listings WHERE id = $1")
        .bind(listing_id)
        .fetch_one(pool)
        .await?;

    // Run sub-queries in parallel to minimize total latency
    let amenities_fut = sqlx::query_as::<_, ListingAmenity>(
        "SELECT * FROM listing_amenities WHERE listing_id = $1",
    )
    .bind(listing_id)
    .fetch_all(pool);

    let photos_fut = sqlx::query_as::<_, ListingPhoto>(
        "SELECT id, listing_id, url, caption, room_type, COALESCE(is_cover, FALSE) as is_cover, COALESCE(display_order, 0) as display_order, uploaded_at FROM listing_photos WHERE listing_id = $1 ORDER BY is_cover DESC, display_order, id",
    )
    .bind(listing_id)
    .fetch_all(pool);

    let videos_fut =
        sqlx::query_as::<_, ListingVideo>("SELECT * FROM listing_videos WHERE listing_id = $1")
            .bind(listing_id)
            .fetch_all(pool);

    // Optimized unavailable dates query with date range limit (1 year ahead)
    let unavailable_fut = sqlx::query_as::<_, UnavailableDateRange>(
        r#"
        SELECT check_in, check_out
        FROM bookings
        WHERE listing_id = $1 
          AND status = 'confirmed' 
          AND check_out >= CURRENT_DATE
          AND check_in <= CURRENT_DATE + INTERVAL '1 year'
        UNION ALL
        SELECT date AS check_in, (date + INTERVAL '1 day')::date AS check_out
        FROM calendar_pricing
        WHERE listing_id = $1 
          AND is_available = FALSE 
          AND date >= CURRENT_DATE
          AND date <= CURRENT_DATE + INTERVAL '1 year'
        "#,
    )
    .bind(listing_id)
    .fetch_all(pool);

    let profile_fut = sqlx::query(
        "SELECT u.username as username, p.phone as phone, p.avatar as avatar FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1",
    )
    .bind(listing.host_id)
    .fetch_optional(pool);

    let amenities_rows = amenities_fut.await?;
    let photos = photos_fut.await?;
    let videos = videos_fut.await?;
    let unavailable_dates = unavailable_fut.await?;
    let profile_row = profile_fut.await?;

    let amenities: Vec<String> = amenities_rows.into_iter().map(|a| a.amenity_type).collect();
    let (host_username, contact_phone, host_avatar): (
        Option<String>,
        Option<String>,
        Option<String>,
    ) = if let Some(row) = profile_row {
        (
            sqlx::Row::get(&row, "username"),
            sqlx::Row::get(&row, "phone"),
            sqlx::Row::get(&row, "avatar"),
        )
    } else {
        (None, None, None)
    };

    // Parse safety items
    let safety_items: Vec<String> = listing
        .safety_devices
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    Ok(ListingWithDetails {
        listing,
        amenities,
        photos,
        videos,
        safety_items,
        unavailable_dates,
        contact_phone,
        host_avatar,
        host_username,
    })
}

fn validate_listing_for_publish(listing: &Listing) -> Result<(), String> {
    if listing.title.is_none() || listing.title.as_ref().unwrap().trim().len() < 5 {
        let title_len = listing.title.as_ref().map(|t| t.len()).unwrap_or(0);
        log::warn!("Title validation failed: length = {}", title_len);
        return Err("Title must be at least 5 characters".to_string());
    }

    if listing.description.is_none() || listing.description.as_ref().unwrap().trim().len() < 20 {
        let desc_len = listing.description.as_ref().map(|d| d.len()).unwrap_or(0);
        log::warn!("Description validation failed: length = {}", desc_len);
        return Err("Description must be at least 20 characters".to_string());
    }

    if listing.price_per_night.is_none() || listing.price_per_night.unwrap() <= 0.0 {
        log::warn!("Price validation failed: {:?}", listing.price_per_night);
        return Err("Price per night must be greater than 0".to_string());
    }

    if listing.max_guests.is_none() || listing.max_guests.unwrap() < 1 {
        log::warn!("Max guests validation failed: {:?}", listing.max_guests);
        return Err("Max guests must be at least 1".to_string());
    }

    log::info!("Listing validation passed for listing {}", listing.id);
    Ok(())
}

// ============================================================================
// API Endpoints
// ============================================================================

/// POST /api/listings - Create new draft listing
#[post("")]
pub async fn create_listing(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<CreateListingRequest>,
) -> impl Responder {
    let started = std::time::Instant::now();
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Ensure user exists: attempt insert and ignore if already present
    if let Err(e) = sqlx::query(
        "INSERT INTO users (id, username, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
    )
    .bind(user_id)
    .bind(format!("host_{}", user_id))
    .bind(format!("host_{}@mboamaison.com", user_id))
    .execute(pool.get_ref())
    .await
    {
        log::error!("Failed to upsert user {}: {:?}", user_id, e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Database error while ensuring user"
        }));
    }

    let listing_id = Uuid::new_v4().to_string();

    log::debug!(
        "Creating listing with id: {}, user_id: {}",
        listing_id,
        user_id
    );

    let result = sqlx::query(
        "INSERT INTO listings (id, host_id, status, property_type) VALUES ($1, $2, 'draft', $3)",
    )
    .bind(&listing_id)
    .bind(user_id)
    .bind(&body.property_type)
    .execute(pool.get_ref())
    .await;

    let resp = match result {
        Ok(_) => {
            log::debug!("Listing created successfully, returning minimal payload");
            let r = HttpResponse::Ok().json(serde_json::json!({
                "id": listing_id,
                "status": "draft",
                "host_id": user_id,
            }));
            r
        }
        Err(e) => {
            log::error!("Failed to create listing: {:?}", e);
            let r = HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create listing: {}", e)
            }));
            r
        }
    };
    log::info!(
        "create_listing latency_ms={}",
        started.elapsed().as_millis()
    );
    resp
}

/// GET /api/listings/:id - Get listing details
#[get("/{id}")]
pub async fn get_listing(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let listing_id = path.into_inner();

    // Check cache first
    if let Some(cached) = listing_cache.get(&listing_id).await {
        log::info!("Cache hit for listing {}", listing_id);
        let accept = req
            .headers()
            .get(actix_web::http::header::ACCEPT)
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");

        if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
            if let Ok(bytes) = rmp_serde::to_vec(&cached) {
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
                    .body(bytes);
            }
        }
        let json = serde_json::to_vec(&cached).unwrap_or_default();
        let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
        if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
            if tag.to_str().ok() == Some(etag.as_str()) {
                return HttpResponse::NotModified().finish();
            }
        }
        return HttpResponse::Ok()
            .insert_header((actix_web::http::header::ETAG, etag))
            .json(cached);
    }

    match get_listing_with_details(pool.get_ref(), &listing_id).await {
        Ok(listing) => {
            // Cache the result
            listing_cache
                .insert(listing_id.clone(), listing.clone())
                .await;
            let accept = req
                .headers()
                .get(actix_web::http::header::ACCEPT)
                .and_then(|h| h.to_str().ok())
                .unwrap_or("");
            if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
                match rmp_serde::to_vec(&listing) {
                    Ok(bytes) => {
                        let etag = format!("\"{}\"", hex::encode(Sha1::digest(&bytes)));
                        if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH)
                        {
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
                            .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                            .body(bytes);
                    }
                    Err(e) => {
                        log::error!("msgpack serialize error: {:?}", e);
                    }
                }
            }
            let json = serde_json::to_vec(&listing).unwrap_or_default();
            let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
            if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
                if tag.to_str().ok() == Some(etag.as_str()) {
                    return HttpResponse::NotModified().finish();
                }
            }
            HttpResponse::Ok()
                .insert_header((actix_web::http::header::ETAG, etag))
                .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                .json(listing)
        }
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// PUT /api/listings/:id - Update listing (autosave)
#[put("/{id}")]
pub async fn update_listing(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    listing_list_cache: web::Data<Cache<String, Vec<ListingWithDetails>>>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateListingRequest>,
) -> impl Responder {
    let started = std::time::Instant::now();
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Build dynamic update query using QueryBuilder to prevent SQL injection
            let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
                sqlx::QueryBuilder::new("UPDATE listings SET updated_at = CURRENT_TIMESTAMP");

            if let Some(ref property_type) = body.property_type {
                query_builder.push(", property_type = ");
                query_builder.push_bind(property_type);
            }
            if let Some(ref title) = body.title {
                query_builder.push(", title = ");
                query_builder.push_bind(title);
            }
            if let Some(ref description) = body.description {
                query_builder.push(", description = ");
                query_builder.push_bind(description);
            }
            if let Some(ref address) = body.address {
                query_builder.push(", address = ");
                query_builder.push_bind(address);
            }
            if let Some(ref city) = body.city {
                query_builder.push(", city = ");
                query_builder.push_bind(city);
            }
            if let Some(ref country) = body.country {
                query_builder.push(", country = ");
                query_builder.push_bind(country);
            }
            if let Some(latitude) = body.latitude {
                query_builder.push(", latitude = ");
                query_builder.push_bind(latitude);
            }
            if let Some(longitude) = body.longitude {
                query_builder.push(", longitude = ");
                query_builder.push_bind(longitude);
            }
            if let Some(price) = body.price_per_night {
                query_builder.push(", price_per_night = ");
                query_builder.push_bind(price);
            }
            if let Some(ref currency) = body.currency {
                query_builder.push(", currency = ");
                query_builder.push_bind(currency);
            }
            if let Some(cleaning_fee) = body.cleaning_fee {
                query_builder.push(", cleaning_fee = ");
                query_builder.push_bind(cleaning_fee);
            }
            if let Some(max_guests) = body.max_guests {
                query_builder.push(", max_guests = ");
                query_builder.push_bind(max_guests);
            }
            if let Some(bedrooms) = body.bedrooms {
                query_builder.push(", bedrooms = ");
                query_builder.push_bind(bedrooms);
            }
            if let Some(beds) = body.beds {
                query_builder.push(", beds = ");
                query_builder.push_bind(beds);
            }
            if let Some(bathrooms) = body.bathrooms {
                query_builder.push(", bathrooms = ");
                query_builder.push_bind(bathrooms);
            }
            if let Some(instant_book) = body.instant_book {
                query_builder.push(", instant_book = ");
                query_builder.push_bind(instant_book);
            }
            if let Some(min_nights) = body.min_nights {
                query_builder.push(", min_nights = ");
                query_builder.push_bind(min_nights);
            }
            if let Some(max_nights) = body.max_nights {
                query_builder.push(", max_nights = ");
                query_builder.push_bind(max_nights);
            }

            if let Some(ref house_rules) = body.house_rules {
                query_builder.push(", house_rules = ");
                query_builder.push_bind(house_rules);
            }
            if let Some(ref safety_items) = body.safety_items {
                let json = serde_json::to_string(safety_items).unwrap_or_default();
                query_builder.push(", safety_devices = ");
                query_builder.push_bind(json);
            }
            if let Some(ref cancellation_policy) = body.cancellation_policy {
                query_builder.push(", cancellation_policy = ");
                query_builder.push_bind(cancellation_policy);
            }
            if let Some(ref getting_around) = body.getting_around {
                query_builder.push(", getting_around = ");
                query_builder.push_bind(getting_around);
            }
            if let Some(ref scenic_views) = body.scenic_views {
                let json = serde_json::to_string(scenic_views).unwrap_or_default();
                query_builder.push(", scenic_views = ");
                query_builder.push_bind(json);
            }

            query_builder.push(" WHERE id = ");
            query_builder.push_bind(&listing_id);

            let result = match query_builder.build().execute(pool.get_ref()).await {
                Ok(_) => {
                    // Invalidate cache
                    listing_cache.invalidate(&listing_id).await;
                    listing_list_cache.invalidate_all();
                    HttpResponse::Ok().json(serde_json::json!({
                        "id": listing_id,
                        "updated": true
                    }))
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to update listing: {}", e)
                })),
            };
            log::info!(
                "update_listing latency_ms={}",
                started.elapsed().as_millis()
            );
            result
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to update this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// DELETE /api/listings/:id - Delete listing
#[delete("/{id}")]
pub async fn delete_listing(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    listing_list_cache: web::Data<Cache<String, Vec<ListingWithDetails>>>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            match sqlx::query("DELETE FROM listings WHERE id = $1")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await
            {
                Ok(_) => {
                    listing_cache.invalidate(&listing_id).await;
                    listing_list_cache.invalidate_all();
                    HttpResponse::Ok().json(serde_json::json!({
                        "message": "Listing deleted successfully"
                    }))
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to delete listing: {}", e)
                })),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to delete this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// GET /api/listings/my-listings - Get my listings (paginated, lightweight)
#[get("/my-listings")]
pub async fn get_my_listings(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<PageParams>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let started = std::time::Instant::now();
    let mut qb: sqlx::QueryBuilder<sqlx::Postgres> =
        sqlx::QueryBuilder::new("SELECT * FROM listings WHERE host_id = ");
    qb.push_bind(user_id);
    qb.push(" ORDER BY created_at DESC");

    let mut limit = query.limit.unwrap_or(50);
    if limit < 1 {
        limit = 1;
    }
    if limit > 200 {
        limit = 200;
    }
    let offset = query.offset.unwrap_or(0).max(0);
    qb.push(" LIMIT ");
    qb.push_bind(limit);
    if offset > 0 {
        qb.push(" OFFSET ");
        qb.push_bind(offset);
    }

    let listings = match qb
        .build_query_as::<Listing>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }));
        }
    };

    if listings.is_empty() {
        return HttpResponse::Ok().json(Vec::<ListingWithDetails>::new());
    }

    // Batch top photos per listing
    let ids: Vec<String> = listings.iter().map(|l| l.id.clone()).collect();
    let photo_rows = match sqlx::query_as::<_, ListingPhoto>(
        r#"
        WITH ranked AS (
            SELECT id, listing_id, url, caption, room_type, COALESCE(is_cover, FALSE) as is_cover, COALESCE(display_order, 0) as display_order, uploaded_at,
                   ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY COALESCE(is_cover, FALSE) DESC, COALESCE(display_order, 0), id) AS rn
            FROM listing_photos
            WHERE listing_id = ANY($1)
        )
        SELECT id, listing_id, url, caption, room_type, is_cover, display_order, uploaded_at
        FROM ranked
        WHERE rn <= 4
        ORDER BY listing_id, rn
        "#,
    )
    .bind(&ids)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to load photos: {}", e)
            }));
        }
    };

    let mut photos_map: HashMap<String, Vec<ListingPhoto>> = HashMap::new();
    for p in photo_rows.into_iter() {
        photos_map.entry(p.listing_id.clone()).or_default().push(p);
    }

    // Fetch host profile once
    let profile_row = sqlx::query("SELECT phone, avatar FROM user_profiles WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
        .ok()
        .flatten();
    let (contact_phone, host_avatar): (Option<String>, Option<String>) =
        if let Some(row) = profile_row {
            (
                sqlx::Row::get(&row, "phone"),
                sqlx::Row::get(&row, "avatar"),
            )
        } else {
            (None, None)
        };

    let mut out: Vec<ListingWithDetails> = Vec::with_capacity(listings.len());
    for l in listings {
        let sid = l.id.clone();
        let safety_items: Vec<String> = l
            .safety_devices
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        out.push(ListingWithDetails {
            listing: l,
            amenities: Vec::new(),
            photos: photos_map.remove(&sid).unwrap_or_default(),
            videos: Vec::new(),
            safety_items,
            unavailable_dates: Vec::new(),
            contact_phone: contact_phone.clone(),
            host_avatar: host_avatar.clone(),
            host_username: None,
        });
    }

    let resp = HttpResponse::Ok().json(out);
    log::info!(
        "get_my_listings latency_ms={}",
        started.elapsed().as_millis()
    );
    resp
}

/// POST /api/listings/:id/publish - Publish listing
#[post("/{id}/publish")]
pub async fn publish_listing(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    listing_list_cache: web::Data<Cache<String, Vec<ListingWithDetails>>>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let started = std::time::Instant::now();
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();
    log::info!("Publishing listing {} for user {}", listing_id, user_id);

    // OPTIMIZATION: Combine ownership check and listing fetch into single query
    let listing_row =
        match sqlx::query_as::<_, Listing>("SELECT * FROM listings WHERE id = $1 AND host_id = $2")
            .bind(&listing_id)
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await
        {
            Ok(Some(l)) => {
                log::info!("Ownership verified for listing {}", listing_id);
                l
            }
            Ok(None) => {
                // Check if listing exists but user doesn't own it
                let exists = sqlx::query_scalar::<_, bool>(
                    "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1)",
                )
                .bind(&listing_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap_or(false);

                if exists {
                    log::warn!("User {} does not own listing {}", user_id, listing_id);
                    return HttpResponse::Forbidden().json(serde_json::json!({
                        "error": "You don't have permission to publish this listing"
                    }));
                } else {
                    log::warn!("Listing {} not found", listing_id);
                    return HttpResponse::NotFound().json(serde_json::json!({
                        "error": "Listing not found"
                    }));
                }
            }
            Err(e) => {
                log::error!("Database error fetching listing: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Database error: {}", e)
                }));
            }
        };

    // Validate listing before publishing
    if let Err(error) = validate_listing_for_publish(&listing_row) {
        log::warn!("Validation failed for listing {}: {}", listing_id, error);
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }));
    }

    // Update status to published
    let result = match sqlx::query(
        "UPDATE listings SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = $1",
    )
    .bind(&listing_id)
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => {
            log::info!("Successfully published listing {}", listing_id);
            listing_cache.invalidate(&listing_id).await;
            listing_list_cache.invalidate_all();
            HttpResponse::Ok().json(serde_json::json!({
                "id": listing_id,
                "status": "published"
            }))
        }
        Err(e) => {
            log::error!("Failed to update listing status: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to publish listing: {}", e)
            }))
        }
    };

    log::info!(
        "publish_listing latency_ms={}",
        started.elapsed().as_millis()
    );
    result
}

/// POST /api/listings/:id/unpublish - Unpublish listing
#[post("/{id}/unpublish")]
pub async fn unpublish_listing(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    listing_list_cache: web::Data<Cache<String, Vec<ListingWithDetails>>>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let started = std::time::Instant::now();
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();
    log::info!("Unpublishing listing {} for user {}", listing_id, user_id);

    // OPTIMIZATION: Single query to check ownership and update
    let result =
        sqlx::query("UPDATE listings SET status = 'unpublished' WHERE id = $1 AND host_id = $2")
            .bind(&listing_id)
            .bind(user_id)
            .execute(pool.get_ref())
            .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                log::info!("Successfully unpublished listing {}", listing_id);
                listing_cache.invalidate(&listing_id).await;
                listing_list_cache.invalidate_all();
                let resp = HttpResponse::Ok().json(serde_json::json!({
                    "id": listing_id,
                    "status": "unpublished"
                }));
                log::info!(
                    "unpublish_listing latency_ms={}",
                    started.elapsed().as_millis()
                );
                resp
            } else {
                // Either listing doesn't exist or user doesn't own it
                // Check which one it is for better error message
                let exists = sqlx::query_scalar::<_, bool>(
                    "SELECT EXISTS(SELECT 1 FROM listings WHERE id = $1)",
                )
                .bind(&listing_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap_or(false);

                if exists {
                    log::warn!("User {} does not own listing {}", user_id, listing_id);
                    HttpResponse::Forbidden().json(serde_json::json!({
                        "error": "You don't have permission to unpublish this listing"
                    }))
                } else {
                    log::warn!("Listing {} not found", listing_id);
                    HttpResponse::NotFound().json(serde_json::json!({
                        "error": "Listing not found"
                    }))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to unpublish listing: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        }
    }
}

/// POST /api/listings/:id/amenities - Add amenities to listing
#[post("/{id}/amenities")]
pub async fn add_amenities(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<AddAmenitiesRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Delete existing amenities
            let _ = sqlx::query("DELETE FROM listing_amenities WHERE listing_id = $1")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await;

            // Insert new amenities
            for amenity in &body.amenities {
                let _ = sqlx::query(
                    "INSERT INTO listing_amenities (listing_id, amenity_type) VALUES ($1, $2)",
                )
                .bind(&listing_id)
                .bind(amenity)
                .execute(pool.get_ref())
                .await;
            }

            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => {
                    listing_cache.invalidate(&listing_id).await;
                    HttpResponse::Ok().json(listing)
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch listing: {}", e)
                })),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to modify this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// POST /api/listings/:id/photos - Sync photos for a listing
#[post("/{id}/photos")]
pub async fn sync_photos(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SyncPhotosRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Use a transaction to ensure atomicity
            let mut tx = match pool.begin().await {
                Ok(tx) => tx,
                Err(e) => {
                    return HttpResponse::InternalServerError().json(
                        serde_json::json!({"error": format!("Failed to start transaction: {}", e)}),
                    );
                }
            };

            // Delete existing photos
            if let Err(e) = sqlx::query("DELETE FROM listing_photos WHERE listing_id = $1")
                .bind(&listing_id)
                .execute(&mut *tx)
                .await
            {
                let _ = tx.rollback().await;
                return HttpResponse::InternalServerError().json(
                    serde_json::json!({"error": format!("Failed to clear existing photos: {}", e)}),
                );
            }

            // Insert new photos
            for photo in &body.photos {
                let is_cover = photo.is_cover.unwrap_or(false);
                let display_order = photo.display_order.unwrap_or(0);

                if let Err(e) = sqlx::query("INSERT INTO listing_photos (listing_id, url, caption, room_type, is_cover, display_order) VALUES ($1, $2, $3, $4, $5, $6)")
                    .bind(&listing_id)
                    .bind(&photo.url)
                    .bind(&photo.caption)
                    .bind(&photo.room_type)
                    .bind(is_cover)
                    .bind(display_order)
                    .execute(&mut *tx)
                    .await
                {
                    let _ = tx.rollback().await;
                    return HttpResponse::InternalServerError().json(
                        serde_json::json!({"error": format!("Failed to add photo {}: {}", photo.url, e)}),
                    );
                }
            }

            if let Err(e) = tx.commit().await {
                return HttpResponse::InternalServerError().json(
                    serde_json::json!({"error": format!("Failed to commit transaction: {}", e)}),
                );
            }

            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => {
                    listing_cache.invalidate(&listing_id).await;
                    HttpResponse::Ok().json(listing)
                }
                Err(e) => HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": format!("Failed to fetch listing: {}", e)})),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to modify this listing"
        })),
        Ok(None) => {
            HttpResponse::NotFound().json(serde_json::json!({ "error": "Listing not found" }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// POST /api/listings/:id/videos - Add video to listing
#[post("/{id}/videos")]
pub async fn add_video(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, ListingWithDetails>>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<AddVideoRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = $1")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Delete existing video (only one allowed)
            let _ = sqlx::query("DELETE FROM listing_videos WHERE listing_id = $1")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await;

            match sqlx::query("INSERT INTO listing_videos (listing_id, url) VALUES ($1, $2)")
                .bind(&listing_id)
                .bind(&body.url)
                .execute(pool.get_ref())
                .await
            {
                Ok(_) => match get_listing_with_details(pool.get_ref(), &listing_id).await {
                    Ok(listing) => {
                        listing_cache.invalidate(&listing_id).await;
                        HttpResponse::Ok().json(listing)
                    }
                    Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to fetch listing: {}", e)
                    })),
                },
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to add video: {}", e)
                })),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to modify this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// GET /api/listings - Get published listings (paginated, lightweight)
#[get("")]
pub async fn get_all_listings(
    pool: web::Data<PgPool>,
    listing_cache: web::Data<Cache<String, Vec<ListingWithDetails>>>,
    req: HttpRequest,
    query: web::Query<ListingFilters>,
) -> impl Responder {
    let started = std::time::Instant::now();

    // Try to get from cache
    let cache_key = match serde_json::to_string(&*query) {
        Ok(s) => format!("listings:{}", s),
        Err(_) => "listings:default".to_string(),
    };

    if let Some(cached) = listing_cache.get(&cache_key).await {
        log::info!("Cache hit for {}", cache_key);
        let accept = req
            .headers()
            .get(actix_web::http::header::ACCEPT)
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");

        if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
            if let Ok(bytes) = rmp_serde::to_vec(&cached) {
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
                    .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                    .body(bytes);
            }
        }

        let json = serde_json::to_vec(&cached).unwrap_or_default();
        let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
        if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
            if tag.to_str().ok() == Some(etag.as_str()) {
                return HttpResponse::NotModified().finish();
            }
        }
        return HttpResponse::Ok()
            .insert_header((actix_web::http::header::ETAG, etag))
            .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
            .body(json);
    }

    // Select specific columns to avoid fetching heavy text fields
    let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
        sqlx::QueryBuilder::new("SELECT id, host_id, status, property_type, title, address, city, country, latitude, longitude, price_per_night, currency, cleaning_fee, max_guests, bedrooms, beds, bathrooms, instant_book, min_nights, max_nights, created_at, updated_at, published_at FROM listings WHERE status = 'published'");

    if let Some(ref search) = query.search {
        let pattern = format!("%{}%", search);
        // Only search indexed fields that are in SELECT clause
        query_builder.push(" AND (title ILIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR city ILIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR country ILIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR address ILIKE ");
        query_builder.push_bind(pattern);
        query_builder.push(")");
    }

    if let Some(ref category) = query.category {
        query_builder.push(" AND property_type = ");
        query_builder.push_bind(category);
    }

    if let Some(ref location) = query.location {
        let pattern = format!("%{}%", location);
        query_builder.push(" AND (city ILIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR country ILIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR address ILIKE ");
        query_builder.push_bind(pattern);
        query_builder.push(")");
    }

    if let Some(min_price) = query.min_price {
        query_builder.push(" AND price_per_night >= ");
        query_builder.push_bind(min_price);
    }

    if let Some(max_price) = query.max_price {
        query_builder.push(" AND price_per_night <= ");
        query_builder.push_bind(max_price);
    }

    if let Some(guests) = query.guests {
        query_builder.push(" AND max_guests >= ");
        query_builder.push_bind(guests);
    }

    query_builder.push(" ORDER BY created_at DESC");

    // Pagination: default limit=20, offset=0, and clamp bounds
    let mut limit = query.limit.unwrap_or(20);
    if limit < 1 {
        limit = 1;
    }
    if limit > 500 {
        limit = 500;
    }
    let offset = query.offset.unwrap_or(0).max(0);

    query_builder.push(" LIMIT ");
    query_builder.push_bind(limit);
    if offset > 0 {
        query_builder.push(" OFFSET ");
        query_builder.push_bind(offset);
    }

    let listings_res = query_builder
        .build_query_as::<Listing>()
        .fetch_all(pool.get_ref())
        .await;

    let listings = match listings_res {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }));
        }
    };

    if listings.is_empty() {
        return HttpResponse::Ok().json(Vec::<ListingWithDetails>::new());
    }

    // Batch-load up to 4 photos per listing (cover first) to avoid N+1
    let ids: Vec<String> = listings.iter().map(|l| l.id.clone()).collect();
    let photo_rows = match sqlx::query_as::<_, ListingPhoto>(
        r#"
        WITH ranked AS (
            SELECT id, listing_id, url, caption, room_type, COALESCE(is_cover, FALSE) as is_cover, COALESCE(display_order, 0) as display_order, uploaded_at,
                   ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY COALESCE(is_cover, FALSE) DESC, COALESCE(display_order, 0), id) AS rn
            FROM listing_photos
            WHERE listing_id = ANY($1)
        )
        SELECT id, listing_id, url, caption, room_type, is_cover, display_order, uploaded_at
        FROM ranked
        WHERE rn <= 4
        ORDER BY listing_id, rn
        "#,
    )
    .bind(&ids)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to load photos: {}", e)
            }));
        }
    };

    let mut photos_map: HashMap<String, Vec<ListingPhoto>> = HashMap::new();
    for p in photo_rows.into_iter() {
        photos_map.entry(p.listing_id.clone()).or_default().push(p);
    }

    let mut out: Vec<ListingWithDetails> = Vec::with_capacity(listings.len());
    for listing in listings {
        let listing_id_for_map = listing.id.clone();
        let safety_items: Vec<String> = listing
            .safety_devices
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();

        out.push(ListingWithDetails {
            listing,
            amenities: Vec::new(),
            photos: photos_map.remove(&listing_id_for_map).unwrap_or_default(),
            videos: Vec::new(),
            safety_items,
            unavailable_dates: Vec::new(),
            contact_phone: None,
            host_avatar: None,
            host_username: None,
        });
    }

    // Save to cache
    listing_cache.insert(cache_key.clone(), out.clone()).await;

    log::info!(
        "get_all_listings latency_ms={} (cache miss)",
        started.elapsed().as_millis()
    );

    let accept = req
        .headers()
        .get(actix_web::http::header::ACCEPT)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    if accept.contains("application/x-msgpack") || accept.contains("application/msgpack") {
        if let Ok(bytes) = rmp_serde::to_vec(&out) {
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
                .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
                .body(bytes);
        }
    }

    let json = serde_json::to_vec(&out).unwrap_or_default();
    let etag = format!("\"{}\"", hex::encode(Sha1::digest(&json)));
    if let Some(tag) = req.headers().get(actix_web::http::header::IF_NONE_MATCH) {
        if tag.to_str().ok() == Some(etag.as_str()) {
            return HttpResponse::NotModified().finish();
        }
    }
    HttpResponse::Ok()
        .insert_header((actix_web::http::header::ETAG, etag))
        .insert_header(("Cache-Control", "public, max-age=0, must-revalidate"))
        .body(json)
}
