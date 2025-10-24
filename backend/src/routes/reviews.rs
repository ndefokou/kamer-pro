use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Review {
    pub id: i32,
    pub product_id: i32,
    pub user_id: i32,
    pub rating: i32,
    pub title: Option<String>,
    pub comment: Option<String>,
    pub is_verified_purchase: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct ReviewWithDetails {
    pub id: i32,
    pub product_id: i32,
    pub user_id: i32,
    pub username: String,
    pub rating: i32,
    pub title: Option<String>,
    pub comment: Option<String>,
    pub is_verified_purchase: bool,
    pub created_at: String,
    pub helpful_count: i32,
    pub not_helpful_count: i32,
    pub user_vote: Option<bool>,
    pub images: Vec<String>,
    pub seller_response: Option<SellerResponse>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct SellerResponse {
    pub id: i32,
    pub response_text: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct VoteRequest {
    pub is_helpful: bool,
}

#[derive(Deserialize)]
pub struct SellerResponseRequest {
    pub response_text: String,
}

#[derive(Serialize)]
pub struct ReviewStats {
    pub average_rating: f64,
    pub total_reviews: i32,
    pub rating_distribution: Vec<RatingCount>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct RatingCount {
    pub rating: i32,
    pub count: i32,
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

// Get all reviews for a product
#[get("/products/{product_id}")]
pub async fn get_product_reviews(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let product_id = path.into_inner();
    let user_id = get_user_id_from_headers(&req).ok();

    let reviews: Result<Vec<Review>, _> =
        sqlx::query_as("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC")
            .bind(product_id)
            .fetch_all(pool.get_ref())
            .await;

    match reviews {
        Ok(reviews) => {
            let mut detailed_reviews = Vec::new();

            for review in reviews {
                let username: (String,) = sqlx::query_as("SELECT username FROM users WHERE id = ?")
                    .bind(review.user_id)
                    .fetch_one(pool.get_ref())
                    .await
                    .unwrap_or((String::from("Unknown"),));

                let helpful_count: (i32,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM review_votes WHERE review_id = ? AND is_helpful = 1",
                )
                .bind(review.id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap_or((0,));

                let not_helpful_count: (i32,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM review_votes WHERE review_id = ? AND is_helpful = 0",
                )
                .bind(review.id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap_or((0,));

                let user_vote: Option<(bool,)> = if let Some(uid) = user_id {
                    sqlx::query_as(
                        "SELECT is_helpful FROM review_votes WHERE review_id = ? AND user_id = ?",
                    )
                    .bind(review.id)
                    .bind(uid)
                    .fetch_optional(pool.get_ref())
                    .await
                    .ok()
                    .flatten()
                } else {
                    None
                };

                let images: Vec<(String,)> =
                    sqlx::query_as("SELECT image_url FROM review_images WHERE review_id = ?")
                        .bind(review.id)
                        .fetch_all(pool.get_ref())
                        .await
                        .unwrap_or_else(|_| vec![]);

                let seller_response: Option<SellerResponse> = sqlx::query_as(
                    "SELECT id, response_text, created_at, updated_at FROM review_responses WHERE review_id = ?",
                )
                .bind(review.id)
                .fetch_optional(pool.get_ref())
                .await
                .ok()
                .flatten();

                detailed_reviews.push(ReviewWithDetails {
                    id: review.id,
                    product_id: review.product_id,
                    user_id: review.user_id,
                    username: username.0,
                    rating: review.rating,
                    title: review.title,
                    comment: review.comment,
                    is_verified_purchase: review.is_verified_purchase,
                    created_at: review.created_at,
                    helpful_count: helpful_count.0,
                    not_helpful_count: not_helpful_count.0,
                    user_vote: user_vote.map(|v| v.0),
                    images: images
                        .into_iter()
                        .map(|i| format!("http://localhost:8082{}", i.0.replace("/public", "")))
                        .collect(),
                    seller_response,
                });
            }

            HttpResponse::Ok().json(detailed_reviews)
        }
        Err(e) => {
            eprintln!("Failed to fetch reviews: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch reviews".to_string(),
            })
        }
    }
}

// Get review statistics for a product
#[get("/products/{product_id}/stats")]
pub async fn get_review_stats(pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let product_id = path.into_inner();

    let avg_rating: Result<(Option<f64>,), _> =
        sqlx::query_as("SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?")
            .bind(product_id)
            .fetch_one(pool.get_ref())
            .await;

    let total: Result<(i32,), _> =
        sqlx::query_as("SELECT COUNT(*) FROM reviews WHERE product_id = ?")
            .bind(product_id)
            .fetch_one(pool.get_ref())
            .await;

    let distribution: Result<Vec<RatingCount>, _> = sqlx::query_as(
        "SELECT rating, COUNT(*) as count FROM reviews WHERE product_id = ? GROUP BY rating ORDER BY rating DESC",
    )
    .bind(product_id)
    .fetch_all(pool.get_ref())
    .await;

    match (avg_rating, total, distribution) {
        (Ok(avg), Ok(tot), Ok(dist)) => HttpResponse::Ok().json(ReviewStats {
            average_rating: avg.0.unwrap_or(0.0),
            total_reviews: tot.0,
            rating_distribution: dist,
        }),
        _ => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch review stats".to_string(),
        }),
    }
}

// Create a review
#[post("")]
pub async fn create_review(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = get_user_id_from_headers(&req)?;

    let mut product_id: Option<i32> = None;
    let mut rating: Option<i32> = None;
    let mut title: Option<String> = None;
    let mut comment: Option<String> = None;
    let mut images: Vec<String> = Vec::new();

    while let Some(mut field) = payload
        .try_next()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "product_id" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                product_id = String::from_utf8(bytes).ok().and_then(|s| s.parse().ok());
            }
            "rating" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                rating = String::from_utf8(bytes).ok().and_then(|s| s.parse().ok());
            }
            "title" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                title = String::from_utf8(bytes).ok();
            }
            "comment" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                comment = String::from_utf8(bytes).ok();
            }
            "images[]" => {
                let filename = format!("{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                let mut f = std::fs::File::create(&filepath)
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    f.write_all(&chunk)
                        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
                }
                images.push(format!("/uploads/{}", filename));
            }
            _ => {}
        }
    }

    let product_id =
        product_id.ok_or_else(|| actix_web::error::ErrorBadRequest("Product ID is required"))?;

    let rating = rating
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Rating is required"))
        .and_then(|r| {
            if (1..=5).contains(&r) {
                Ok(r)
            } else {
                Err(actix_web::error::ErrorBadRequest(
                    "Rating must be between 1 and 5",
                ))
            }
        })?;

    let result = sqlx::query(
        "INSERT INTO reviews (product_id, user_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(product_id)
    .bind(user_id)
    .bind(rating)
    .bind(title)
    .bind(comment)
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create review"))?;

    let review_id = result.last_insert_rowid() as i32;

    for image in images {
        if let Err(e) =
            sqlx::query("INSERT INTO review_images (review_id, image_url) VALUES (?, ?)")
                .bind(review_id)
                .bind(&image)
                .execute(pool.get_ref())
                .await
        {
            eprintln!("Failed to insert review image: {}", e);
        }
    }

    Ok(HttpResponse::Created().json(serde_json::json!({
        "message": "Review created successfully",
        "review_id": review_id
    })))
}

// Vote on a review
#[post("/{review_id}/vote")]
pub async fn vote_review(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<VoteRequest>,
) -> impl Responder {
    let review_id = path.into_inner();
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized".to_string(),
            })
        }
    };

    let result = sqlx::query(
        "INSERT OR REPLACE INTO review_votes (review_id, user_id, is_helpful) VALUES (?, ?, ?)",
    )
    .bind(review_id)
    .bind(user_id)
    .bind(payload.is_helpful)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Vote recorded successfully"
        })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to record vote".to_string(),
        }),
    }
}

// Add seller response to a review
#[post("/{review_id}/response")]
pub async fn add_seller_response(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<SellerResponseRequest>,
) -> impl Responder {
    let review_id = path.into_inner();
    let seller_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized".to_string(),
            })
        }
    };

    // Verify that the seller owns the product
    let product_owner: Result<(i32,), _> = sqlx::query_as(
        "SELECT p.user_id FROM reviews r JOIN products p ON r.product_id = p.id WHERE r.id = ?",
    )
    .bind(review_id)
    .fetch_one(pool.get_ref())
    .await;

    match product_owner {
        Ok((owner_id,)) if owner_id == seller_id => {
            let result = sqlx::query(
                "INSERT OR REPLACE INTO review_responses (review_id, seller_id, response_text) VALUES (?, ?, ?)",
            )
            .bind(review_id)
            .bind(seller_id)
            .bind(&payload.response_text)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => HttpResponse::Created().json(serde_json::json!({
                    "message": "Response added successfully"
                })),
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to add response".to_string(),
                }),
            }
        }
        _ => HttpResponse::Forbidden().json(ErrorResponse {
            message: "You can only respond to reviews on your own products".to_string(),
        }),
    }
}

// Delete a review
#[delete("/{review_id}")]
pub async fn delete_review(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let review_id = path.into_inner();
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized".to_string(),
            })
        }
    };

    let result = sqlx::query("DELETE FROM reviews WHERE id = ? AND user_id = ?")
        .bind(review_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(ErrorResponse {
                    message: "Review not found".to_string(),
                })
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Review deleted successfully"
                }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to delete review".to_string(),
        }),
    }
}
