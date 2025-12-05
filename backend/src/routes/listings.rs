use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Listing {
    pub id: String,
    pub host_id: i32,
    pub status: String,
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
    pub instant_book: Option<i32>,
    pub min_nights: Option<i32>,
    pub max_nights: Option<i32>,
    pub safety_devices: Option<String>,
    pub house_rules: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub published_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListingWithDetails {
    pub listing: Listing,
    pub amenities: Vec<String>,
    pub photos: Vec<ListingPhoto>,
    pub videos: Vec<ListingVideo>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ListingPhoto {
    pub id: i32,
    pub listing_id: String,
    pub url: String,
    pub is_cover: i32,
    pub display_order: i32,
    pub uploaded_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ListingVideo {
    pub id: i32,
    pub listing_id: String,
    pub url: String,
    pub uploaded_at: Option<String>,
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
    pub safety_devices: Option<Vec<String>>,
    pub house_rules: Option<String>,
    pub safety_items: Option<Vec<String>>,
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
    pub is_cover: Option<bool>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct AddVideoRequest {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ListingFilters {
    pub search: Option<String>,
    pub category: Option<String>,
    pub location: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub guests: Option<i32>,
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
    Err(HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Missing or invalid authorization header"
    })))
}

async fn get_listing_with_details(
    pool: &SqlitePool,
    listing_id: &str,
) -> Result<ListingWithDetails, sqlx::Error> {
    // Get listing
    let listing = sqlx::query_as::<_, Listing>("SELECT * FROM listings WHERE id = ?")
        .bind(listing_id)
        .fetch_one(pool)
        .await?;

    // Get amenities
    let amenities =
        sqlx::query_as::<_, ListingAmenity>("SELECT * FROM listing_amenities WHERE listing_id = ?")
            .bind(listing_id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|a| a.amenity_type)
            .collect();

    // Get photos
    let photos = sqlx::query_as::<_, ListingPhoto>(
        "SELECT * FROM listing_photos WHERE listing_id = ? ORDER BY display_order, id",
    )
    .bind(listing_id)
    .fetch_all(pool)
    .await?;

    // Get videos
    let videos =
        sqlx::query_as::<_, ListingVideo>("SELECT * FROM listing_videos WHERE listing_id = ?")
            .bind(listing_id)
            .fetch_all(pool)
            .await?;

    Ok(ListingWithDetails {
        listing,
        amenities,
        photos,
        videos,
    })
}

fn validate_listing_for_publish(listing: &ListingWithDetails) -> Result<(), String> {
    // Title validation - relaxed to 5 characters
    if listing.listing.title.is_none() || listing.listing.title.as_ref().unwrap().trim().len() < 5 {
        let title_len = listing.listing.title.as_ref().map(|t| t.len()).unwrap_or(0);
        log::warn!("Title validation failed: length = {}", title_len);
        return Err("Title must be at least 5 characters".to_string());
    }

    // Description validation - relaxed to 20 characters
    if listing.listing.description.is_none()
        || listing.listing.description.as_ref().unwrap().trim().len() < 20
    {
        let desc_len = listing
            .listing
            .description
            .as_ref()
            .map(|d| d.len())
            .unwrap_or(0);
        log::warn!("Description validation failed: length = {}", desc_len);
        return Err("Description must be at least 20 characters".to_string());
    }

    // Price validation
    if listing.listing.price_per_night.is_none() || listing.listing.price_per_night.unwrap() <= 0.0
    {
        log::warn!(
            "Price validation failed: {:?}",
            listing.listing.price_per_night
        );
        return Err("Price per night must be greater than 0".to_string());
    }

    // Max guests validation
    if listing.listing.max_guests.is_none() || listing.listing.max_guests.unwrap() < 1 {
        log::warn!(
            "Max guests validation failed: {:?}",
            listing.listing.max_guests
        );
        return Err("Max guests must be at least 1".to_string());
    }

    log::info!(
        "Listing validation passed for listing {}",
        listing.listing.id
    );
    Ok(())
}

// ============================================================================
// API Endpoints
// ============================================================================

/// POST /api/listings - Create new draft listing
#[post("")]
pub async fn create_listing(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateListingRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Check if user exists, create if not
    let user_exists: Option<i32> = match sqlx::query_scalar("SELECT id FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
    {
        Ok(id) => id,
        Err(e) => {
            log::error!("Failed to check user existence: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error while verifying user"
            }));
        }
    };

    if user_exists.is_none() {
        log::info!("User ID {} not found, creating new user", user_id);

        // Auto-create user with basic info
        match sqlx::query("INSERT INTO users (id, username, email) VALUES (?, ?, ?)")
            .bind(user_id)
            .bind(format!("host_{}", user_id))
            .bind(format!("host_{}@mboamaison.com", user_id))
            .execute(pool.get_ref())
            .await
        {
            Ok(_) => log::info!("Successfully created user {}", user_id),
            Err(e) => {
                log::error!("Failed to create user: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to create user account"
                }));
            }
        }
    }

    let listing_id = Uuid::new_v4().to_string();

    log::debug!(
        "Creating listing with id: {}, user_id: {}",
        listing_id,
        user_id
    );

    let result = sqlx::query(
        "INSERT INTO listings (id, host_id, status, property_type) VALUES (?, ?, 'draft', ?)",
    )
    .bind(&listing_id)
    .bind(user_id)
    .bind(&body.property_type)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            log::debug!("Listing created successfully, fetching details...");
            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => {
                    log::debug!("Listing details fetched successfully");
                    HttpResponse::Ok().json(listing)
                }
                Err(e) => {
                    log::error!("Failed to fetch created listing: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to fetch created listing: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to create listing: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create listing: {}", e)
            }))
        }
    }
}

/// GET /api/listings/:id - Get listing details
#[get("/{id}")]
pub async fn get_listing(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let listing_id = path.into_inner();

    match get_listing_with_details(pool.get_ref(), &listing_id).await {
        Ok(listing) => HttpResponse::Ok().json(listing),
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
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateListingRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Build dynamic update query using QueryBuilder to prevent SQL injection
            let mut query_builder: sqlx::QueryBuilder<sqlx::Sqlite> =
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
                query_builder.push_bind(if instant_book { 1 } else { 0 });
            }
            if let Some(min_nights) = body.min_nights {
                query_builder.push(", min_nights = ");
                query_builder.push_bind(min_nights);
            }
            if let Some(max_nights) = body.max_nights {
                query_builder.push(", max_nights = ");
                query_builder.push_bind(max_nights);
            }
            if let Some(ref safety_devices) = body.safety_devices {
                let json = serde_json::to_string(safety_devices).unwrap_or_default();
                query_builder.push(", safety_devices = ");
                query_builder.push_bind(json);
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

            query_builder.push(" WHERE id = ");
            query_builder.push_bind(&listing_id);

            match query_builder.build().execute(pool.get_ref()).await {
                Ok(_) => match get_listing_with_details(pool.get_ref(), &listing_id).await {
                    Ok(listing) => HttpResponse::Ok().json(listing),
                    Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to fetch updated listing: {}", e)
                    })),
                },
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to update listing: {}", e)
                })),
            }
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
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            match sqlx::query("DELETE FROM listings WHERE id = ?")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await
            {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "message": "Listing deleted successfully"
                })),
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

/// GET /api/listings/my-listings - Get host's listings
#[get("/my-listings")]
pub async fn get_my_listings(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, Listing>(
        "SELECT * FROM listings WHERE host_id = ? ORDER BY created_at DESC",
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(listings) => {
            // Get details for each listing
            let mut listings_with_details = Vec::new();
            for listing in listings {
                if let Ok(details) = get_listing_with_details(pool.get_ref(), &listing.id).await {
                    listings_with_details.push(details);
                }
            }
            HttpResponse::Ok().json(listings_with_details)
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// POST /api/listings/:id/publish - Publish listing
#[post("/{id}/publish")]
pub async fn publish_listing(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();
    log::info!("Publishing listing {} for user {}", listing_id, user_id);

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            log::info!("Ownership verified for listing {}", listing_id);
            
            // Get listing with details for validation
            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => {
                    log::info!("Fetched listing details for validation");
                    
                    // Validate listing
                    if let Err(error) = validate_listing_for_publish(&listing) {
                        log::warn!("Validation failed for listing {}: {}", listing_id, error);
                        return HttpResponse::BadRequest().json(serde_json::json!({
                            "error": error
                        }));
                    }

                    log::info!("Validation passed, updating listing status");
                    
                    // Publish listing
                    match sqlx::query(
                        "UPDATE listings SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = ?"
                    )
                    .bind(&listing_id)
                    .execute(pool.get_ref())
                    .await
                    {
                        Ok(_) => {
                            log::info!("Successfully updated listing status to published");
                            
                            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                                Ok(updated_listing) => {
                                    log::info!("Successfully fetched updated listing, returning response");
                                    HttpResponse::Ok().json(updated_listing)
                                },
                                Err(e) => {
                                    log::error!("Failed to fetch published listing: {:?}", e);
                                    HttpResponse::InternalServerError().json(serde_json::json!({
                                        "error": format!("Failed to fetch published listing: {}", e)
                                    }))
                                },
                            }
                        }
                        Err(e) => {
                            log::error!("Failed to update listing status: {:?}", e);
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "error": format!("Failed to publish listing: {}", e)
                            }))
                        },
                    }
                }
                Err(e) => {
                    log::error!("Failed to fetch listing for validation: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to fetch listing: {}", e)
                    }))
                }
            }
        }
        Ok(Some(_)) => {
            log::warn!("User {} does not own listing {}", user_id, listing_id);
            HttpResponse::Forbidden().json(serde_json::json!({
                "error": "You don't have permission to publish this listing"
            }))
        },
        Ok(None) => {
            log::warn!("Listing {} not found", listing_id);
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Listing not found"
            }))
        },
        Err(e) => {
            log::error!("Database error checking ownership: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", e)
            }))
        },
    }
}

/// POST /api/listings/:id/unpublish - Unpublish listing
#[post("/{id}/unpublish")]
pub async fn unpublish_listing(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            match sqlx::query("UPDATE listings SET status = 'unpublished' WHERE id = ?")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await
            {
                Ok(_) => match get_listing_with_details(pool.get_ref(), &listing_id).await {
                    Ok(listing) => HttpResponse::Ok().json(listing),
                    Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to fetch unpublished listing: {}", e)
                    })),
                },
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to unpublish listing: {}", e)
                })),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to unpublish this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

/// POST /api/listings/:id/amenities - Add amenities to listing
#[post("/{id}/amenities")]
pub async fn add_amenities(
    pool: web::Data<SqlitePool>,
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
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Delete existing amenities
            let _ = sqlx::query("DELETE FROM listing_amenities WHERE listing_id = ?")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await;

            // Insert new amenities
            for amenity in &body.amenities {
                let _ = sqlx::query(
                    "INSERT INTO listing_amenities (listing_id, amenity_type) VALUES (?, ?)",
                )
                .bind(&listing_id)
                .bind(amenity)
                .execute(pool.get_ref())
                .await;
            }

            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => HttpResponse::Ok().json(listing),
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
    pool: web::Data<SqlitePool>,
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
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
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
            if let Err(e) = sqlx::query("DELETE FROM listing_photos WHERE listing_id = ?")
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
                let is_cover = if photo.is_cover.unwrap_or(false) {
                    1
                } else {
                    0
                };
                let display_order = photo.display_order.unwrap_or(0);

                if let Err(e) = sqlx::query("INSERT INTO listing_photos (listing_id, url, is_cover, display_order) VALUES (?, ?, ?, ?)")
                    .bind(&listing_id)
                    .bind(&photo.url)
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
                Ok(listing) => HttpResponse::Ok().json(listing),
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
    pool: web::Data<SqlitePool>,
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
    let owner_check = sqlx::query_scalar::<_, i32>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Delete existing video (only one allowed)
            let _ = sqlx::query("DELETE FROM listing_videos WHERE listing_id = ?")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await;

            match sqlx::query("INSERT INTO listing_videos (listing_id, url) VALUES (?, ?)")
                .bind(&listing_id)
                .bind(&body.url)
                .execute(pool.get_ref())
                .await
            {
                Ok(_) => match get_listing_with_details(pool.get_ref(), &listing_id).await {
                    Ok(listing) => HttpResponse::Ok().json(listing),
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

/// GET /api/listings - Get all published listings (for marketplace)
#[get("")]
pub async fn get_all_listings(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListingFilters>,
) -> impl Responder {
    let mut query_builder: sqlx::QueryBuilder<sqlx::Sqlite> =
        sqlx::QueryBuilder::new("SELECT * FROM listings WHERE status = 'published'");

    if let Some(ref search) = query.search {
        let pattern = format!("%{}%", search);
        query_builder.push(" AND (title LIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR description LIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR city LIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR country LIKE ");
        query_builder.push_bind(pattern);
        query_builder.push(")");
    }

    if let Some(ref category) = query.category {
        query_builder.push(" AND property_type = ");
        query_builder.push_bind(category);
    }

    if let Some(ref location) = query.location {
        let pattern = format!("%{}%", location);
        query_builder.push(" AND (city LIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR country LIKE ");
        query_builder.push_bind(pattern.clone());
        query_builder.push(" OR address LIKE ");
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

    let result = query_builder
        .build_query_as::<Listing>()
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(listings) => {
            let mut listings_with_details = Vec::new();
            for listing in listings {
                if let Ok(details) = get_listing_with_details(pool.get_ref(), &listing.id).await {
                    listings_with_details.push(details);
                }
            }
            HttpResponse::Ok().json(listings_with_details)
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
    }
}
