import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { NotificationChannel } from '../types';
import { getNotificationChannels as apiGetChannels } from '../services/notificationChannelService';
import NotificationChannelListItem from './NotificationChannelListItem';

const NotificationChannelList: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedChannels = await apiGetChannels();
      setChannels(fetchedChannels);
    } catch (err) {
      console.error('Failed to fetch notification channels:', err);
      setError('Failed to load notification channels. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleChannelDelete = (deletedChannelId: number) => {
    setChannels(prevChannels => prevChannels.filter(channel => channel.id !== deletedChannelId));
  };

  if (isLoading) {
    return <p>Loading notification channels...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchChannels}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Notification Channels</h2>
        <Link to="/notification-channels/new">
          <button>Add New Channel</button>
        </Link>
      </div>
      {channels.length === 0 ? (
        <p>No notification channels found. <Link to="/notification-channels/new">Add one now!</Link></p>
      ) : (
        <div>
          {channels.map(channel => (
            <NotificationChannelListItem key={channel.id} channel={channel} onDelete={handleChannelDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationChannelList;
