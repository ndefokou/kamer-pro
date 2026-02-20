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
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .unwrap_or_else(|_| Client::new());

    let endpoints = [
        "https://translate.terraprint.co/translate",
        "https://translate.getante.com/translate",
        "https://translate.argosopentech.com/translate",
    ];

    let mut last_error = String::new();

    for api_url in endpoints {
        let response = client
            .post(api_url)
            .header("Content-Type", "application/json")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            .json(&req.0)
            .send()
            .await;

        match response {
            Ok(res) => {
                let status = res.status();
                let body = res.text().await.unwrap_or_else(|_| "{}".to_string());

                if status.is_success()
                    && !body.trim().starts_with("<!DOCTYPE html>")
                    && !body.trim().starts_with("<html")
                {
                    return HttpResponse::Ok()
                        .content_type("application/json")
                        .body(body);
                } else {
                    last_error = format!(
                        "Endpoint {} failed with status {} and body snippet: {}",
                        api_url,
                        status,
                        &body[..std::cmp::min(body.len(), 100)]
                    );
                    eprintln!("{}", last_error);
                }
            }
            Err(e) => {
                last_error = format!("Failed to reach {}: {}", api_url, e);
                eprintln!("{}", last_error);
            }
        }
    }

    HttpResponse::BadGateway().json(serde_json::json!({
        "error": "All translation services failed or returned invalid content",
        "last_error": last_error
    }))
}
