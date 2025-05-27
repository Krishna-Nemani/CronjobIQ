import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth_middleware';
import { 
    createMonitoredJob, 
    getMonitoredJobById, 
    getMonitoredJobsByUser, 
    updateMonitoredJob, 
    deleteMonitoredJob,
    MonitoredJob
} from '../services/monitored_job_service';

const router = express.Router();

// All routes in this file are protected by the authenticateToken middleware
router.use(authenticateToken);

// POST /api/jobs - Create a new monitored job
router.post('/', async (req: Request, res: Response) => {
    const { name, schedule_type, schedule, grace_period_seconds } = req.body;
    const userId = req.user?.userId; // Assuming userId is stored in req.user by authenticateToken

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }

    if (!name || !schedule_type || !schedule) {
        return res.status(400).json({ message: 'Missing required fields: name, schedule_type, schedule.' });
    }

    // Validate schedule_type
    if (!['cron', 'interval'].includes(schedule_type)) {
        return res.status(400).json({ message: 'Invalid schedule_type. Must be "cron" or "interval".' });
    }

    // Basic validation for schedule based on type (can be more robust)
    if (schedule_type === 'cron') {
        // Very basic cron validation (5 or 6 parts)
        if (schedule.split(' ').length < 5 || schedule.split(' ').length > 6) {
             return res.status(400).json({ message: 'Invalid cron schedule format.' });
        }
    } else if (schedule_type === 'interval') {
        if (!/^\d+[mhd]$/.test(schedule)) {
            return res.status(400).json({ message: 'Invalid interval format. Use e.g., "5m", "1h", "2d".' });
        }
    }
    
    if (grace_period_seconds !== undefined && (typeof grace_period_seconds !== 'number' || grace_period_seconds < 0)) {
        return res.status(400).json({ message: 'Invalid grace_period_seconds. Must be a non-negative number.' });
    }

    try {
        const job = await createMonitoredJob(userId, name, schedule_type, schedule, grace_period_seconds);
        res.status(201).json(job);
    } catch (error) {
        console.error('Error creating monitored job:', error);
        if (error.message.includes('Invalid schedule')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to create monitored job.' });
    }
});

// GET /api/jobs - List all jobs for the authenticated user
router.get('/', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }

    try {
        const jobs = await getMonitoredJobsByUser(userId);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs for user:', error);
        res.status(500).json({ message: 'Failed to retrieve jobs.' });
    }
});

// GET /api/jobs/:jobId - Get a specific job
router.get('/:jobId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const jobId = parseInt(req.params.jobId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID.' });
    }

    try {
        const job = await getMonitoredJobById(jobId, userId);
        if (job) {
            res.json(job);
        } else {
            res.status(404).json({ message: 'Job not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error fetching job ${jobId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve job.' });
    }
});

// PUT /api/jobs/:jobId - Update a job
router.put('/:jobId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const jobId = parseInt(req.params.jobId, 10);
    const updates: Partial<Pick<MonitoredJob, 'name' | 'schedule_type' | 'schedule' | 'status' | 'grace_period_seconds'>> = req.body;

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID.' });
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No update fields provided.' });
    }
    
    // Validate updates
    if (updates.schedule_type && !['cron', 'interval'].includes(updates.schedule_type)) {
        return res.status(400).json({ message: 'Invalid schedule_type.' });
    }
    if (updates.status && !['active', 'paused', 'errored', 'healthy'].includes(updates.status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }
     if (updates.schedule_type || updates.schedule) {
        const scheduleType = updates.schedule_type || (await getMonitoredJobById(jobId, userId))?.schedule_type;
        const schedule = updates.schedule || (await getMonitoredJobById(jobId, userId))?.schedule;
        if (!scheduleType || !schedule) {
             return res.status(400).json({ message: 'Schedule type and schedule value are needed for validation.' });
        }
        if (scheduleType === 'cron') {
            if (schedule.split(' ').length < 5 || schedule.split(' ').length > 6) {
                 return res.status(400).json({ message: 'Invalid cron schedule format for update.' });
            }
        } else if (scheduleType === 'interval') {
            if (!/^\d+[mhd]$/.test(schedule)) {
                return res.status(400).json({ message: 'Invalid interval format for update. Use e.g., "5m", "1h", "2d".' });
            }
        }
    }


    try {
        const updatedJob = await updateMonitoredJob(jobId, userId, updates);
        if (updatedJob) {
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error updating job ${jobId}:`, error);
         if (error.message.includes('Invalid schedule')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to update job.' });
    }
});

// DELETE /api/jobs/:jobId - Delete a job
router.delete('/:jobId', async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const jobId = parseInt(req.params.jobId, 10);

    if (!userId) {
        return res.status(403).json({ message: 'User ID not found on token.' });
    }
    if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID.' });
    }

    try {
        const success = await deleteMonitoredJob(jobId, userId);
        if (success) {
            res.status(204).send(); // No content
        } else {
            res.status(404).json({ message: 'Job not found or access denied.' });
        }
    } catch (error) {
        console.error(`Error deleting job ${jobId}:`, error);
        res.status(500).json({ message: 'Failed to delete job.' });
    }
});

export default router;
