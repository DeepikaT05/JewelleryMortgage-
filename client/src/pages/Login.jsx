import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, Coins, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      // Save token
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Redirect to correct panel
      if (res.data.user && res.data.user.role === 'admin') {
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. admin)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-350 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
    </div>
  );
};

export default Login;
