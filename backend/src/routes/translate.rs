use actix_web::{post, web, HttpResponse, Responder};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct TranslateRequest {
    pub q: String,
    pub source: Option<String>,
    pub target: String,
    pub format: Option<String>,
    pub api_key: Option<String>,
}

#[post("/translate")]
pub async fn translate_text(req: web::Json<TranslateRequest>) -> impl Responder {
    let client = Client::new();
    let api_url = "https://libretranslate.de/translate";

    let response = client.post(api_url).json(&req.into_inner()).send().await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                let body = res.text().await.unwrap_or_else(|_| "{}".to_string());
                HttpResponse::Ok()
                    .content_type("application/json")
                    .body(body)
            } else {
                let status = res.status();
                let body = res.text().await.unwrap_or_else(|_| "{}".to_string());
                // Log the error for debugging
                eprintln!("Translation API error: Status: {}, Body: {}", status, body);

                HttpResponse::build(status).body(body)
            }
        }
        Err(e) => {
            eprintln!("Failed to reach translation service: {}", e);
            HttpResponse::InternalServerError()
                .body(format!("Failed to reach translation service: {}", e))
        }
    }
}
