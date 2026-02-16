pub mod aggregate;
pub mod translate;
pub mod upload;

// Re-export all route handlers
pub use aggregate::*;
pub use translate::*;
pub use upload::*;

// Re-export route configuration
pub mod config;
pub use config::configure_routes;
