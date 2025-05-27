import { calculateNextPingTime, calculateIntervalMs } from '../schedule_utils';

describe('schedule_utils', () => {
  describe('calculateNextPingTime', () => {
    // Test with CRON expressions
    it('should calculate the next ping time for a valid CRON expression from a specific date', () => {
      const cronExpression = '0 0 * * *'; // Every day at midnight
      const fromDate = new Date('2023-01-01T10:00:00Z'); // Jan 1, 2023, 10:00 AM UTC
      const expectedNextPing = new Date('2023-01-02T00:00:00Z'); // Midnight of Jan 2, 2023 UTC
      expect(calculateNextPingTime('cron', cronExpression, fromDate)).toEqual(expectedNextPing);
    });

    it('should calculate the next ping time for a more complex CRON expression', () => {
      const cronExpression = '*/15 * * * 1-5'; // Every 15 minutes on weekdays
      const fromDate = new Date('2023-01-02T10:05:00Z'); // Monday, Jan 2, 2023, 10:05 AM UTC
      const expectedNextPing = new Date('2023-01-02T10:15:00Z');
      expect(calculateNextPingTime('cron', cronExpression, fromDate)).toEqual(expectedNextPing);
    });

    it('should return null for an invalid CRON expression', () => {
      const cronExpression = 'invalid cron';
      expect(calculateNextPingTime('cron', cronExpression)).toBeNull();
    });

    // Test with interval strings
    it('should calculate the next ping time for a minute interval', () => {
      const interval = '5m';
      const fromDate = new Date('2023-01-01T10:00:00Z');
      const expectedNextPing = new Date('2023-01-01T10:05:00Z');
      expect(calculateNextPingTime('interval', interval, fromDate)).toEqual(expectedNextPing);
    });

    it('should calculate the next ping time for an hour interval', () => {
      const interval = '2h';
      const fromDate = new Date('2023-01-01T10:00:00Z');
      const expectedNextPing = new Date('2023-01-01T12:00:00Z');
      expect(calculateNextPingTime('interval', interval, fromDate)).toEqual(expectedNextPing);
    });

    it('should calculate the next ping time for a day interval', () => {
      const interval = '1d';
      const fromDate = new Date('2023-01-01T10:00:00Z');
      const expectedNextPing = new Date('2023-01-02T10:00:00Z');
      expect(calculateNextPingTime('interval', interval, fromDate)).toEqual(expectedNextPing);
    });

    it('should return null for an invalid interval string', () => {
      const interval = '5x'; // Invalid unit
      expect(calculateNextPingTime('interval', interval)).toBeNull();
    });
    
    it('should return null for an interval string with no unit', () => {
      const interval = '5'; 
      expect(calculateNextPingTime('interval', interval)).toBeNull();
    });

    it('should use current time if fromDate is not provided for interval', () => {
        const interval = '1m';
        const now = new Date();
        const expected = new Date(now.getTime() + 60000);
        const actual = calculateNextPingTime('interval', interval);
        // Allow for a small difference due to execution time
        expect(actual.getTime()).toBeGreaterThanOrEqual(expected.getTime() - 100);
        expect(actual.getTime()).toBeLessThanOrEqual(expected.getTime() + 100);
    });

    it('should return null for invalid schedule_type', () => {
        expect(calculateNextPingTime('invalid_type' as any, '5m')).toBeNull();
    });
  });

  describe('calculateIntervalMs', () => {
    it('should calculate milliseconds for a CRON expression (e.g., every minute)', () => {
      const cronExpression = '* * * * *'; // Every minute
      expect(calculateIntervalMs('cron', cronExpression)).toEqual(60 * 1000);
    });

    it('should calculate milliseconds for a CRON expression (e.g., every 5 minutes)', () => {
      const cronExpression = '*/5 * * * *'; // Every 5 minutes
      expect(calculateIntervalMs('cron', cronExpression)).toEqual(5 * 60 * 1000);
    });
    
    it('should calculate milliseconds for an hourly CRON expression', () => {
      const cronExpression = '0 * * * *'; // Every hour at minute 0
      expect(calculateIntervalMs('cron', cronExpression)).toEqual(60 * 60 * 1000);
    });

    it('should return null for an invalid CRON expression', () => {
      expect(calculateIntervalMs('cron', 'invalid cron')).toBeNull();
    });

    it('should calculate milliseconds for a minute interval string', () => {
      expect(calculateIntervalMs('interval', '10m')).toEqual(10 * 60 * 1000);
    });

    it('should calculate milliseconds for an hour interval string', () => {
      expect(calculateIntervalMs('interval', '3h')).toEqual(3 * 60 * 60 * 1000);
    });

    it('should calculate milliseconds for a day interval string', () => {
      expect(calculateIntervalMs('interval', '2d')).toEqual(2 * 24 * 60 * 60 * 1000);
    });

    it('should return null for an invalid interval string', () => {
      expect(calculateIntervalMs('interval', '5x')).toBeNull();
    });
    
    it('should return null for an interval string with no value', () => {
      expect(calculateIntervalMs('interval', 'm')).toBeNull();
    });

     it('should return null for invalid schedule_type', () => {
        expect(calculateIntervalMs('invalid_type' as any, '5m')).toBeNull();
    });
  });
});
