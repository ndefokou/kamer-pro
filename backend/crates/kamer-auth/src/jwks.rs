use jsonwebtoken::{jwk::Jwk as JsonWebKey, DecodingKey};
use moka::future::Cache;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::env;
use std::time::Duration;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct JwksResponse {
    pub keys: Vec<serde_json::Value>,
}

pub static KEY_CACHE: Lazy<Cache<String, DecodingKey>> = Lazy::new(|| {
    Cache::builder()
        .max_capacity(10)
        .time_to_live(Duration::from_secs(3600))
        .build()
});

pub async fn get_decoding_key(kid: &str) -> Option<DecodingKey> {
    if let Some(key) = KEY_CACHE.get(kid).await {
        return Some(key);
    }

    // Cache miss, fetch JWKS
    match fetch_jwks().await {
        Ok(jwks) => {
            log::info!("Fetched {} public keys from Supabase", jwks.keys.len());
            let mut found_key = None;
            for jwk_value in jwks.keys {
                // Parse the JWK using jsonwebtoken's own struct
                if let Ok(jwk) = serde_json::from_value::<JsonWebKey>(jwk_value.clone()) {
                    let current_kid = jwk.common.key_id.clone().unwrap_or_default();

                    // Native decoding from JWK (Available in jsonwebtoken 9)
                    if let Ok(decoding_key) = DecodingKey::from_jwk(&jwk) {
                        KEY_CACHE
                            .insert(current_kid.clone(), decoding_key.clone())
                            .await;
                        if current_kid == kid {
                            found_key = Some(decoding_key);
                        }
                    } else {
                        log::error!(
                            "Failed to create DecodingKey from JWK for kid: {}",
                            current_kid
                        );
                    }
                }
            }
            return found_key;
        }
        Err(e) => {
            log::error!("Failed to fetch JWKS from Supabase: {:?}", e);
        }
    }

    None
}

async fn fetch_jwks() -> Result<JwksResponse, Box<dyn std::error::Error>> {
    let supabase_url = env::var("SUPABASE_PUBLIC_URL").or_else(|_| env::var("SUPABASE_URL"))?;
    // The correct endpoint discovered via .well-known
    let url = format!(
        "{}/auth/v1/.well-known/jwks.json",
        supabase_url.trim_end_matches('/')
    );

    log::debug!("Fetching JWKS from {}", url);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;
    let response = client
        .get(&url)
        .send()
        .await?
        .json::<JwksResponse>()
        .await?;

    Ok(response)
}
