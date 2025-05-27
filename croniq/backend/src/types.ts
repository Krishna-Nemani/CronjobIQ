// Base User type
export interface User {
  id: number;
  email: string;
  password_hash: string; // Should not be sent to client
  created_at: Date;
}

// Monitored Job type
export interface MonitoredJob {
  id: number;
  user_id: number;
  name: string;
  schedule_type: 'cron' | 'interval';
  schedule: string;
  webhook_url: string;
  status: 'active' | 'paused' | 'errored' | 'healthy' | 'late';
  grace_period_seconds: number;
  last_pinged_at: Date | null;
  expected_next_ping_at: Date | null;
  created_at: Date;
}

// Job Execution type
export interface JobExecution {
  id: string; // Using string for bigserial from DB, can be number if preferred and handled
  monitored_job_id: number;
  status: 'success' | 'failed' | 'late' | 'skipped' | 'errored'; // Added 'errored' based on scheduler logic
  started_at: Date;
  ended_at: Date | null; // Can be null if job is still running or ping type
  output_log: string | null;
}

// Notification Channel type
export interface NotificationChannel {
  id: number;
  user_id: number;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  name: string;
  configuration_details: any; // JSONB
  is_verified: boolean;
  created_at: Date;
}

// Job Notification Setting type
export interface JobNotificationSetting {
  id: number;
  monitored_job_id: number;
  notification_channel_id: number;
  notify_on_failure: boolean;
  notify_on_lateness: boolean;
  notify_on_recovery: boolean;
  created_at: Date;
}

// Combined type for settings with channel details
export interface JobNotificationSettingWithChannelDetails extends NotificationChannel {
  setting_id: number;
  setting_monitored_job_id: number; // Aliased to avoid conflict with NotificationChannel.id if it were 'monitored_job_id'
  setting_notification_channel_id: number; // Aliased
  setting_notify_on_failure: boolean;
  setting_notify_on_lateness: boolean;
  setting_notify_on_recovery: boolean;
  setting_created_at: Date;
}

// For JWT payload
export interface UserPayload {
  userId: number;
  email: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
