import React, { useEffect, useState, useCallback } from 'react';
import { NotificationChannel, JobNotificationSetting } from '../types';
import { getNotificationChannels } from '../services/notificationChannelService';
import { getSettingsForJob, addOrUpdateSettingForJob, removeSettingFromJob, UpsertJobNotificationSettingData } from '../services/jobNotificationSettingsService';

interface JobNotificationSettingsManagerProps {
  jobId: string;
}

const JobNotificationSettingsManager: React.FC<JobNotificationSettingsManagerProps> = ({ jobId }) => {
  const [allChannels, setAllChannels] = useState<NotificationChannel[]>([]);
  const [jobSettings, setJobSettings] = useState<JobNotificationSetting[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<{[key: number]: boolean}>({}); // Track saving state per channel

  const fetchData = useCallback(async () => {
    setLoadingChannels(true);
    setLoadingSettings(true);
    setError(null);
    try {
      const [channelsRes, settingsRes] = await Promise.all([
        getNotificationChannels(),
        getSettingsForJob(jobId)
      ]);
      setAllChannels(channelsRes);
      setJobSettings(settingsRes);
    } catch (err) {
      console.error('Failed to load notification data:', err);
      setError('Failed to load notification settings. Please try again.');
    } finally {
      setLoadingChannels(false);
      setLoadingSettings(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSettingForChannel = (channelId: number): JobNotificationSetting | undefined => {
    return jobSettings.find(s => s.notification_channel_id === channelId);
  };

  const handleSettingChange = async (
    channelId: number, 
    updates: Partial<UpsertJobNotificationSettingData> & { is_selected: boolean }
  ) => {
    setIsSaving(prev => ({...prev, [channelId]: true}));
    setError(null);
    
    const existingSetting = getSettingForChannel(channelId);

    if (updates.is_selected === false) { // Deselected, so remove
      if (existingSetting) {
        try {
          await removeSettingFromJob(existingSetting.id.toString());
          setJobSettings(prev => prev.filter(s => s.id !== existingSetting.id));
        } catch (err) {
          console.error(`Error removing setting for channel ${channelId}:`, err);
          setError(`Failed to remove notification for channel ${allChannels.find(c=>c.id === channelId)?.name}.`);
        }
      }
    } else { // Selected or updated existing
      const settingData: UpsertJobNotificationSettingData = {
        notification_channel_id: channelId,
        notify_on_failure: updates.notify_on_failure ?? existingSetting?.notify_on_failure ?? true,
        notify_on_lateness: updates.notify_on_lateness ?? existingSetting?.notify_on_lateness ?? true,
        notify_on_recovery: updates.notify_on_recovery ?? existingSetting?.notify_on_recovery ?? false,
      };
      try {
        const savedSetting = await addOrUpdateSettingForJob(jobId, settingData);
        setJobSettings(prev => {
          const index = prev.findIndex(s => s.id === savedSetting.id);
          if (index > -1) {
            const newSettings = [...prev];
            newSettings[index] = savedSetting;
            return newSettings;
          }
          return [...prev, savedSetting];
        });
      } catch (err) {
        console.error(`Error saving setting for channel ${channelId}:`, err);
        setError(`Failed to save notification for channel ${allChannels.find(c=>c.id === channelId)?.name}.`);
      }
    }
    setIsSaving(prev => ({...prev, [channelId]: false}));
  };


  if (loadingChannels || loadingSettings) {
    return <p>Loading notification settings manager...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }
  
  const unverifiedChannels = allChannels.filter(c => !c.is_verified && c.type === 'email');


  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Manage Notifications for this Job</h3>
      {allChannels.length === 0 ? (
        <p>No notification channels have been configured yet. Please <Link to="/notification-channels/new">add a channel</Link> first.</p>
      ) : (
        allChannels.map(channel => {
          // Do not allow selection of unverified email channels
          const isEmailAndUnverified = channel.type === 'email' && !channel.is_verified;
          const currentSetting = getSettingForChannel(channel.id);
          const isSelected = !!currentSetting;

          return (
            <div key={channel.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              <h5 style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <input
                  type="checkbox"
                  id={`channel-select-${channel.id}`}
                  checked={isSelected}
                  onChange={(e) => handleSettingChange(channel.id, { is_selected: e.target.checked })}
                  disabled={isSaving[channel.id] || isEmailAndUnverified}
                  style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                />
                <label htmlFor={`channel-select-${channel.id}`} style={{fontWeight: 'normal'}}>
                  {channel.name} ({channel.type.toUpperCase()})
                  {isEmailAndUnverified && <span style={{color: 'orange', marginLeft: '5px'}}>(Not Verified)</span>}
                </label>
              </h5>
              {isSelected && !isEmailAndUnverified && (
                <div style={{ marginLeft: '30px', fontSize: '0.9em' }}>
                  <label style={{ marginRight: '10px' }}>
                    <input
                      type="checkbox"
                      checked={currentSetting?.notify_on_failure ?? true}
                      onChange={(e) => handleSettingChange(channel.id, { is_selected: true, notify_on_failure: e.target.checked })}
                      disabled={isSaving[channel.id]}
                    /> Notify on Failure
                  </label>
                  <label style={{ marginRight: '10px' }}>
                    <input
                      type="checkbox"
                      checked={currentSetting?.notify_on_lateness ?? true}
                      onChange={(e) => handleSettingChange(channel.id, { is_selected: true, notify_on_lateness: e.target.checked })}
                      disabled={isSaving[channel.id]}
                    /> Notify on Lateness
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={currentSetting?.notify_on_recovery ?? false}
                      onChange={(e) => handleSettingChange(channel.id, { is_selected: true, notify_on_recovery: e.target.checked })}
                      disabled={isSaving[channel.id]}
                    /> Notify on Recovery
                  </label>
                </div>
              )}
              {isSaving[channel.id] && <p style={{marginLeft: '30px', fontSize: '0.85em', color: 'blue'}}>Saving settings for {channel.name}...</p>}
            </div>
          );
        })
      )}
       {unverifiedChannels.length > 0 && (
          <div style={{marginTop: '15px', padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px'}}>
            <p style={{color: '#856404', margin: 0}}>
                Some email channels are not verified and cannot be used for notifications until verified.
                (Verification process is currently a TODO and would typically involve sending a confirmation email.)
            </p>
          </div>
        )}
    </div>
  );
};

export default JobNotificationSettingsManager;
