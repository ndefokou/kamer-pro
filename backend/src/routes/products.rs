use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{delete, get, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub condition: String,
    pub category: String,
    pub location: String,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub user_id: i32,
    pub status: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ProductImage {
    id: i32,
    pub image_url: String,
    product_id: i32,
}

#[derive(Serialize)]
pub struct ProductResponse {
    #[serde(flatten)]
    product: Product,
    images: Vec<ProductImageResponse>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProductImageResponse {
    pub id: i32,
    pub image_url: String,
    pub product_id: i32,
}

#[derive(Deserialize, Debug, Default)]
pub struct CreateProductPayload {
    name: String,
    description: String,
    price: f64,
    condition: String,
    category: String,
    location: String,
    contact_phone: Option<String>,
    contact_email: Option<String>,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

#[derive(Deserialize)]
pub struct ProductFilters {
    category: Option<String>,
    location: Option<String>,
    condition: Option<String>,
    min_price: Option<f64>,
    max_price: Option<f64>,
    search: Option<String>,
}

async fn extract_string_from_field(
    field: &mut actix_multipart::Field,
) -> Result<String, actix_web::Error> {
    let mut bytes = Vec::new();
    while let Some(chunk) = field.try_next().await? {
        bytes.extend_from_slice(&chunk);
    }
    Ok(String::from_utf8(bytes).map_err(|e| actix_web::error::ErrorInternalServerError(e))?)
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

// Get ALL products (for marketplace - buyers and sellers can see all)
#[get("")]
pub async fn get_products(
    pool: web::Data<SqlitePool>,
    query: web::Query<ProductFilters>,
) -> impl Responder {
    let mut query_builder =
        sqlx::QueryBuilder::new("SELECT * FROM products WHERE status = 'active'");

    if let Some(category) = &query.category {
        if category != "All" {
            query_builder.push(" AND category = ");
            query_builder.push_bind(category);
        }
    }

    if let Some(location) = &query.location {
        if location != "All" {
            query_builder.push(" AND location = ");
            query_builder.push_bind(location);
        }
    }

    if let Some(condition) = &query.condition {
        if condition != "All" {
            query_builder.push(" AND condition = ");
            query_builder.push_bind(condition);
        }
    }

    if let Some(min_price) = &query.min_price {
        query_builder.push(" AND price >= ");
        query_builder.push_bind(min_price);
    }

    if let Some(max_price) = &query.max_price {
        query_builder.push(" AND price <= ");
        query_builder.push_bind(max_price);
    }

    if let Some(search) = &query.search {
        let trimmed_search = search.trim();
        if !trimmed_search.is_empty() {
            query_builder.push(" AND (name LIKE ");
            query_builder.push_bind(format!("%{}%", trimmed_search));
            query_builder.push(" OR description LIKE ");
            query_builder.push_bind(format!("%{}%", trimmed_search));
            query_builder.push(")");
        }
    }

    query_builder.push(" ORDER BY created_at DESC");

    let products: Result<Vec<Product>, _> = query_builder
        .build_query_as()
        .fetch_all(pool.get_ref())
        .await;

    match products {
        Ok(products) => {
            let mut product_responses = Vec::new();
            for product in products {
                let images: Vec<ProductImage> =
                    sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                        .bind(product.id)
                        .fetch_all(pool.get_ref())
                        .await
                        .unwrap_or_else(|_| vec![]);
                let image_responses = images
                    .into_iter()
                    .map(|img| ProductImageResponse {
                        id: img.id,
                        image_url: format!(
                            "http://localhost:8082{}",
                            img.image_url.replace("/public", "")
                        ),
                        product_id: img.product_id,
                    })
                    .collect();
                product_responses.push(ProductResponse {
                    product,
                    images: image_responses,
                });
            }
            HttpResponse::Ok().json(product_responses)
        }
        Err(e) => {
            eprintln!("Failed to fetch products: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch products".to_string(),
            })
        }
    }
}

#[get("/{id}")]
pub async fn get_product(pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let id = path.into_inner();
    let product: Result<Product, _> = sqlx::query_as("SELECT * FROM products WHERE id = ?")
        .bind(id)
        .fetch_one(pool.get_ref())
        .await;

    match product {
        Ok(product) => {
            let images: Vec<ProductImage> =
                sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                    .bind(product.id)
                    .fetch_all(pool.get_ref())
                    .await
                    .unwrap_or_else(|_| vec![]);
            let image_responses = images
                .into_iter()
                .map(|img| ProductImageResponse {
                    id: img.id,
                    image_url: format!(
                        "http://localhost:8082{}",
                        img.image_url.replace("/public", "")
                    ),
                    product_id: img.product_id,
                })
                .collect();
            HttpResponse::Ok().json(ProductResponse {
                product,
                images: image_responses,
            })
        }
        Err(_) => HttpResponse::NotFound().json(ErrorResponse {
            message: "Product not found".to_string(),
        }),
    }
}

// Get ONLY the logged-in user's products (for seller dashboard)
#[get("/seller")]
pub async fn get_my_products(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let products: Result<Vec<Product>, _> =
        sqlx::query_as("SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC")
            .bind(user_id)
            .fetch_all(pool.get_ref())
            .await;

    match products {
        Ok(products) => {
            let mut product_responses = Vec::new();
            for product in products {
                let images: Vec<ProductImage> =
                    sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                        .bind(product.id)
                        .fetch_all(pool.get_ref())
                        .await
                        .unwrap_or_else(|_| vec![]);
                let image_responses = images
                    .into_iter()
                    .map(|img| ProductImageResponse {
                        id: img.id,
                        image_url: format!(
                            "http://localhost:8082{}",
                            img.image_url.replace("/public", "")
                        ),
                        product_id: img.product_id,
                    })
                    .collect();
                product_responses.push(ProductResponse {
                    product,
                    images: image_responses,
                });
            }
            HttpResponse::Ok().json(product_responses)
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch products".to_string(),
        }),
    }
}

pub async fn create_product(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let mut product_payload = CreateProductPayload::default();
    let mut image_paths: Vec<String> = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "name" => product_payload.name = extract_string_from_field(&mut field).await.unwrap(),
            "description" => {
                product_payload.description = extract_string_from_field(&mut field).await.unwrap()
            }
            "price" => {
                product_payload.price = extract_string_from_field(&mut field)
                    .await
                    .unwrap()
                    .parse()
                    .unwrap()
            }
            "condition" => {
                product_payload.condition = extract_string_from_field(&mut field).await.unwrap()
            }
            "category" => {
                product_payload.category = extract_string_from_field(&mut field).await.unwrap()
            }
            "location" => {
                product_payload.location = extract_string_from_field(&mut field).await.unwrap()
            }
            "contact_phone" => {
                product_payload.contact_phone =
                    Some(extract_string_from_field(&mut field).await.unwrap())
            }
            "contact_email" => {
                product_payload.contact_email =
                    Some(extract_string_from_field(&mut field).await.unwrap())
            }
            "images[]" => {
                let filename = format!("{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                println!("Saving image to: {}", filepath);
                let mut f = std::fs::File::create(&filepath).unwrap();
                while let Some(chunk) = field.try_next().await.unwrap() {
                    f.write_all(&chunk).unwrap();
                }
                image_paths.push(format!("/uploads/{}", filename));
                println!("Current image paths: {:?}", image_paths);
            }
            _ => (),
        }
    }

    let result = sqlx::query(
        "INSERT INTO products (name, description, price, condition, category, location, contact_phone, contact_email, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&product_payload.name)
    .bind(&product_payload.description)
    .bind(&product_payload.price)
    .bind(&product_payload.condition)
    .bind(&product_payload.category)
    .bind(&product_payload.location)
    .bind(&product_payload.contact_phone)
    .bind(&product_payload.contact_email)
    .bind(user_id)
    .bind("active")
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let product_id = res.last_insert_rowid() as i32;
            for path in image_paths {
                sqlx::query("INSERT INTO product_images (image_url, product_id) VALUES (?, ?)")
                    .bind(path)
                    .bind(product_id)
                    .execute(pool.get_ref())
                    .await
                    .unwrap();
            }

            let product: Product = sqlx::query_as("SELECT * FROM products WHERE id = ?")
                .bind(product_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap();
            let images: Vec<ProductImage> =
                sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                    .bind(product_id)
                    .fetch_all(pool.get_ref())
                    .await
                    .unwrap_or_else(|_| vec![]);
            let image_responses = images
                .into_iter()
                .map(|img| ProductImageResponse {
                    id: img.id,
                    image_url: format!(
                        "http://localhost:8082{}",
                        img.image_url.replace("/public", "")
                    ),
                    product_id: img.product_id,
                })
                .collect();

            HttpResponse::Created().json(ProductResponse {
                product,
                images: image_responses,
            })
        }
        Err(e) => {
            eprintln!("Failed to create product: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to create product".to_string(),
            })
        }
    }
}

pub async fn update_product(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    mut payload: Multipart,
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

    let product: Result<Product, _> =
        sqlx::query_as("SELECT * FROM products WHERE id = ? AND user_id = ?")
            .bind(id)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    if product.is_err() {
        return HttpResponse::NotFound().json(ErrorResponse {
            message: "Product not found or you are not authorized".to_string(),
        });
    }

    let mut product_payload = CreateProductPayload::default();
    let mut image_paths: Vec<String> = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "name" => product_payload.name = extract_string_from_field(&mut field).await.unwrap(),
            "description" => {
                product_payload.description = extract_string_from_field(&mut field).await.unwrap()
            }
            "price" => {
                product_payload.price = extract_string_from_field(&mut field)
                    .await
                    .unwrap()
                    .parse()
                    .unwrap()
            }
            "condition" => {
                product_payload.condition = extract_string_from_field(&mut field).await.unwrap()
            }
            "category" => {
                product_payload.category = extract_string_from_field(&mut field).await.unwrap()
            }
            "location" => {
                product_payload.location = extract_string_from_field(&mut field).await.unwrap()
            }
            "contact_phone" => {
                product_payload.contact_phone =
                    Some(extract_string_from_field(&mut field).await.unwrap())
            }
            "contact_email" => {
                product_payload.contact_email =
                    Some(extract_string_from_field(&mut field).await.unwrap())
            }
            "images[]" => {
                let filename = format!("{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                println!("Saving image to: {}", filepath);
                let mut f = std::fs::File::create(&filepath).unwrap();
                while let Some(chunk) = field.try_next().await.unwrap() {
                    f.write_all(&chunk).unwrap();
                }
                image_paths.push(format!("/uploads/{}", filename));
                println!("Current image paths: {:?}", image_paths);
            }
            _ => (),
        }
    }

    let result = sqlx::query(
        "UPDATE products SET name = ?, description = ?, price = ?, condition = ?, category = ?, location = ?, contact_phone = ?, contact_email = ? WHERE id = ?"
    )
    .bind(&product_payload.name)
    .bind(&product_payload.description)
    .bind(&product_payload.price)
    .bind(&product_payload.condition)
    .bind(&product_payload.category)
    .bind(&product_payload.location)
    .bind(&product_payload.contact_phone)
    .bind(&product_payload.contact_email)
    .bind(id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            if !image_paths.is_empty() {
                sqlx::query("DELETE FROM product_images WHERE product_id = ?")
                    .bind(id)
                    .execute(pool.get_ref())
                    .await
                    .unwrap();
                for path in image_paths {
                    sqlx::query("INSERT INTO product_images (image_url, product_id) VALUES (?, ?)")
                        .bind(path)
                        .bind(id)
                        .execute(pool.get_ref())
                        .await
                        .unwrap();
                }
            }

            let product: Product = sqlx::query_as("SELECT * FROM products WHERE id = ?")
                .bind(id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap();
            let images: Vec<ProductImage> =
                sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                    .bind(id)
                    .fetch_all(pool.get_ref())
                    .await
                    .unwrap_or_else(|_| vec![]);
            let image_responses = images
                .into_iter()
                .map(|img| ProductImageResponse {
                    id: img.id,
                    image_url: format!(
                        "http://localhost:8082{}",
                        img.image_url.replace("/public", "")
                    ),
                    product_id: img.product_id,
                })
                .collect();

            HttpResponse::Ok().json(ProductResponse {
                product,
                images: image_responses,
            })
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to update product".to_string(),
        }),
    }
}

#[delete("/{id}")]
pub async fn delete_product(
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

    let product: Result<Product, _> = sqlx::query_as("SELECT * FROM products WHERE id = ?")
        .bind(id)
        .fetch_one(pool.get_ref())
        .await;

    match product {
        Ok(product) => {
            if product.user_id != user_id {
                return HttpResponse::Forbidden().json(ErrorResponse {
                    message: "You are not authorized to delete this product".to_string(),
                });
            }
        }
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                message: "Product not found".to_string(),
            });
        }
    }

    let result = sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to delete product".to_string(),
        }),
    }
}
