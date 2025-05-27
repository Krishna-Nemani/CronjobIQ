import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitoredJob } from '../types';
import { deleteJob as apiDeleteJob } from '../services/jobService'; // Renamed to avoid conflict

interface JobListItemProps {
  job: MonitoredJob;
  onDelete: (jobId: number) => void; // Callback to update parent list
}

const JobListItem: React.FC<JobListItemProps> = ({ job, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      setIsDeleting(true);
      setError(null);
      try {
        await apiDeleteJob(job.id.toString());
        onDelete(job.id); // Notify parent to remove from list
      } catch (err) {
        console.error('Failed to delete job:', err);
        setError('Failed to delete job. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Webhook URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy webhook URL:', err);
      alert('Failed to copy webhook URL.');
    });
  };
  
  const getStatusColor = (status: MonitoredJob['status']) => {
    switch (status) {
        case 'healthy': return 'green';
        case 'active': return 'blue'; // Active but not yet pinged, or pinged and healthy
        case 'late': return 'orange';
        case 'errored': return 'red';
        case 'paused': return 'grey';
        default: return 'black';
    }
  };

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px', backgroundColor: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>{job.name} (ID: {job.id})</h3>
      <p>
        Status: <strong style={{ color: getStatusColor(job.status) }}>{job.status.toUpperCase()}</strong>
      </p>
      <p>Schedule: {job.schedule_type} - <code>{job.schedule}</code></p>
      <p>Grace Period: {job.grace_period_seconds}s</p>
      <p>Last Ping: {job.last_pinged_at ? new Date(job.last_pinged_at).toLocaleString() : 'Never'}</p>
      <p>Next Expected Ping: {job.expected_next_ping_at ? new Date(job.expected_next_ping_at).toLocaleString() : 'N/A'}</p>
      <div>
        Webhook URL: <code>{job.webhook_url}</code>
        <button onClick={() => copyToClipboard(job.webhook_url)} style={{ marginLeft: '10px' }}>
          Copy
        </button>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <Link to={`/jobs/edit/${job.id}`}>
          <button style={{ marginRight: '10px' }}>Edit</button>
        </Link>
        <button onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default JobListItem;
