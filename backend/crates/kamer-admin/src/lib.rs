pub mod admin;
pub mod reports;
pub mod roles;

// Re-export all route handlers
pub use admin::*;
pub use reports::*;
pub use roles::*;
