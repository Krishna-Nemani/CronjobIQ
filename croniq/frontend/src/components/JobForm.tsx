import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitoredJob, ScheduleType } from '../types';
import { createJob, updateJob, CreateJobData, UpdateJobData } from '../services/jobService';
import cronParser from 'cron-parser'; // For frontend validation of cron expressions

interface JobFormProps {
  initialData?: MonitoredJob; // For editing
  onSave?: (job: MonitoredJob) => void; // Optional callback after saving
}

const JobForm: React.FC<JobFormProps> = ({ initialData, onSave }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initialData?.schedule_type || 'cron');
  const [schedule, setSchedule] = useState(initialData?.schedule || '');
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(initialData?.grace_period_seconds?.toString() || '60');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setScheduleType(initialData.schedule_type);
      setSchedule(initialData.schedule);
      setGracePeriodSeconds(initialData.grace_period_seconds.toString());
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = 'Job name is required.';
    if (!schedule.trim()) errors.schedule = 'Schedule definition is required.';
    
    if (scheduleType === 'cron') {
      try {
        cronParser.parseExpression(schedule);
      } catch (e: any) {
        errors.schedule = `Invalid CRON expression: ${e.message || 'Unknown error'}`;
      }
    } else if (scheduleType === 'interval') {
      if (!/^\d+[mhd]$/.test(schedule)) {
        errors.schedule = 'Invalid interval format. Use e.g., "5m", "1h", "2d".';
      }
    }

    const graceNum = parseInt(gracePeriodSeconds, 10);
    if (isNaN(graceNum) || graceNum < 0) {
      errors.gracePeriodSeconds = 'Grace period must be a non-negative number.';
    } else if (graceNum > 3600 * 24) { // Example: max 1 day
        errors.gracePeriodSeconds = 'Grace period seems too long (max 1 day equivalent).';
    }


    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    const jobDataPayload = {
      name,
      schedule_type: scheduleType,
      schedule,
      grace_period_seconds: parseInt(gracePeriodSeconds, 10),
    };

    try {
      let savedJob: MonitoredJob;
      if (initialData?.id) {
        // Update job
        const updatePayload: UpdateJobData = { ...jobDataPayload };
        // If status is part of form, add it here:
        // if (initialData.status) updatePayload.status = initialData.status; 
        savedJob = await updateJob(initialData.id.toString(), updatePayload);
      } else {
        // Create job
        const createPayload: CreateJobData = jobDataPayload;
        savedJob = await createJob(createPayload);
      }
      
      if (onSave) {
        onSave(savedJob);
      } else {
        // Default navigation if no onSave callback is provided
        navigate('/'); // Navigate to dashboard after save
      }
    } catch (err: any) {
      console.error('Failed to save job:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save job.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: 'auto', padding: '20px', background: '#fff', borderRadius: '8px' }}>
      <h2>{initialData ? 'Edit Job' : 'Create New Job'}</h2>
      
      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      <div>
        <label htmlFor="name">Job Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {formErrors.name && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="scheduleType">Schedule Type:</label>
        <select
          id="scheduleType"
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
        >
          <option value="cron">CRON Expression</option>
          <option value="interval">Interval (e.g., 5m, 1h, 2d)</option>
        </select>
      </div>

      <div>
        <label htmlFor="schedule">Schedule:</label>
        <input
          type="text"
          id="schedule"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder={scheduleType === 'cron' ? '* * * * *' : 'e.g., 30m or 2h'}
          required
        />
        {formErrors.schedule && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.schedule}</p>}
        {scheduleType === 'cron' && <small>Use <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer">crontab.guru</a> for help.</small>}
      </div>

      <div>
        <label htmlFor="gracePeriodSeconds">Grace Period (seconds):</label>
        <input
          type="number"
          id="gracePeriodSeconds"
          value={gracePeriodSeconds}
          onChange={(e) => setGracePeriodSeconds(e.target.value)}
          min="0"
          required
        />
         {formErrors.gracePeriodSeconds && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.gracePeriodSeconds}</p>}
      </div>

      <button type="submit" disabled={isLoading} style={{ marginTop: '15px', padding: '10px 15px' }}>
        {isLoading ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Job')}
      </button>
      <button type="button" onClick={() => navigate('/')} style={{ marginLeft: '10px', background: '#eee', color: '#333' }} disabled={isLoading}>
        Cancel
      </button>
    </form>
  );
};

export default JobForm;
