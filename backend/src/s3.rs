use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::ByteStream;
use std::env;
use uuid::Uuid;

#[derive(Clone)]
pub struct S3Storage {
    client: Client,
    bucket: String,
    public_url_base: String,
}

impl S3Storage {
    /// Initialize S3 storage client with Supabase configuration
    pub async fn new() -> Result<Self, String> {
        let bucket = env::var("SUPABASE_BUCKET")
            .map_err(|_| "SUPABASE_BUCKET environment variable not set")?;
        
        let public_url_base = env::var("SUPABASE_PUBLIC_URL")
            .map_err(|_| "SUPABASE_PUBLIC_URL environment variable not set")?;

        let endpoint_url = env::var("S3_ENDPOINT")
            .map_err(|_| "S3_ENDPOINT environment variable not set")?;

        let access_key = env::var("S3_ACCESS_KEY")
            .map_err(|_| "S3_ACCESS_KEY environment variable not set")?;

        let secret_key = env::var("S3_SECRET_KEY")
            .map_err(|_| "S3_SECRET_KEY environment variable not set")?;

        let region = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        // Configure AWS SDK for Supabase S3-compatible storage
        let credentials = aws_sdk_s3::config::Credentials::new(
            access_key,
            secret_key,
            None,
            None,
            "supabase",
        );

        let config = aws_sdk_s3::config::Builder::new()
            .region(aws_sdk_s3::config::Region::new(region))
            .endpoint_url(endpoint_url)
            .credentials_provider(credentials)
            .force_path_style(true) // Required for Supabase
            .behavior_version_latest()
            .build();

        let client = Client::from_conf(config);

        Ok(Self {
            client,
            bucket,
            public_url_base,
        })
    }

    /// Upload a file to S3 and return the public URL
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
        let key = format!("uploads/{}", unique_filename);

        // Upload to S3
        let byte_stream = ByteStream::from(file_data);
        
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .body(byte_stream)
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| format!("Failed to upload to S3: {:?}", e))?;

        // Return public URL
        let public_url = format!("{}/{}", self.public_url_base, key);
        Ok(public_url)
    }

    /// Delete a file from S3
    pub async fn delete_file(&self, file_url: &str) -> Result<(), String> {
        // Extract key from URL
        let key = file_url
            .strip_prefix(&format!("{}/", self.public_url_base))
            .ok_or_else(|| "Invalid S3 URL format".to_string())?;

        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("Failed to delete from S3: {:?}", e))?;

        Ok(())
    }

    /// Get the public URL for a file
    pub fn get_public_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url_base, key)
    }
}
