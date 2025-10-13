use actix_web::{get, post, put, delete, web, HttpRequest, HttpResponse, Responder, HttpMessage};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub condition: String,
    pub category: String,
    pub location: String,
    pub contact_phone: String,
    pub contact_email: String,
    pub user_id: i32,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductImage {
    id: i32,
    image_url: String,
    product_id: i32,
}

#[derive(Serialize)]
pub struct ProductResponse {
    #[serde(flatten)]
    product: Product,
    images: Vec<String>,
}

#[derive(Deserialize)]
pub struct CreateProductPayload {
    name: String,
    description: String,
    price: f64,
    condition: String,
    category: String,
    location: String,
    contact_phone: String,
    contact_email: String,
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

#[get("/products")]
pub async fn get_products(pool: web::Data<SqlitePool>, query: web::Query<ProductFilters>) -> impl Responder {
    let mut query_builder = sqlx::QueryBuilder::new("SELECT products.* FROM products JOIN user_roles ON products.user_id = user_roles.user_id WHERE user_roles.role = 'seller' AND products.status = 'active'");

    if let Some(category) = &query.category {
        if category != "All" {
            query_builder.push(" AND products.category = ");
            query_builder.push_bind(category);
        }
    }

    if let Some(location) = &query.location {
        if location != "All" {
            query_builder.push(" AND products.location = ");
            query_builder.push_bind(location);
        }
    }

    if let Some(condition) = &query.condition {
        if condition != "All" {
            query_builder.push(" AND products.condition = ");
            query_builder.push_bind(condition);
        }
    }

    if let Some(min_price) = &query.min_price {
        query_builder.push(" AND products.price >= ");
        query_builder.push_bind(min_price);
    }

    if let Some(max_price) = &query.max_price {
        query_builder.push(" AND products.price <= ");
        query_builder.push_bind(max_price);
    }

    if let Some(search) = &query.search {
        query_builder.push(" AND (products.name LIKE ");
        query_builder.push_bind(format!("%{}%", search));
        query_builder.push(" OR products.description LIKE ");
        query_builder.push_bind(format!("%{}%", search));
        query_builder.push(")");
    }

    let products: Result<Vec<Product>, _> = query_builder.build_query_as()
        .fetch_all(pool.get_ref())
        .await;

    match products {
        Ok(products) => {
            let mut product_responses = Vec::new();
            for product in products {
                let images: Vec<ProductImage> = sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                    .bind(product.id)
                    .fetch_all(pool.get_ref())
                    .await
                    .unwrap_or_else(|_| vec![]);
                product_responses.push(ProductResponse {
                    product,
                    images: images.into_iter().map(|img| img.image_url).collect(),
                });
            }
            HttpResponse::Ok().json(product_responses)
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch products".to_string(),
        }),
    }
}

#[get("/products/{id}")]
pub async fn get_product(pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let id = path.into_inner();
    let product: Result<Product, _> = sqlx::query_as("SELECT * FROM products WHERE id = ?")
        .bind(id)
        .fetch_one(pool.get_ref())
        .await;

    match product {
        Ok(product) => {
            let images: Vec<ProductImage> = sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                .bind(product.id)
                .fetch_all(pool.get_ref())
                .await
                .unwrap_or_else(|_| vec![]);
            HttpResponse::Ok().json(ProductResponse {
                product,
                images: images.into_iter().map(|img| img.image_url).collect(),
            })
        }
        Err(_) => HttpResponse::NotFound().json(ErrorResponse {
            message: "Product not found".to_string(),
        }),
    }
}
#[get("/my-products")]
pub async fn get_my_products(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return HttpResponse::InternalServerError().finish(),
    };

    let products: Result<Vec<Product>, _> = sqlx::query_as("SELECT * FROM products WHERE user_id = ?")
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await;

    match products {
        Ok(products) => {
            let mut product_responses = Vec::new();
            for product in products {
                let images: Vec<ProductImage> = sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                    .bind(product.id)
                    .fetch_all(pool.get_ref())
                    .await
                    .unwrap_or_else(|_| vec![]);
                product_responses.push(ProductResponse {
                    product,
                    images: images.into_iter().map(|img| img.image_url).collect(),
                });
            }
            HttpResponse::Ok().json(product_responses)
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch products".to_string(),
        }),
    }
}

#[post("/products")]
pub async fn create_product(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<CreateProductPayload>,
) -> impl Responder {
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        // This should not happen if middleware is applied correctly
        None => return HttpResponse::InternalServerError().finish(),
    };

    let result = sqlx::query(
        "INSERT INTO products (name, description, price, condition, category, location, contact_phone, contact_email, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.price)
    .bind(&payload.condition)
    .bind(&payload.category)
    .bind(&payload.location)
    .bind(&payload.contact_phone)
    .bind(&payload.contact_email)
    .bind(user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            let product_id = res.last_insert_rowid() as i32;
            let product: Product = sqlx::query_as("SELECT * FROM products WHERE id = ?")
                .bind(product_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap();
            HttpResponse::Created().json(ProductResponse {
                product,
                images: vec![],
            })
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to create product".to_string(),
        }),
    }
}

#[put("/products/{id}")]
pub async fn update_product(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
    payload: web::Json<CreateProductPayload>,
) -> impl Responder {
    let id = path.into_inner();
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return HttpResponse::InternalServerError().finish(),
    };

    // Check if the user is authorized to update this product
    let product: Result<Product, _> = sqlx::query_as("SELECT * FROM products WHERE id = ?")
        .bind(id)
        .fetch_one(pool.get_ref())
        .await;

    match product {
        Ok(product) => {
            if product.user_id != user_id {
                return HttpResponse::Forbidden().json(ErrorResponse {
                    message: "You are not authorized to update this product".to_string(),
                });
            }
        }
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                message: "Product not found".to_string(),
            });
        }
    }

    let result = sqlx::query(
        "UPDATE products SET name = ?, description = ?, price = ?, condition = ?, category = ?, location = ?, contact_phone = ?, contact_email = ? WHERE id = ?"
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.price)
    .bind(&payload.condition)
    .bind(&payload.category)
    .bind(&payload.location)
    .bind(&payload.contact_phone)
    .bind(&payload.contact_email)
    .bind(id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let product: Product = sqlx::query_as("SELECT * FROM products WHERE id = ?")
                .bind(id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap();
            let images: Vec<ProductImage> = sqlx::query_as("SELECT * FROM product_images WHERE product_id = ?")
                .bind(id)
                .fetch_all(pool.get_ref())
                .await
                .unwrap_or_else(|_| vec![]);
            HttpResponse::Ok().json(ProductResponse {
                product,
                images: images.into_iter().map(|img| img.image_url).collect(),
            })
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to update product".to_string(),
        }),
    }
}

#[delete("/products/{id}")]
pub async fn delete_product(req: HttpRequest, pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let id = path.into_inner();
    let user_id = match req.extensions().get::<i32>().cloned() {
        Some(id) => id,
        None => return HttpResponse::InternalServerError().finish(),
    };

    // Check if the user is authorized to delete this product
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