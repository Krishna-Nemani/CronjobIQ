import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MonitoredJob } from '../types';
import { getJobs as apiGetJobs } from '../services/jobService'; // Renamed to avoid conflict
import JobListItem from './JobListItem';

const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<MonitoredJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedJobs = await apiGetJobs();
      setJobs(fetchedJobs);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobDelete = (deletedJobId: number) => {
    setJobs(prevJobs => prevJobs.filter(job => job.id !== deletedJobId));
  };

  if (isLoading) {
    return <p>Loading jobs...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchJobs}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Monitored Jobs</h2>
        <Link to="/jobs/new">
          <button>Create New Job</button>
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p>No jobs found. <Link to="/jobs/new">Create one now!</Link></p>
      ) : (
        <div>
          {jobs.map(job => (
            <JobListItem key={job.id} job={job} onDelete={handleJobDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default JobList;
