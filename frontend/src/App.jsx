/* eslint-disable no-unused-vars */
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import DashboardPage from './components/DashboardPage';
import PropertyManagementPage from './components/PropertyManagementPage';
import MaintenanceRequestForm from './components/MaintenanceRequestForm';
import SettingsPage from './components/SettingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PropertyPage from './pages/PropertyPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingActionButton from './components/QuickActions/FloatingActionButton';

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const App = () => {
  return (
    <AppErrorBoundary>
      <Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '8px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <PageErrorBoundary>
          <Navbar />
        </PageErrorBoundary>
        
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={
              <PageErrorBoundary>
                <DashboardPage />
              </PageErrorBoundary>
            } />
            <Route path="/dashboard" element={
              <PageErrorBoundary>
                <DashboardPage />
              </PageErrorBoundary>
            } />
            <Route path="/properties" element={
              <PageErrorBoundary>
                <PropertyManagementPage />
              </PageErrorBoundary>
            } />
            <Route path="/properties/new" element={
              <PageErrorBoundary>
                <PropertyPage />
              </PageErrorBoundary>
            } />
            <Route path="/maintenance" element={
              <PageErrorBoundary>
                <MaintenanceRequestForm />
              </PageErrorBoundary>
            } />
            <Route path="/settings" element={
              <PageErrorBoundary>
                <SettingsPage />
              </PageErrorBoundary>
            } />
            <Route path="/login" element={
              <PageErrorBoundary>
                <LoginPage />
              </PageErrorBoundary>
            } />
            <Route path="/signup" element={
              <PageErrorBoundary>
                <SignupPage />
              </PageErrorBoundary>
            } />
            <Route path="*" element={
              <PageErrorBoundary>
                <NotFoundPage />
              </PageErrorBoundary>
            } />
          </Routes>
        </Suspense>
        
        <PageErrorBoundary>
          <FloatingActionButton />
        </PageErrorBoundary>
        
        <PageErrorBoundary>
          <Footer />
        </PageErrorBoundary>
      </Router>
    </AppErrorBoundary>
  );
};

export default App;

