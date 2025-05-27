import React from 'react';
import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm';
import { MonitoredJob } from '../types';

const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSave = (job: MonitoredJob) => {
    // After successful creation, navigate to the main dashboard (job list)
    // Optionally, navigate to a detail page: navigate(`/jobs/${job.id}`);
    alert(`Job "${job.name}" created successfully!`); // Simple feedback
    navigate('/'); 
  };

  return (
    <div>
      {/* <h2>Create New Monitored Job</h2> removed as JobForm has its own title */}
      <JobForm onSave={handleSave} />
    </div>
  );
};

export default CreateJobPage;
