import { query } from '../db';
import { getMonitoredJobById } from './monitored_job_service'; // To check ownership
import { getNotificationChannelById } from './notification_channel_service'; // To check ownership

export interface JobNotificationSetting {
    id: number;
    monitored_job_id: number;
    notification_channel_id: number;
    notify_on_failure: boolean;
    notify_on_lateness: boolean;
    notify_on_recovery: boolean;
    created_at: Date;
}

export const addNotificationSettingToJob = async (
    userId: number, // Added userId for ownership checks
    monitoredJobId: number,
    notificationChannelId: number,
    notifyOnFailure: boolean = true,
    notifyOnLateness: boolean = true,
    notifyOnRecovery: boolean = false
): Promise<JobNotificationSetting | null> => {
    // 1. Verify ownership of the monitored job
    const job = await getMonitoredJobById(monitoredJobId, userId);
    if (!job) {
        throw new Error('Monitored job not found or user does not have access.');
    }

    // 2. Verify ownership of the notification channel
    const channel = await getNotificationChannelById(notificationChannelId, userId);
    if (!channel) {
        throw new Error('Notification channel not found or user does not have access.');
    }
    if (!channel.is_verified) {
        throw new Error(`Notification channel "${channel.name}" is not verified.`);
    }


    // Upsert logic: Check if a setting for this job-channel pair already exists
    const checkSql = 'SELECT * FROM job_notification_settings WHERE monitored_job_id = $1 AND notification_channel_id = $2;';
    const checkResult = await query(checkSql, [monitoredJobId, notificationChannelId]);

    if (checkResult.rows.length > 0) {
        // Update existing setting
        const existingSettingId = checkResult.rows[0].id;
        const updateSql = `
            UPDATE job_notification_settings
            SET notify_on_failure = $1, notify_on_lateness = $2, notify_on_recovery = $3
            WHERE id = $4
            RETURNING *;
        `;
        try {
            const result = await query(updateSql, [notifyOnFailure, notifyOnLateness, notifyOnRecovery, existingSettingId]);
            console.log(`Updated notification setting for job ${monitoredJobId} and channel ${notificationChannelId}`);
            return result.rows[0] as JobNotificationSetting;
        } catch (error) {
            console.error('Error updating job notification setting:', error);
            throw error;
        }
    } else {
        // Create new setting
        const insertSql = `
            INSERT INTO job_notification_settings 
            (monitored_job_id, notification_channel_id, notify_on_failure, notify_on_lateness, notify_on_recovery)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        try {
            const result = await query(insertSql, [monitoredJobId, notificationChannelId, notifyOnFailure, notifyOnLateness, notifyOnRecovery]);
            console.log(`Created new notification setting for job ${monitoredJobId} and channel ${notificationChannelId}`);
            return result.rows[0] as JobNotificationSetting;
        } catch (error) {
            console.error('Error creating job notification setting:', error);
            // Handle potential unique constraint errors if any other unique constraints were added
            throw error;
        }
    }
};

export const removeNotificationSettingFromJob = async (settingId: number, userId: number): Promise<boolean> => {
    // To ensure user ownership, we need to join with monitored_jobs table
    // and check the user_id there.
    const getSettingSql = `
        SELECT jns.* 
        FROM job_notification_settings jns
        JOIN monitored_jobs mj ON jns.monitored_job_id = mj.id
        WHERE jns.id = $1 AND mj.user_id = $2;
    `;
    try {
        const settingResult = await query(getSettingSql, [settingId, userId]);
        if (settingResult.rows.length === 0) {
            throw new Error('Notification setting not found or user does not have access.');
        }

        const deleteSql = 'DELETE FROM job_notification_settings WHERE id = $1;';
        const result = await query(deleteSql, [settingId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting job notification setting:', error);
        throw error;
    }
};

export const getNotificationSettingsByJobId = async (monitoredJobId: number, userId: number): Promise<JobNotificationSetting[]> => {
    // First, ensure the user owns the job
    const job = await getMonitoredJobById(monitoredJobId, userId);
    if (!job) {
        throw new Error('Monitored job not found or user does not have access.');
    }

    const sql = 'SELECT * FROM job_notification_settings WHERE monitored_job_id = $1 ORDER BY created_at DESC;';
    try {
        const result = await query(sql, [monitoredJobId]);
        return result.rows as JobNotificationSetting[];
    } catch (error) {
        console.error(`Error getting notification settings for job ${monitoredJobId}:`, error);
        throw error;
    }
};
