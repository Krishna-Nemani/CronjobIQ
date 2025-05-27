import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationChannel } from '../types';
import { deleteNotificationChannel as apiDeleteChannel } from '../services/notificationChannelService';

interface NotificationChannelListItemProps {
  channel: NotificationChannel;
  onDelete: (channelId: number) => void;
}

const NotificationChannelListItem: React.FC<NotificationChannelListItemProps> = ({ channel, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete notification channel "${channel.name}"? This will also remove it from any jobs it's associated with.`)) {
      setIsDeleting(true);
      setError(null);
      try {
        await apiDeleteChannel(channel.id.toString());
        onDelete(channel.id);
      } catch (err) {
        console.error('Failed to delete notification channel:', err);
        setError('Failed to delete channel. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getDisplayDetail = (ch: NotificationChannel): string => {
    switch (ch.type) {
      case 'email':
        return `Email: ${ch.configuration_details?.email || 'N/A'}`;
      case 'slack':
        return `Webhook URL: ${ch.configuration_details?.webhook_url ? ch.configuration_details.webhook_url.substring(0, 30) + '...' : 'N/A'}`;
      case 'pagerduty':
        return `Routing Key: ${ch.configuration_details?.routing_key || 'N/A'}`;
      case 'webhook':
        return `URL: ${ch.configuration_details?.url || 'N/A'}`;
      default:
        return 'No details available';
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
      <h4 style={{ marginTop: 0, marginBottom: '5px' }}>{channel.name}</h4>
      <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '3px' }}>
        Type: <strong>{channel.type.toUpperCase()}</strong>
        {!channel.is_verified && channel.type === 'email' && <span style={{ color: 'orange', marginLeft: '10px' }}>(Not Verified)</span>}
      </p>
      <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '10px' }}>{getDisplayDetail(channel)}</p>
      
      <div style={{ marginTop: '10px' }}>
        <Link to={`/notification-channels/edit/${channel.id}`}>
          <button style={{ marginRight: '10px', fontSize: '0.9em', padding: '5px 10px' }}>Edit</button>
        </Link>
        <button onClick={handleDelete} disabled={isDeleting} style={{ fontSize: '0.9em', padding: '5px 10px', background: '#ff4d4f', color: 'white' }}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      {error && <p style={{ color: 'red', marginTop: '10px', fontSize: '0.9em' }}>{error}</p>}
    </div>
  );
};

export default NotificationChannelListItem;
