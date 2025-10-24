use crate::routes::middleware::extract_user_id_from_token;
use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct CartItem {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub quantity: i32,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct CartItemWithProduct {
    pub id: i32,
    pub product_id: i32,
    pub quantity: i32,
    pub product_name: String,
    pub product_price: f64,
    pub product_image: Option<String>,
    pub product_location: String,
    pub product_status: String,
}

#[derive(Deserialize)]
pub struct AddToCartRequest {
    pub product_id: i32,
    pub quantity: i32,
}

#[derive(Deserialize)]
pub struct UpdateCartRequest {
    pub quantity: i32,
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

// Get all cart items for the logged-in user
#[get("")]
pub async fn get_cart(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let cart_items: Result<Vec<CartItemWithProduct>, _> = sqlx::query_as(
        r#"
        SELECT 
            ci.id,
            ci.product_id,
            ci.quantity,
            p.name as product_name,
            p.price as product_price,
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
            p.location as product_location,
            p.status as product_status
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ?
        ORDER BY ci.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await;

    match cart_items {
        Ok(items) => {
            let items_with_full_urls: Vec<CartItemWithProduct> = items
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
            eprintln!("Failed to fetch cart items: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch cart items".to_string(),
            })
        }
    }
}

// Add item to cart
#[post("")]
pub async fn add_to_cart(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<AddToCartRequest>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    // Check if user exists
    let user_exists: Result<(i32,), _> = sqlx::query_as("SELECT id FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await;

    if user_exists.is_err() {
        return HttpResponse::Unauthorized().json(ErrorResponse {
            message: "User not found, please log in again".to_string(),
        });
    }

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

    // Check if item already in cart
    let existing: Result<CartItem, _> =
        sqlx::query_as("SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?")
            .bind(user_id)
            .bind(payload.product_id)
            .fetch_one(pool.get_ref())
            .await;

    match existing {
        Ok(item) => {
            // Update quantity
            let result = sqlx::query(
                "UPDATE cart_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(payload.quantity)
            .bind(item.id)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "message": "Cart updated successfully"
                })),
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to update cart".to_string(),
                }),
            }
        }
        Err(_) => {
            // Insert new item
            let result = sqlx::query(
                "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
            )
            .bind(user_id)
            .bind(payload.product_id)
            .bind(payload.quantity)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => HttpResponse::Created().json(serde_json::json!({
                    "message": "Item added to cart successfully"
                })),
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to add item to cart".to_string(),
                }),
            }
        }
    }
}

// Update cart item quantity
#[put("/{id}")]
pub async fn update_cart_item(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<UpdateCartRequest>,
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

    if payload.quantity <= 0 {
        return HttpResponse::BadRequest().json(ErrorResponse {
            message: "Quantity must be greater than 0".to_string(),
        });
    }

    let result = sqlx::query(
        "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
    )
    .bind(payload.quantity)
    .bind(id)
    .bind(user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Cart item not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Cart item updated successfully"
                }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to update cart item".to_string(),
        }),
    }
}

// Remove item from cart
#[delete("/{id}")]
pub async fn remove_from_cart(
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

    let result = sqlx::query("DELETE FROM cart_items WHERE id = ? AND user_id = ?")
        .bind(id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Cart item not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Item removed from cart successfully"
                }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to remove item from cart".to_string(),
        }),
    }
}

// Clear entire cart
#[delete("")]
pub async fn clear_cart(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM cart_items WHERE user_id = ?")
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Cart cleared successfully"
        })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to clear cart".to_string(),
        }),
    }
}

// Get cart count
#[get("/count")]
pub async fn get_cart_count(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let count: Result<(i32,), _> =
        sqlx::query_as("SELECT COUNT(*) FROM cart_items WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    match count {
        Ok((count,)) => HttpResponse::Ok().json(serde_json::json!({ "count": count })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to get cart count".to_string(),
        }),
    }
}
