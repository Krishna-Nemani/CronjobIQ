import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm';
import { getJobById } from '../services/jobService';
import { MonitoredJob } from '../types';
import JobNotificationSettingsManager from '../components/JobNotificationSettingsManager'; // Import the manager

const EditJobPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<MonitoredJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided.');
      setLoading(false);
      return;
    }

    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedJob = await getJobById(jobId);
        setJob(fetchedJob);
      } catch (err) {
        console.error(`Failed to fetch job ${jobId}:`, err);
        setError('Failed to load job data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleSave = (updatedJob: MonitoredJob) => {
    // After successful update, navigate to the main dashboard
    // Optionally, navigate to a detail page: navigate(`/jobs/${updatedJob.id}`);
    alert(`Job "${updatedJob.name}" updated successfully!`);
    navigate('/'); 
  };

  if (loading) {
    return <p>Loading job details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!job) {
    return <p>Job not found.</p>; // Should be covered by error state usually
  }

  return (
    <div>
      {/* JobForm for editing core job details */}
      <JobForm initialData={job} onSave={handleSave} />

      {/* Notification Settings Manager for this job */}
      {jobId && <JobNotificationSettingsManager jobId={jobId} />}
    </div>
  );
};

export default EditJobPage;
