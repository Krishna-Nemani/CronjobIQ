import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth_routes';
import jobRoutes from './routes/job_routes';
import webhookRoutes from './routes/webhook_routes';
import notificationChannelRoutes from './routes/notification_channel_routes';
import jobNotificationSettingsRoutes from './routes/job_notification_settings_routes';
import { authenticateToken } from './middleware/auth_middleware';
import { startScheduler } from './services/scheduler_service';
import pool from './db'; // Import the pool for graceful shutdown

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount job routes (protected by JWT)
app.use('/api/jobs', jobRoutes);

// Mount notification channel routes (protected by JWT)
app.use('/api/notification-channels', notificationChannelRoutes);

// Mount job notification settings routes
app.use('/api', jobNotificationSettingsRoutes);

// Mount webhook routes (publicly accessible)
app.use('/webhook', webhookRoutes);

// Simple root route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to Croniq backend!');
});

// Protected route example
app.get('/api/profile', authenticateToken, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(403).json({ message: 'User information not available on request.' });
  }
  res.json({
    message: 'This is a protected route.',
    user: req.user
  });
});

let server: any;

// Start server only if not in test environment or if run directly
if (process.env.NODE_ENV !== 'test' || require.main === module) {
  server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    // Start the scheduler only when the server starts for real
    if (process.env.NODE_ENV !== 'test') { // Avoid starting scheduler during most test scenarios
        startScheduler();
    }
  });
}


// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await pool.end();
      console.log('Database pool has ended.');
      process.exit(0);
    });
  } else {
    // If server isn't running (e.g. tests that import app but don't start server)
    await pool.end();
    console.log('Database pool has ended (no server running).');
    process.exit(0);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C

export default app; // Export app for testing purposes
