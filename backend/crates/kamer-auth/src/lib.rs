pub mod auth;
pub mod jwks;
pub mod routes;
pub mod supabase_auth;

// Re-export commonly used items
pub use auth::{extract_user_id, extract_user_id_from_token};
pub use routes::*;
pub use supabase_auth::{
    get_or_create_local_user, validate_supabase_token, AuthenticatedUser, SupabaseClaims,
};
