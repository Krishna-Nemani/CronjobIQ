import express, { Request, Response } from 'express';
import { processPing } from '../services/monitored_job_service';

const router = express.Router();

// POST /webhook/ping/:webhookUrl - Receives pings for jobs
router.post('/ping/:webhookUrl', async (req: Request, res: Response) => {
    const { webhookUrl } = req.params;

    if (!webhookUrl) {
        return res.status(400).json({ message: 'Webhook URL is required.' });
    }

    try {
        const updatedJob = await processPing(webhookUrl);
        if (updatedJob) {
            res.status(200).json({ message: 'Ping processed successfully.', job: updatedJob });
        } else {
            // processPing handles logging for unknown webhook URLs
            res.status(404).json({ message: 'Job not found for this webhook URL.' });
        }
    } catch (error) {
        console.error(`Error processing ping for webhook ${webhookUrl} in route:`, error);
        // It's possible processPing already created a 'failed' execution,
        // but if the error happened before or after, this is a general server error.
        res.status(500).json({ message: 'Failed to process ping due to an internal error.' });
    }
});

export default router;
