#!/bin/bash

# report_job_status.sh
#
# Reports the status of a job to a Croniq webhook URL.
#
# Usage:
# ./report_job_status.sh <WEBHOOK_URL> <STATUS> [MESSAGE]
#
# Arguments:
#   WEBHOOK_URL: The unique URL provided by Croniq for the job to monitor.
#   STATUS:      The status of the job. Should be 'success' or 'failed'.
#   MESSAGE:     (Optional) A short message or log output from the job.
#
# Example:
# ./report_job_status.sh "http://localhost:3000/webhook/ping/your_unique_webhook_id" "success" "Job completed in 30s"
# ./report_job_status.sh "http://localhost:3000/webhook/ping/your_unique_webhook_id" "failed" "Job failed due to error X"

# --- Configuration ---
WEBHOOK_URL="$1"
STATUS="$2"
MESSAGE="$3" # Optional message

# --- Input Validation ---
if [ -z "$WEBHOOK_URL" ]; then
  echo "Error: WEBHOOK_URL is required."
  echo "Usage: $0 <WEBHOOK_URL> <STATUS> [MESSAGE]"
  exit 1
fi

if [ "$STATUS" != "success" ] && [ "$STATUS" != "failed" ]; then
  echo "Error: STATUS must be 'success' or 'failed'."
  echo "Usage: $0 <WEBHOOK_URL> <STATUS> [MESSAGE]"
  exit 1
fi

# --- Payload Construction ---
# This script sends a JSON payload.
# IMPORTANT NOTE: The current Croniq backend endpoint (/webhook/ping/:webhookUrl)
# is very simple and only registers a successful ping regardless of the request body.
# It does NOT currently process this JSON payload (status or message).
# This script is designed with a forward-looking approach, anticipating that the
# backend endpoint could be enhanced to understand this kind of structured data.
# For now, a 'failed' status sent by this script will still be recorded as a 'ping'
# by the current backend, effectively a 'success'. True failure reporting requires
# backend changes.

# Construct JSON payload
json_payload="{\"status\": \"$STATUS\""
if [ -n "$MESSAGE" ]; then
  # Escape double quotes in message for valid JSON
  escaped_message=$(echo "$MESSAGE" | sed 's/"/\\"/g')
  json_payload="$json_payload, \"message\": \"$escaped_message\""
fi
json_payload="$json_payload}"

# --- Sending Data ---
echo "Sending payload to $WEBHOOK_URL:"
echo "$json_payload"

# Use curl to send the POST request with the JSON payload
# The -s flag silences curl's progress meter
# The -o /dev/null discards the server response body (we only care if it succeeded)
# The -w "%{http_code}" prints the HTTP status code of the response
http_response_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$json_payload" \
  "$WEBHOOK_URL")

# --- Output ---
if [ "$http_response_code" -eq 200 ] || [ "$http_response_code" -eq 201 ]; then
  echo "Successfully reported status '$STATUS' to Croniq. HTTP Status: $http_response_code"
  # Note: Even if STATUS is 'failed', the current backend processes it as a successful ping.
else
  echo "Error: Failed to report status to Croniq. HTTP Status: $http_response_code"
  # You might want to add retry logic or more robust error handling here in a real agent.
fi

exit 0
