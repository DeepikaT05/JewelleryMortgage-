import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Configure Axios defaults dynamically
axios.defaults.baseURL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
  ? import.meta.env.VITE_API_URL
  : (window.location.port === '5173' || window.location.port === '5174'
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : window.location.origin);

// Intercept all requests to dynamically add the latest Superadmin token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sa_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
