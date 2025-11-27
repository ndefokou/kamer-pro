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
    pub host_id: String,
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
    #[serde(flatten)]
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
}

#[derive(Debug, Deserialize)]
pub struct AddAmenitiesRequest {
    pub amenities: Vec<String>,
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

// ============================================================================
// Helper Functions
// ============================================================================

fn extract_user_id(req: &HttpRequest) -> Result<String, HttpResponse> {
    req.headers()
        .get("x-user-id")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Missing or invalid authentication"
            }))
        })
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
    if listing.listing.title.is_none() || listing.listing.title.as_ref().unwrap().len() < 10 {
        return Err("Title must be at least 10 characters".to_string());
    }

    if listing.listing.description.is_none()
        || listing.listing.description.as_ref().unwrap().len() < 50
    {
        return Err("Description must be at least 50 characters".to_string());
    }

    if listing.listing.price_per_night.is_none() || listing.listing.price_per_night.unwrap() <= 0.0
    {
        return Err("Price per night must be greater than 0".to_string());
    }

    if listing.photos.len() < 3 {
        return Err("At least 3 photos are required".to_string());
    }

    if listing.listing.max_guests.is_none() || listing.listing.max_guests.unwrap() < 1 {
        return Err("Max guests must be at least 1".to_string());
    }

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

    let listing_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO listings (id, host_id, status, property_type) VALUES (?, ?, 'draft', ?)",
    )
    .bind(&listing_id)
    .bind(&user_id)
    .bind(&body.property_type)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => match get_listing_with_details(pool.get_ref(), &listing_id).await {
            Ok(listing) => HttpResponse::Created().json(listing),
            Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch created listing: {}", e)
            })),
        },
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create listing: {}", e)
        })),
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
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Build dynamic update query
            let mut updates = Vec::new();
            let mut query = "UPDATE listings SET updated_at = CURRENT_TIMESTAMP".to_string();

            if let Some(ref property_type) = body.property_type {
                updates.push(format!("property_type = '{}'", property_type));
            }
            if let Some(ref title) = body.title {
                updates.push(format!("title = '{}'", title.replace("'", "''")));
            }
            if let Some(ref description) = body.description {
                updates.push(format!(
                    "description = '{}'",
                    description.replace("'", "''")
                ));
            }
            if let Some(ref address) = body.address {
                updates.push(format!("address = '{}'", address.replace("'", "''")));
            }
            if let Some(ref city) = body.city {
                updates.push(format!("city = '{}'", city.replace("'", "''")));
            }
            if let Some(ref country) = body.country {
                updates.push(format!("country = '{}'", country.replace("'", "''")));
            }
            if let Some(latitude) = body.latitude {
                updates.push(format!("latitude = {}", latitude));
            }
            if let Some(longitude) = body.longitude {
                updates.push(format!("longitude = {}", longitude));
            }
            if let Some(price) = body.price_per_night {
                updates.push(format!("price_per_night = {}", price));
            }
            if let Some(ref currency) = body.currency {
                updates.push(format!("currency = '{}'", currency));
            }
            if let Some(cleaning_fee) = body.cleaning_fee {
                updates.push(format!("cleaning_fee = {}", cleaning_fee));
            }
            if let Some(max_guests) = body.max_guests {
                updates.push(format!("max_guests = {}", max_guests));
            }
            if let Some(bedrooms) = body.bedrooms {
                updates.push(format!("bedrooms = {}", bedrooms));
            }
            if let Some(beds) = body.beds {
                updates.push(format!("beds = {}", beds));
            }
            if let Some(bathrooms) = body.bathrooms {
                updates.push(format!("bathrooms = {}", bathrooms));
            }
            if let Some(instant_book) = body.instant_book {
                updates.push(format!(
                    "instant_book = {}",
                    if instant_book { 1 } else { 0 }
                ));
            }
            if let Some(min_nights) = body.min_nights {
                updates.push(format!("min_nights = {}", min_nights));
            }
            if let Some(max_nights) = body.max_nights {
                updates.push(format!("max_nights = {}", max_nights));
            }
            if let Some(ref safety_devices) = body.safety_devices {
                let json = serde_json::to_string(safety_devices).unwrap_or_default();
                updates.push(format!("safety_devices = '{}'", json.replace("'", "''")));
            }
            if let Some(ref house_rules) = body.house_rules {
                updates.push(format!(
                    "house_rules = '{}'",
                    house_rules.replace("'", "''")
                ));
            }

            if !updates.is_empty() {
                query.push_str(", ");
                query.push_str(&updates.join(", "));
            }
            query.push_str(&format!(" WHERE id = '{}'", listing_id));

            match sqlx::query(&query).execute(pool.get_ref()).await {
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
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
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

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Get listing with details for validation
            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                Ok(listing) => {
                    // Validate listing
                    if let Err(error) = validate_listing_for_publish(&listing) {
                        return HttpResponse::BadRequest().json(serde_json::json!({
                            "error": error
                        }));
                    }

                    // Publish listing
                    match sqlx::query(
                        "UPDATE listings SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = ?"
                    )
                    .bind(&listing_id)
                    .execute(pool.get_ref())
                    .await
                    {
                        Ok(_) => {
                            match get_listing_with_details(pool.get_ref(), &listing_id).await {
                                Ok(updated_listing) => HttpResponse::Ok().json(updated_listing),
                                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                                    "error": format!("Failed to fetch published listing: {}", e)
                                })),
                            }
                        }
                        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                            "error": format!("Failed to publish listing: {}", e)
                        })),
                    }
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch listing: {}", e)
                })),
            }
        }
        Ok(Some(_)) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "You don't have permission to publish this listing"
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Listing not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        })),
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
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
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
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
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

/// POST /api/listings/:id/photos - Add photo to listing
#[post("/{id}/photos")]
pub async fn add_photo(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<AddPhotoRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let listing_id = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            let is_cover = if body.is_cover.unwrap_or(false) { 1 } else { 0 };
            let display_order = body.display_order.unwrap_or(0);

            // If this is a cover photo, unset other cover photos
            if is_cover == 1 {
                let _ = sqlx::query("UPDATE listing_photos SET is_cover = 0 WHERE listing_id = ?")
                    .bind(&listing_id)
                    .execute(pool.get_ref())
                    .await;
            }

            match sqlx::query(
                "INSERT INTO listing_photos (listing_id, url, is_cover, display_order) VALUES (?, ?, ?, ?)"
            )
            .bind(&listing_id)
            .bind(&body.url)
            .bind(is_cover)
            .bind(display_order)
            .execute(pool.get_ref())
            .await
            {
                Ok(_) => {
                    match get_listing_with_details(pool.get_ref(), &listing_id).await {
                        Ok(listing) => HttpResponse::Ok().json(listing),
                        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                            "error": format!("Failed to fetch listing: {}", e)
                        })),
                    }
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to add photo: {}", e)
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

/// DELETE /api/listings/:id/photos/:photo_id - Delete photo
#[delete("/{id}/photos/{photo_id}")]
pub async fn delete_photo(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<(String, i32)>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let (listing_id, photo_id) = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            match sqlx::query("DELETE FROM listing_photos WHERE id = ? AND listing_id = ?")
                .bind(photo_id)
                .bind(&listing_id)
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
                    "error": format!("Failed to delete photo: {}", e)
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

/// PUT /api/listings/:id/photos/:photo_id/cover - Set cover photo
#[put("/{id}/photos/{photo_id}/cover")]
pub async fn set_cover_photo(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<(String, i32)>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let (listing_id, photo_id) = path.into_inner();

    // Verify ownership
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
        .bind(&listing_id)
        .fetch_optional(pool.get_ref())
        .await;

    match owner_check {
        Ok(Some(host_id)) if host_id == user_id => {
            // Unset all cover photos
            let _ = sqlx::query("UPDATE listing_photos SET is_cover = 0 WHERE listing_id = ?")
                .bind(&listing_id)
                .execute(pool.get_ref())
                .await;

            // Set new cover photo
            match sqlx::query(
                "UPDATE listing_photos SET is_cover = 1 WHERE id = ? AND listing_id = ?",
            )
            .bind(photo_id)
            .bind(&listing_id)
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
                    "error": format!("Failed to set cover photo: {}", e)
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
    let owner_check = sqlx::query_scalar::<_, String>("SELECT host_id FROM listings WHERE id = ?")
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
pub async fn get_all_listings(pool: web::Data<SqlitePool>) -> impl Responder {
    let result = sqlx::query_as::<_, Listing>(
        "SELECT * FROM listings WHERE status = 'published' ORDER BY created_at DESC",
    )
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
