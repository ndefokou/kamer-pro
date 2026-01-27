use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::middleware::auth::extract_user_id_from_token;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct WishlistItem {
    pub id: i32,
    pub user_id: i32,
    pub product_id: String,
    pub created_at: String,
    // Fields joined from the products table
    pub product_name: String,
    pub product_price: f64,
    pub product_location: String,
    pub product_category: String,
    pub product_image: Option<String>,
    pub product_contact_phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddToWishlistRequest {
    pub product_id: String,
}

fn extract_user_id(req: &HttpRequest) -> Result<i32, HttpResponse> {
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value()).map_err(|_| {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired token"
            }))
        });
    }
    Err(HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Missing authorization token"
    })))
}

#[get("")]
async fn get_wishlist(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, WishlistItem>(
        r#"
        SELECT
            w.id, w.user_id, w.product_id, w.created_at::TEXT,
            l.title as product_name,
            l.price_per_night as product_price,
            l.city as product_location,
            l.property_type as product_category,
            (SELECT url FROM listing_photos WHERE listing_id = l.id AND is_cover = true LIMIT 1) as product_image,
            up.phone as product_contact_phone
        FROM wishlist w
        JOIN listings l ON w.product_id = l.id
        LEFT JOIN user_profiles up ON l.host_id = up.user_id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(items) => HttpResponse::Ok().json(items),
        Err(e) => {
            eprintln!("Failed to fetch wishlist: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch wishlist"
            }))
        }
    }
}

#[post("")]
pub async fn add_to_wishlist(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<AddToWishlistRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Validate listing exists (avoid FK error on product_id)
    let listing_exists: Result<Option<String>, _> =
        sqlx::query_scalar("SELECT id FROM listings WHERE id = $1")
            .bind(&body.product_id)
            .fetch_optional(pool.get_ref())
            .await;

    match listing_exists {
        Ok(Some(_)) => {}
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Listing not found"
            }))
        }
        Err(_) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to validate listing"
            }))
        }
    }

    // Validate user exists (avoid FK error on user_id)
    let user_exists: Result<Option<i32>, _> =
        sqlx::query_scalar("SELECT id FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await;

    match user_exists {
        Ok(Some(_)) => {}
        Ok(None) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "User not found"
            }))
        }
        Err(_) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to validate user"
            }))
        }
    }

    // Check if item is already in wishlist
    let existing_item: Result<Option<i32>, _> =
        sqlx::query_scalar("SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2")
            .bind(user_id)
            .bind(&body.product_id)
            .fetch_optional(pool.get_ref())
            .await;

    if let Ok(Some(_)) = existing_item {
        return HttpResponse::Conflict().json(serde_json::json!({
            "message": "Item is already in wishlist"
        }));
    }

    let result = sqlx::query("INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)")
        .bind(user_id)
        .bind(&body.product_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Item added to wishlist"
        })),
        Err(e) => {
            eprintln!("Failed to add to wishlist: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to add item to wishlist"
            }))
        }
    }
}

#[delete("/{id}")]
pub async fn remove_from_wishlist(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<i32>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let wishlist_item_id = path.into_inner();

    let result = sqlx::query("DELETE FROM wishlist WHERE id = $1 AND user_id = $2")
        .bind(wishlist_item_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => HttpResponse::Ok().json(serde_json::json!({
            "message": "Item removed from wishlist"
        })),
        Ok(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Item not found in wishlist or permission denied"
        })),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to remove item from wishlist"
        })),
    }
}

#[delete("/product/{product_id}")]
pub async fn remove_from_wishlist_by_product(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let product_id = path.into_inner();

    let result = sqlx::query("DELETE FROM wishlist WHERE product_id = $1 AND user_id = $2")
        .bind(product_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => HttpResponse::Ok().json(serde_json::json!({
            "message": "Item removed from wishlist"
        })),
        Ok(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Item not found in wishlist or permission denied"
        })),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to remove item from wishlist"
        })),
    }
}

#[get("/check/{product_id}")]
pub async fn check_wishlist(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };
    let product_id = path.into_inner();

    let result: Result<Option<i32>, _> =
        sqlx::query_scalar("SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2")
            .bind(user_id)
            .bind(product_id)
            .fetch_optional(pool.get_ref())
            .await;

    match result {
        Ok(Some(_)) => HttpResponse::Ok().json(serde_json::json!({ "in_wishlist": true })),
        Ok(None) => HttpResponse::Ok().json(serde_json::json!({ "in_wishlist": false })),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to check wishlist"
        })),
    }
}
