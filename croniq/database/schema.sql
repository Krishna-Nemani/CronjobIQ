-- Users table: Stores information about registered users.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monitored jobs table: Stores information about the jobs being monitored.
CREATE TABLE monitored_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('cron', 'interval')),
    schedule VARCHAR(255) NOT NULL, -- e.g., cron expression or interval string like '5m', '1h'
    webhook_url VARCHAR(2048) UNIQUE NOT NULL, -- Unique URL generated for pings
    status VARCHAR(50) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'errored', 'healthy')),
    grace_period_seconds INTEGER DEFAULT 60 NOT NULL, -- Time in seconds to wait before marking as late
    last_pinged_at TIMESTAMP WITH TIME ZONE,
    expected_next_ping_at TIMESTAMP WITH TIME ZONE, -- Calculated based on schedule and last_pinged_at
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job executions table: Logs each execution or ping received for a monitored job.
CREATE TABLE job_executions (
    id BIGSERIAL PRIMARY KEY,
    monitored_job_id INTEGER NOT NULL REFERENCES monitored_jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'late', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Time ping was received or execution was noted
    ended_at TIMESTAMP WITH TIME ZONE, -- Could be same as started_at for simple pings
    output_log TEXT -- Optional: for agents that might send some output
);

-- Notification channels table: Stores details about the different channels users can be notified through.
CREATE TABLE notification_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'slack', 'pagerduty', 'webhook')),
    name VARCHAR(255) NOT NULL, -- User-defined name for the channel, e.g., "Team Slack"
    configuration_details JSONB NOT NULL, -- e.g., { "email": "user@example.com" } or { "webhook_url": "...", "headers": {...} } for Slack/PagerDuty/generic webhooks
    is_verified BOOLEAN DEFAULT FALSE, -- For channels like email that might need verification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job notification settings table: Links monitored jobs to notification channels and specifies notification preferences.
CREATE TABLE job_notification_settings (
    id SERIAL PRIMARY KEY,
    monitored_job_id INTEGER NOT NULL REFERENCES monitored_jobs(id) ON DELETE CASCADE,
    notification_channel_id INTEGER NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    notify_on_failure BOOLEAN DEFAULT TRUE,
    notify_on_lateness BOOLEAN DEFAULT TRUE,
    notify_on_recovery BOOLEAN DEFAULT FALSE, -- Notify when a job goes from failed/late to success
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (monitored_job_id, notification_channel_id) -- Ensure one setting per job-channel pair
);
