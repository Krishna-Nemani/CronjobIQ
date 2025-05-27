import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NotificationChannelForm from '../components/NotificationChannelForm';
import apiClient from '../services/api'; // Using apiClient directly to fetch single channel
import { NotificationChannel } from '../types';

const EditNotificationChannelPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<NotificationChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setError('No channel ID provided.');
      setLoading(false);
      return;
    }

    const fetchChannel = async () => {
      setLoading(true);
      setError(null);
      try {
        // notificationChannelService doesn't have getChannelById, so use apiClient directly
        const response = await apiClient.get<NotificationChannel>(`/notification-channels/${channelId}`);
        setChannel(response.data);
      } catch (err) {
        console.error(`Failed to fetch notification channel ${channelId}:`, err);
        setError('Failed to load channel data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [channelId]);

  const handleSave = (updatedChannel: NotificationChannel) => {
    alert(`Notification channel "${updatedChannel.name}" updated successfully!`);
    navigate('/notification-channels'); 
  };

  if (loading) {
    return <p>Loading channel details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!channel) {
    return <p>Channel not found.</p>;
  }

  return (
    <div>
      <NotificationChannelForm initialData={channel} onSave={handleSave} />
    </div>
  );
};

export default EditNotificationChannelPage;
