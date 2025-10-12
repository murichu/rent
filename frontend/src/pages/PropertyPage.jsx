/* eslint-disable no-unused-vars */
import React from 'react';
import PropertyForm from '../components/PropertyForm';
import axios from 'axios';

const PropertyPage = () => {
  const handlePropertySubmit = async (property) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/properties', property, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      alert('Property added successfully');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Property Management</h1>
      <PropertyForm onSubmit={handlePropertySubmit} />
    </div>
  );
};

export default PropertyPage;
