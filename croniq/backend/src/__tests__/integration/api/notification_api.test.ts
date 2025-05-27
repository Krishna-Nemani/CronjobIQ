import request from 'supertest';
import app from '../../../index'; // Express app
import { clearAllTables, closeTestDBConnection } from '../db_test_helper';
import { NotificationChannel, JobNotificationSetting, MonitoredJob } from '../../../types';
import pool from '../../../db'; // For direct DB checks if needed

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_notification_api_tests_12345';

describe('Notification API Endpoints (/api/notification-channels and /api/jobs/:jobId/notification-settings)', () => {
  let testUserToken: string;
  let testUserId: number;
  let testJobId: number;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests must be run with NODE_ENV=test');
    }
    await clearAllTables(); // Clean slate

    // Register and login a test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'notifytestuser@example.com', password: 'password123' });
    testUserId = userRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notifytestuser@example.com', password: 'password123' });
    testUserToken = loginRes.body.token;

    // Create a test job for this user to associate notification settings with
    const jobData = { name: 'Notify Job', schedule_type: 'cron' as 'cron'|'interval', schedule: '0 0 * * *' };
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(jobData);
    testJobId = jobRes.body.id;
  });
  
  beforeEach(async () => {
    // Clear notification-related tables before each test in this suite
    // User and their primary job are kept from beforeAll
    await pool.query('TRUNCATE TABLE job_notification_settings RESTART IDENTITY CASCADE;');
    await pool.query('TRUNCATE TABLE notification_channels RESTART IDENTITY CASCADE;');
  });

  afterAll(async () => {
    await clearAllTables(); // Clean up everything
    await closeTestDBConnection();
  });

  describe('POST /api/notification-channels', () => {
    it('should create a new email notification channel successfully', async () => {
      const channelData = {
        name: 'My Email Alerts',
        type: 'email' as 'email'|'slack'|'pagerduty'|'webhook',
        configuration_details: { email: 'alerts@example.com' },
      };
      const res = await request(app)
        .post('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(channelData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual(channelData.name);
      expect(res.body.type).toEqual(channelData.type);
      expect(res.body.user_id).toEqual(testUserId);
      expect(res.body.is_verified).toBe(false); // Email channels start unverified
    });

    it('should create a new slack notification channel successfully', async () => {
      const channelData = {
        name: 'My Slack Alerts',
        type: 'slack' as 'email'|'slack'|'pagerduty'|'webhook',
        configuration_details: { webhook_url: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX' },
      };
      const res = await request(app)
        .post('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(channelData);
      expect(res.statusCode).toEqual(201);
      expect(res.body.is_verified).toBe(true);
    });
    
    it('should fail to create a channel with invalid configuration_details for email type', async () => {
      const channelData = {
        name: 'Invalid Email Channel',
        type: 'email',
        configuration_details: { wrong_field: 'alerts@example.com' },
      };
      const res = await request(app)
        .post('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(channelData);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Invalid configuration_details for type email.');
    });
  });

  describe('GET /api/notification-channels', () => {
    beforeEach(async () => {
      // Create a channel for the user to list
      const channelData = { name: 'Listable Channel', type: 'email' as 'email'|'slack'|'pagerduty'|'webhook', configuration_details: { email: 'list@example.com' } };
      await request(app)
        .post('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(channelData);
    });

    it('should list all notification channels for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toEqual('Listable Channel');
    });
  });
  
  describe('POST /api/jobs/:jobId/notification-settings', () => {
    let channelId: number;

    beforeEach(async () => {
      // Create a notification channel to link
      const channelData = {
        name: 'Channel For Linking',
        type: 'slack' as 'email'|'slack'|'pagerduty'|'webhook', // Slack is auto-verified
        configuration_details: { webhook_url: 'https://hooks.slack.com/services/T001/B001/YYYYYYYY' },
      };
      const channelRes = await request(app)
        .post('/api/notification-channels')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(channelData);
      channelId = channelRes.body.id;
    });

    it('should link a notification channel to a job with specified settings', async () => {
      const settingData = {
        notification_channel_id: channelId,
        notify_on_failure: true,
        notify_on_lateness: false,
        notify_on_recovery: true,
      };
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/notification-settings`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(settingData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.monitored_job_id).toEqual(testJobId);
      expect(res.body.notification_channel_id).toEqual(channelId);
      expect(res.body.notify_on_failure).toBe(true);
      expect(res.body.notify_on_lateness).toBe(false);
      expect(res.body.notify_on_recovery).toBe(true);

      // Verify in DB
      const dbCheck = await pool.query('SELECT * FROM job_notification_settings WHERE monitored_job_id = $1 AND notification_channel_id = $2', [testJobId, channelId]);
      expect(dbCheck.rowCount).toBe(1);
      expect(dbCheck.rows[0].notify_on_lateness).toBe(false);
    });

    it('should fail to link if notification_channel_id is missing', async () => {
      const settingData = { notify_on_failure: true }; // Missing notification_channel_id
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/notification-settings`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(settingData);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Missing required field: notification_channel_id.');
    });
    
    it('should fail to link an unverified email channel', async () => {
        // Create an unverified email channel
        const emailChannelData = { name: 'Unverified Email', type: 'email' as 'email'|'slack'|'pagerduty'|'webhook', configuration_details: {email: 'unverified@example.com'}};
        const emailChannelRes = await request(app).post('/api/notification-channels').set('Authorization', `Bearer ${testUserToken}`).send(emailChannelData);
        const unverifiedChannelId = emailChannelRes.body.id;
        expect(emailChannelRes.body.is_verified).toBe(false);

        const settingData = { notification_channel_id: unverifiedChannelId };
        const res = await request(app)
            .post(`/api/jobs/${testJobId}/notification-settings`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(settingData);
        
        expect(res.statusCode).toEqual(404); // Or 400 depending on specific error handling, 404 if service throws "not found / no access / not verified"
        expect(res.body).toHaveProperty('message', expect.stringContaining('not verified'));
    });
  });
});
