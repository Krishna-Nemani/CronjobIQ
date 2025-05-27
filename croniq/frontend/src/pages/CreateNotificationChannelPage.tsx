import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationChannelForm from '../components/NotificationChannelForm';
import { NotificationChannel } from '../types';

const CreateNotificationChannelPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSave = (channel: NotificationChannel) => {
    alert(`Notification channel "${channel.name}" created successfully!`);
    navigate('/notification-channels'); 
  };

  return (
    <div>
      <NotificationChannelForm onSave={handleSave} />
    </div>
  );
};

export default CreateNotificationChannelPage;
