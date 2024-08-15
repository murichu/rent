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
    // Fetch report data
    fetch('/api/reports/dashboard')
      .then(res => res.json())
      .then(data => setReportData(data));

    // Fetch vacant properties
    fetch('/api/properties/vacant')
      .then(res => res.json())
      .then(data => setVacantProperties(data));
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
