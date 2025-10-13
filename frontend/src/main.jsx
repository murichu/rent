import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'
import { ThemeProvider } from './context/ThemeContext'

// Attach token if present
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// Register service worker for PWA
serviceWorkerRegistration.register({
  onSuccess: () => console.log('✅ App ready for offline use'),
  onUpdate: (registration) => {
    console.log('🔄 New version available');
    if (confirm('New version available! Reload to update?')) {
      window.location.reload();
    }
  },
})
