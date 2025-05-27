import cronParser from 'cron-parser';

/**
 * Calculates the next expected ping time based on the schedule type and value.
 * @param scheduleType Type of schedule ('cron' or 'interval').
 * @param schedule The schedule string (cron expression or interval string like '5m', '1h').
 * @param fromDate The date from which to calculate the next ping. Defaults to current time.
 * @returns The Date of the next expected ping, or null if parsing fails.
 */
export const calculateNextPingTime = (
    scheduleType: 'cron' | 'interval',
    schedule: string,
    fromDate: Date = new Date()
): Date | null => {
    if (scheduleType === 'cron') {
        try {
            // Ensure the fromDate is not in the past for cron's `next()` method if it matters for the logic.
            // cron-parser's next() gives the next time from the options.currentDate or now.
            const options = { currentDate: fromDate };
            const interval = cronParser.parseExpression(schedule, options);
            return interval.next().toDate();
        } catch (err) {
            console.error(`Error parsing cron schedule "${schedule}":`, err);
            return null;
        }
    } else if (scheduleType === 'interval') {
        const match = schedule.match(/^(\d+)([mhd])$/);
        if (!match) {
            console.error('Invalid interval format:', schedule, '. Expected format like "5m", "1h", "2d".');
            return null;
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        let msToAdd = 0;

        if (unit === 'm') msToAdd = value * 60 * 1000; // minutes
        else if (unit === 'h') msToAdd = value * 60 * 60 * 1000; // hours
        else if (unit === 'd') msToAdd = value * 24 * 60 * 60 * 1000; // days
        else {
            // This case should ideally not be reached due to the regex check.
            console.error('Invalid interval unit:', unit);
            return null;
        }
        return new Date(fromDate.getTime() + msToAdd);
    }
    console.error('Invalid schedule_type provided:', scheduleType);
    return null;
};

/**
 * Calculates the interval duration in milliseconds for a given schedule.
 * This is a helper for determining if a job is "too late".
 * For cron jobs, it calculates the typical interval between two consecutive runs.
 * For interval jobs, it directly converts the interval string to milliseconds.
 * @param scheduleType Type of schedule ('cron' or 'interval').
 * @param schedule The schedule string.
 * @returns Interval in milliseconds, or null if parsing fails or not applicable.
 */
export const calculateIntervalMs = (
    scheduleType: 'cron' | 'interval',
    schedule: string
): number | null => {
    if (scheduleType === 'cron') {
        try {
            const options = { iterator: true }; // Use iterator to get multiple dates
            const interval = cronParser.parseExpression(schedule, options as any); // Cast options as cron-parser's own types might be slightly different
            const first = interval.next().value.getTime();
            const second = interval.next().value.getTime();
            return second - first;
        } catch (err) {
            console.error(`Error parsing cron schedule "${schedule}" for interval calculation:`, err);
            return null;
        }
    } else if (scheduleType === 'interval') {
        const match = schedule.match(/^(\d+)([mhd])$/);
        if (!match) {
            console.error('Invalid interval format for interval calculation:', schedule);
            return null;
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        if (unit === 'm') return value * 60 * 1000;
        if (unit === 'h') return value * 60 * 60 * 1000;
        if (unit === 'd') return value * 24 * 60 * 60 * 1000;
        return null;
    }
    return null;
};
