/* eslint-disable no-unused-vars */
import React, { useState } from 'react';

const MaintenanceRequestForm = () => {
  const [request, setRequest] = useState({ propertyId: '', description: '' });

  const handleSubmit = () => {
    // Submit maintenance request
    fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(res => res.json())
      .then(data => console.log('Request submitted:', data));
  };

  return (
    <div>
      <h1>Submit Maintenance Request</h1>
      <input type="text" placeholder="Property ID" value={request.propertyId} onChange={e => setRequest({ ...request, propertyId: e.target.value })} />
      <textarea placeholder="Description" value={request.description} onChange={e => setRequest({ ...request, description: e.target.value })}></textarea>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default MaintenanceRequestForm;
