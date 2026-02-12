# Supabase Authentication Middleware Usage Examples

This document provides examples of how to use the Supabase JWT authentication middleware in your Rust/Actix-Web backend.

## Setup

1. Add the required environment variables to your `.env` file:
```bash
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
SUPABASE_URL=https://your-project.supabase.co
```

2. The middleware is already configured in `src/middleware/supabase_auth.rs`

## Usage Examples

### Example 1: Protecting a Route with Manual Validation

```rust
use actix_web::{web, HttpRequest, HttpResponse, Responder};
use crate::middleware::supabase_auth::extract_user_id;

#[actix_web::get("/protected-endpoint")]
async fn protected_endpoint(req: HttpRequest) -> impl Responder {
    // Validate and extract user ID
    match extract_user_id(&req).await {
        Ok(user_id) => {
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Access granted",
                "user_id": user_id,
            }))
        }
        Err(_) => {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Unauthorized"
            }))
        }
    }
}
```

### Example 2: Using in Multiple Routes

```rust
use actix_web::{web, HttpRequest, HttpResponse, Responder};
use crate::middleware::supabase_auth::extract_user_id;

#[actix_web::get("/api/profile")]
async fn get_profile(req: HttpRequest, pool: web::Data<PgPool>) -> impl Responder {
    let user_id = match extract_user_id(&req).await {
        Ok(id) => id,
        Err(e) => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": format!("Authentication failed: {}", e)
        })),
    };

    // Use user_id to fetch profile from database
    // ...
    HttpResponse::Ok().json(serde_json::json!({
        "user_id": user_id,
        "profile": "..."
    }))
}

#[actix_web::post("/api/listings")]
async fn create_listing(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    listing_data: web::Json<CreateListingData>
) -> impl Responder {
    let user_id = match extract_user_id(&req).await {
        Ok(id) => id,
        Err(_) => return HttpResponse::Unauthorized().finish(),
    };

    // Create listing for user_id
    // ...
    HttpResponse::Created().finish()
}
```

### Example 3: Creating a Reusable Auth Guard

```rust
use actix_web::{Error, HttpRequest};
use crate::middleware::supabase_auth::extract_user_id;

/// Helper macro to require authentication
macro_rules! require_auth {
    ($req:expr) => {
        match extract_user_id(&$req).await {
            Ok(user_id) => user_id,
            Err(e) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
                "error": format!("Authentication required: {}", e)
            }))),
        }
    };
}

#[actix_web::get("/api/bookings")]
async fn get_bookings(req: HttpRequest) -> Result<HttpResponse, Error> {
    let user_id = require_auth!(req);
    
    // Fetch bookings for user_id
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "user_id": user_id,
        "bookings": []
    })))
}
```

## Testing with cURL

### With Supabase Token
```bash
# Get token from Supabase (after login)
TOKEN="your-supabase-jwt-token"

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8082/api/profile
```

### Response Examples

**Success:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com"
}
```

**Failure:**
```json
{
  "error": "Invalid or expired token"
}
```

## Migration Strategy

### Phase 1: Add Supabase Auth Alongside Legacy
- Keep existing auth middleware
- Add Supabase auth to new routes
- Test thoroughly

### Phase 2: Hybrid Authentication
- Support both auth methods
- Gradually migrate users
- Monitor usage

### Phase 3: Full Migration
- Remove legacy auth
- All routes use Supabase
- Clean up old code

## Troubleshooting

### "SUPABASE_JWT_SECRET not configured"
- Ensure `.env` file has `SUPABASE_JWT_SECRET`
- Restart the server after adding

### "Invalid or expired token"
- Check token expiration
- Verify JWT secret matches Supabase dashboard
- Ensure token is from correct Supabase project

### "Missing Authorization header"
- Ensure frontend sends `Authorization: Bearer <token>`
- Check CORS configuration
