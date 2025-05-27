# Croniq - Cron Job Monitoring Tool

Croniq is a tool designed to help you monitor your scheduled tasks (cron jobs) and get alerted if they fail to run on time or report errors. It provides a simple yet effective way to keep track of your critical background processes.

## Core Features

*   **User Authentication:** Secure registration and login for users.
*   **Job Management:** Create, update, delete, and view monitored jobs with their status.
*   **Flexible Scheduling:** Define job expectations using CRON expressions or simple interval-based schedules (e.g., "every 5 minutes").
*   **Webhook Pinging:** Each job gets a unique URL. Your job is expected to send an HTTP GET or POST request (a "ping") to this URL upon successful completion.
*   **Status Tracking:** Jobs are tracked with statuses like 'active', 'paused', 'healthy' (recently pinged), 'late' (missed expected ping), or 'errored'.
*   **Notification System:** Configurable, multi-channel notifications (Email, Slack, PagerDuty, generic Webhooks) to alert you about job lateness, failure, or recovery.
*   **Agent-Based Reporting (Conceptual):** For advanced scenarios, jobs can report detailed status via an agent. See [Agents & External Integrations](./AGENTS_AND_INTEGRATIONS.md) for more details.

## Project Structure

The Croniq monorepo is organized as follows:

*   `backend/`: Contains the Node.js (TypeScript) application that provides the API and core logic.
*   `frontend/`: Contains the React (TypeScript) single-page application for the user interface.
*   `database/`: Holds the PostgreSQL schema (`schema.sql`) and potentially migration scripts in the future.
*   `example-agent/`: Includes a basic example of an agent script (`report_job_status.sh`) that can be used to report job status to Croniq.
*   `AGENTS_AND_INTEGRATIONS.md`: Documentation on using agents and integrating with external systems.
*   `DEPLOYMENT.md`: A guide for deploying the Croniq application.

## Tech Stack

*   **Backend**:
    *   Node.js
    *   Express.js
    *   TypeScript
    *   PostgreSQL (with `pg` client)
    *   JWT (JSON Web Tokens) for authentication
    *   Jest & Supertest for testing
*   **Frontend**:
    *   React
    *   Vite (build tool)
    *   TypeScript
    *   Axios (for API communication)
    *   React Router (for navigation)
*   **Database**:
    *   PostgreSQL
*   **Deployment (Examples)**:
    *   Docker
    *   Nginx (for serving frontend)

## Getting Started

Detailed setup instructions for each part of the application can be found in their respective README files:

*   **Backend Setup**: [croniq/backend/README.md](./backend/README.md)
*   **Frontend Setup**: [croniq/frontend/README.md](./frontend/README.md)

**High-level setup involves:**

1.  **Prerequisites**: Node.js (v18+ recommended), npm, PostgreSQL server.
2.  **Clone the repository.**
3.  **Setup Backend**: Configure database connection, install dependencies, apply database schema, and start the backend server.
4.  **Setup Frontend**: Install dependencies, configure the API base URL, and start the frontend development server.

## Running the Application (Development)

To run Croniq for development, you'll typically run the backend and frontend servers concurrently:

1.  **Run the Backend Server**:
    ```bash
    cd croniq/backend
    npm run dev 
    # Usually runs on http://localhost:3000
    ```
2.  **Run the Frontend Server**:
    ```bash
    cd croniq/frontend
    npm run dev
    # Usually runs on http://localhost:5173 (or another port if 5173 is busy)
    ```
    Access the application through the frontend URL provided by Vite.

## Testing

For details on running backend unit and integration tests, please refer to the [Backend Testing Documentation](./backend/README.md#testing).

## Documentation

*   **Project Overview**: You are here! (`croniq/README.md`)
*   **Backend Details**: [croniq/backend/README.md](./backend/README.md)
*   **Frontend Details**: [croniq/frontend/README.md](./frontend/README.md)
*   **Agents & Integrations**: [croniq/AGENTS_AND_INTEGRATIONS.md](./AGENTS_AND_INTEGRATIONS.md)
*   **Deployment Guide**: [croniq/DEPLOYMENT.md](./DEPLOYMENT.md)

## Contributing (Optional Placeholder)

We welcome contributions to Croniq! If you're interested in helping, please (TODO: add contribution guidelines, e.g., fork, feature branch, PR, code style).

---

This README provides a comprehensive overview of the Croniq project. Refer to the linked documents for more specific details.
