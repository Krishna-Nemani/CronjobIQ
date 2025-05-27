# Croniq Deployment Guide

This guide provides instructions and examples for deploying the Croniq application.

## Overview

Deploying Croniq typically involves setting up and running three main components:

1.  **Backend Server**: The Node.js/Express API application.
2.  **Frontend Application**: The React static assets.
3.  **PostgreSQL Database**: The data store for the application.

Using Docker is recommended for packaging and deploying the backend and frontend services for consistency and ease of management. A managed PostgreSQL service is recommended for the database in production.

## Prerequisites

*   **Docker**: For building and running application containers.
*   **Node.js & npm**: For building the frontend and potentially the backend if not using multi-stage Docker builds.
*   **PostgreSQL Database**: Access to a PostgreSQL server (e.g., a managed cloud database like Amazon RDS, Google Cloud SQL, or Azure Database for PostgreSQL, or a self-hosted instance).
*   **Cloud Provider Account (Optional)**: If deploying to cloud platforms like AWS, Google Cloud, or Azure.
*   **Reverse Proxy (Optional but Recommended)**: Such as Nginx or a cloud load balancer for HTTPS, serving static files, and routing.

## Backend Deployment

The backend is a Node.js application. It can be deployed as a Docker container.

### 1. Backend Dockerfile

Create a `Dockerfile` in the `croniq/backend/` directory (if one doesn't exist) with the following content:

```dockerfile
# croniq/backend/Dockerfile

# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Transpile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production environment
FROM node:18-alpine
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose the port the app runs on
EXPOSE 3000 

# Command to run the application
# Ensure your .env file or environment variables are correctly set up in your deployment environment
CMD ["node", "dist/index.js"]
```

### 2. Building the Backend Docker Image

Navigate to the `croniq/backend` directory and run:

```bash
docker build -t croniq-backend:latest .
```

### 3. Environment Variable Configuration for Production

The backend requires environment variables to be set in the production environment where the container will run. These are typically injected into the Docker container at runtime. Refer to `croniq/backend/.env.example` for all required variables. Key variables include:

*   `NODE_ENV=production`
*   `PORT` (e.g., `3000`)
*   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (pointing to your production PostgreSQL database)
*   `JWT_SECRET` (a strong, unique secret)
*   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (for email notifications)
*   `API_BASE_URL` (if needed by backend for self-references, though usually a frontend concern)

How these are set depends on your deployment platform (e.g., Docker run command `-e` flags, Docker Compose file, Kubernetes ConfigMaps/Secrets, cloud provider's service configuration).

### 4. Running the Backend Container

Example of running the Docker container:

```bash
docker run -d \
  -p 3000:3000 \
  --name croniq-backend-container \
  -e NODE_ENV="production" \
  -e PORT="3000" \
  -e DB_HOST="your_prod_db_host" \
  -e DB_USER="your_prod_db_user" \
  # ... (add all other required environment variables) ... \
  croniq-backend:latest
```

### 5. Database Migration

Ensure the PostgreSQL schema from `croniq/database/schema.sql` is applied to your production database instance *before* starting the backend application for the first time.

```bash
psql -h your_prod_db_host -U your_prod_db_user -d your_prod_db_name -f ./database/schema.sql
```

## Frontend Deployment

The frontend is a React application built using Vite. It consists of static HTML, CSS, and JavaScript files.

### 1. Building for Production

Navigate to the `croniq/frontend` directory and run:

```bash
npm run build
```
This will create a `dist/` directory containing the production-ready static assets.

### 2. Serving Static Files

These static files can be served using various methods:

*   **Using a Web Server (e.g., Nginx)**: This is a common approach, especially if you also need a reverse proxy.
*   **Cloud Storage Services**: Services like AWS S3, Google Cloud Storage, or Azure Blob Storage can host static websites.
*   **Platform as a Service (PaaS)**: Many PaaS offerings (e.g., Vercel, Netlify, GitHub Pages) can directly serve static sites from your Git repository.

### 3. Frontend Dockerfile (Example with Nginx)

Create a `Dockerfile` in the `croniq/frontend/` directory to serve the static assets with Nginx:

```dockerfile
# croniq/frontend/Dockerfile

# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default Nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY --from=builder /app/dist .

# Optional: Copy a custom Nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf 
# (See Nginx configuration example below)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Example `nginx.conf` (optional, place in `croniq/frontend/` if used):**
This configuration helps with single-page applications (SPA) by redirecting all non-file requests to `index.html`.

```nginx
# croniq/frontend/nginx.conf
server {
  listen 80;
  server_name localhost; # Adjust for your domain

  root /usr/share/nginx/html;
  index index.html index.htm;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Optional: Add cache control headers for static assets
  location ~* \.(?:css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public";
  }
}
```

### 4. Building and Running the Frontend Docker Image

Navigate to `croniq/frontend` and run:

```bash
docker build -t croniq-frontend:latest .
docker run -d -p 8080:80 --name croniq-frontend-container croniq-frontend:latest 
# Access at http://localhost:8080 (or your server's IP)
```

### 5. Environment Variable Configuration for Frontend

The primary build-time environment variable for the frontend is `VITE_API_BASE_URL`.
*   **During `npm run build`**: Vite will embed the value of `VITE_API_BASE_URL` from your environment (or `.env.production` file) into the static assets.
*   **If using Docker for frontend**: You might need to set this variable at build time of the frontend Docker image if the API URL is fixed per environment.
    ```bash
    docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com -t croniq-frontend:latest .
    ```
    And in your `croniq/frontend/vite.config.ts` (or similar, depending on Vite version), ensure it can pick up this arg, or use `.env` files that are present during the build. Typically, Vite automatically picks up `VITE_` prefixed env vars.

## Database

*   **Recommendation**: Use a managed PostgreSQL service from a cloud provider (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL). This simplifies setup, maintenance, backups, and scaling.
*   **Schema**: Apply the schema from `croniq/database/schema.sql` to your production database instance as mentioned in the backend deployment section.
*   **Backups**: Configure regular automated backups for your production database. Most managed services offer this.
*   **Maintenance**: Keep your PostgreSQL version updated and monitor performance.

## General Considerations

*   **HTTPS**:
    *   Always use HTTPS for production deployments.
    *   Use a reverse proxy like Nginx, Caddy, or a cloud load balancer to terminate SSL/TLS.
    *   Obtain SSL certificates (e.g., from Let's Encrypt).
*   **CORS (Cross-Origin Resource Sharing)**:
    *   The backend API must be configured to allow requests from the domain where your frontend is hosted.
    *   Update the CORS configuration in `croniq/backend/src/index.ts` (if using the `cors` middleware) to include your production frontend URL in the `origin` whitelist.
*   **Monitoring and Logging**:
    *   Implement logging for both backend and frontend applications.
    *   Use a centralized logging solution (e.g., ELK stack, Grafana Loki, cloud provider logging services).
    *   Monitor application performance, error rates, and resource usage.
*   **Security**:
    *   Keep all dependencies updated.
    *   Secure your `JWT_SECRET` and other sensitive credentials.
    *   Regularly review security best practices.

This guide provides a starting point. Specific deployment steps will vary based on your chosen hosting environment and tools.
