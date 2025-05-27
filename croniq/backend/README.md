# Croniq Backend

This directory contains the Node.js (TypeScript) application that provides the API and core logic for Croniq, a cron job monitoring tool.

## Setup and Installation

1.  **Navigate to the backend directory:**
    ```bash
    cd croniq/backend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file and fill in the required values. See the "Environment Variables" section below for details. Key variables include database connection details and JWT secret.

4.  **Database Setup:**
    *   Ensure you have a running PostgreSQL server.
    *   Create a PostgreSQL database for Croniq (e.g., `croniq_db`).
    *   Create a PostgreSQL database for testing (e.g., `croniq_test_db`).
    *   Apply the schema to both your main and test databases. You can use a tool like `psql` for this:
        ```bash
        psql -U your_db_user -d croniq_db -f ../database/schema.sql
        psql -U your_test_db_user -d croniq_test_db -f ../database/schema.sql 
        # Ensure your_test_db_user has permissions on croniq_test_db
        ```
        Replace `your_db_user` and `your_test_db_user` with the appropriate PostgreSQL usernames.

## Environment Variables

The following environment variables are used by the backend. They should be defined in a `.env` file in the `croniq/backend` directory.

*   `PORT`: The port the backend server will listen on (Default: `3000`).
*   `NODE_ENV`: Set to `development` for development, `production` for production, or `test` for testing.

**Database Configuration (Main):**
*   `DB_HOST`: Hostname of your PostgreSQL server (e.g., `localhost`).
*   `DB_PORT`: Port of your PostgreSQL server (e.g., `5432`).
*   `DB_USER`: PostgreSQL username for the main database.
*   `DB_PASSWORD`: Password for the PostgreSQL user.
*   `DB_NAME`: Name of the main PostgreSQL database (e.g., `croniq_db`).

**Database Configuration (Test):**
*   `TEST_DB_HOST`: Hostname of your test PostgreSQL server (e.g., `localhost`).
*   `TEST_DB_PORT`: Port of your test PostgreSQL server (e.g., `5433` or same as `DB_PORT` if using different DB names on same instance).
*   `TEST_DB_USER`: PostgreSQL username for the test database.
*   `TEST_DB_PASSWORD`: Password for the test PostgreSQL user.
*   `TEST_DB_NAME`: Name of the test PostgreSQL database (e.g., `croniq_test_db`).

**JWT Configuration:**
*   `JWT_SECRET`: A strong, secret string used to sign JSON Web Tokens. Must be at least 32 characters long.

**SMTP Configuration (for Email Notifications):**
*   `SMTP_HOST`: Hostname of your SMTP server (e.g., `smtp.example.com`).
*   `SMTP_PORT`: Port of your SMTP server (e.g., `587`).
*   `SMTP_SECURE`: Set to `true` if using SSL/TLS (e.g., for port 465), `false` otherwise (e.g., for port 587 with STARTTLS).
*   `SMTP_USER`: Username for SMTP authentication.
*   `SMTP_PASS`: Password for SMTP authentication.
*   `EMAIL_FROM`: The "From" address for emails sent by Croniq (e.g., `"Croniq Monitoring <noreply@example.com>"`).

## Running the Backend

*   **Development Mode (with auto-rebuild and nodemon):**
    Watches for file changes, recompiles TypeScript, and restarts the server.
    ```bash
    npm run dev
    ```

*   **Production Mode:**
    First, build the TypeScript code, then run the compiled JavaScript.
    ```bash
    npm run build
    npm start
    ```
    The `npm start` command runs `node dist/index.js`.

*   **Build Only:**
    Compiles TypeScript to JavaScript in the `dist/` directory.
    ```bash
    npm run build
    ```

## Testing

The backend uses Jest for unit and integration testing.

*   **Run all tests:**
    ```bash
    npm test
    ```
    This will execute all `*.test.ts` files in `**/__tests__` directories.

*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

**Test Database Requirements:**
*   Integration tests require a running PostgreSQL server and a dedicated test database (configured via `TEST_DB_*` environment variables).
*   The test database schema must be applied (see "Database Setup").
*   Tests will clear data from tables in the test database before execution. Ensure `NODE_ENV=test` is set when running tests to use the correct database configuration. The `jest.setup.js` file attempts to set this.

## API Overview

The Croniq backend provides a RESTful API. Authentication is typically required for most endpoints and is handled via JWT Bearer tokens in the `Authorization` header.

**Authentication (`/api/auth`)**
*   `POST /api/auth/register`: Register a new user.
*   `POST /api/auth/login`: Log in an existing user and receive a JWT.

**Monitored Jobs (`/api/jobs`)**
*   `POST /api/jobs`: Create a new monitored job. (Auth required)
*   `GET /api/jobs`: List all monitored jobs for the authenticated user. (Auth required)
*   `GET /api/jobs/:jobId`: Get details of a specific monitored job. (Auth required)
*   `PUT /api/jobs/:jobId`: Update a monitored job. (Auth required)
*   `DELETE /api/jobs/:jobId`: Delete a monitored job. (Auth required)

**Notification Channels (`/api/notification-channels`)**
*   `POST /api/notification-channels`: Create a new notification channel. (Auth required)
*   `GET /api/notification-channels`: List all notification channels for the user. (Auth required)
*   `GET /api/notification-channels/:channelId`: Get details of a specific channel. (Auth required)
*   `PUT /api/notification-channels/:channelId`: Update a notification channel. (Auth required)
*   `DELETE /api/notification-channels/:channelId`: Delete a notification channel. (Auth required)

**Job Notification Settings (`/api`)**
*   `POST /api/jobs/:jobId/notification-settings`: Add or update a notification setting for a specific job, linking it to a channel. (Auth required)
*   `GET /api/jobs/:jobId/notification-settings`: List all notification settings for a specific job. (Auth required)
*   `DELETE /api/notification-settings/:settingId`: Remove a specific notification setting (identified by its own ID). (Auth required)

**Webhooks (`/webhook`)**
*   `POST /webhook/ping/:webhookUrl`: Public endpoint for jobs to send pings. This updates the job's status.

## Project Structure (Backend - `src/`)

*   `db.ts`: Configures and exports the PostgreSQL connection pool.
*   `index.ts`: Main application entry point, sets up Express app, middleware, and routes.
*   `middleware/`: Contains custom Express middleware (e.g., `auth_middleware.ts` for JWT verification).
*   `routes/`: Defines API route handlers for different resources (e.g., `auth_routes.ts`, `job_routes.ts`).
*   `services/`: Contains business logic and interacts with the database (e.g., `user_service.ts`, `monitored_job_service.ts`).
*   `types.ts`: Defines shared TypeScript types and interfaces used across the backend.
*   `utils/`: Utility functions (e.g., `schedule_utils.ts` for parsing schedules).
*   `__tests__/`: Contains unit and integration test files.
    *   `integration/`: Integration tests, including API endpoint tests.
    *   `services/`: Unit tests for service layer modules.
    *   `utils/`: Unit tests for utility modules.

---

Refer to the main project [README.md](../README.md) for overall project information.
