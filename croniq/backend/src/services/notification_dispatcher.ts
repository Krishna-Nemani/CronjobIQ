import nodemailer from 'nodemailer';
import axios from 'axios';
import { NotificationChannel } from './notification_channel_service';
import { MonitoredJob } from './monitored_job_service';
import { JobExecution } from '../types'; // Corrected path

// SimpleJobExecution interface is removed as we'll use JobExecution from types.ts

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (channelConfig: any, subject: string, textBody: string, htmlBody: string) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: channelConfig.email,
        subject: subject,
        text: textBody,
        html: htmlBody,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${channelConfig.email} with subject "${subject}"`);
    } catch (error) {
        console.error(`Error sending email to ${channelConfig.email}:`, error);
        throw error; // Re-throw to be handled by caller
    }
};

const sendSlackNotification = async (webhookUrl: string, job: MonitoredJob, eventType: string, executionDetails?: JobExecution) => {
    const color = eventType === 'failure' || eventType === 'lateness' ? 'danger' : (eventType === 'recovery' ? 'good' : 'warning');
    const message = `Croniq Alert: Job "${job.name}" (ID: ${job.id}) reported event: ${eventType.toUpperCase()}.`;
    const execLog = executionDetails?.output_log ? `\n\`\`\`\n${executionDetails.output_log}\n\`\`\`` : "";

    const payload = {
        attachments: [{
            color: color,
            title: `Croniq Job Event: ${job.name} - ${eventType.toUpperCase()}`,
            text: `${message}${execLog}\nExpected at: ${job.expected_next_ping_at}\nLast pinged: ${job.last_pinged_at || 'Never'}`,
            fields: [
                { title: "Job ID", value: job.id.toString(), short: true },
                { title: "Schedule", value: `${job.schedule_type} (${job.schedule})`, short: true },
                { title: "Status", value: job.status, short: true},
                { title: "Event Type", value: eventType.toUpperCase(), short: true}
            ],
            footer: "Croniq Monitoring",
            ts: Math.floor(new Date().getTime() / 1000)
        }]
    };
    try {
        await axios.post(webhookUrl, payload);
        console.log(`Slack notification sent for job ${job.id} - event ${eventType}`);
    } catch (error) {
        console.error(`Error sending Slack notification for job ${job.id}:`, error);
        throw error;
    }
};

const sendPagerDutyNotification = async (routingKey: string, job: MonitoredJob, eventType: string, executionDetails?: JobExecution) => {
    const severity = eventType === 'failure' || eventType === 'lateness' ? 'critical' : (eventType === 'recovery' ? 'info' : 'warning');
    const summary = `Croniq: Job "${job.name}" (ID: ${job.id}) ${eventType.toUpperCase()}`;
    
    const payload: any = {
        payload: {
            summary: summary,
            timestamp: new Date().toISOString(),
            severity: severity,
            source: `Croniq_Job_${job.id}`, // A unique identifier for the source of the event
            component: "Croniq Monitoring System",
            group: `croniq_job_${job.id}`, // Group related alerts
            class: eventType === 'failure' || eventType === 'lateness' ? `job_failure_or_late` : `job_recovery`,
            custom_details: {
                job_id: job.id,
                job_name: job.name,
                schedule: `${job.schedule_type} (${job.schedule})`,
                status: job.status,
                event_type: eventType,
                last_pinged_at: job.last_pinged_at,
                expected_next_ping_at: job.expected_next_ping_at,
                output_log: executionDetails?.output_log
            }
        },
        routing_key: routingKey,
        event_action: eventType === 'recovery' ? 'resolve' : 'trigger',
        // For resolve events, a dedup_key matching the trigger event's dedup_key is needed.
        // For simplicity, PagerDuty can often auto-resolve based on source/component if not provided.
        // Or, store and retrieve dedup_key from initial trigger.
        // For now, we'll rely on PagerDuty's default grouping or create a simple one.
        dedup_key: `croniq_job_${job.id}` // Simple dedup key for now
    };

    try {
        await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
        console.log(`PagerDuty notification sent for job ${job.id} - event ${eventType}`);
    } catch (error) {
        console.error(`Error sending PagerDuty notification for job ${job.id}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

const sendGenericWebhookNotification = async (url: string, headers: Record<string, string> | undefined, job: MonitoredJob, eventType: string, executionDetails?: JobExecution) => {
    const payload = {
        job_id: job.id,
        job_name: job.name,
        event_type: eventType,
        status: job.status,
        schedule: `${job.schedule_type} (${job.schedule})`,
        last_pinged_at: job.last_pinged_at,
        expected_next_ping_at: job.expected_next_ping_at,
        timestamp: new Date().toISOString(),
        execution_details: executionDetails
    };
    try {
        await axios.post(url, payload, { headers: headers || {} });
        console.log(`Generic webhook notification sent for job ${job.id} - event ${eventType} to ${url}`);
    } catch (error) {
        console.error(`Error sending generic webhook for job ${job.id} to ${url}:`, error);
        throw error;
    }
};


export const sendNotification = async (
    channel: NotificationChannel,
    eventType: 'failure' | 'lateness' | 'recovery',
    job: MonitoredJob,
    executionDetails?: JobExecution // Using JobExecution from types.ts
): Promise<void> => {
    if (!channel.is_verified) {
        console.log(`Notification channel ${channel.name} (ID: ${channel.id}) is not verified. Skipping notification.`);
        return;
    }

    const subject = `Croniq Alert: Job "${job.name}" - ${eventType.toUpperCase()}`;
    const textBody = `
        Dear User,
        
        This is an alert from Croniq Monitoring.
        
        Job Name: ${job.name} (ID: ${job.id})
        Event Type: ${eventType.toUpperCase()}
        Current Status: ${job.status}
        Schedule: ${job.schedule_type} (${job.schedule})
        Expected Next Ping: ${job.expected_next_ping_at || 'N/A'}
        Last Pinged At: ${job.last_pinged_at || 'Never'}
        
        Execution Details (if any):
        Log: ${executionDetails?.output_log || 'N/A'}
        
        Thank you,
        The Croniq Team
    `;
    const htmlBody = `
        <p>Dear User,</p>
        <p>This is an alert from Croniq Monitoring.</p>
        <ul>
            <li><strong>Job Name:</strong> ${job.name} (ID: ${job.id})</li>
            <li><strong>Event Type:</strong> ${eventType.toUpperCase()}</li>
            <li><strong>Current Status:</strong> ${job.status}</li>
            <li><strong>Schedule:</strong> ${job.schedule_type} (${job.schedule})</li>
            <li><strong>Expected Next Ping:</strong> ${job.expected_next_ping_at || 'N/A'}</li>
            <li><strong>Last Pinged At:</strong> ${job.last_pinged_at || 'Never'}</li>
        </ul>
        ${executionDetails?.output_log ? `<p><strong>Execution Log:</strong></p><pre>${executionDetails.output_log}</pre>` : ''}
        <p>Thank you,<br/>The Croniq Team</p>
    `;

    try {
        switch (channel.type) {
            case 'email':
                if (channel.configuration_details?.email) {
                    await sendEmail(channel.configuration_details, subject, textBody, htmlBody);
                } else {
                    console.error(`Missing email address in configuration for email channel ${channel.id}`);
                }
                break;
            case 'slack':
                if (channel.configuration_details?.webhook_url) {
                    await sendSlackNotification(channel.configuration_details.webhook_url, job, eventType, executionDetails);
                } else {
                     console.error(`Missing webhook_url in configuration for Slack channel ${channel.id}`);
                }
                break;
            case 'pagerduty':
                 if (channel.configuration_details?.routing_key) { // PagerDuty uses routing_key
                    await sendPagerDutyNotification(channel.configuration_details.routing_key, job, eventType, executionDetails);
                } else {
                     console.error(`Missing routing_key in configuration for PagerDuty channel ${channel.id}`);
                }
                break;
            case 'webhook':
                if (channel.configuration_details?.url) {
                    await sendGenericWebhookNotification(channel.configuration_details.url, channel.configuration_details.headers, job, eventType, executionDetails);
                } else {
                    console.error(`Missing url in configuration for generic webhook channel ${channel.id}`);
                }
                break;
            default:
                console.warn(`Unknown notification channel type: ${(channel as any).type}`);
        }
    } catch (error) {
        // Errors are logged by individual sender functions, but we can add a general log here too.
        console.error(`Failed to dispatch notification for job ${job.id} via channel ${channel.id} (${channel.type}). Event: ${eventType}.`);
    }
};
