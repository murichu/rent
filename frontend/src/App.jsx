 
/* eslint-disable no-unused-vars */
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DashboardPage from './components/DashboardPage';
import PropertyManagementPage from './components/PropertyManagementPage';
import MaintenanceRequestForm from './components/MaintenanceRequestForm';
import SettingsPage from './components/SettingsPage';
import About from './pages/About';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PropertyPage from './pages/PropertyPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const App = () => {
  return (
    <Router>
      <Routes>
      <Navbar/>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/properties" element={<PropertyManagementPage />} />
        <Route path="/maintenance" element={<MaintenanceRequestForm />} />
        <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/properties" element={<PropertyPage />} />
      <Footer/>

      </Routes>
    </Router>
  );
};

export default App;

