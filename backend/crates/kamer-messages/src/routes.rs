use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
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
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
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
    pub read_at: Option<chrono::NaiveDateTime>,
    pub created_at: chrono::NaiveDateTime,
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

// Local extract_user_id removed in favor of kamer_auth::extract_user_id

// ============================================================================
// API Endpoints
// ============================================================================

/// POST /api/messages/conversations - Start a conversation
#[post("/conversations")]
pub async fn create_conversation(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<CreateConversationRequest>,
) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    // Check if conversation already exists
    let existing_conversation = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE listing_id = $1 AND guest_id = $2 AND host_id = $3",
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
                "INSERT INTO conversations (id, listing_id, guest_id, host_id) VALUES ($1, $2, $3, $4)",
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
        "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES ($1, $2, $3, $4)",
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
            let _ = sqlx::query(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            )
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

#[derive(Debug, sqlx::FromRow)]
struct ConversationRow {
    id: String,
    listing_id: String,
    guest_id: i32,
    host_id: i32,
    created_at: chrono::NaiveDateTime,
    updated_at: chrono::NaiveDateTime,

    last_message_id: Option<String>,
    last_message_conversation_id: Option<String>,
    last_message_sender_id: Option<i32>,
    last_message_content: Option<String>,
    last_message_read_at: Option<chrono::NaiveDateTime>,
    last_message_created_at: Option<chrono::NaiveDateTime>,

    other_username: Option<String>,
    listing_title: Option<String>,
    listing_image: Option<String>,
}

/// GET /api/messages/conversations - Get all conversations for user
#[get("/conversations")]
pub async fn get_conversations(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let query = r#"
        SELECT 
            c.id, c.listing_id, c.guest_id, c.host_id, c.created_at, c.updated_at,
            m.id as last_message_id, 
            m.conversation_id as last_message_conversation_id,
            m.sender_id as last_message_sender_id,
            m.content as last_message_content, 
            m.read_at as last_message_read_at,
            m.created_at as last_message_created_at,
            u.username as other_username,
            l.title as listing_title,
            (SELECT url FROM listing_photos lp WHERE lp.listing_id = l.id AND lp.is_cover = TRUE LIMIT 1) as listing_image
        FROM conversations c
        LEFT JOIN LATERAL (
            SELECT * FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
        ) m ON true
        LEFT JOIN users u ON u.id = CASE WHEN c.guest_id = $1 THEN c.host_id ELSE c.guest_id END
        LEFT JOIN listings l ON l.id = c.listing_id
        WHERE c.guest_id = $1 OR c.host_id = $1
        ORDER BY c.updated_at DESC
    "#;

    let rows = match sqlx::query_as::<_, ConversationRow>(query)
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            log::error!("Failed to fetch conversations: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch conversations"
            }));
        }
    };

    let result: Vec<ConversationWithDetails> = rows
        .into_iter()
        .map(|row| {
            let other_user_id = if row.guest_id == user_id {
                row.host_id
            } else {
                row.guest_id
            };

            let last_message = if let Some(id) = row.last_message_id {
                Some(Message {
                    id,
                    conversation_id: row.last_message_conversation_id.unwrap_or_default(),
                    sender_id: row.last_message_sender_id.unwrap_or_default(),
                    content: row.last_message_content.unwrap_or_default(),
                    read_at: row.last_message_read_at,
                    created_at: row.last_message_created_at.unwrap_or_default(),
                })
            } else {
                None
            };

            ConversationWithDetails {
                conversation: Conversation {
                    id: row.id,
                    listing_id: row.listing_id,
                    guest_id: row.guest_id,
                    host_id: row.host_id,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                },
                last_message,
                other_user: UserSummary {
                    id: other_user_id,
                    name: row
                        .other_username
                        .unwrap_or_else(|| "Unknown User".to_string()),
                    avatar: None, // Avatar not yet implemented in users table
                },
                listing_title: row.listing_title.unwrap_or_default(),
                listing_image: row.listing_image,
            }
        })
        .collect();

    HttpResponse::Ok().json(result)
}

/// GET /api/messages/conversations/{id} - Get messages for a conversation
#[get("/conversations/{id}")]
pub async fn get_messages(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let conversation_id = path.into_inner();

    // Verify participation
    let participation = sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM conversations WHERE id = $1 AND (guest_id = $2 OR host_id = $3)",
    )
    .bind(&conversation_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match participation {
        Ok(Some(_)) => {
            let messages = sqlx::query_as::<_, Message>(
                "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
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
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<SendMessageRequest>,
) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    // Verify participation
    let participation = sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM conversations WHERE id = $1 AND (guest_id = $2 OR host_id = $3)",
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
                "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES ($1, $2, $3, $4)"
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
                    let _ = sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1")
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
pub async fn get_unread_count(pool: web::Data<PgPool>, req: HttpRequest) -> impl Responder {
    let user_id = match kamer_auth::extract_user_id(&req, pool.get_ref()).await {
        Ok(id) => id,
        Err(err) => return HttpResponse::from_error(err),
    };

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messages 
         JOIN conversations ON messages.conversation_id = conversations.id
         WHERE (conversations.guest_id = $1 OR conversations.host_id = $2)
         AND messages.sender_id != $3 
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
