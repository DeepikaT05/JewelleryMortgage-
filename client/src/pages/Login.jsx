import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, Coins, AlertCircle, Eye, EyeOff, Settings } from 'lucide-react';
import Toast from '../components/Toast';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mobile app server configuration states
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('server_url') || '');
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    let formattedUrl = serverUrl.trim();
    if (formattedUrl) {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'http://' + formattedUrl;
      }
      formattedUrl = formattedUrl.replace(/\/$/, '');
      localStorage.setItem('server_url', formattedUrl);
      axios.defaults.baseURL = formattedUrl;
      setServerUrl(formattedUrl);
      triggerToast('Server URL updated successfully');
    } else {
      localStorage.removeItem('server_url');
      axios.defaults.baseURL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
        ? import.meta.env.VITE_API_URL
        : (window.location.port === '5173'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : window.location.origin);
      setServerUrl('');
      triggerToast('Server URL reset to default');
    }
    setShowSettings(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        username,
        password
      });

      // Clear old session details to prevent session mixing
      localStorage.removeItem('currentUser');
      localStorage.removeItem('companyDetails');
      localStorage.removeItem('companies');

      // Save token
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Redirect to correct panel
      const userRole = (res.data.user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (userRole.includes('superadmin') || userRole.includes('super')) {
        navigate('/superadmin-portal');
      } else if (userRole.includes('admin')) {
        navigate('/');
      } else {
        navigate('/deal-master');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
      {/* Background radial highlight glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-slate-800 shadow-2xl relative">
        {/* Settings Button */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-primary-500 hover:bg-slate-900/10 rounded-full transition-all focus:outline-none"
          title="Server Settings"
        >
          <Settings className="h-5 w-5 animate-spin-hover" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-primary-500/10 rounded-2xl border border-primary-500/20 text-primary-500 mb-3">
            <Coins className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Girvi Management System</h2>
          <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
            Jeweller Mortgage Dashboard
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm rounded-xl mb-6">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. admin)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-primary-950/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
          <p>Multi-company scoped system logins.</p>
          <p className="mt-1">Default credentials: <span className="font-mono text-slate-400 font-semibold">admin / admin</span> or <span className="font-mono text-slate-400 font-semibold">operator / operator</span></p>
        </div>
      </div>

      {/* Server Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-slate-850 shadow-2xl relative animate-slide-in">
            <h3 className="text-lg font-bold text-white mb-2">API Server Settings</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure the backend API URL for this application (e.g. for local wifi testing or cloud servers).
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                  Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.100:5000"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all font-mono"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('server_url');
                    axios.defaults.baseURL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
                      ? import.meta.env.VITE_API_URL
                      : (window.location.port === '5173'
                          ? `${window.location.protocol}//${window.location.hostname}:5000`
                          : window.location.origin);
                    setServerUrl('');
                    triggerToast('Server URL reset to default');
                    setShowSettings(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-all border border-slate-800"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-primary-950/20"
                >
                  Save URL
                </button>
              </div>
            </form>
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Login;
