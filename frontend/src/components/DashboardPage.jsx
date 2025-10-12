/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import VacantProperties from './VacantProperties';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DashboardPage = () => {
  const [reportData, setReportData] = useState({ labels: [], datasets: [] });
  const [vacantProperties, setVacantProperties] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/leases', { headers })
      .then(res => res.json())
      .then(data => {
        const labels = data.map((l) => new Date(l.startDate).toLocaleDateString());
        const values = data.map((l) => l.rentAmount);
        setReportData({ labels, datasets: [{ label: 'Leases', data: values }] });
      });

    fetch('/properties', { headers })
      .then(res => res.json())
      .then(data => setVacantProperties(data.filter((p) => p.status === 'AVAILABLE')));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Line data={reportData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Dashboard Report' } } }} />
      <VacantProperties properties={vacantProperties} />
    </div>
  );
};

export default DashboardPage;
