# 1. Build stage
FROM rust:1-bookworm as builder
WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker cache
COPY Cargo.toml Cargo.lock ./

# Create a cargo config file to make network requests more resilient
RUN mkdir .cargo && \
    echo '[net]' > .cargo/config.toml && \
    echo 'retry = 5' >> .cargo/config.toml && \
    echo 'timeout = 300' >> .cargo/config.toml && \
    echo '[http]' >> .cargo/config.toml && \
    echo 'timeout = 300' >> .cargo/config.toml

# Create a dummy main.rs to build only dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build -j 2 --release

# Now copy the rest of the application files
COPY . .

# Build the application. This will be much faster as dependencies are cached.
RUN cargo build -j 2 --release

# Install sqlx-cli, which is needed in the runtime stage
RUN cargo install sqlx-cli

# 2. Runtime stage
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/backend .
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/
COPY --from=builder /usr/src/app/migrations /app/migrations
COPY --from=builder /usr/src/app/public /app/public
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data && mkdir -p /app/public/uploads
# Create a non-root user
RUN useradd -ms /bin/bash appuser
# Copy the entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8082
ENTRYPOINT ["entrypoint.sh"]
CMD ["./backend"]
