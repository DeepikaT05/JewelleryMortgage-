import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Configure Axios base URL:
// - Local dev (port 5173/5174): point to backend on port 5000
// - Mobile WebView (origin is "null" / file://): use localStorage server_url
// - Production web browser: ALWAYS use window.location.origin (auto HTTPS, no Mixed Content)

let baseURL;
const origin = window.location.origin;
const port   = window.location.port;

if (port === '5173' || port === '5174') {
  // Local development
  baseURL = `${window.location.protocol}//${window.location.hostname}:5000`;
} else if (origin === 'null' || origin === 'file://') {
  // Mobile WebView — use the server URL configured by the user
  const savedServerUrl = localStorage.getItem('server_url') || 'http://jewellery.stafftrack.cloud';
  baseURL = savedServerUrl;
} else {
  // Production web browser — always use the page's own origin (HTTP or HTTPS respected automatically)
  baseURL = origin;
}
axios.defaults.baseURL = baseURL;

// Intercept all requests to dynamically add the latest Authorization token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized (expired or missing session)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


