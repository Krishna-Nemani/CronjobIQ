import React from 'react';
import JobList from '../components/JobList'; // Import the JobList component
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth(); // Renamed isLoading to authLoading to avoid conflict

  if (authLoading) {
    return <div>Loading user information...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>Dashboard</h2>
        {user && <p>Welcome back, {user.email}!</p>}
      </div>
      
      {/* Render the JobList component here */}
      <JobList />
      
      {/* Placeholder for future content like overview statistics */}
      {/* 
      <div style={{ marginTop: '30px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
        <h4>Overview Statistics (Future)</h4>
        <p>Total Jobs: ...</p>
        <p>Healthy Jobs: ...</p>
        <p>Late/Errored Jobs: ...</p>
      </div>
      */}
    </div>
  );
};

export default DashboardPage;
