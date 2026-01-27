# 1. Build stage
FROM rust:1.83-alpine3.20 AS builder
WORKDIR /usr/src/app

# Switch to nightly toolchain to use unstable features
RUN rustup default nightly

# Install build dependencies for Alpine
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

# Copy dependency manifests first to leverage Docker cache
COPY Cargo.toml Cargo.lock ./

# Create a cargo config file with more resilient network settings
RUN mkdir .cargo && \
    echo '[net]' > .cargo/config.toml && \
    echo 'retry = 10' >> .cargo/config.toml && \
    echo 'git-fetch-with-cli = true' >> .cargo/config.toml && \
    echo '[http]' >> .cargo/config.toml && \
    echo 'timeout = 600' >> .cargo/config.toml && \
    echo 'multiplexing = false' >> .cargo/config.toml

# Create a dummy main.rs to build only dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build -j 2 --release

# Now copy the rest of the application files
COPY . .

# Build the application
RUN cargo build -j 2 --release

# Download pre-compiled sqlx-cli binary
RUN cargo install sqlx-cli --version=0.7.3 --features native-tls,rustls,postgres --no-default-features

# 2. Runtime stage
FROM alpine:3.20
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl ca-certificates curl libgcc postgresql-client su-exec

COPY --from=builder /usr/src/app/target/release/backend .
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/
COPY --from=builder /usr/src/app/migrations /app/migrations
COPY --from=builder /usr/src/app/public /app/public

RUN mkdir -p /app/data && mkdir -p /app/public/uploads

# Create a non-root user
RUN adduser -D -s /bin/sh appuser

# Change ownership of the app directory to appuser
RUN chown -R appuser:appuser /app

# Copy the entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8082
ENTRYPOINT ["entrypoint.sh"]
CMD ["./backend"]
