use crate::routes::middleware::extract_user_id_from_token;
use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct WishlistItem {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub created_at: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct WishlistItemWithProduct {
    pub id: i32,
    pub product_id: i32,
    pub product_name: String,
    pub product_price: f64,
    pub product_image: Option<String>,
    pub product_location: String,
    pub product_category: String,
    pub product_status: String,
}

#[derive(Deserialize)]
pub struct AddToWishlistRequest {
    pub product_id: i32,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

fn get_user_id_from_headers(req: &HttpRequest) -> Result<i32, actix_web::Error> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token);
            }
        }
    }
    Err(actix_web::error::ErrorUnauthorized(
        "Missing or invalid authorization header",
    ))
}

// Get all wishlist items for the logged-in user
#[get("")]
pub async fn get_wishlist(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let wishlist_items: Result<Vec<WishlistItemWithProduct>, _> = sqlx::query_as(
        r#"
        SELECT 
            wi.id,
            wi.product_id,
            p.name as product_name,
            p.price as product_price,
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
            p.location as product_location,
            p.category as product_category,
            p.status as product_status
        FROM wishlist_items wi
        JOIN products p ON wi.product_id = p.id
        WHERE wi.user_id = ?
        ORDER BY wi.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await;

    match wishlist_items {
        Ok(items) => {
            let items_with_full_urls: Vec<WishlistItemWithProduct> = items
                .into_iter()
                .map(|mut item| {
                    if let Some(ref image) = item.product_image {
                        item.product_image = Some(format!(
                            "http://localhost:8082{}",
                            image.replace("/public", "")
                        ));
                    }
                    item
                })
                .collect();
            HttpResponse::Ok().json(items_with_full_urls)
        }
        Err(e) => {
            eprintln!("Failed to fetch wishlist items: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch wishlist items".to_string(),
            })
        }
    }
}

// Add item to wishlist
#[post("")]
pub async fn add_to_wishlist(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<AddToWishlistRequest>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    // Check if product exists
    let product: Result<crate::routes::products::Product, _> =
        sqlx::query_as("SELECT * FROM products WHERE id = ?")
            .bind(payload.product_id)
            .fetch_one(pool.get_ref())
            .await;

    if product.is_err() {
        return HttpResponse::NotFound().json(ErrorResponse {
            message: "Product not found".to_string(),
        });
    }

    // Check if item already in wishlist
    let existing: Result<WishlistItem, _> =
        sqlx::query_as("SELECT * FROM wishlist_items WHERE user_id = ? AND product_id = ?")
            .bind(user_id)
            .bind(payload.product_id)
            .fetch_one(pool.get_ref())
            .await;

    if existing.is_ok() {
        return HttpResponse::Conflict().json(ErrorResponse {
            message: "Item already in wishlist".to_string(),
        });
    }

    // Insert new item
    let result = sqlx::query("INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)")
        .bind(user_id)
        .bind(payload.product_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                HttpResponse::Created().json(serde_json::json!({
                    "message": "Item added to wishlist successfully"
                }))
            } else {
                eprintln!("Insert returned 0 rows affected");
                HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to add item to wishlist - no rows inserted".to_string(),
                })
            }
        }
        Err(e) => {
            eprintln!("Database error while adding to wishlist: {:?}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: format!("Failed to add item to wishlist: {}", e),
            })
        }
    }
}

// Remove item from wishlist
#[delete("/{id}")]
pub async fn remove_from_wishlist(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let id = path.into_inner();
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM wishlist_items WHERE id = ? AND user_id = ?")
        .bind(id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Wishlist item not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Item removed from wishlist successfully"
                }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to remove item from wishlist".to_string(),
        }),
    }
}

// Remove product from wishlist by product_id
#[delete("/product/{product_id}")]
pub async fn remove_from_wishlist_by_product(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let product_id = path.into_inner();
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM wishlist_items WHERE product_id = ? AND user_id = ?")
        .bind(product_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Wishlist item not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Item removed from wishlist successfully"
                }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to remove item from wishlist".to_string(),
        }),
    }
}

// Check if product is in wishlist
#[get("/check/{product_id}")]
pub async fn check_wishlist(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let product_id = path.into_inner();
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let exists: Result<WishlistItem, _> =
        sqlx::query_as("SELECT * FROM wishlist_items WHERE user_id = ? AND product_id = ?")
            .bind(user_id)
            .bind(product_id)
            .fetch_one(pool.get_ref())
            .await;

    HttpResponse::Ok().json(serde_json::json!({
        "in_wishlist": exists.is_ok()
    }))
}

// Get wishlist count
#[get("/count")]
pub async fn get_wishlist_count(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let count: Result<(i32,), _> =
        sqlx::query_as("SELECT COUNT(*) FROM wishlist_items WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    match count {
        Ok((count,)) => HttpResponse::Ok().json(serde_json::json!({ "count": count })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to get wishlist count".to_string(),
        }),
    }
}
