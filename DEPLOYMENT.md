# Deployment Guide for Kamer Pro

This guide explains how to deploy the Kamer Pro application using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine or server.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Project Structure

The project consists of three main services:
- **Backend**: A Rust application using Actix Web and PostgreSQL.
- **Frontend**: A React application built with Vite and served via Nginx.
- **Postgres**: A PostgreSQL database container (for local development).

## Quick Start (Development)

To run the application locally:

1.  **Build and Start Containers**:
    ```bash
    docker-compose up --build
    ```

2.  **Access the Application**:
    - Frontend: `http://localhost:3000`
    - Backend API: `http://localhost:8081`
    - Database: `localhost:5432` (User: `postgres`, Password: `password`, DB: `kamerpro`)

3.  **Stop Containers**:
    ```bash
    docker-compose down
    ```

## Production Deployment (e.g., Supabase + Render)

For production, you will likely use a managed database like Supabase and a cloud provider for the backend.

### Database (Supabase)
1.  Create a project on Supabase.
2.  Get your connection string (Transaction mode, port 6543 or 5432).
3.  Run migrations against your Supabase DB:
    You can use `sqlx-cli` locally:
    ```bash
    export DATABASE_URL="postgres://user:pass@host:port/db"
    sqlx migrate run --source backend/migrations
    ```

### Backend
1.  Set `DATABASE_URL` to your production database URL.
2.  Set `RESET_DB=false` to prevent accidental data loss (although the script is safer now).
3.  Deploy the Docker image.

### Database Persistence (Local Docker)

By default, the `docker-compose.yml` is configured for development, which means it **RESETS the database** on every restart (via `RESET_DB=true`).

**FOR PRODUCTION / PERSISTENCE**, you must override this behavior.

### Steps to Prepare for Production

1.  **Environment Variables**:
    Set `RESET_DB=false` for the backend service.
    
    ```bash
    RESET_DB=false docker-compose up -d
    ```

2.  **Migrations**:
    The application uses `sqlx migrate run`.

3.  **Persistent Volumes**:
    - `db-data`: Stores the PostgreSQL data.
    - `uploads-data`: Stores uploaded files.
