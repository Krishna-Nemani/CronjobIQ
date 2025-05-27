import { query } from '../db';
import crypto from 'crypto';
import { calculateNextPingTime } from '../utils/schedule_utils';
import { getNotificationSettingsForJob } from './notification_channel_service'; // For recovery notifications
import { sendNotification } from './notification_dispatcher'; // For recovery notifications
import { JobExecution } from '../types'; // For execution details

// Define the MonitoredJob type based on the schema
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

// The local calculateNextPingTime function has been removed.
// It is now imported from ../utils/schedule_utils.ts

export const generateWebhookUrl = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

export const createMonitoredJob = async (
    userId: number,
    name: string,
    scheduleType: 'cron' | 'interval',
    schedule: string,
    gracePeriodSeconds: number = 60
): Promise<MonitoredJob | null> => {
    const webhookUrl = generateWebhookUrl();
    const initialExpectedNextPingAt = calculateNextPingTime(scheduleType, schedule);

    if (!initialExpectedNextPingAt) {
        throw new Error('Invalid schedule provided, could not calculate next ping time.');
    }

    const sql = `
        INSERT INTO monitored_jobs 
        (user_id, name, schedule_type, schedule, webhook_url, status, grace_period_seconds, expected_next_ping_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *;
    `;
    try {
        const result = await query(sql, [
            userId,
            name,
            scheduleType,
            schedule,
            webhookUrl,
            'active', // Initial status
            gracePeriodSeconds,
            initialExpectedNextPingAt
        ]);
        return result.rows[0] as MonitoredJob;
    } catch (error) {
        console.error('Error creating monitored job:', error);
        throw error;
    }
};

export const getMonitoredJobById = async (jobId: number, userId: number): Promise<MonitoredJob | null> => {
    const sql = 'SELECT * FROM monitored_jobs WHERE id = $1 AND user_id = $2;';
    try {
        const result = await query(sql, [jobId, userId]);
        return result.rows.length > 0 ? result.rows[0] as MonitoredJob : null;
    } catch (error) {
        console.error('Error getting monitored job by ID:', error);
        throw error;
    }
};

export const getMonitoredJobsByUser = async (userId: number): Promise<MonitoredJob[]> => {
    const sql = 'SELECT * FROM monitored_jobs WHERE user_id = $1 ORDER BY created_at DESC;';
    try {
        const result = await query(sql, [userId]);
        return result.rows as MonitoredJob[];
    } catch (error) {
        console.error('Error getting monitored jobs by user:', error);
        throw error;
    }
};

export const updateMonitoredJob = async (
    jobId: number,
    userId: number,
    updates: Partial<Pick<MonitoredJob, 'name' | 'schedule_type' | 'schedule' | 'status' | 'grace_period_seconds'>>
): Promise<MonitoredJob | null> => {
    const existingJob = await getMonitoredJobById(jobId, userId);
    if (!existingJob) return null;

    const fieldsToUpdate: (keyof typeof updates)[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            fieldsToUpdate.push(key as keyof typeof updates);
            values.push(updates[key as keyof typeof updates]);
        }
    }

    if (fieldsToUpdate.length === 0) return existingJob; // No updates

    // Recalculate expected_next_ping_at if schedule changes
    let newExpectedNextPingAt: Date | string | null = existingJob.expected_next_ping_at; // Keep existing by default
    if (updates.schedule || updates.schedule_type) {
        const scheduleType = updates.schedule_type || existingJob.schedule_type;
        const schedule = updates.schedule || existingJob.schedule;
        // If the job was pinged, calculate from last ping, otherwise from now or existing expected time
        const baseDate = existingJob.last_pinged_at || existingJob.expected_next_ping_at || new Date();
        newExpectedNextPingAt = calculateNextPingTime(scheduleType, schedule, baseDate instanceof Date ? baseDate : new Date(baseDate));
        if (!newExpectedNextPingAt) {
            throw new Error('Invalid schedule provided for update, could not calculate next ping time.');
        }
    }
    
    // Add expected_next_ping_at to updates if it changed
    if (newExpectedNextPingAt !== existingJob.expected_next_ping_at) {
        fieldsToUpdate.push('expected_next_ping_at' as any); // Type assertion needed here
        values.push(newExpectedNextPingAt);
    }


    const setClauses = fieldsToUpdate.map((field, i) => `${field} = $${i + 1}`).join(', ');
    values.push(jobId, userId); // For WHERE clause

    const sql = `
        UPDATE monitored_jobs 
        SET ${setClauses} 
        WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${fieldsToUpdate.length + 2}
        RETURNING *;
    `;

    try {
        const result = await query(sql, values);
        return result.rows.length > 0 ? result.rows[0] as MonitoredJob : null;
    } catch (error) {
        console.error('Error updating monitored job:', error);
        throw error;
    }
};

export const deleteMonitoredJob = async (jobId: number, userId: number): Promise<boolean> => {
    const sql = 'DELETE FROM monitored_jobs WHERE id = $1 AND user_id = $2;';
    try {
        const result = await query(sql, [jobId, userId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting monitored job:', error);
        throw error;
    }
};

export const processPing = async (webhookUrl: string): Promise<MonitoredJob | null> => {
    const findJobSql = 'SELECT * FROM monitored_jobs WHERE webhook_url = $1;';
    try {
        const jobResult = await query(findJobSql, [webhookUrl]);
        if (jobResult.rows.length === 0) {
            console.error(`Ping received for unknown webhook URL: ${webhookUrl}`);
            return null;
        }
        const job: MonitoredJob = jobResult.rows[0];
        const previousStatus = job.status; // Capture status before update
        const now = new Date();
        const nextExpectedPing = calculateNextPingTime(job.schedule_type, job.schedule, now);

        if (!nextExpectedPing) {
            console.error(`Could not calculate next ping for job ${job.id} after ping.`);
            // Potentially mark as errored or handle differently
            // For now, we'll leave expected_next_ping_at as is or null
        }

        const updateJobSql = `
            UPDATE monitored_jobs 
            SET last_pinged_at = $1, expected_next_ping_at = $2, status = $3
            WHERE id = $4 RETURNING *;
        `;
        const updatedJobResult = await query(updateJobSql, [now, nextExpectedPing, 'healthy', job.id]);
        const updatedJob: MonitoredJob = updatedJobResult.rows[0];
        
        const createExecutionSql = `
            INSERT INTO job_executions (monitored_job_id, status, started_at, ended_at, output_log) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        // Note: output_log for a successful ping might be minimal or just a timestamp.
        const executionResult = await query(createExecutionSql, [job.id, 'success', now, now, 'Ping received successfully.']);
        const executionRecord: JobExecution | undefined = executionResult.rows[0] as JobExecution | undefined;


        // Handle recovery notifications
        if ((previousStatus === 'late' || previousStatus === 'errored') && updatedJob.status === 'healthy') {
            console.log(`Job ${job.id} has recovered. Previous status: ${previousStatus}, New status: ${updatedJob.status}`);
            const notificationSettings = await getNotificationSettingsForJob(job.id);
            for (const setting of notificationSettings) {
                if (setting.notify_on_recovery) {
                    // Pass the full channel object
                    await sendNotification(setting, 'recovery', updatedJob, executionRecord);
                }
            }
        }

        return updatedJob;
    } catch (error) {
        console.error(`Error processing ping for webhook ${webhookUrl}:`, error);
        // Consider creating a 'failed' job_execution here if appropriate
        throw error;
    }
};

export const findLateJobs = async (): Promise<MonitoredJob[]> => {
    const sql = `
        SELECT * FROM monitored_jobs 
        WHERE status NOT IN ('paused', 'errored') 
        AND expected_next_ping_at < NOW() - (grace_period_seconds * INTERVAL '1 second');
    `;
    // Note: The interval math `NOW() - (grace_period_seconds * INTERVAL '1 second')` is PostgreSQL specific.
    // If using a different DB, this might need adjustment.
    try {
        const result = await query(sql);
        return result.rows as MonitoredJob[];
    } catch (error) {
        console.error('Error finding late jobs:', error);
        throw error;
    }
};
