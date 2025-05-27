import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth_middleware';
import {
    addNotificationSettingToJob,
    removeNotificationSettingFromJob,
    getNotificationSettingsByJobId,
    JobNotificationSetting
} from '../services/job_notification_settings_service';

const router = express.Router();
router.use(authenticateToken); // Protect all routes

// POST /api/jobs/:jobId/notification-settings - Add/Update a notification setting for a job
router.post('/jobs/:jobId/notification-settings', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const jobId = parseInt(req.params.jobId, 10);
    const { notification_channel_id, notify_on_failure, notify_on_lateness, notify_on_recovery } = req.body;

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID.' });
    }
    if (notification_channel_id === undefined) {
        return res.status(400).json({ message: 'Missing required field: notification_channel_id.' });
    }
    if (typeof notification_channel_id !== 'number') {
        return res.status(400).json({ message: 'Invalid notification_channel_id format.' });
    }
    // Optional boolean fields can be validated if present
    if (notify_on_failure !== undefined && typeof notify_on_failure !== 'boolean') {
        return res.status(400).json({ message: 'Invalid notify_on_failure format.' });
    }
    if (notify_on_lateness !== undefined && typeof notify_on_lateness !== 'boolean') {
        return res.status(400).json({ message: 'Invalid notify_on_lateness format.' });
    }
    if (notify_on_recovery !== undefined && typeof notify_on_recovery !== 'boolean') {
        return res.status(400).json({ message: 'Invalid notify_on_recovery format.' });
    }

    try {
        const setting = await addNotificationSettingToJob(
            userId,
            jobId,
            notification_channel_id,
            notify_on_failure,
            notify_on_lateness,
            notify_on_recovery
        );
        res.status(201).json(setting);
    } catch (error) {
        console.error(`Error adding/updating notification setting for job ${jobId}:`, error);
        if (error.message.includes('not found or user does not have access') || error.message.includes('not verified')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to add or update notification setting.' });
    }
});

// GET /api/jobs/:jobId/notification-settings - List all notification settings for a specific job
router.get('/jobs/:jobId/notification-settings', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const jobId = parseInt(req.params.jobId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID.' });
    }

    try {
        const settings = await getNotificationSettingsByJobId(jobId, userId);
        res.json(settings);
    } catch (error) {
        console.error(`Error fetching notification settings for job ${jobId}:`, error);
        if (error.message.includes('not found or user does not have access')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to retrieve notification settings.' });
    }
});

// DELETE /api/notification-settings/:settingId - Remove a specific notification setting
router.delete('/notification-settings/:settingId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const settingId = parseInt(req.params.settingId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(settingId)) {
        return res.status(400).json({ message: 'Invalid setting ID.' });
    }

    try {
        const success = await removeNotificationSettingFromJob(settingId, userId);
        if (success) {
            res.status(204).send(); // No content
        } else {
            // This path might not be reached if removeNotificationSettingFromJob throws an error for not found.
            res.status(404).json({ message: 'Notification setting not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error deleting notification setting ${settingId}:`, error);
         if (error.message.includes('not found or user does not have access')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to delete notification setting.' });
    }
});

export default router;
