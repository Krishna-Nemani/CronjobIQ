import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth_middleware';
import {
    createNotificationChannel,
    getNotificationChannelById,
    getNotificationChannelsByUser,
    updateNotificationChannel,
    deleteNotificationChannel,
    NotificationChannel
} from '../services/notification_channel_service';

const router = express.Router();
router.use(authenticateToken); // Protect all routes in this router

// POST /api/notification-channels - Create a new notification channel
router.post('/', async (req: Request, res: Response) => {
    const { type, name, configuration_details } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (!type || !name || !configuration_details) {
        return res.status(400).json({ message: 'Missing required fields: type, name, configuration_details.' });
    }
    if (!['email', 'slack', 'pagerduty', 'webhook'].includes(type)) {
        return res.status(400).json({ message: 'Invalid channel type.' });
    }

    try {
        const channel = await createNotificationChannel(userId, type, name, configuration_details);
        res.status(201).json(channel);
    } catch (error) {
        console.error('Error creating notification channel:', error);
        if (error.message.startsWith('Invalid configuration_details')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to create notification channel.' });
    }
});

// GET /api/notification-channels - List all notification channels for the authenticated user
router.get('/', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }

    try {
        const channels = await getNotificationChannelsByUser(userId);
        res.json(channels);
    } catch (error) {
        console.error('Error fetching notification channels for user:', error);
        res.status(500).json({ message: 'Failed to retrieve notification channels.' });
    }
});

// GET /api/notification-channels/:channelId - Get a specific notification channel
router.get('/:channelId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const channelId = parseInt(req.params.channelId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(channelId)) {
        return res.status(400).json({ message: 'Invalid channel ID.' });
    }

    try {
        const channel = await getNotificationChannelById(channelId, userId);
        if (channel) {
            res.json(channel);
        } else {
            res.status(404).json({ message: 'Notification channel not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error fetching notification channel ${channelId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve notification channel.' });
    }
});

// PUT /api/notification-channels/:channelId - Update a notification channel
router.put('/:channelId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const channelId = parseInt(req.params.channelId, 10);
    const updates: Partial<Pick<NotificationChannel, 'name' | 'configuration_details'>> = req.body;

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(channelId)) {
        return res.status(400).json({ message: 'Invalid channel ID.' });
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No update fields provided.' });
    }
     if (updates.name !== undefined && typeof updates.name !== 'string') {
        return res.status(400).json({ message: 'Invalid name format.' });
    }
    if (updates.configuration_details !== undefined && typeof updates.configuration_details !== 'object') {
        return res.status(400).json({ message: 'Invalid configuration_details format.' });
    }


    try {
        const updatedChannel = await updateNotificationChannel(channelId, userId, updates);
        if (updatedChannel) {
            res.json(updatedChannel);
        } else {
            res.status(404).json({ message: 'Notification channel not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error updating notification channel ${channelId}:`, error);
        if (error.message.startsWith('Invalid configuration_details')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to update notification channel.' });
    }
});

// DELETE /api/notification-channels/:channelId - Delete a notification channel
router.delete('/:channelId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const channelId = parseInt(req.params.channelId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(channelId)) {
        return res.status(400).json({ message: 'Invalid channel ID.' });
    }

    try {
        const success = await deleteNotificationChannel(channelId, userId);
        if (success) {
            res.status(204).send(); // No content
        } else {
            res.status(404).json({ message: 'Notification channel not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error deleting notification channel ${channelId}:`, error);
        res.status(500).json({ message: 'Failed to delete notification channel.' });
    }
});

export default router;
