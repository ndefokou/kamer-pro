# 1. Build stage
FROM rust:1-bookworm as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo install sqlx-cli && \
    cargo build --release

# 2. Runtime stage
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/backend .
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/
COPY --from=builder /usr/src/app/migrations /app/migrations
COPY --from=builder /usr/src/app/public /app/public
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data && mkdir -p /app/public/uploads
# Create a non-root user
RUN useradd -ms /bin/bash appuser
# Copy the entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["entrypoint.sh"]
CMD ["./backend"]
