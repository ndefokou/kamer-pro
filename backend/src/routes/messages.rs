use crate::routes::middleware::extract_user_id_from_token;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: i32,
    pub product_id: i32,
    pub buyer_id: i32,
    pub seller_id: i32,
    pub last_message_at: String,
    pub created_at: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct ConversationWithDetails {
    pub id: i32,
    pub product_id: i32,
    pub product_name: String,
    pub product_image: Option<String>,
    pub buyer_id: i32,
    pub buyer_username: String,
    pub seller_id: i32,
    pub seller_username: String,
    pub last_message: Option<String>,
    pub last_message_at: String,
    pub unread_count: i32,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: i32,
    pub conversation_id: i32,
    pub sender_id: i32,
    pub content: String,
    pub message_type: String,
    pub is_read: bool,
    pub created_at: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MessageWithDetails {
    pub id: i32,
    pub conversation_id: i32,
    pub sender_id: i32,
    pub sender_username: String,
    pub content: String,
    pub message_type: String,
    pub is_read: bool,
    pub created_at: String,
    pub images: Vec<String>,
}

#[derive(Deserialize)]
pub struct CreateConversationRequest {
    pub product_id: i32,
    pub seller_id: i32,
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: i32,
    pub content: String,
    pub message_type: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MessageTemplate {
    pub id: i32,
    pub template_text: String,
    pub category: String,
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

// Get all conversations for the logged-in user
#[get("")]
pub async fn get_conversations(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let conversations: Result<Vec<ConversationWithDetails>, _> = sqlx::query_as(
        r#"
        SELECT 
            c.id,
            c.product_id,
            p.name as product_name,
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
            c.buyer_id,
            buyer.username as buyer_username,
            c.seller_id,
            seller.username as seller_username,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            c.last_message_at,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
        FROM conversations c
        JOIN products p ON c.product_id = p.id
        JOIN users buyer ON c.buyer_id = buyer.id
        JOIN users seller ON c.seller_id = seller.id
        WHERE c.buyer_id = ? OR c.seller_id = ?
        ORDER BY c.last_message_at DESC
        "#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await;

    match conversations {
        Ok(convs) => {
            let convs_with_urls: Vec<ConversationWithDetails> = convs
                .into_iter()
                .map(|mut conv| {
                    if let Some(ref image) = conv.product_image {
                        conv.product_image = Some(format!(
                            "http://localhost:8082{}",
                            image.replace("/public", "")
                        ));
                    }
                    conv
                })
                .collect();
            HttpResponse::Ok().json(convs_with_urls)
        }
        Err(e) => {
            eprintln!("Failed to fetch conversations: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                message: "Failed to fetch conversations".to_string(),
            })
        }
    }
}

// Create or get existing conversation
#[post("/conversations")]
pub async fn create_conversation(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<CreateConversationRequest>,
) -> impl Responder {
    let buyer_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    // Check if conversation already exists
    let existing: Result<Conversation, _> = sqlx::query_as(
        "SELECT * FROM conversations WHERE product_id = ? AND buyer_id = ? AND seller_id = ?",
    )
    .bind(payload.product_id)
    .bind(buyer_id)
    .bind(payload.seller_id)
    .fetch_one(pool.get_ref())
    .await;

    match existing {
        Ok(conv) => HttpResponse::Ok().json(conv),
        Err(_) => {
            // Create new conversation
            let result = sqlx::query(
                "INSERT INTO conversations (product_id, buyer_id, seller_id) VALUES (?, ?, ?)",
            )
            .bind(payload.product_id)
            .bind(buyer_id)
            .bind(payload.seller_id)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(res) => {
                    let conv_id = res.last_insert_rowid() as i32;
                    let conversation: Conversation =
                        sqlx::query_as("SELECT * FROM conversations WHERE id = ?")
                            .bind(conv_id)
                            .fetch_one(pool.get_ref())
                            .await
                            .unwrap();
                    HttpResponse::Created().json(conversation)
                }
                Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
                    message: "Failed to create conversation".to_string(),
                }),
            }
        }
    }
}

// Get messages for a conversation
#[get("/{conversation_id}/messages")]
pub async fn get_messages(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let conversation_id = path.into_inner();

    // Verify user is part of the conversation
    let conversation: Result<Conversation, _> =
        sqlx::query_as("SELECT * FROM conversations WHERE id = ?")
            .bind(conversation_id)
            .fetch_one(pool.get_ref())
            .await;

    match conversation {
        Ok(conv) => {
            if conv.buyer_id != user_id && conv.seller_id != user_id {
                return HttpResponse::Forbidden().json(ErrorResponse {
                    message: "You are not part of this conversation".to_string(),
                });
            }
        }
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                message: "Conversation not found".to_string(),
            });
        }
    }

    // Mark messages as read
    let _ = sqlx::query(
        "UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?",
    )
    .bind(conversation_id)
    .bind(user_id)
    .execute(pool.get_ref())
    .await;

    let messages: Result<Vec<Message>, _> = sqlx::query_as(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool.get_ref())
    .await;

    match messages {
        Ok(msgs) => {
            let mut detailed_messages = Vec::new();
            for msg in msgs {
                let username: (String,) = sqlx::query_as("SELECT username FROM users WHERE id = ?")
                    .bind(msg.sender_id)
                    .fetch_one(pool.get_ref())
                    .await
                    .unwrap_or((String::from("Unknown"),));

                let images: Vec<(String,)> =
                    sqlx::query_as("SELECT image_url FROM message_images WHERE message_id = ?")
                        .bind(msg.id)
                        .fetch_all(pool.get_ref())
                        .await
                        .unwrap_or_else(|_| vec![]);

                detailed_messages.push(MessageWithDetails {
                    id: msg.id,
                    conversation_id: msg.conversation_id,
                    sender_id: msg.sender_id,
                    sender_username: username.0,
                    content: msg.content,
                    message_type: msg.message_type,
                    is_read: msg.is_read,
                    created_at: msg.created_at,
                    images: images
                        .into_iter()
                        .map(|i| format!("http://localhost:8082{}", i.0.replace("/public", "")))
                        .collect(),
                });
            }
            HttpResponse::Ok().json(detailed_messages)
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch messages".to_string(),
        }),
    }
}

// Send a text message
#[post("/send")]
pub async fn send_message(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    payload: web::Json<SendMessageRequest>,
) -> impl Responder {
    let sender_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let message_type = payload.message_type.as_deref().unwrap_or("text");

    let result = sqlx::query(
        "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)",
    )
    .bind(payload.conversation_id)
    .bind(sender_id)
    .bind(&payload.content)
    .bind(message_type)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            // Update conversation last_message_at
            let _ = sqlx::query(
                "UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(payload.conversation_id)
            .execute(pool.get_ref())
            .await;

            let message_id = res.last_insert_rowid() as i32;
            let message: Message = sqlx::query_as("SELECT * FROM messages WHERE id = ?")
                .bind(message_id)
                .fetch_one(pool.get_ref())
                .await
                .unwrap();

            HttpResponse::Created().json(message)
        }
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to send message".to_string(),
        }),
    }
}

// Send a message with image
#[post("/send-image")]
pub async fn send_image_message(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let sender_id = get_user_id_from_headers(&req)?;

    let mut conversation_id: Option<i32> = None;
    let mut content = String::new();
    let mut images: Vec<String> = Vec::new();

    while let Some(mut field) = payload
        .try_next()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or_default();

        match field_name {
            "conversation_id" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                conversation_id = String::from_utf8(bytes).ok().and_then(|s| s.parse().ok());
            }
            "content" => {
                let mut bytes = Vec::new();
                while let Some(chunk) = field
                    .try_next()
                    .await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
                {
                    bytes.extend_from_slice(&chunk);
                }
                content = String::from_utf8(bytes).ok().unwrap_or_default();
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

    let conversation_id = conversation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Conversation ID is required"))?;

    // Create message
    let result = sqlx::query(
        "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, 'image')",
    )
    .bind(conversation_id)
    .bind(sender_id)
    .bind(&content)
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create message"))?;

    let message_id = result.last_insert_rowid() as i32;

    // Insert images
    for image in images {
        if let Err(e) = sqlx::query("INSERT INTO message_images (message_id, image_url) VALUES (?, ?)")
            .bind(message_id)
            .bind(&image)
            .execute(pool.get_ref())
            .await
        {
            eprintln!("Failed to insert message image: {}", e);
        }
    }

    // Update conversation
    let _ = sqlx::query("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(conversation_id)
        .execute(pool.get_ref())
        .await;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "message": "Image message sent successfully",
        "message_id": message_id
    })))
}

// Get message templates
#[get("/templates")]
pub async fn get_message_templates(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    let language = req
        .headers()
        .get("Accept-Language")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .and_then(|s| s.split('-').next())
        .unwrap_or("en");

    let templates: Result<Vec<MessageTemplate>, _> =
        sqlx::query_as("SELECT id, template_text, category FROM message_templates WHERE language = ?")
            .bind(language)
            .fetch_all(pool.get_ref())
            .await;

    match templates {
        Ok(templates) => HttpResponse::Ok().json(templates),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to fetch templates".to_string(),
        }),
    }
}

// Get unread message count
#[get("/unread-count")]
pub async fn get_unread_count(req: HttpRequest, pool: web::Data<SqlitePool>) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let count: Result<(i32,), _> = sqlx::query_as(
        r#"
        SELECT COUNT(*) FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.buyer_id = ? OR c.seller_id = ?) 
        AND m.sender_id != ? 
        AND m.is_read = FALSE
        "#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    match count {
        Ok((count,)) => HttpResponse::Ok().json(serde_json::json!({ "count": count })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to get unread count".to_string(),
        }),
    }
}

// Delete a conversation
#[delete("/{conversation_id}")]
pub async fn delete_conversation(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<i32>,
) -> impl Responder {
    let user_id = match get_user_id_from_headers(&req) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::Unauthorized().json(ErrorResponse {
                message: "Unauthorized - Please log in".to_string(),
            })
        }
    };

    let conversation_id = path.into_inner();

    // Verify user is part of the conversation
    let conversation: Result<Conversation, _> =
        sqlx::query_as("SELECT * FROM conversations WHERE id = ?")
            .bind(conversation_id)
            .fetch_one(pool.get_ref())
            .await;

    match conversation {
        Ok(conv) => {
            if conv.buyer_id != user_id && conv.seller_id != user_id {
                return HttpResponse::Forbidden().json(ErrorResponse {
                    message: "You are not part of this conversation".to_string(),
                });
            }
        }
        Err(_) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                message: "Conversation not found".to_string(),
            });
        }
    }

    let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(conversation_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Conversation deleted successfully"
        })),
        Err(_) => HttpResponse::InternalServerError().json(ErrorResponse {
            message: "Failed to delete conversation".to_string(),
        }),
    }
}