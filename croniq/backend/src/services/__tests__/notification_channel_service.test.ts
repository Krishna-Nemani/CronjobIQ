import {
  createNotificationChannel,
  NotificationChannel,
  NotificationChannelType,
} from '../notification_channel_service';
import { query } from '../../db'; // This will be the mocked version

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

describe('notification_channel_service', () => {
  const mockQuery = query as jest.MockedFunction<typeof query>;

  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('createNotificationChannel', () => {
    const userId = 1;
    const channelName = 'Test Email Channel';

    it('should create an email channel with is_verified=false', async () => {
      const type: NotificationChannelType = 'email';
      const configDetails = { email: 'test@example.com' };
      const mockCreatedChannel: NotificationChannel = {
        id: 1,
        user_id: userId,
        type: type,
        name: channelName,
        configuration_details: configDetails,
        is_verified: false, // Emails start unverified
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedChannel], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await createNotificationChannel(userId, type, channelName, configDetails);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_channels'),
        [userId, type, channelName, JSON.stringify(configDetails), false]
      );
      expect(result).toEqual(mockCreatedChannel);
    });

    it('should create a slack channel with is_verified=true', async () => {
      const type: NotificationChannelType = 'slack';
      const configDetails = { webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX' };
      const mockCreatedChannel: NotificationChannel = {
        id: 2,
        user_id: userId,
        type: type,
        name: 'Test Slack Channel',
        configuration_details: configDetails,
        is_verified: true, // Slack channels are auto-verified
        created_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedChannel], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await createNotificationChannel(userId, type, 'Test Slack Channel', configDetails);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_channels'),
        [userId, type, 'Test Slack Channel', JSON.stringify(configDetails), true]
      );
      expect(result).toEqual(mockCreatedChannel);
    });

    it('should throw error for invalid email configuration_details', async () => {
      const type: NotificationChannelType = 'email';
      const invalidConfig = { mail: 'test@example.com' }; // wrong property name
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type email.');
      expect(mockQuery).not.toHaveBeenCalled();
    });
    
    it('should throw error for invalid Slack webhook_url', async () => {
      const type: NotificationChannelType = 'slack';
      const invalidConfig = { webhook_url: 'http://invalid.slack.com/services/...' }; // Not https or wrong domain
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type slack.');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for invalid PagerDuty routing_key (too short)', async () => {
      const type: NotificationChannelType = 'pagerduty';
      const invalidConfig = { routing_key: '12345' }; 
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type pagerduty.');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for invalid generic webhook URL', async () => {
      const type: NotificationChannelType = 'webhook';
      const invalidConfig = { url: 'notaurl' }; 
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type webhook.');
      expect(mockQuery).not.toHaveBeenCalled();
    });
     it('should throw error for invalid generic webhook headers (not an object)', async () => {
      const type: NotificationChannelType = 'webhook';
      const invalidConfig = { url: 'https://example.com', headers: 'not-an-object' }; 
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type webhook.');
      expect(mockQuery).not.toHaveBeenCalled();
    });
     it('should throw error for invalid generic webhook headers (value not a string)', async () => {
      const type: NotificationChannelType = 'webhook';
      const invalidConfig = { url: 'https://example.com', headers: {'X-My-Header': 123} }; 
      await expect(
        createNotificationChannel(userId, type, channelName, invalidConfig)
      ).rejects.toThrow('Invalid configuration_details for type webhook.');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should re-throw database errors during channel creation', async () => {
      const type: NotificationChannelType = 'email';
      const configDetails = { email: 'db_error@example.com' };
      mockQuery.mockRejectedValueOnce(new Error('DB insert failed'));

      await expect(
        createNotificationChannel(userId, type, channelName, configDetails)
      ).rejects.toThrow('DB insert failed');
    });
  });
});
