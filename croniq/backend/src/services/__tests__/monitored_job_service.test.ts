import {
  createMonitoredJob,
  processPing,
  findLateJobs,
  MonitoredJob,
  generateWebhookUrl, // Will mock this partially for predictability
} from '../monitored_job_service';
import { query } from '../../db';
import * as scheduleUtils from '../../utils/schedule_utils'; // Import all exports to mock them
import crypto from 'crypto'; // For mocking generateWebhookUrl

// Mock db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock schedule_utils module
jest.mock('../../utils/schedule_utils', () => ({
  calculateNextPingTime: jest.fn(),
  calculateIntervalMs: jest.fn(), // Though not directly used in these specific tests, good to mock
}));

// Mock crypto for generateWebhookUrl
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'), // Import and retain default behavior
  randomBytes: jest.fn(),
}));


describe('monitored_job_service', () => {
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const mockCalculateNextPingTime = scheduleUtils.calculateNextPingTime as jest.MockedFunction<typeof scheduleUtils.calculateNextPingTime>;
  const mockRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;
  // const mockGenerateWebhookUrl = generateWebhookUrl as jest.MockedFunction<typeof generateWebhookUrl>;


  beforeEach(() => {
    mockQuery.mockClear();
    mockCalculateNextPingTime.mockClear();
    mockRandomBytes.mockClear();
    // mockGenerateWebhookUrl.mockClear(); // If generateWebhookUrl itself was mocked
  });

  describe('createMonitoredJob', () => {
    it('should create a job with a generated webhook, calculated next ping, and insert into DB', async () => {
      const userId = 1;
      const jobName = 'Test Cron Job';
      const scheduleType = 'cron' as 'cron' | 'interval';
      const schedule = '* * * * *';
      const gracePeriodSeconds = 60;
      const mockWebhook = 'mockedwebhookurl123';
      const expectedNextPing = new Date('2023-01-01T12:00:00Z');
      const mockCreatedJob: MonitoredJob = {
        id: 1,
        user_id: userId,
        name: jobName,
        schedule_type: scheduleType,
        schedule: schedule,
        webhook_url: mockWebhook,
        status: 'active',
        grace_period_seconds: gracePeriodSeconds,
        last_pinged_at: null,
        expected_next_ping_at: expectedNextPing,
        created_at: new Date(),
      };

      // Mock generateWebhookUrl via crypto.randomBytes
      mockRandomBytes.mockReturnValueOnce(Buffer.from(mockWebhook, 'hex'));
      mockCalculateNextPingTime.mockReturnValueOnce(expectedNextPing);
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedJob], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      
      const result = await createMonitoredJob(userId, jobName, scheduleType, schedule, gracePeriodSeconds);

      expect(mockRandomBytes).toHaveBeenCalledWith(32); // As generateWebhookUrl uses crypto.randomBytes(32)
      expect(mockCalculateNextPingTime).toHaveBeenCalledWith(scheduleType, schedule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO monitored_jobs'),
        [userId, jobName, scheduleType, schedule, mockWebhook, 'active', gracePeriodSeconds, expectedNextPing]
      );
      expect(result).toEqual(mockCreatedJob);
    });

    it('should throw an error if calculateNextPingTime returns null', async () => {
        mockCalculateNextPingTime.mockReturnValueOnce(null); // Simulate invalid schedule
        mockRandomBytes.mockReturnValueOnce(Buffer.from('mockedwebhookurl123', 'hex'));


        await expect(
            createMonitoredJob(1, 'Test Job', 'cron', 'invalid schedule', 60)
        ).rejects.toThrow('Invalid schedule provided, could not calculate next ping time.');
    });
  });

  describe('processPing', () => {
    it('should update last_pinged_at, expected_next_ping_at, status, and create an execution record', async () => {
      const webhookUrl = 'testwebhook123';
      const existingJob: MonitoredJob = {
        id: 1,
        user_id: 1,
        name: 'Ping Test Job',
        schedule_type: 'interval',
        schedule: '5m',
        webhook_url: webhookUrl,
        status: 'active',
        grace_period_seconds: 60,
        last_pinged_at: null,
        expected_next_ping_at: new Date('2023-01-01T11:55:00Z'),
        created_at: new Date('2023-01-01T11:50:00Z'),
      };
      const now = new Date('2023-01-01T11:54:00Z'); // Simulate current time for ping
      const calculatedNextExpectedPing = new Date('2023-01-01T11:59:00Z'); // 5 mins after 'now'
      const updatedJobAfterPing: MonitoredJob = { ...existingJob, last_pinged_at: now, expected_next_ping_at: calculatedNextExpectedPing, status: 'healthy' };

      // Mock Date constructor to control 'now'
      jest.spyOn(global, 'Date').mockImplementation(() => now);
      
      mockQuery
        .mockResolvedValueOnce({ rows: [existingJob], rowCount: 1, command: 'SELECT', oid: 0, fields: [] }) // Find job by webhook
        .mockResolvedValueOnce({ rows: [updatedJobAfterPing], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] }) // Update job
        .mockResolvedValueOnce({ rows: [{id: '123'}], rowCount: 1, command: 'INSERT', oid: 0, fields: [] }); // Create execution (returning the execution id)

      mockCalculateNextPingTime.mockReturnValueOnce(calculatedNextExpectedPing);
      // Mock getNotificationSettingsForJob and sendNotification as they are called in processPing for recovery
      // For this unit test, we are not testing recovery notifications, so simple mocks suffice.
      jest.mock('../notification_channel_service', () => ({
        getNotificationSettingsForJob: jest.fn().mockResolvedValue([]),
      }));
      jest.mock('../notification_dispatcher', () => ({
        sendNotification: jest.fn().mockResolvedValue(undefined),
      }));


      const result = await processPing(webhookUrl);

      expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT * FROM monitored_jobs WHERE webhook_url = $1;', [webhookUrl]);
      expect(mockCalculateNextPingTime).toHaveBeenCalledWith(existingJob.schedule_type, existingJob.schedule, now);
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('UPDATE monitored_jobs'),
        [now, calculatedNextExpectedPing, 'healthy', existingJob.id]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO job_executions'),
        [existingJob.id, 'success', now, now, 'Ping received successfully.']
      );
      expect(result).toEqual(updatedJobAfterPing);

      // Restore Date mock
      jest.restoreAllMocks(); 
    });

    it('should return null if webhook URL is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] }); // No job found
      const result = await processPing('unknownwebhook');
      expect(result).toBeNull();
    });
  });

  describe('findLateJobs', () => {
    it('should return jobs that are past their expected_next_ping_at + grace_period_seconds', async () => {
      const lateJob: MonitoredJob = {
        id: 1, user_id: 1, name: 'Late Job', schedule_type: 'cron', schedule: '* * * * *',
        webhook_url: 'latejobwebhook', status: 'active', 
        grace_period_seconds: 60, // 1 minute
        last_pinged_at: new Date('2023-01-01T10:00:00Z'),
        // Expected at 10:01, grace ends 10:02. If NOW is 10:03, it's late.
        expected_next_ping_at: new Date('2023-01-01T10:01:00Z'), 
        created_at: new Date('2023-01-01T09:00:00Z'),
      };
      mockQuery.mockResolvedValueOnce({ rows: [lateJob], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await findLateJobs();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("expected_next_ping_at < NOW() - (grace_period_seconds * INTERVAL '1 second')"));
      expect(result).toEqual([lateJob]);
    });

    it('should return an empty array if no jobs are late', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
      const result = await findLateJobs();
      expect(result).toEqual([]);
    });
  });
});
