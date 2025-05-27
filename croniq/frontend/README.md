# Croniq Frontend

This directory contains the React (TypeScript) single-page application for Croniq, a cron job monitoring tool. It is built using Vite.

## Setup and Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd croniq/frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    *   The primary environment variable needed is for the backend API URL.
    *   You can create a `.env.development.local` or `.env.production.local` file in this directory to override the default development URL or set a production URL. Alternatively, you can modify `.env.development` directly for local setup.
    *   See the "Environment Variables" section below for details.

## Environment Variables

The following environment variables are used by the frontend. They are typically defined in `.env.*` files (e.g., `.env.development`, `.env.production.local`).

*   **`VITE_API_BASE_URL`**: The base URL for the Croniq backend API.
    *   Example for local development (if backend runs on port 3000): `VITE_API_BASE_URL=http://localhost:3000/api`
    *   For production, this should point to your deployed backend API endpoint.

## Running the Frontend

*   **Development Mode (with Vite HMR):**
    Starts the development server, usually on `http://localhost:5173`.
    ```bash
    npm run dev
    ```

*   **Build for Production:**
    Compiles and minifies the application for production into the `dist/` directory.
    ```bash
    npm run build
    ```
    The contents of `dist/` can then be served by a static web server (like Nginx) or deployed to a hosting platform.

## Key Features Implemented

*   **User Authentication:**
    *   User registration and login pages.
    *   JWT-based authentication managed via `AuthContext`.
    *   Protected routes for authenticated users.
*   **Job Dashboard:**
    *   Lists all monitored jobs for the logged-in user.
    *   Displays job status, schedule, last ping, and next expected ping.
*   **Job Creation and Editing:**
    *   Forms for creating new monitored jobs and editing existing ones.
    *   Supports CRON and interval-based schedules.
    *   Allows configuration of grace periods.
*   **Notification Channel Management:**
    *   CRUD operations for notification channels (Email, Slack, PagerDuty, Generic Webhook).
    *   Dynamic form fields based on selected channel type.
*   **Linking Notifications to Jobs:**
    *   Interface within the job editing page to associate notification channels with a job.
    *   Configuration of notification triggers (on failure, on lateness, on recovery) per job-channel link.

## Project Structure (Frontend - `src/`)

*   `main.tsx`: Main entry point of the application, renders the `App` component.
*   `App.tsx`: Sets up routing using `react-router-dom` and `AuthProvider`.
*   `components/`: Reusable UI components (e.g., `JobListItem.tsx`, `JobForm.tsx`, `ProtectedRoute.tsx`).
*   `pages/`: Top-level page components that correspond to routes (e.g., `DashboardPage.tsx`, `LoginPage.tsx`, `EditJobPage.tsx`).
*   `services/`: Modules for interacting with the backend API (e.g., `api.ts` for Axios setup, `jobService.ts`, `notificationChannelService.ts`).
*   `contexts/`: React context providers for global state management (e.g., `AuthContext.tsx`).
*   `layouts/`: Layout components that define the structure for different parts of the application (e.g., `MainLayout.tsx` for authenticated areas, `AuthLayout.tsx` for login/register pages).
*   `hooks/`: Custom React hooks (if any were created, currently `useAuth` is part of `AuthContext`).
*   `types.ts`: TypeScript interfaces and type definitions used across the frontend.
*   `assets/`: Static assets like images or SVGs.

---

Refer to the main project [README.md](../README.md) for overall project information and backend setup.
