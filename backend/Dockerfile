# syntax=docker/dockerfile:1.6
# 1. Build stage
FROM rust:1.83-alpine3.20 AS builder
WORKDIR /usr/src/app

# Install build dependencies for Alpine (including static OpenSSL for musl)
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

# Switch to nightly toolchain so Cargo supports crates that opt into edition2024
RUN rustup default nightly

# Copy dependency manifests first to leverage Docker cache
COPY Cargo.toml Cargo.lock ./

# Copy workspace member manifests
COPY crates/kamer-accounts/Cargo.toml crates/kamer-accounts/Cargo.toml
COPY crates/kamer-admin/Cargo.toml crates/kamer-admin/Cargo.toml
COPY crates/kamer-api/Cargo.toml crates/kamer-api/Cargo.toml
COPY crates/kamer-auth/Cargo.toml crates/kamer-auth/Cargo.toml
COPY crates/kamer-bookings/Cargo.toml crates/kamer-bookings/Cargo.toml
COPY crates/kamer-calendar/Cargo.toml crates/kamer-calendar/Cargo.toml
COPY crates/kamer-core/Cargo.toml crates/kamer-core/Cargo.toml
COPY crates/kamer-db/Cargo.toml crates/kamer-db/Cargo.toml
COPY crates/kamer-listings/Cargo.toml crates/kamer-listings/Cargo.toml
COPY crates/kamer-messages/Cargo.toml crates/kamer-messages/Cargo.toml
COPY crates/kamer-storage/Cargo.toml crates/kamer-storage/Cargo.toml
COPY crates/kamer-wishlist/Cargo.toml crates/kamer-wishlist/Cargo.toml

# Create a cargo config file with more resilient network settings
RUN mkdir .cargo && \
    echo '[net]' > .cargo/config.toml && \
    echo 'retry = 10' >> .cargo/config.toml && \
    echo 'git-fetch-with-cli = true' >> .cargo/config.toml && \
    echo '[http]' >> .cargo/config.toml && \
    echo 'timeout = 600' >> .cargo/config.toml && \
    echo 'multiplexing = false' >> .cargo/config.toml

# Create dummy source files for all crates to build only dependencies
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && \
    mkdir -p crates/kamer-accounts/src && touch crates/kamer-accounts/src/lib.rs && \
    mkdir -p crates/kamer-admin/src && touch crates/kamer-admin/src/lib.rs && \
    mkdir -p crates/kamer-api/src && touch crates/kamer-api/src/lib.rs && \
    mkdir -p crates/kamer-auth/src && touch crates/kamer-auth/src/lib.rs && \
    mkdir -p crates/kamer-bookings/src && touch crates/kamer-bookings/src/lib.rs && \
    mkdir -p crates/kamer-calendar/src && touch crates/kamer-calendar/src/lib.rs && \
    mkdir -p crates/kamer-core/src && touch crates/kamer-core/src/lib.rs && \
    mkdir -p crates/kamer-db/src && touch crates/kamer-db/src/lib.rs && \
    mkdir -p crates/kamer-listings/src && touch crates/kamer-listings/src/lib.rs && \
    mkdir -p crates/kamer-messages/src && touch crates/kamer-messages/src/lib.rs && \
    mkdir -p crates/kamer-storage/src && touch crates/kamer-storage/src/lib.rs && \
    mkdir -p crates/kamer-wishlist/src && touch crates/kamer-wishlist/src/lib.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    cargo build --release --locked

# Now copy the rest of the application files
COPY . .

# Build the application
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    rustup target add x86_64-unknown-linux-musl && \
    cargo build --release --locked --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/backend ./backend

# 2. Runtime stage
FROM alpine:3.20
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl ca-certificates curl libgcc postgresql-client su-exec libc6-compat

COPY --from=builder /usr/src/app/backend .
RUN chmod +x backend
COPY --from=builder /usr/src/app/migrations /app/migrations

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
