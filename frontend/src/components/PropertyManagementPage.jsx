import React, { useEffect, useState } from 'react';

const PropertyManagementPage = () => {
  const [properties, setProperties] = useState([]);
  const [newProperty, setNewProperty] = useState({ address: '', type: '', description: '', isVacant: true });

  useEffect(() => {
    // Fetch properties from API
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => setProperties(data));
  }, []);

  const handleAddProperty = () => {
    // Add a new property
    fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProperty),
    })
      .then(res => res.json())
      .then(data => setProperties([...properties, data]));
  };

  return (
    <div>
      <h1>Property Management</h1>
      <div>
        <input type="text" placeholder="Address" value={newProperty.address} onChange={e => setNewProperty({ ...newProperty, address: e.target.value })} />
        <input type="text" placeholder="Type" value={newProperty.type} onChange={e => setNewProperty({ ...newProperty, type: e.target.value })} />
        <textarea placeholder="Description" value={newProperty.description} onChange={e => setNewProperty({ ...newProperty, description: e.target.value })}></textarea>
        <label>
          Vacant:
          <input type="checkbox" checked={newProperty.isVacant} onChange={e => setNewProperty({ ...newProperty, isVacant: e.target.checked })} />
        </label>
        <button onClick={handleAddProperty}>Add Property</button>
      </div>
      <ul>
        {properties.map(property => (
          <li key={property.id}>{property.address} - {property.type} - {property.isVacant ? 'Vacant' : 'Occupied'}</li>
        ))}
      </ul>
    </div>
  );
};

export default PropertyManagementPage;
