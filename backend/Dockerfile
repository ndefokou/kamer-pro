# syntax=docker/dockerfile:1.6
# 1. Build stage
FROM rust:1.83-alpine3.20 AS builder
WORKDIR /usr/src/app

# Install build dependencies for Alpine
RUN apk add --no-cache musl-dev openssl-dev pkgconfig

# Switch to nightly toolchain so Cargo supports crates that opt into edition2024
RUN rustup default nightly

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
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    cargo build --release --locked

# Now copy the rest of the application files
COPY . .

# Ensure public directory exists
RUN mkdir -p public/uploads

# Build the application
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    cargo build --release --locked && \
    cp target/release/backend ./backend

# 2. Runtime stage
FROM alpine:3.20
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl ca-certificates curl libgcc postgresql-client su-exec

COPY --from=builder /usr/src/app/backend .
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
