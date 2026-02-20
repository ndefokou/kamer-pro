# syntax=docker/dockerfile:1.6
# 1. Build stage
FROM rust:1.83-alpine3.20 AS builder
WORKDIR /usr/src/app

# Install build dependencies for Alpine (including static OpenSSL for musl)
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

# Switch to nightly toolchain so Cargo supports crates that opt into edition2024
RUN rustup default nightly && rustup target add x86_64-unknown-linux-musl

# Copy root dependency manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy source files for all workspace members to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    mkdir -p crates/kamer-accounts/src && echo "" > crates/kamer-accounts/src/lib.rs && \
    mkdir -p crates/kamer-admin/src && echo "" > crates/kamer-admin/src/lib.rs && \
    mkdir -p crates/kamer-api/src && echo "" > crates/kamer-api/src/lib.rs && \
    mkdir -p crates/kamer-auth/src && echo "" > crates/kamer-auth/src/lib.rs && \
    mkdir -p crates/kamer-bookings/src && echo "" > crates/kamer-bookings/src/lib.rs && \
    mkdir -p crates/kamer-calendar/src && echo "" > crates/kamer-calendar/src/lib.rs && \
    mkdir -p crates/kamer-core/src && echo "" > crates/kamer-core/src/lib.rs && \
    mkdir -p crates/kamer-db/src && echo "" > crates/kamer-db/src/lib.rs && \
    mkdir -p crates/kamer-listings/src && echo "" > crates/kamer-listings/src/lib.rs && \
    mkdir -p crates/kamer-messages/src && echo "" > crates/kamer-messages/src/lib.rs && \
    mkdir -p crates/kamer-storage/src && echo "" > crates/kamer-storage/src/lib.rs && \
    mkdir -p crates/kamer-wishlist/src && echo "" > crates/kamer-wishlist/src/lib.rs

# Copy workspace member manifests
COPY crates/kamer-accounts/Cargo.toml crates/kamer-accounts/
COPY crates/kamer-admin/Cargo.toml crates/kamer-admin/
COPY crates/kamer-api/Cargo.toml crates/kamer-api/
COPY crates/kamer-auth/Cargo.toml crates/kamer-auth/
COPY crates/kamer-bookings/Cargo.toml crates/kamer-bookings/
COPY crates/kamer-calendar/Cargo.toml crates/kamer-calendar/
COPY crates/kamer-core/Cargo.toml crates/kamer-core/
COPY crates/kamer-db/Cargo.toml crates/kamer-db/
COPY crates/kamer-listings/Cargo.toml crates/kamer-listings/
COPY crates/kamer-messages/Cargo.toml crates/kamer-messages/
COPY crates/kamer-storage/Cargo.toml crates/kamer-storage/
COPY crates/kamer-wishlist/Cargo.toml crates/kamer-wishlist/

# Build dependencies (caching layer)
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    cargo build --release --locked --target x86_64-unknown-linux-musl

# Now copy the rest of the application files
COPY . .

# Force Cargo to recompile the real source files by updating their timestamps.
# This ensures we don't accidentally package the dummy binary from the previous stage.
RUN find . -name "*.rs" -exec touch {} +

# Build the real application
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/app/target \
    cargo build --release --locked --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/kamer-pro-backend ./backend

# Verify the binary is not a dummy (should be several MBs, whereas dummy is ~500KB)
RUN BSIZE=$(stat -c%s "./backend") && \
    if [ "$BSIZE" -lt 5000000 ]; then \
    echo "Error: Backend binary is too small ($BSIZE bytes). This is likely the dummy binary."; \
    exit 1; \
    fi

# 2. Runtime stage
FROM alpine:3.20
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl ca-certificates curl libgcc postgresql-client su-exec libc6-compat

COPY --from=builder /usr/src/app/backend .
RUN chmod +x backend
COPY --from=builder /usr/src/app/migrations /app/migrations

# Create a non-root user
RUN adduser -D -u 1000 appuser

# Ensure public/uploads directory exists
RUN mkdir -p /app/public/uploads

# Change ownership of the app directory to appuser
RUN chown -R appuser:appuser /app

# Copy the entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8082
ENTRYPOINT ["entrypoint.sh"]
CMD ["./backend"]
