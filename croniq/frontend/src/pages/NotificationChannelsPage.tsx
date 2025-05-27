import React from 'react';
import NotificationChannelList from '../components/NotificationChannelList';
import { useAuth } from '../contexts/AuthContext'; // For user context if needed

const NotificationChannelsPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading user information...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>Manage Notification Channels</h2>
        {user && <p>Configure channels to receive alerts for your monitored jobs.</p>}
      </div>
      
      <NotificationChannelList />
    </div>
  );
};

export default NotificationChannelsPage;
