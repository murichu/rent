/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import axios from 'axios';

const DashboardPage = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/properties', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setData(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Dashboard data={data} />
    </div>
  );
};

export default DashboardPage;
