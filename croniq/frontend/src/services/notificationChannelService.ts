import apiClient from './api';
import { NotificationChannel, NotificationChannelType } from '../types';

// Type for creating a new notification channel.
// id, user_id, is_verified, created_at are handled by the backend.
export interface CreateNotificationChannelData {
  type: NotificationChannelType;
  name: string;
  configuration_details: any; // This will be specific to the 'type'
}

// Type for updating a notification channel.
// Only name and configuration_details are typically updatable.
// Type usually cannot be changed. is_verified is backend controlled.
export type UpdateNotificationChannelData = Partial<Pick<NotificationChannel, 'name' | 'configuration_details'>>;


/**
 * Fetches all notification channels for the authenticated user.
 */
export const getNotificationChannels = async (): Promise<NotificationChannel[]> => {
  try {
    const response = await apiClient.get<NotificationChannel[]>('/notification-channels');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification channels:', error);
    throw error;
  }
};

/**
 * Creates a new notification channel.
 * @param channelData The data for the new notification channel.
 */
export const createNotificationChannel = async (channelData: CreateNotificationChannelData): Promise<NotificationChannel> => {
  try {
    const response = await apiClient.post<NotificationChannel>('/notification-channels', channelData);
    return response.data;
  } catch (error) {
    console.error('Error creating notification channel:', error);
    throw error;
  }
};

/**
 * Updates an existing notification channel.
 * @param channelId The ID of the channel to update.
 * @param channelData The partial data to update the channel with.
 */
export const updateNotificationChannel = async (channelId: string, channelData: UpdateNotificationChannelData): Promise<NotificationChannel> => {
  try {
    const response = await apiClient.put<NotificationChannel>(`/notification-channels/${channelId}`, channelData);
    return response.data;
  } catch (error) {
    console.error(`Error updating notification channel ${channelId}:`, error);
    throw error;
  }
};

/**
 * Deletes a notification channel.
 * @param channelId The ID of the channel to delete.
 */
export const deleteNotificationChannel = async (channelId: string): Promise<void> => {
  try {
    await apiClient.delete(`/notification-channels/${channelId}`);
  } catch (error) {
    console.error(`Error deleting notification channel ${channelId}:`, error);
    throw error;
  }
};
