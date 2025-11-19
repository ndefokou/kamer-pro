use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use log;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectCompany {
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub logo_url: Option<String>,
    pub banner_url: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectProject {
    pub id: i32,
    pub architect_company_id: i32,
    pub user_id: i32,
    pub name: String,
    pub description: String,
    pub project_cost: f64,
    pub location: String,
    pub house_plan_url: Option<String>,
    pub maquette_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectProjectImage {
    pub id: i32,
    pub project_id: i32,
    pub image_url: String,
    pub created_at: String,
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

pub async fn get_architect_company(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(ErrorResponse { message: e.to_string() }),
    };

    let company = sqlx::query_as::<_, ArchitectCompany>("SELECT * FROM architect_companies WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await;

    match company {
        Ok(Some(company)) => HttpResponse::Ok().json(company),
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse { message: "Architect company not found".to_string() }),
        Err(e) => {
            eprintln!("Failed to fetch architect company: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to fetch architect company".to_string() })
        }
    }
}

pub async fn create_or_update_architect_company(req: HttpRequest, pool: web::Data<SqlitePool>, mut payload: Multipart) -> Result<HttpResponse, actix_web::Error> {
    log::info!("Attempting to create or update architect company...");
    let user_id = get_user_id_from_headers(&req)?;
    log::info!("User ID {} retrieved.", user_id);
    let mut name = String::new();
    let mut email = String::new();
    let mut phone = String::new();
    let mut location = String::new();
    let mut description = String::new();
    let mut logo_path: Option<String> = None;
    let mut banner_path: Option<String> = None;

    while let Some(mut field) = payload.try_next().await? {
        log::info!("Processing a multipart field...");
        let field_name = field
            .content_disposition()
            .get_name()
            .unwrap_or_default()
            .to_owned();
        log::info!("Field name: {}", field_name);
        
        let mut bytes = Vec::new();
        while let Some(chunk) = field.try_next().await? {
            bytes.extend_from_slice(&chunk);
        }

        match field_name.as_str() {
            "name" => name = String::from_utf8(bytes).unwrap_or_default(),
            "email" => email = String::from_utf8(bytes).unwrap_or_default(),
            "phone" => phone = String::from_utf8(bytes).unwrap_or_default(),
            "location" => location = String::from_utf8(bytes).unwrap_or_default(),
            "description" => description = String::from_utf8(bytes).unwrap_or_default(),
            "logo" => {
                let filename = format!("architect_logo_{}.png", Uuid::new_v4());
                let filepath = format!("../public/uploads/{}", filename);
                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| {
                            eprintln!("Failed to create directory for {}: {}", filepath, e);
                            actix_web::error::ErrorInternalServerError("Failed to save file")
                        })?;
                    }
                }
                std::fs::write(&filepath, &bytes).map_err(|e| {
                    eprintln!("Failed to write file to {}: {}", filepath, e);
                    actix_web::error::ErrorInternalServerError("Failed to save file")
                })?;
                logo_path = Some(format!("/uploads/{}", filename));
            }
            "banner" => {
                let filename = format!("architect_banner_{}.png", Uuid::new_v4());
                let filepath = format!("../public/uploads/{}", filename);
                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| {
                            eprintln!("Failed to create directory for {}: {}", filepath, e);
                            actix_web::error::ErrorInternalServerError("Failed to save file")
                        })?;
                    }
                }
                std::fs::write(&filepath, &bytes).map_err(|e| {
                    eprintln!("Failed to write file to {}: {}", filepath, e);
                    actix_web::error::ErrorInternalServerError("Failed to save file")
                })?;
                banner_path = Some(format!("/uploads/{}", filename));
            }
            _ => {}
        }
    }

    let existing_company = sqlx::query_as::<_, ArchitectCompany>("SELECT * FROM architect_companies WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| {
            eprintln!("Failed to fetch existing architect company: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to process request")
        })?;

    if let Some(company) = existing_company {
        let updated_company = sqlx::query_as::<_, ArchitectCompany>(
            "UPDATE architect_companies SET name = ?, email = ?, phone = ?, location = ?, description = ?, logo_url = ?, banner_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING *"
        )
        .bind(if name.is_empty() { &company.name } else { &name })
        .bind(if email.is_empty() { &company.email } else { &email })
        .bind(if phone.is_empty() { &company.phone } else { &phone })
        .bind(if location.is_empty() { &company.location } else { &location })
        .bind(if description.is_empty() { company.description.as_ref() } else { Some(&description) })
        .bind(logo_path.or(company.logo_url))
        .bind(banner_path.or(company.banner_url))
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|e| {
            eprintln!("Failed to update architect company: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to process request")
        })?;
        Ok(HttpResponse::Ok().json(updated_company))
    } else {
        let new_company = sqlx::query_as::<_, ArchitectCompany>(
            "INSERT INTO architect_companies (user_id, name, email, phone, location, description, logo_url, banner_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
        )
        .bind(user_id)
        .bind(&name)
        .bind(&email)
        .bind(&phone)
        .bind(&location)
        .bind(if description.is_empty() { None } else { Some(&description) })
        .bind(&logo_path)
        .bind(&banner_path)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|e| {
            eprintln!("Failed to create new architect company: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to process request")
        })?;
        Ok(HttpResponse::Created().json(new_company))
    }
}

pub async fn get_architect_projects(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(ErrorResponse { message: e.to_string() }),
    };

    let projects = sqlx::query_as::<_, ArchitectProject>("SELECT * FROM architect_projects WHERE user_id = ?")
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await;

    match projects {
        Ok(projects) => HttpResponse::Ok().json(projects),
        Err(e) => {
            eprintln!("Failed to fetch architect projects: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to fetch architect projects".to_string() })
        }
    }
}

pub async fn create_architect_project(req: HttpRequest, pool: web::Data<SqlitePool>, mut payload: Multipart) -> Result<HttpResponse, actix_web::Error> {
    let user_id = get_user_id_from_headers(&req)?;
    let company = sqlx::query_as::<_, ArchitectCompany>("SELECT * FROM architect_companies WHERE user_id = ?")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await.map_err(|_| actix_web::error::ErrorBadRequest("Architect company not found"))?;

    let mut name = String::new();
    let mut description = String::new();
    let mut project_cost = String::new();
    let mut location = String::new();
    let mut house_plan_path: Option<String> = None;
    let mut maquette_path: Option<String> = None;
    let mut image_paths: Vec<String> = Vec::new();

    while let Some(mut field) = payload.try_next().await? {
        let field_name = field
            .content_disposition()
            .get_name()
            .unwrap_or_default()
            .to_owned();

        let mut bytes = Vec::new();
        while let Some(chunk) = field.try_next().await? {
            bytes.extend_from_slice(&chunk);
        }

        match field_name.as_str() {
            "name" => name = String::from_utf8(bytes).unwrap_or_default(),
            "description" => description = String::from_utf8(bytes).unwrap_or_default(),
            "project_cost" => project_cost = String::from_utf8(bytes).unwrap_or_default(),
            "location" => location = String::from_utf8(bytes).unwrap_or_default(),
            "house_plan" => {
                let filename = format!("architect_house_plan_{}.png", Uuid::new_v4());
                let filepath = format!("../public/uploads/{}", filename);
                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| {
                            eprintln!("Failed to create directory for {}: {}", filepath, e);
                            actix_web::error::ErrorInternalServerError("Failed to save file")
                        })?;
                    }
                }
                std::fs::write(&filepath, &bytes).map_err(|e| {
                    eprintln!("Failed to write file to {}: {}", filepath, e);
                    actix_web::error::ErrorInternalServerError("Failed to save file")
                })?;
                house_plan_path = Some(format!("/uploads/{}", filename));
            }
            "maquette" => {
                let filename = format!("architect_maquette_{}.png", Uuid::new_v4());
                let filepath = format!("../public/uploads/{}", filename);
                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| {
                            eprintln!("Failed to create directory for {}: {}", filepath, e);
                            actix_web::error::ErrorInternalServerError("Failed to save file")
                        })?;
                    }
                }
                std::fs::write(&filepath, &bytes).map_err(|e| {
                    eprintln!("Failed to write file to {}: {}", filepath, e);
                    actix_web::error::ErrorInternalServerError("Failed to save file")
                })?;
                maquette_path = Some(format!("/uploads/{}", filename));
            }
            "images[]" => {
                let filename = format!("architect_image_{}.png", Uuid::new_v4());
                let filepath = format!("../public/uploads/{}", filename);
                if let Some(p) = std::path::Path::new(&filepath).parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| {
                            eprintln!("Failed to create directory for {}: {}", filepath, e);
                            actix_web::error::ErrorInternalServerError("Failed to save file")
                        })?;
                    }
                }
                std::fs::write(&filepath, &bytes).map_err(|e| {
                    eprintln!("Failed to write file to {}: {}", filepath, e);
                    actix_web::error::ErrorInternalServerError("Failed to save file")
                })?;
                image_paths.push(format!("/uploads/{}", filename));
            }
            _ => {}
        }
    }

    let cost: f64 = project_cost.parse().unwrap_or(0.0);

    let new_project = sqlx::query_as::<_, ArchitectProject>(
        "INSERT INTO architect_projects (architect_company_id, user_id, name, description, project_cost, location, house_plan_url, maquette_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
    )
    .bind(company.id)
    .bind(user_id)
    .bind(&name)
    .bind(&description)
    .bind(cost)
    .bind(&location)
    .bind(&house_plan_path)
    .bind(&maquette_path)
    .fetch_one(pool.get_ref())
    .await.map_err(actix_web::error::ErrorInternalServerError)?;

    for image_url in image_paths {
        sqlx::query("INSERT INTO architect_project_images (project_id, image_url) VALUES (?, ?)")
            .bind(new_project.id)
            .bind(&image_url)
            .execute(pool.get_ref())
            .await.map_err(actix_web::error::ErrorInternalServerError)?;
    }

    Ok(HttpResponse::Created().json(new_project))
}

pub async fn update_architect_project(req: HttpRequest, pool: web::Data<SqlitePool>, path: web::Path<i32>, mut payload: Multipart) -> Result<HttpResponse, actix_web::Error> {
    let user_id = get_user_id_from_headers(&req)?;
    let project_id = path.into_inner();

    let mut name = String::new();
    let mut description = String::new();
    let mut project_cost = String::new();
    let mut location = String::new();

    while let Some(mut field) = payload.try_next().await? {
        let field_name = field
            .content_disposition()
            .get_name()
            .unwrap_or_default()
            .to_owned();
        
        let mut bytes = Vec::new();
        while let Some(chunk) = field.try_next().await? {
            bytes.extend_from_slice(&chunk);
        }

        match field_name.as_str() {
            "name" => name = String::from_utf8(bytes).unwrap_or_default(),
            "description" => description = String::from_utf8(bytes).unwrap_or_default(),
            "project_cost" => project_cost = String::from_utf8(bytes).unwrap_or_default(),
            "location" => location = String::from_utf8(bytes).unwrap_or_default(),
            _ => {}
        }
    }

    let cost: f64 = project_cost.parse().unwrap_or(0.0);

    let updated_project = sqlx::query_as::<_, ArchitectProject>(
        "UPDATE architect_projects SET name = ?, description = ?, project_cost = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *"
    )
    .bind(&name)
    .bind(&description)
    .bind(cost)
    .bind(&location)
    .bind(project_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await.map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(updated_project))
}

pub async fn delete_architect_project(req: HttpRequest, pool: web::Data<SqlitePool>, path: web::Path<i32>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(ErrorResponse { message: e.to_string() }),
    };
    let project_id = path.into_inner();

    let result = sqlx::query("DELETE FROM architect_projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => HttpResponse::Ok().json(serde_json::json!({ "message": "Project deleted successfully" })),
        Ok(_) => HttpResponse::NotFound().json(ErrorResponse { message: "Project not found".to_string() }),
        Err(e) => {
            eprintln!("Failed to delete project: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse { message: "Failed to delete project".to_string() })
        }
    }
}