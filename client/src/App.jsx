import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout & Frame wrapper
import Layout from './components/Layout';

// View Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GeneralMasters from './pages/GeneralMasters';
import DealMaster from './pages/DealMaster';
import Transaction from './pages/Transaction';
import Reports from './pages/Reports';
import GirviSetup from './pages/GirviSetup';

// Authentication Protection Wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard/Admin modules */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/general-masters"
          element={
            <ProtectedRoute>
              <GeneralMasters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deal-master"
          element={
            <ProtectedRoute>
              <DealMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transaction"
          element={
            <ProtectedRoute>
              <Transaction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/girvi-setup"
          element={
            <ProtectedRoute>
              <GirviSetup />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
