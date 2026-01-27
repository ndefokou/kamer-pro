use reqwest::Client;
use std::env;
use uuid::Uuid;

#[derive(Clone)]
pub struct S3Storage {
    client: Client,
    bucket: String,
    project_url: String,
    service_key: String,
}

impl S3Storage {
    /// Initialize Supabase storage client
    pub async fn new() -> Result<Self, String> {
        let bucket = env::var("SUPABASE_BUCKET")
            .map_err(|_| "SUPABASE_BUCKET environment variable not set")?;
        
        // roject URL (e.g. https://xyz.supabase.co)
        let mut project_url = env::var("SUPABASE_PUBLIC_URL")
            .map_err(|_| "SUPABASE_PUBLIC_URL environment variable not set")?;
            
        // Clean up URL: remove /storage/v1... suffix if present to get base project URL
        if let Some(idx) = project_url.find("/storage/v1") {
            project_url = project_url[..idx].to_string();
        }
        
        // Remove trailing slash
        if project_url.ends_with('/') {
            project_url.pop();
        }

        // euse S3_ACCESS_KEY or S3_SECRET_KEY as the service key since
        // check for SUPABASE_SERVICE_KEY
        let service_key = env::var("S3_SECRET_KEY")
            .or_else(|_| env::var("S3_ACCESS_KEY"))
            .or_else(|_| env::var("SUPABASE_SERVICE_KEY"))
            .map_err(|_| "No service key found (checked S3_SECRET_KEY, S3_ACCESS_KEY, SUPABASE_SERVICE_KEY)")?;

        let client = Client::new();

        Ok(Self {
            client,
            bucket,
            project_url,
            service_key,
        })
    }

    /// Upload a file to Supabase Storage and return the public URL
    pub async fn upload_file(
        &self,
        file_data: Vec<u8>,
        original_filename: &str,
        content_type: &str,
    ) -> Result<String, String> {
        // Generate unique filename
        let extension = std::path::Path::new(original_filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("jpg");
        
        let unique_filename = format!("{}.{}", Uuid::new_v4(), extension);
        let path = format!("uploads/{}", unique_filename);

        // Supabase Storage API Endpoint
        // POST /storage/v1/object/{bucket}/{path}
        let url = format!(
            "{}/storage/v1/object/{}/{}", 
            self.project_url, 
            self.bucket, 
            path
        );

        println!("Uploading to: {}", url);

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .header("Content-Type", content_type)
            .body(file_data)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Upload failed: {} - {}", status, error_text));
        }

        // Return public URL
        // Public URL format: {project_url}/storage/v1/object/public/{bucket}/{path}
        let public_url = format!(
            "{}/storage/v1/object/public/{}/{}",
            self.project_url,
            self.bucket,
            path
        );
        
        Ok(public_url)
    }

    /// Delete a file from Supabase Storage
    pub async fn delete_file(&self, file_url: &str) -> Result<(), String> {
        // Extract path from URL
        // URL format: .../storage/v1/object/public/{bucket}/{path}
        let search_str = format!("/storage/v1/object/public/{}/", self.bucket);
        let path = file_url
            .split(&search_str)
            .nth(1)
            .ok_or_else(|| "Invalid file URL format".to_string())?;

        // API Endpoint: DELETE /storage/v1/object/{bucket}/{path}
        // Note: DELETE typically takes only {bucket} in the path and the file path in JSON body
        // but Supabase API varies. Standard method is DELETE /storage/v1/object/{bucket} with ["path"] in body
        
        let url = format!(
            "{}/storage/v1/object/{}", 
            self.project_url, 
            self.bucket
        );

        let response = self.client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .json(&serde_json::json!({ "prefixes": [path] }))
            .send()
            .await
            .map_err(|e| format!("Failed to send delete request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Delete failed: {}", response.status()));
        }

        Ok(())
    }
}
