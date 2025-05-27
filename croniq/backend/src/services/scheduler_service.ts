import cron from 'node-cron';
import { findLateJobs, MonitoredJob } from './monitored_job_service';
import { query } from '../db';
import { calculateIntervalMs } from '../utils/schedule_utils';
import { getNotificationSettingsForJob, JobNotificationSettingWithChannel } from './notification_channel_service'; // Import for fetching settings
import { sendNotification } from './notification_dispatcher'; // Import for sending notifications
import { JobExecution } from '../types'; // For execution details

// Define what "too long" for a late job means
// This is a simple example; more sophisticated logic could be based on job's schedule.
const MAX_LATE_THRESHOLD_MULTIPLIER = 3; // Mark as errored if late for 3x its grace period + expected interval

export const checkLateJobs = async () => {
    console.log('Scheduler: Checking for late jobs...');
    try {
        const lateJobs = await findLateJobs();

        if (lateJobs.length === 0) {
            console.log('Scheduler: No late jobs found.');
            return;
        }

        for (const job of lateJobs) {
            console.log(`Scheduler: Job ID ${job.id} (${job.name}) is late. Expected at: ${job.expected_next_ping_at}`);

            // Determine if the job has been late for too long
            // Determine if the job has been late for too long
            let newStatus: 'late' | 'errored' = 'late';
            
            if (job.expected_next_ping_at) { // Ensure expected_next_ping_at is not null
                const timeSinceExpected = new Date().getTime() - new Date(job.expected_next_ping_at).getTime();
                const jobIntervalMs = calculateIntervalMs(job.schedule_type, job.schedule);
            
                if (jobIntervalMs && timeSinceExpected > (job.grace_period_seconds * 1000 + jobIntervalMs) * MAX_LATE_THRESHOLD_MULTIPLIER) {
                    newStatus = 'errored';
                    console.log(`Scheduler: Job ID ${job.id} has been late for too long (expected at ${job.expected_next_ping_at}, grace ${job.grace_period_seconds}s, interval ${jobIntervalMs}ms). Marking as errored.`);
                }
            } else {
                 console.warn(`Scheduler: Job ID ${job.id} is late but has no expected_next_ping_at. Skipping 'errored' check.`);
            }

            // Update job status to 'late' (or 'errored')
            // Note: updateMonitoredJob requires userId, which we don't have directly here.
            // This indicates a potential design consideration: scheduler might need privileged access
            // or a dedicated service function that doesn't require userId for system actions.
            // For now, we'll bypass the userId check by directly updating the DB or modifying updateMonitoredJob.
            // Let's assume a direct DB update for simplicity in this step.
             try {
                const updateSql = 'UPDATE monitored_jobs SET status = $1 WHERE id = $2 RETURNING *;';
                const updatedJobResult = await query(updateSql, [newStatus, job.id]);
                if (updatedJobResult.rows.length > 0) {
                     console.log(`Scheduler: Job ID ${job.id} status updated to ${newStatus}.`);
                } else {
                    console.error(`Scheduler: Failed to update status for job ID ${job.id}. Job not found?`);
                    continue; // Skip creating execution record if update failed
                }
            } catch (dbError) {
                console.error(`Scheduler: DB error updating status for job ID ${job.id}:`, dbError);
                continue; // Skip if cannot update status
            }


            // Create a job_executions record
            const executionSql = `
                INSERT INTO job_executions (monitored_job_id, status, started_at, ended_at, output_log) 
                VALUES ($1, $2, $3, $4, $5);
            `;
            try {
                await query(executionSql, [
                    job.id, 
                    newStatus, // 'late' or 'errored'
                    new Date(), // started_at
                    new Date(), // ended_at (can be same as started_at for this type of event)
                    `Job detected as ${newStatus} by scheduler. Expected at ${job.expected_next_ping_at}.`
                ]);
                console.log(`Scheduler: Created 'late' execution record for job ID ${job.id}.`);
            } catch (dbError) {
                 console.error(`Scheduler: DB error creating execution record for job ID ${job.id}:`, dbError);
            }
            
            const executionOutputLog = `Job detected as ${newStatus} by scheduler. Expected at ${job.expected_next_ping_at}.`;
            let executionRecord: JobExecution | undefined;
            try {
                const executionResult = await query(executionSql, [
                    job.id, 
                    newStatus, // 'late' or 'errored'
                    new Date(), // started_at
                    new Date(), // ended_at
                    executionOutputLog
                ]);
                if (executionResult.rows.length > 0) {
                    console.log(`Scheduler: Created '${newStatus}' execution record for job ID ${job.id}.`);
                    executionRecord = executionResult.rows[0] as JobExecution;
                } else {
                    console.error(`Scheduler: Failed to create execution record for job ID ${job.id}.`);
                }
            } catch (dbError) {
                 console.error(`Scheduler: DB error creating execution record for job ID ${job.id}:`, dbError);
            }

            // Send notifications
            if (newStatus === 'late' || newStatus === 'errored') { // Or just always if status changed meaningfully
                const notificationSettings = await getNotificationSettingsForJob(job.id);
                for (const setting of notificationSettings) {
                    const eventType = newStatus === 'late' ? 'lateness' : 'failure'; // map 'errored' to 'failure'
                    if ((eventType === 'lateness' && setting.notify_on_lateness) || (eventType === 'failure' && setting.notify_on_failure)) {
                        // Pass the full channel object from the joined query
                        await sendNotification(setting, eventType, job, executionRecord);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Scheduler: Error during late job check:', error);
    }
};

export const startScheduler = () => {
    // Schedule the task to run every minute
    // For testing, you might use a shorter interval like '*/10 * * * * *' (every 10 seconds)
    // but '*/1 * * * *' (every minute) is more standard for this kind of check.
    cron.schedule('*/1 * * * *', checkLateJobs, {
        scheduled: true,
        timezone: "UTC" // Or your server's timezone
    });

    console.log('Scheduler started. Will check for late jobs every minute.');
};
