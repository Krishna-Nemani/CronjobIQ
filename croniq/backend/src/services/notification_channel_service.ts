import { query } from '../db';

export interface NotificationChannel {
    id: number;
    user_id: number;
    type: 'email' | 'slack' | 'pagerduty' | 'webhook';
    name: string;
    configuration_details: any; // JSONB, so can be any object
    is_verified: boolean;
    created_at: Date;
}

export interface JobNotificationSettingWithChannel extends NotificationChannel {
    // Fields from job_notification_settings
    setting_id: number;
    monitored_job_id: number;
    notification_channel_id: number; // Redundant with id from NotificationChannel but part of the join
    notify_on_failure: boolean;
    notify_on_lateness: boolean;
    notify_on_recovery: boolean;
    setting_created_at: Date;
}


// Basic validation schemas (can be more robust using a library like Joi or Zod)
const configSchemas = {
    email: (config: any) => config && typeof config.email === 'string' && /\S+@\S+\.\S+/.test(config.email),
    slack: (config: any) => config && typeof config.webhook_url === 'string' && /^https:\/\/hooks\.slack\.com\//.test(config.webhook_url),
    pagerduty: (config: any) => config && typeof config.routing_key === 'string' && config.routing_key.length > 0, // PagerDuty routing keys are typically 32 chars
    webhook: (config: any) => {
        if (!(config && typeof config.url === 'string' && /^https?:\/\//.test(config.url))) {
            return false;
        }
        if (config.headers !== undefined && (typeof config.headers !== 'object' || config.headers === null)) {
            return false;
        }
        if (config.headers) {
            for (const key in config.headers) {
                if (typeof config.headers[key] !== 'string') return false;
            }
        }
        return true;
    }
};

export const createNotificationChannel = async (
    userId: number,
    type: 'email' | 'slack' | 'pagerduty' | 'webhook',
    name: string,
    configurationDetails: any
): Promise<NotificationChannel | null> => {
    // Validate configurationDetails based on type
    const validator = configSchemas[type];
    if (!validator || !validator(configurationDetails)) {
        throw new Error(`Invalid configuration_details for type ${type}.`);
    }

    const isVerified = type !== 'email'; // Email channels start unverified

    const sql = `
        INSERT INTO notification_channels (user_id, type, name, configuration_details, is_verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    try {
        const result = await query(sql, [userId, type, name, JSON.stringify(configurationDetails), isVerified]);
        return result.rows[0] as NotificationChannel;
    } catch (error) {
        console.error('Error creating notification channel:', error);
        // Handle specific errors like unique constraint violations if 'name' per user should be unique
        throw error;
    }
};

export const getNotificationChannelById = async (channelId: number, userId: number): Promise<NotificationChannel | null> => {
    const sql = 'SELECT * FROM notification_channels WHERE id = $1 AND user_id = $2;';
    try {
        const result = await query(sql, [channelId, userId]);
        return result.rows.length > 0 ? result.rows[0] as NotificationChannel : null;
    } catch (error) {
        console.error('Error getting notification channel by ID:', error);
        throw error;
    }
};

export const getNotificationChannelsByUser = async (userId: number): Promise<NotificationChannel[]> => {
    const sql = 'SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY created_at DESC;';
    try {
        const result = await query(sql, [userId]);
        return result.rows as NotificationChannel[];
    } catch (error) {
        console.error('Error getting notification channels by user:', error);
        throw error;
    }
};

export const updateNotificationChannel = async (
    channelId: number,
    userId: number,
    updates: Partial<Pick<NotificationChannel, 'name' | 'configuration_details'>>
): Promise<NotificationChannel | null> => {
    const existingChannel = await getNotificationChannelById(channelId, userId);
    if (!existingChannel) return null; // Or throw error

    // Validate new configuration_details if provided
    if (updates.configuration_details) {
        const validator = configSchemas[existingChannel.type]; // Type cannot be changed, so use existing type
        if (!validator || !validator(updates.configuration_details)) {
            throw new Error(`Invalid configuration_details for type ${existingChannel.type}.`);
        }
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        fieldsToUpdate.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    if (updates.configuration_details !== undefined) {
        fieldsToUpdate.push(`configuration_details = $${paramIndex++}`);
        values.push(JSON.stringify(updates.configuration_details));
        // If email config changes, it might need re-verification
        if (existingChannel.type === 'email') {
            fieldsToUpdate.push(`is_verified = $${paramIndex++}`);
            values.push(false);
        }
    }

    if (fieldsToUpdate.length === 0) return existingChannel;

    values.push(channelId, userId);

    const sql = `
        UPDATE notification_channels
        SET ${fieldsToUpdate.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *;
    `;
    try {
        const result = await query(sql, values);
        return result.rows.length > 0 ? result.rows[0] as NotificationChannel : null;
    } catch (error) {
        console.error('Error updating notification channel:', error);
        throw error;
    }
};

export const deleteNotificationChannel = async (channelId: number, userId: number): Promise<boolean> => {
    // Related job_notification_settings will be deleted by CASCADE constraint in DB.
    const sql = 'DELETE FROM notification_channels WHERE id = $1 AND user_id = $2;';
    try {
        const result = await query(sql, [channelId, userId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting notification channel:', error);
        throw error;
    }
};

export const getNotificationSettingsForJob = async (monitoredJobId: number): Promise<JobNotificationSettingWithChannel[]> => {
    const sql = `
        SELECT
            nc.id, nc.user_id, nc.type, nc.name, nc.configuration_details, nc.is_verified, nc.created_at,
            jns.id as setting_id, jns.monitored_job_id, jns.notification_channel_id,
            jns.notify_on_failure, jns.notify_on_lateness, jns.notify_on_recovery,
            jns.created_at as setting_created_at
        FROM notification_channels nc
        JOIN job_notification_settings jns ON nc.id = jns.notification_channel_id
        WHERE jns.monitored_job_id = $1 AND nc.is_verified = TRUE; 
        -- Only send to verified channels
    `;
    try {
        const result = await query(sql, [monitoredJobId]);
        return result.rows as JobNotificationSettingWithChannel[];
    } catch (error) {
        console.error(`Error getting notification settings for job ${monitoredJobId}:`, error);
        throw error;
    }
};
