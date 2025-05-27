// From backend schema:
// users: id, email, password_hash, created_at
// monitored_jobs: id, user_id, name, schedule_type, schedule, webhook_url, status, grace_period_seconds, last_pinged_at, expected_next_ping_at, created_at
// job_executions: id, monitored_job_id, status, started_at, ended_at, output_log
// notification_channels: id, user_id, type, name, configuration_details, is_verified, created_at
// job_notification_settings: id, monitored_job_id, notification_channel_id, notify_on_failure, notify_on_lateness, notify_on_recovery, created_at

export interface User {
  id: number;
  email: string;
  // password_hash is not sent to client
  created_at: Date;
}

export type MonitoredJobStatus = 'active' | 'paused' | 'errored' | 'healthy' | 'late';
export type ScheduleType = 'cron' | 'interval';

export interface MonitoredJob {
  id: number;
  user_id: number;
  name: string;
  schedule_type: ScheduleType;
  schedule: string;
  webhook_url: string;
  status: MonitoredJobStatus;
  grace_period_seconds: number;
  last_pinged_at: string | null; // Dates will be strings from JSON
  expected_next_ping_at: string | null; // Dates will be strings from JSON
  created_at: string; // Dates will be strings from JSON
}

export type JobExecutionStatus = 'success' | 'failed' | 'late' | 'skipped' | 'errored';

export interface JobExecution {
  id: string; // Assuming bigserial might be string
  monitored_job_id: number;
  status: JobExecutionStatus;
  started_at: string; // Dates will be strings from JSON
  ended_at: string | null; // Dates will be strings from JSON
  output_log: string | null;
}


export type NotificationChannelType = 'email' | 'slack' | 'pagerduty' | 'webhook';

export interface NotificationChannel {
  id: number;
  user_id: number;
  type: NotificationChannelType;
  name: string;
  configuration_details: any; // JSONB
  is_verified: boolean;
  created_at: string; // Dates will be strings from JSON
}

export interface JobNotificationSetting {
  id: number;
  monitored_job_id: number;
  notification_channel_id: number;
  notify_on_failure: boolean;
  notify_on_lateness: boolean;
  notify_on_recovery: boolean;
  created_at: string; // Dates will be strings from JSON
}

// For JWT payload in AuthContext, if needed for typing req.user
export interface UserPayload {
  userId: number;
  email: string;
}
