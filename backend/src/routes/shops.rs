use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::routes::middleware::extract_user_id_from_token;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Shop {
    pub id: i32,
    pub user_id: i32,
    pub email: String,
    pub phone: String,
    pub location: String,
}

#[derive(Deserialize)]
pub struct CreateShop {
    pub email: String,
    pub phone: String,
    pub location: String,
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

#[post("")]
pub async fn create_or_update_shop(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<CreateShop>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(e.to_string()),
    };

    let shop = sqlx::query_as::<_, Shop>("SELECT * FROM shops WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await;

    match shop {
        Ok(Some(_)) => {
            // Update existing shop
            let updated_shop = sqlx::query_as::<_, Shop>(
                "UPDATE shops SET email = ?, phone = ?, location = ? WHERE user_id = ? RETURNING *",
            )
            .bind(&payload.email)
            .bind(&payload.phone)
            .bind(&payload.location)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await;

            match updated_shop {
                Ok(shop) => HttpResponse::Ok().json(shop),
                Err(e) => {
                    eprintln!("Failed to update shop: {}", e);
                    HttpResponse::InternalServerError().json("Failed to update shop")
                }
            }
        }
        Ok(None) => {
            // Create new shop
            let new_shop = sqlx::query_as::<_, Shop>(
                "INSERT INTO shops (user_id, email, phone, location) VALUES (?, ?, ?, ?) RETURNING *",
            )
            .bind(user_id)
            .bind(&payload.email)
            .bind(&payload.phone)
            .bind(&payload.location)
            .fetch_one(pool.get_ref())
            .await;

            match new_shop {
                Ok(shop) => HttpResponse::Created().json(shop),
                Err(e) => {
                    eprintln!("Failed to create shop: {}", e);
                    HttpResponse::InternalServerError().json("Failed to create shop")
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to fetch shop: {}", e);
            HttpResponse::InternalServerError().json("Failed to process request")
        }
    }
}

#[get("")]
pub async fn get_shop(
    req: HttpRequest,
    pool: web::Data<SqlitePool>
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(e.to_string()),
    };

    let shop = sqlx::query_as::<_, Shop>("SELECT * FROM shops WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await;

    match shop {
        Ok(Some(shop)) => HttpResponse::Ok().json(shop),
        Ok(None) => HttpResponse::NotFound().json("Shop not found"),
        Err(e) => {
            eprintln!("Failed to fetch shop: {}", e);
            HttpResponse::InternalServerError().json("Failed to fetch shop")
        }
    }
}