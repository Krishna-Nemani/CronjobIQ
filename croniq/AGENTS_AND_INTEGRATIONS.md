# Agents & External Integrations

Croniq is designed to be flexible in how it monitors your scheduled jobs. While the primary and simplest method is a direct HTTP ping to a job's unique webhook URL, more advanced integration patterns can be employed, especially for complex scenarios.

## Agent-Based Monitoring

In some cases, a small agent script or application running alongside your job can provide more robust monitoring and detailed feedback.

**When an Agent Might Be Useful:**

*   **Private Networks:** If your job runs in a network not directly accessible from the public internet (where Croniq is hosted), an agent within that network can make an outbound call to the Croniq webhook.
*   **Wrapping Complex Jobs:** An agent can wrap a multi-step job, reporting success only if all steps complete, or failure if any step fails, along with specific error messages.
*   **Detailed Status & Metrics:** An agent can gather more context about the job's execution (e.g., duration, output logs, custom metrics) and send this to Croniq.
*   **Pre/Post Processing:** An agent can perform actions before a job starts or after it finishes, and then report to Croniq.

**Example Agent:**

We provide a very basic shell script agent in the `example-agent/` directory: `report_job_status.sh`.

*   **Usage:** `./report_job_status.sh <WEBHOOK_URL> <STATUS> [MESSAGE]`
*   `WEBHOOK_URL`: The unique URL provided by Croniq for the job to monitor.
*   `STATUS`: 'success' or 'failed'.
*   `MESSAGE`: (Optional) A short message or log output from the job.

This script demonstrates how an agent can report a job's status by making a POST request to the job's webhook URL. It sends a JSON payload:

```json
{
  "status": "success|failed",
  "message": "optional message here"
}
```

**Conceptual Agent JSON Payload:**

For more advanced agent-based reporting, Croniq conceptually supports (or could be extended to support) a richer JSON payload sent to the job's webhook URL. This allows for more detailed information about the job's execution.

```json
{
  "status": "success" | "failed" | "running",
  "message": "Optional detailed log output or error message from the job.",
  "execution_time_ms": 12345,
  "data": {
    "custom_metric_1": "value1",
    "error_code": "X123"
  }
}
```

*   `status`:
    *   `success`: The job completed successfully.
    *   `failed`: The job encountered an error.
    *   `running`: (Conceptual) For long-running jobs, an agent could send an initial "running" status, followed by a final "success" or "failed". This helps distinguish between a job that hasn't started yet and one that's in progress.
*   `message`: Detailed text output, error messages, or logs from the job.
*   `execution_time_ms`: The duration the job took to complete, in milliseconds.
*   `data`: An optional object for any other structured data relevant to the job's execution.

**Backend Endpoint Note:**

Currently, the Croniq backend endpoint (`/webhook/ping/:webhookUrl`) is designed for simple pings and registers any POST request as a successful check-in, effectively marking the job as "healthy" and updating its `last_pinged_at` and `expected_next_ping_at` times. It **does not yet parse or process the JSON body** sent by the `report_job_status.sh` script or the conceptual payload described above.

To fully leverage detailed agent reports (like distinct failure statuses, messages, or metrics), this backend endpoint would need to be enhanced to:
1.  Parse the incoming JSON payload.
2.  Update the `monitored_jobs.status` based on the `status` field in the payload.
3.  Store the `message`, `execution_time_ms`, and other `data` in the `job_executions` table.
4.  Trigger notifications based on the reported status (e.g., 'failed' status from agent).

This enhancement is planned for future development to enable more sophisticated monitoring capabilities.

## Direct Scheduler Integrations (Conceptual - Future Vision)

Looking ahead, Croniq aims to offer deeper integrations with popular job schedulers and CI/CD platforms. This would move beyond manual webhook setup and allow for more automated monitoring.

**Potential Future Integrations:**

*   **Kubernetes CronJobs:** Automatically discover and monitor CronJobs running in your Kubernetes clusters.
*   **GitHub Actions:** Integrate with GitHub Actions workflows to monitor scheduled or manually triggered CI/CD pipelines.
*   **Jenkins:** Connect to Jenkins instances to track the status of build jobs.
*   **Cloud Schedulers:** (e.g., AWS EventBridge Scheduler, Google Cloud Scheduler)

**How it Might Work:**

These integrations would likely involve:

1.  **Authentication:** Using OAuth or platform-specific API tokens for secure access to the external platform.
2.  **Job Discovery:** Croniq could list available jobs from the integrated platform.
3.  **Automatic Monitoring Setup:** Users could select jobs to monitor, and Croniq would handle the necessary API interactions or webhook configurations on the platform side (if applicable) or use the platform's own event streams.
4.  **Richer Status Updates:** Leveraging platform-specific APIs to get detailed status, logs, and execution history, rather than relying solely on pings.

These direct integrations represent a long-term vision for making Croniq a more comprehensive and automated monitoring solution.
