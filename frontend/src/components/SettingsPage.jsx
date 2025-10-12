import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({ theme: 'light', notifications: true });

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/agencies/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => setSettings({ ...settings, name: data.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const token = localStorage.getItem('token');
    fetch('/agencies/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name: settings.name || 'My Agency' }),
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

