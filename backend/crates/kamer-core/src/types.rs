use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// User authentication claims
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // User ID
    pub email: String,
    pub exp: usize, // Expiration time
}

/// User role
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Guest,
    Host,
    Admin,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Guest
    }
}

/// Date range for unavailable dates
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DateRange {
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Pagination parameters
#[derive(Debug, Deserialize, Clone)]
pub struct PaginationParams {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    20
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self { page: 1, limit: 20 }
    }
}
