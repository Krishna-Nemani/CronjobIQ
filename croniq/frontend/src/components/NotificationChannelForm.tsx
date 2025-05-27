import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationChannel, NotificationChannelType } from '../types';
import { createNotificationChannel, updateNotificationChannel, CreateNotificationChannelData, UpdateNotificationChannelData } from '../services/notificationChannelService';

interface NotificationChannelFormProps {
  initialData?: NotificationChannel;
  onSave?: (channel: NotificationChannel) => void;
}

const NotificationChannelForm: React.FC<NotificationChannelFormProps> = ({ initialData, onSave }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<NotificationChannelType>(initialData?.type || 'email');
  
  // State for configuration details, initialized based on initialData or defaults
  const [emailAddress, setEmailAddress] = useState(initialData?.type === 'email' ? initialData.configuration_details?.email : '');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(initialData?.type === 'slack' ? initialData.configuration_details?.webhook_url : '');
  const [pagerDutyRoutingKey, setPagerDutyRoutingKey] = useState(initialData?.type === 'pagerduty' ? initialData.configuration_details?.routing_key : '');
  const [genericWebhookUrl, setGenericWebhookUrl] = useState(initialData?.type === 'webhook' ? initialData.configuration_details?.url : '');
  const [genericWebhookHeaders, setGenericWebhookHeaders] = useState(initialData?.type === 'webhook' ? JSON.stringify(initialData.configuration_details?.headers || {}, null, 2) : '{}');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      switch (initialData.type) {
        case 'email':
          setEmailAddress(initialData.configuration_details?.email || '');
          break;
        case 'slack':
          setSlackWebhookUrl(initialData.configuration_details?.webhook_url || '');
          break;
        case 'pagerduty':
          setPagerDutyRoutingKey(initialData.configuration_details?.routing_key || '');
          break;
        case 'webhook':
          setGenericWebhookUrl(initialData.configuration_details?.url || '');
          setGenericWebhookHeaders(JSON.stringify(initialData.configuration_details?.headers || {}, null, 2));
          break;
      }
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = 'Channel name is required.';

    switch (type) {
      case 'email':
        if (!emailAddress.trim() || !/\S+@\S+\.\S+/.test(emailAddress)) errors.emailAddress = 'A valid email address is required.';
        break;
      case 'slack':
        if (!slackWebhookUrl.trim() || !/^https:\/\/hooks\.slack\.com\//.test(slackWebhookUrl)) errors.slackWebhookUrl = 'A valid Slack webhook URL is required (must start with https://hooks.slack.com/).';
        break;
      case 'pagerduty':
        if (!pagerDutyRoutingKey.trim()) errors.pagerDutyRoutingKey = 'PagerDuty routing key is required.';
        // Basic length check, actual PagerDuty keys are 32 chars alphanumeric
        if (pagerDutyRoutingKey.trim().length !== 32 || !/^[a-zA-Z0-9]+$/.test(pagerDutyRoutingKey)) {
            errors.pagerDutyRoutingKey = 'PagerDuty routing key must be 32 alphanumeric characters.';
        }
        break;
      case 'webhook':
        if (!genericWebhookUrl.trim() || !/^https?:\/\//.test(genericWebhookUrl)) errors.genericWebhookUrl = 'A valid URL is required for the webhook.';
        try {
          const parsedHeaders = JSON.parse(genericWebhookHeaders);
          if (typeof parsedHeaders !== 'object' || parsedHeaders === null || Array.isArray(parsedHeaders)) {
            errors.genericWebhookHeaders = 'Headers must be a valid JSON object.';
          } else {
            for(const key in parsedHeaders) {
                if (typeof parsedHeaders[key] !== 'string') {
                     errors.genericWebhookHeaders = `Value for header "${key}" must be a string.`;
                     break;
                }
            }
          }
        } catch (e) {
          errors.genericWebhookHeaders = 'Headers must be a valid JSON string.';
        }
        break;
      default:
        errors.type = 'Invalid channel type selected.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    let configuration_details = {};
    switch (type) {
      case 'email': configuration_details = { email: emailAddress }; break;
      case 'slack': configuration_details = { webhook_url: slackWebhookUrl }; break;
      case 'pagerduty': configuration_details = { routing_key: pagerDutyRoutingKey }; break;
      case 'webhook': 
        try {
            configuration_details = { url: genericWebhookUrl, headers: JSON.parse(genericWebhookHeaders) };
        } catch (e) {
            setError("Invalid JSON in webhook headers."); // Should be caught by validation, but good to have
            setIsLoading(false);
            return;
        }
        break;
    }

    const channelDataPayload = { name, type, configuration_details };

    try {
      let savedChannel: NotificationChannel;
      if (initialData?.id) {
        savedChannel = await updateNotificationChannel(initialData.id.toString(), channelDataPayload as UpdateNotificationChannelData);
      } else {
        savedChannel = await createNotificationChannel(channelDataPayload as CreateNotificationChannelData);
      }
      
      if (onSave) {
        onSave(savedChannel);
      } else {
        navigate('/notification-channels'); // Default navigation
      }
    } catch (err: any) {
      console.error('Failed to save notification channel:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save channel.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfigFields = () => {
    switch (type) {
      case 'email':
        return (
          <div>
            <label htmlFor="emailAddress">Email Address:</label>
            <input type="email" id="emailAddress" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required />
            {formErrors.emailAddress && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.emailAddress}</p>}
          </div>
        );
      case 'slack':
        return (
          <div>
            <label htmlFor="slackWebhookUrl">Slack Webhook URL:</label>
            <input type="url" id="slackWebhookUrl" value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)} required placeholder="https://hooks.slack.com/services/..." />
            {formErrors.slackWebhookUrl && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.slackWebhookUrl}</p>}
          </div>
        );
      case 'pagerduty':
        return (
          <div>
            <label htmlFor="pagerDutyRoutingKey">PagerDuty Routing Key:</label>
            <input type="text" id="pagerDutyRoutingKey" value={pagerDutyRoutingKey} onChange={(e) => setPagerDutyRoutingKey(e.target.value)} required />
            {formErrors.pagerDutyRoutingKey && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.pagerDutyRoutingKey}</p>}
          </div>
        );
      case 'webhook':
        return (
          <>
            <div>
              <label htmlFor="genericWebhookUrl">Webhook URL:</label>
              <input type="url" id="genericWebhookUrl" value={genericWebhookUrl} onChange={(e) => setGenericWebhookUrl(e.target.value)} required />
              {formErrors.genericWebhookUrl && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.genericWebhookUrl}</p>}
            </div>
            <div>
              <label htmlFor="genericWebhookHeaders">Webhook Headers (JSON):</label>
              <textarea id="genericWebhookHeaders" value={genericWebhookHeaders} onChange={(e) => setGenericWebhookHeaders(e.target.value)} rows={3} style={{width: 'calc(100% - 22px)', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              {formErrors.genericWebhookHeaders && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.genericWebhookHeaders}</p>}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: 'auto', padding: '20px', background: '#fff', borderRadius: '8px' }}>
      <h2>{initialData ? 'Edit Notification Channel' : 'Create New Notification Channel'}</h2>
      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      <div>
        <label htmlFor="name">Channel Name:</label>
        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        {formErrors.name && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="type">Channel Type:</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value as NotificationChannelType)} disabled={!!initialData}>
          <option value="email">Email</option>
          <option value="slack">Slack</option>
          <option value="pagerduty">PagerDuty</option>
          <option value="webhook">Generic Webhook</option>
        </select>
        {initialData && <small style={{display: 'block', marginTop: '5px'}}>Channel type cannot be changed after creation.</small>}
      </div>

      {renderConfigFields()}

      <button type="submit" disabled={isLoading} style={{ marginTop: '20px', padding: '10px 15px' }}>
        {isLoading ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Channel')}
      </button>
      <button type="button" onClick={() => navigate('/notification-channels')} style={{ marginLeft: '10px', background: '#eee', color: '#333' }} disabled={isLoading}>
        Cancel
      </button>
    </form>
  );
};

export default NotificationChannelForm;
