import apiClient from './api';
import { JobNotificationSetting } from '../types';

// Type for creating or updating a job notification setting.
// Backend's addSettingToJob is an upsert, so one interface can cover both.
export interface UpsertJobNotificationSettingData {
  notification_channel_id: number; // Ensure this is number to match DB type if IDs are numeric
  notify_on_failure?: boolean;
  notify_on_lateness?: boolean;
  notify_on_recovery?: boolean;
}

/**
 * Fetches all notification settings for a specific job.
 * @param jobId The ID of the job.
 */
export const getSettingsForJob = async (jobId: string): Promise<JobNotificationSetting[]> => {
  try {
    // The backend route is /api/jobs/:jobId/notification-settings
    const response = await apiClient.get<JobNotificationSetting[]>(`/jobs/${jobId}/notification-settings`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching notification settings for job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Adds or updates a notification setting for a job.
 * Backend handles upsert logic based on jobId and channelId.
 * @param jobId The ID of the job.
 * @param settingData The data for the setting.
 */
export const addOrUpdateSettingForJob = async (jobId: string, settingData: UpsertJobNotificationSettingData): Promise<JobNotificationSetting> => {
  try {
    // The backend route is POST /api/jobs/:jobId/notification-settings
    // It expects notification_channel_id and the boolean flags in the body.
    const response = await apiClient.post<JobNotificationSetting>(`/jobs/${jobId}/notification-settings`, settingData);
    return response.data;
  } catch (error) {
    console.error(`Error adding/updating notification setting for job ${jobId}:`, error);
    throw error;
  }
};


/**
 * Removes a specific notification setting from a job.
 * The backend route is DELETE /api/notification-settings/:settingId
 * @param settingId The ID of the job_notification_settings record.
 */
export const removeSettingFromJob = async (settingId: string): Promise<void> => {
  try {
    await apiClient.delete(`/notification-settings/${settingId}`);
  } catch (error) {
    console.error(`Error removing notification setting ${settingId}:`, error);
    throw error;
  }
};
