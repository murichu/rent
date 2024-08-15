import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({ theme: 'light', notifications: true });

  useEffect(() => {
    // Fetch current settings from API
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const handleSave = () => {
    // Save settings
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
      .then(res => res.json())
      .then(data => console.log('Settings saved:', data));
  };

  return (
    <div>
      <h1>Settings</h1>
      <label>
        Theme:
        <select value={settings.theme} onChange={e => setSettings({ ...settings, theme: e.target.value })}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>
        Notifications:
        <input type="checkbox" checked={settings.notifications} onChange={e => setSettings({ ...settings, notifications: e.target.checked })} />
      </label>
      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};

export default SettingsPage;

