import apiClient from './api';
import { MonitoredJob, ScheduleType } from '../types';

// Type for creating a new job, omitting fields that are auto-generated or set by server
export interface CreateJobData {
  name: string;
  schedule_type: ScheduleType;
  schedule: string;
  grace_period_seconds?: number; // Optional, backend might have a default
  // status is typically set by the backend on creation (e.g., to 'active' or 'pending')
}

// Type for updating an existing job. Most fields are partial.
// user_id, webhook_url, created_at are generally not updatable by the user directly.
export type UpdateJobData = Partial<Omit<MonitoredJob, 'id' | 'user_id' | 'webhook_url' | 'created_at' | 'last_pinged_at' | 'expected_next_ping_at'>>;


/**
 * Fetches all monitored jobs for the authenticated user.
 */
export const getJobs = async (): Promise<MonitoredJob[]> => {
  try {
    const response = await apiClient.get<MonitoredJob[]>('/jobs');
    return response.data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
};

/**
 * Fetches a single monitored job by its ID.
 * @param jobId The ID of the job to fetch.
 */
export const getJobById = async (jobId: string): Promise<MonitoredJob> => {
  try {
    const response = await apiClient.get<MonitoredJob>(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Creates a new monitored job.
 * @param jobData The data for the new job.
 */
export const createJob = async (jobData: CreateJobData): Promise<MonitoredJob> => {
  try {
    const response = await apiClient.post<MonitoredJob>('/jobs', jobData);
    return response.data;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
};

/**
 * Updates an existing monitored job.
 * @param jobId The ID of the job to update.
 * @param jobData The partial data to update the job with.
 */
export const updateJob = async (jobId: string, jobData: UpdateJobData): Promise<MonitoredJob> => {
  try {
    const response = await apiClient.put<MonitoredJob>(`/jobs/${jobId}`, jobData);
    return response.data;
  } catch (error) {
    console.error(`Error updating job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Deletes a monitored job.
 * @param jobId The ID of the job to delete.
 */
export const deleteJob = async (jobId: string): Promise<void> => {
  try {
    await apiClient.delete(`/jobs/${jobId}`);
  } catch (error) {
    console.error(`Error deleting job ${jobId}:`, error);
    throw error;
  }
};
