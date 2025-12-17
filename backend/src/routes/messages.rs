use crate::middleware::auth::extract_user_id_from_token;
use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: String,
    pub listing_id: String,
    pub guest_id: i32,
    pub host_id: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationWithDetails {
    pub conversation: Conversation,
    pub last_message: Option<Message>,
    pub other_user: UserSummary,
    pub listing_title: String,
    pub listing_image: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: i32,
    pub content: String,
    pub read_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserSummary {
    pub id: i32,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationRequest {
    pub listing_id: String,
    pub host_id: i32,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: String,
    pub content: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn extract_user_id(req: &HttpRequest) -> Result<i32, HttpResponse> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                return extract_user_id_from_token(token).map_err(|e| {
                    log::error!("Failed to extract user ID from token: {:?}", e);
                    HttpResponse::Unauthorized().json(serde_json::json!({
                        "error": "Invalid or expired token"
                    }))
                });
            }
        }
    }
    if let Some(cookie) = req.cookie("session") {
        return extract_user_id_from_token(cookie.value()).map_err(|e| {
            log::error!("Failed to extract user ID from cookie: {:?}", e);
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired token"
            }))
        });
    }
    Err(HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Missing or invalid authorization header"
    })))
}

// ============================================================================
// API Endpoints
// ============================================================================

/// POST /api/messages/conversations - Start a conversation
#[post("/conversations")]
pub async fn create_conversation(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateConversationRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Check if conversation already exists
    let existing_conversation = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE listing_id = ? AND guest_id = ? AND host_id = ?",
    )
    .bind(&body.listing_id)
    .bind(user_id)
    .bind(body.host_id)
    .fetch_optional(pool.get_ref())
    .await;

    let conversation_id = match existing_conversation {
        Ok(Some(conv)) => conv.id,
        Ok(None) => {
            let new_id = Uuid::new_v4().to_string();
            let result = sqlx::query(
                "INSERT INTO conversations (id, listing_id, guest_id, host_id) VALUES (?, ?, ?, ?)",
            )
            .bind(&new_id)
            .bind(&body.listing_id)
            .bind(user_id)
            .bind(body.host_id)
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => new_id,
                Err(e) => {
                    log::error!("Failed to create conversation: {:?}", e);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to create conversation"
                    }));
                }
            }
        }
        Err(e) => {
            log::error!("Database error checking conversation: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    // Send the initial message
    let message_id = Uuid::new_v4().to_string();
    match sqlx::query(
        "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)",
    )
    .bind(&message_id)
    .bind(&conversation_id)
    .bind(user_id)
    .bind(&body.message)
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => {
            // Update conversation updated_at
            let _ =
                sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                    .bind(&conversation_id)
                    .execute(pool.get_ref())
                    .await;

            HttpResponse::Ok().json(serde_json::json!({
                "conversation_id": conversation_id,
                "message_id": message_id
            }))
        }
        Err(e) => {
            log::error!("Failed to send initial message: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to send message"
            }))
        }
    }
}

/// GET /api/messages/conversations - Get all conversations for user
#[get("/conversations")]
pub async fn get_conversations(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Fetch conversations where user is guest or host
    let conversations = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE guest_id = ? OR host_id = ? ORDER BY updated_at DESC",
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await;

    match conversations {
        Ok(convs) => {
            let mut result = Vec::new();
            for conv in convs {
                // Get last message
                let last_message = sqlx::query_as::<_, Message>(
                    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1"
                )
                .bind(&conv.id)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None);

                // Get other user details
                let other_user_id = if conv.guest_id == user_id {
                    conv.host_id
                } else {
                    conv.guest_id
                };
                let other_user = sqlx::query_as::<_, (String, Option<String>)>(
                    // Assuming username and avatar columns
                    "SELECT username, NULL as avatar FROM users WHERE id = ?", // Placeholder for avatar if not in DB
                )
                .bind(other_user_id)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None);

                let other_user_summary = UserSummary {
                    id: other_user_id,
                    name: other_user
                        .map(|u| u.0)
                        .unwrap_or_else(|| "Unknown User".to_string()),
                    avatar: None, // TODO: Add avatar to users table or fetch from profile
                };

                // Get listing details
                let listing = sqlx::query_as::<_, (String, Option<String>)>( // title, cover photo
                    "SELECT title, (SELECT url FROM listing_photos WHERE listing_id = listings.id AND is_cover = 1 LIMIT 1) as image FROM listings WHERE id = ?"
                )
                .bind(&conv.listing_id)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None);

                result.push(ConversationWithDetails {
                    conversation: conv,
                    last_message,
                    other_user: other_user_summary,
                    listing_title: listing.as_ref().map(|l| l.0.clone()).unwrap_or_default(),
                    listing_image: listing.and_then(|l| l.1),
                });
            }
            HttpResponse::Ok().json(result)
        }
        Err(e) => {
            log::error!("Failed to fetch conversations: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch conversations"
            }))
        }
    }
}

/// GET /api/messages/conversations/{id} - Get messages for a conversation
#[get("/conversations/{id}")]
pub async fn get_messages(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let conversation_id = path.into_inner();

    // Verify participation
    let participation = sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM conversations WHERE id = ? AND (guest_id = ? OR host_id = ?)",
    )
    .bind(&conversation_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match participation {
        Ok(Some(_)) => {
            let messages = sqlx::query_as::<_, Message>(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            )
            .bind(&conversation_id)
            .fetch_all(pool.get_ref())
            .await;

            match messages {
                Ok(msgs) => HttpResponse::Ok().json(msgs),
                Err(e) => {
                    log::error!("Failed to fetch messages: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to fetch messages"
                    }))
                }
            }
        }
        Ok(None) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Access denied"
        })),
        Err(e) => {
            log::error!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }))
        }
    }
}

/// POST /api/messages - Send a message
#[post("")]
pub async fn send_message(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<SendMessageRequest>,
) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    // Verify participation
    let participation = sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM conversations WHERE id = ? AND (guest_id = ? OR host_id = ?)",
    )
    .bind(&body.conversation_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match participation {
        Ok(Some(_)) => {
            let message_id = Uuid::new_v4().to_string();
            match sqlx::query(
                "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)"
            )
            .bind(&message_id)
            .bind(&body.conversation_id)
            .bind(user_id)
            .bind(&body.content)
            .execute(pool.get_ref())
            .await
            {
                Ok(_) => {
                    // Update conversation updated_at
                    let _ = sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                        .bind(&body.conversation_id)
                        .execute(pool.get_ref())
                        .await;

                    HttpResponse::Ok().json(serde_json::json!({
                        "id": message_id,
                        "status": "sent"
                    }))
                }
                Err(e) => {
                    log::error!("Failed to send message: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to send message"
                    }))
                }
            }
        }
        Ok(None) => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Access denied"
        })),
        Err(e) => {
            log::error!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }))
        }
    }
}

/// GET /api/messages/unread-count - Get unread message count
#[get("/unread-count")]
pub async fn get_unread_count(pool: web::Data<SqlitePool>, req: HttpRequest) -> impl Responder {
    let user_id = match extract_user_id(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let count = sqlx::query_scalar::<_, i32>(
        "SELECT COUNT(*) FROM messages 
         JOIN conversations ON messages.conversation_id = conversations.id
         WHERE (conversations.guest_id = ? OR conversations.host_id = ?)
         AND messages.sender_id != ? 
         AND messages.read_at IS NULL",
    )
    .bind(user_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    HttpResponse::Ok().json(serde_json::json!({ "count": count }))
}

/// GET /api/messages/templates - Get message templates (placeholder)
#[get("/templates")]
pub async fn get_message_templates() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!([]))
}
