use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use log;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
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
    pub company_id: Option<i32>,
}

#[derive(sqlx::FromRow)]
struct Company {
    id: i32,
    location: String,
    phone: String,
    email: String,
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
                        image_url: format!("{}/{}", std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:8082".to_string()).trim_end_matches('/'), img.image_url.trim_start_matches('/')),
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
                    image_url: format!("{}/{}", std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:8082".to_string()).trim_end_matches('/'), img.image_url.trim_start_matches('/')),
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
                        image_url: format!("{}/{}", std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:8082".to_string()).trim_end_matches('/'), img.image_url.trim_start_matches('/')),
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

    log::info!("Attempting to create product for user_id: {}", user_id);
    // Get company info to inherit location and contact details
    log::info!("Fetching company for user_id: {}", user_id);
    let company: Result<Company, _> =
        sqlx::query_as("SELECT id, location, phone, email FROM companies WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    let company = match company {
        Ok(s) => {
            log::info!("Successfully fetched company id: {} for user_id: {}", s.id, user_id);
            s
        }
        Err(e) => {
            log::error!("Failed to fetch company for user_id {}: {}", user_id, e);
            return HttpResponse::BadRequest().json(ErrorResponse {
                message: "You must create a company before adding products.".to_string(),
            })
        }
    };

    let mut product_payload = CreateProductPayload::default();
    let mut image_paths: Vec<String> = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "name" => match extract_string_from_field(&mut field).await {
                Ok(name) => product_payload.name = name,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid name".to_string() }),
            },
            "description" => match extract_string_from_field(&mut field).await {
                Ok(description) => product_payload.description = description,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid description".to_string() }),
            },
            "price" => match extract_string_from_field(&mut field).await {
                Ok(price_str) => match price_str.parse() {
                    Ok(price) => product_payload.price = price,
                    Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid price".to_string() }),
                },
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid price".to_string() }),
            },
            "condition" => match extract_string_from_field(&mut field).await {
                Ok(condition) => product_payload.condition = condition,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid condition".to_string() }),
            },
            "category" => match extract_string_from_field(&mut field).await {
                Ok(category) => product_payload.category = category,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid category".to_string() }),
            },
            "location" => match extract_string_from_field(&mut field).await {
                Ok(location) => product_payload.location = location,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid location".to_string() }),
            },
            "images[]" => {
                let filename = format!("product_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);
                
                let mut bytes = Vec::new();
                while let Some(chunk_result) = field.try_next().await.transpose() {
                    match chunk_result {
                        Ok(chunk) => bytes.extend_from_slice(&chunk),
                        Err(e) => {
                            log::error!("Error reading multipart chunk: {}", e);
                            return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to read file chunk".to_string() });
                        }
                    }
                }

                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        if let Err(e) = std::fs::create_dir_all(p) {
                             log::error!("Failed to create directory for {}: {}", filepath, e);
                             return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to save file".to_string() });
                        }
                    }
                }
                if let Err(e) = std::fs::write(&filepath, &bytes) {
                    log::error!("Failed to write file to {}: {}", filepath, e);
                    return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to save file".to_string() });
                }
                image_paths.push(format!("/uploads/{}", filename));
            }
            _ => (),
        }
    }

    // Use company's location, phone, and email
    // Format phone number for WhatsApp (remove spaces and ensure it starts with country code)
    let formatted_phone = company.phone.replace(" ", "").replace("-", "");
    let formatted_phone = if !formatted_phone.starts_with("+") {
        format!("+{}", formatted_phone)
    } else {
        formatted_phone
    };

    println!("Using company location for new product: {}", &company.location);
    let result = sqlx::query(
        "INSERT INTO products (name, description, price, condition, category, location, contact_phone, contact_email, user_id, status, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&product_payload.name)
    .bind(&product_payload.description)
    .bind(&product_payload.price)
    .bind(&product_payload.condition)
    .bind(&product_payload.category)
    .bind(if product_payload.location.is_empty() { &company.location } else { &product_payload.location })
    .bind(&formatted_phone)      // Use company phone (formatted)
    .bind(&company.email)      // Use company email
    .bind(user_id)
    .bind("active")
    .bind(company.id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let product_id = res.last_insert_rowid() as i32;
            for path in image_paths {
                if let Err(e) = sqlx::query("INSERT INTO product_images (image_url, product_id) VALUES (?, ?)")
                    .bind(path)
                    .bind(product_id)
                    .execute(pool.get_ref())
                    .await {
                        log::error!("Failed to insert product image: {}", e);
                    }
            }

           let product: Product = match sqlx::query_as("SELECT * FROM products WHERE id = ?")
               .bind(product_id)
               .fetch_one(pool.get_ref())
               .await {
                   Ok(p) => p,
                   Err(e) => {
                       log::error!("Failed to fetch product after creation: {}", e);
                       return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to create product".to_string() });
                   }
               };
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
                    image_url: format!("{}/{}", std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:8082".to_string()).trim_end_matches('/'), img.image_url.trim_start_matches('/')),
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
            "name" => match extract_string_from_field(&mut field).await {
                Ok(name) => product_payload.name = name,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid name".to_string() }),
            },
            "description" => match extract_string_from_field(&mut field).await {
                Ok(description) => product_payload.description = description,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid description".to_string() }),
            },
            "price" => match extract_string_from_field(&mut field).await {
                Ok(price_str) => match price_str.parse() {
                    Ok(price) => product_payload.price = price,
                    Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid price".to_string() }),
                },
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid price".to_string() }),
            },
            "condition" => match extract_string_from_field(&mut field).await {
                Ok(condition) => product_payload.condition = condition,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid condition".to_string() }),
            },
            "category" => match extract_string_from_field(&mut field).await {
                Ok(category) => product_payload.category = category,
                Err(_) => return HttpResponse::BadRequest().json(ErrorResponse { message: "Invalid category".to_string() }),
            },
            "images[]" => {
                let filename = format!("product_{}.png", Uuid::new_v4());
                let filepath = format!("./public/uploads/{}", filename);

                let mut bytes = Vec::new();
                while let Some(chunk_result) = field.try_next().await.transpose() {
                    match chunk_result {
                        Ok(chunk) => bytes.extend_from_slice(&chunk),
                        Err(e) => {
                            log::error!("Error reading multipart chunk: {}", e);
                            return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to read file chunk".to_string() });
                        }
                    }
                }

                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        if let Err(e) = std::fs::create_dir_all(p) {
                             log::error!("Failed to create directory for {}: {}", filepath, e);
                             return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to save file".to_string() });
                        }
                    }
                }
                if let Err(e) = std::fs::write(&filepath, &bytes) {
                    log::error!("Failed to write file to {}: {}", filepath, e);
                    return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to save file".to_string() });
                }
                image_paths.push(format!("/uploads/{}", filename));
            }
            _ => (),
        }
    }

    // Update only the fields that can be changed (not location/contact info)
    let result = sqlx::query(
        "UPDATE products SET name = ?, description = ?, price = ?, condition = ?, category = ?, location = ? WHERE id = ?"
    )
    .bind(&product_payload.name)
    .bind(&product_payload.description)
    .bind(&product_payload.price)
    .bind(&product_payload.condition)
    .bind(&product_payload.category)
    .bind(&product.as_ref().expect("Product should exist here").location)
    .bind(id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            if !image_paths.is_empty() {
               if let Err(e) = sqlx::query("DELETE FROM product_images WHERE product_id = ?")
                   .bind(id)
                   .execute(pool.get_ref())
                   .await {
                       log::error!("Failed to delete product images: {}", e);
               }
               for path in image_paths {
                   if let Err(e) = sqlx::query("INSERT INTO product_images (image_url, product_id) VALUES (?, ?)")
                       .bind(path)
                       .bind(id)
                       .execute(pool.get_ref())
                       .await {
                           log::error!("Failed to insert product image: {}", e);
                       }
               }
            }

           let product: Product = match sqlx::query_as("SELECT * FROM products WHERE id = ?")
               .bind(id)
               .fetch_one(pool.get_ref())
               .await {
                   Ok(p) => p,
                   Err(e) => {
                       log::error!("Failed to fetch product after update: {}", e);
                       return HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to update product".to_string() });
                   }
               };
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
                    image_url: format!("{}/{}", std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:8082".to_string()).trim_end_matches('/'), img.image_url.trim_start_matches('/')),
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

    // Verify the product belongs to the user
    let product: Result<Product, _> =
        sqlx::query_as("SELECT * FROM products WHERE id = ? AND user_id = ?")
            .bind(id)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

    match product {
        Ok(_) => {
            // Product belongs to user, proceed with deletion
            let result = sqlx::query("DELETE FROM products WHERE id = ?")
                .bind(id)
                .execute(pool.get_ref())
                .await;

            match result {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "message": "Product deleted successfully"
                })),
                Err(e) => {
                    eprintln!("Failed to delete product: {}", e);
                    HttpResponse::InternalServerError().json(ErrorResponse {
                        message: "Failed to delete product".to_string(),
                    })
                }
            }
        }
        Err(_) => HttpResponse::Forbidden().json(ErrorResponse {
            message: "You are not authorized to delete this product".to_string(),
        }),
    }
}
