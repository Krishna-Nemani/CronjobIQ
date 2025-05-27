import request from 'supertest';
import app from '../../../index'; // Express app
import { clearAllTables, closeTestDBConnection } from '../db_test_helper';
import { MonitoredJob, User } from '../../../types'; // Assuming types.ts is in src/
import pool from '../../../db'; // For direct DB checks if needed

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_job_api_tests_1234567890';

describe('Job API Endpoints (/api/jobs and /webhook)', () => {
  let testUserToken: string;
  let testUserId: number;
  let testUserWebhookUrl: string; // Will be set after creating a job

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests must be run with NODE_ENV=test');
    }
    // Register and login a test user
    await clearAllTables(); // Start with a clean slate for user registration
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jobtestuser@example.com', password: 'password123' });
    testUserId = userRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jobtestuser@example.com', password: 'password123' });
    testUserToken = loginRes.body.token;
  });

  beforeEach(async () => {
    // Clear job-related tables before each job test, but not users table as we need the logged-in user
    await pool.query('TRUNCATE TABLE job_executions RESTART IDENTITY CASCADE;');
    await pool.query('TRUNCATE TABLE job_notification_settings RESTART IDENTITY CASCADE;');
    // Notification channels might be user-specific, decide if they should be cleared or not. For now, let's clear them.
    await pool.query('TRUNCATE TABLE notification_channels RESTART IDENTITY CASCADE;'); 
    await pool.query('TRUNCATE TABLE monitored_jobs RESTART IDENTITY CASCADE;');
  });

  afterAll(async () => {
    await clearAllTables(); // Clean up everything including users
    await closeTestDBConnection();
  });

  describe('POST /api/jobs', () => {
    it('should create a new monitored job successfully', async () => {
      const jobData = {
        name: 'My Test Cron Job',
        schedule_type: 'cron' as 'cron' | 'interval',
        schedule: '0 * * * *', // Every hour
        grace_period_seconds: 300,
      };
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(jobData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual(jobData.name);
      expect(res.body.schedule_type).toEqual(jobData.schedule_type);
      expect(res.body.schedule).toEqual(jobData.schedule);
      expect(res.body.user_id).toEqual(testUserId);
      expect(res.body).toHaveProperty('webhook_url');
      testUserWebhookUrl = res.body.webhook_url; // Save for ping test
    });

    it('should fail to create a job with invalid schedule type', async () => {
      const jobData = {
        name: 'Invalid Schedule Type Job',
        schedule_type: 'invalid_type',
        schedule: '0 * * * *',
      };
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(jobData);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Invalid schedule_type. Must be "cron" or "interval".');
    });
  });

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      // Create a job for the user to list
      const jobData = { name: 'Listable Job', schedule_type: 'interval' as 'cron' | 'interval', schedule: '1h' };
      const createRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(jobData);
      testUserWebhookUrl = createRes.body.webhook_url; // used in later tests
    });

    it('should list all jobs for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toEqual('Listable Job');
    });
  });

  describe('GET /api/jobs/:jobId', () => {
    let jobId: number;
    beforeEach(async () => {
      const jobData = { name: 'Specific Job', schedule_type: 'cron' as 'cron' | 'interval', schedule: '0 0 * * *' };
      const createRes = await request(app).post('/api/jobs').set('Authorization', `Bearer ${testUserToken}`).send(jobData);
      jobId = createRes.body.id;
      testUserWebhookUrl = createRes.body.webhook_url; // used in later tests
    });

    it('should get a specific job by its ID', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(jobId);
      expect(res.body.name).toEqual('Specific Job');
    });

    it('should return 404 if job ID does not exist', async () => {
      const res = await request(app)
        .get('/api/jobs/99999') // Non-existent ID
        .set('Authorization', `Bearer ${testUserToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });
  
  describe('PUT /api/jobs/:jobId', () => {
    let jobIdToUpdate: number;
    beforeEach(async () => {
      const jobData = { name: 'Job To Update', schedule_type: 'interval' as 'cron' | 'interval', schedule: '30m' };
      const createRes = await request(app).post('/api/jobs').set('Authorization', `Bearer ${testUserToken}`).send(jobData);
      jobIdToUpdate = createRes.body.id;
      testUserWebhookUrl = createRes.body.webhook_url; // used in later tests
    });

    it('should update an existing job', async () => {
      const updateData = { name: 'Updated Job Name', grace_period_seconds: 120 };
      const res = await request(app)
        .put(`/api/jobs/${jobIdToUpdate}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(jobIdToUpdate);
      expect(res.body.name).toEqual(updateData.name);
      expect(res.body.grace_period_seconds).toEqual(updateData.grace_period_seconds);
    });
  });

  describe('DELETE /api/jobs/:jobId', () => {
    let jobIdToDelete: number;
    beforeEach(async () => {
      const jobData = { name: 'Job To Delete', schedule_type: 'cron' as 'cron' | 'interval', schedule: '0 1 * * *' };
      const createRes = await request(app).post('/api/jobs').set('Authorization', `Bearer ${testUserToken}`).send(jobData);
      jobIdToDelete = createRes.body.id;
      testUserWebhookUrl = createRes.body.webhook_url; // used in later tests
    });
    
    it('should delete an existing job', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${jobIdToDelete}`)
        .set('Authorization', `Bearer ${testUserToken}`);
      expect(res.statusCode).toEqual(204); // No Content

      // Verify it's actually deleted
      const getRes = await request(app).get(`/api/jobs/${jobIdToDelete}`).set('Authorization', `Bearer ${testUserToken}`);
      expect(getRes.statusCode).toEqual(404);
    });
  });

  describe('POST /webhook/ping/:webhookUrl', () => {
    let jobIdForPing: number;
    let jobWebhookUrlForPing: string;

    beforeEach(async () => {
        const jobData = { name: 'Ping Test Job', schedule_type: 'interval' as 'cron' | 'interval', schedule: '5m', grace_period_seconds: 60 };
        const createRes = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(jobData);
        jobIdForPing = createRes.body.id;
        jobWebhookUrlForPing = createRes.body.webhook_url;
    });

    it('should successfully process a ping and update job status', async () => {
        const initialJobRes = await request(app)
            .get(`/api/jobs/${jobIdForPing}`)
            .set('Authorization', `Bearer ${testUserToken}`);
        const initialLastPingedAt = initialJobRes.body.last_pinged_at;

        const pingRes = await request(app)
            .post(`/webhook/ping/${jobWebhookUrlForPing}`)
            .send(); // Body is optional for ping, current backend ignores it

        expect(pingRes.statusCode).toEqual(200);
        expect(pingRes.body).toHaveProperty('message', 'Ping processed successfully.');
        expect(pingRes.body.job.id).toEqual(jobIdForPing);
        expect(pingRes.body.job.status).toEqual('healthy');
        
        // Verify job was updated in DB
        const updatedJobRes = await request(app)
            .get(`/api/jobs/${jobIdForPing}`)
            .set('Authorization', `Bearer ${testUserToken}`);
        
        expect(updatedJobRes.body.status).toEqual('healthy');
        // last_pinged_at should be later than initial or not null if initial was null
        if(initialLastPingedAt) {
            expect(new Date(updatedJobRes.body.last_pinged_at).getTime()).toBeGreaterThan(new Date(initialLastPingedAt).getTime());
        } else {
            expect(updatedJobRes.body.last_pinged_at).not.toBeNull();
        }

        // Verify job execution record was created
        const executionsRes = await pool.query('SELECT * FROM job_executions WHERE monitored_job_id = $1', [jobIdForPing]);
        expect(executionsRes.rowCount).toBe(1);
        expect(executionsRes.rows[0].status).toBe('success');
    });

    it('should return 404 for an unknown webhook URL', async () => {
        const pingRes = await request(app)
            .post('/webhook/ping/thiswebhookdoesnotexist12345')
            .send();
        expect(pingRes.statusCode).toEqual(404);
        expect(pingRes.body).toHaveProperty('message', 'Job not found for this webhook URL.');
    });
  });
});
