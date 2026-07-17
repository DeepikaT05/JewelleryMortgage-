import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  Coins, 
  ArrowLeftRight, 
  TrendingUp, 
  Database, 
  Briefcase,
  LogOut,
  Building,
  ChevronDown,
  Menu,
  X,
  Plus,
  Trash2,
  Printer,
  BookOpen,
  CalendarDays
} from 'lucide-react';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [time, setTime] = useState(new Date());
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- LEDGER MODAL SYSTEM STATES ---
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerSubTab, setLedgerSubTab] = useState('list'); // 'list' or 'details'

  // Forms
  const [newAccForm, setNewAccForm] = useState({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });
  const [newTxForm, setNewTxForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'add', amount: '', remarks: '' });
  
  const [editingAccId, setEditingAccId] = useState(null);
  const [editAccForm, setEditAccForm] = useState({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });

  const fetchLedgers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/ledgers');
      setLedgers(res.data);
      if (res.data.length > 0 && !selectedLedgerId) {
        setSelectedLedgerId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching ledgers:', err);
    }
  };

  const fetchLedgerTx = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/ledgers/${id}/transactions`);
      setLedgerTransactions(res.data);
    } catch (err) {
      console.error('Error fetching ledger transactions:', err);
    }
  };

  useEffect(() => {
    if (showLedgerModal) {
      fetchLedgers();
    }
  }, [showLedgerModal]);

  useEffect(() => {
    if (selectedLedgerId && showLedgerModal) {
      fetchLedgerTx(selectedLedgerId);
    }
  }, [selectedLedgerId, showLedgerModal]);

  // Global Ctrl + L Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentUser?.role === 'admin' && e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setShowLedgerModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      const groupValue = newAccForm.group === 'custom' ? newAccForm.customGroup : newAccForm.group;
      await axios.post('http://localhost:5000/api/ledgers', {
        name: newAccForm.name,
        group: groupValue,
        openingBalance: newAccForm.openingBalance
      });
      setNewAccForm({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });
      fetchLedgers();
    } catch (err) {
      console.error('Error creating ledger account:', err);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      const groupValue = editAccForm.group === 'custom' ? editAccForm.customGroup : editAccForm.group;
      await axios.put(`http://localhost:5000/api/ledgers/${editingAccId}`, {
        name: editAccForm.name,
        group: groupValue,
        openingBalance: editAccForm.openingBalance
      });
      setEditingAccId(null);
      fetchLedgers();
    } catch (err) {
      console.error('Error updating ledger account:', err);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ledger account? All its transactions will be deleted.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/ledgers/${id}`);
      if (selectedLedgerId === id) setSelectedLedgerId('');
      fetchLedgers();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!newTxForm.amount) return;
    try {
      await axios.post(`http://localhost:5000/api/ledgers/${selectedLedgerId}/transactions`, newTxForm);
      setNewTxForm({ date: new Date().toISOString().split('T')[0], type: 'add', amount: '', remarks: '' });
      fetchLedgerTx(selectedLedgerId);
      fetchLedgers();
    } catch (err) {
      console.error('Error creating transaction:', err);
    }
  };

  const handleDeleteTx = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/ledgers/transactions/${txId}`);
      fetchLedgerTx(selectedLedgerId);
      fetchLedgers();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handlePrintLedger = () => {
    const acc = ledgers.find(l => l._id === selectedLedgerId);
    if (!acc) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${acc.name} - Ledger Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 20px; background: #fafafa; padding: 15px; border: 1px solid #eee; }
            .amount { font-family: monospace; font-size: 14px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Ledger Account Statement</h2>
            <p><strong>Account Name:</strong> ${acc.name} (${acc.group.toUpperCase()})</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="summary">
            <div>Opening Balance: <strong>₹${acc.openingBalance.toFixed(2)}</strong></div>
            <div>Total Additions (DD): <strong>₹${acc.totalAdd.toFixed(2)}</strong></div>
            <div>Total Deductions: <strong>₹${acc.totalDeduct.toFixed(2)}</strong></div>
            <div>Closing Balance: <strong>₹${acc.closingBalance.toFixed(2)}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Source</th>
                <th>Remarks</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerTransactions.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString()}</td>
                  <td style="color: ${t.type === 'add' ? 'green' : 'red'}; text-transform: uppercase; font-weight: bold;">
                    ${t.type === 'add' ? 'Addition (DD)' : 'Deduction'}
                  </td>
                  <td>${t.refType.toUpperCase()}</td>
                  <td>${t.remarks || ''}</td>
                  <td class="amount">₹${t.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${ledgerTransactions.length === 0 ? '<tr><td colspan="5" style="text-align: center;">No transactions found.</td></tr>' : ''}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    // Live clock update
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Session data
  const fetchSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (currentUser) {
        // Redirect store users to deal-master if they try to access restricted paths (like /)
        const isStoreUser = currentUser.role !== 'admin';
        const allowedPaths = ['/deal-master', '/transaction', '/day-report'];
        if (isStoreUser && !allowedPaths.includes(location.pathname)) {
          navigate('/deal-master');
        }
        return;
      }
      
      // Get current user
      const userRes = await axios.get('http://localhost:5000/api/auth/me');
      setCurrentUser(userRes.data);

      // Get all companies
      const compListRes = await axios.get('http://localhost:5000/api/companies');
      setCompanies(compListRes.data);

      // Get current active company
      if (userRes.data.companyId) {
        const activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
        setCompanyDetails(activeComp);
      }
      
      // Redirect store users to deal-master if they try to access restricted paths (like /)
      const isStoreUser = userRes.data.role !== 'admin';
      const allowedPaths = ['/deal-master', '/transaction', '/day-report'];
      if (isStoreUser && !allowedPaths.includes(location.pathname)) {
        navigate('/deal-master');
      }
      setLoading(false);
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchSession();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCompanySwitch = async (companyId) => {
    try {
      const res = await axios.post('http://localhost:5000/api/companies/switch', { companyId });
      // Reload page to refresh all scoped database calls
      window.location.reload();
    } catch (err) {
      console.error('Error switching company', err);
    }
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isOperator = role === 'operator' || role === 'staff';

  const allMenuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['admin'] },
    { name: 'General Masters', path: '/general-masters', icon: <Briefcase className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Deal Master', path: '/deal-master', icon: <Coins className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Transaction', path: '/transaction', icon: <ArrowLeftRight className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Reports', path: '/reports', icon: <FileText className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Accounting Group', path: '/accounting-group', icon: <BookOpen className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Day Report', path: '/day-report', icon: <CalendarDays className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Girvi Setup', path: '/girvi-setup', icon: <Settings className="h-5 w-5" />, roles: ['admin'] }
  ];

  const menuItems = role ? allMenuItems.filter(item => item.roles.includes(role)) : [];

  // Format date nicely
  const formatDate = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-955 text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <Coins className="h-10 w-10 text-primary-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-450 tracking-wide">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="glass-panel sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800 shadow-md no-print">
        {/* Left Side: Brand info & Financial Period & Hamburger Toggle */}
        <div className="flex items-center space-x-3 md:space-x-6">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg focus:outline-none transition-all"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-2">
            <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary-500" />
            <span className="text-sm md:text-lg font-bold tracking-wide bg-gradient-to-r from-primary-400 to-amber-300 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-xs md:max-w-none">
              {companyDetails ? companyDetails.name : 'Girvi Management'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-amber-400">
            <span>Financial Period:</span>
            <span>
              {companyDetails?.financialYearStart && companyDetails?.financialYearEnd
                ? `${new Date(companyDetails.financialYearStart).getFullYear()} - ${new Date(companyDetails.financialYearEnd).getFullYear()}`
                : '2026 - 2027'}
            </span>
          </div>
        </div>

        {/* Right Side: Live Clock, Switcher, User Dropdown */}
        <div className="flex items-center space-x-6">
          {/* Live Clock */}
          <div className="hidden lg:flex flex-col items-end text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{formatDate(time)}</span>
            <span className="font-mono text-amber-500/80">{formatTime(time)}</span>
          </div>

          {/* Switch Company (Admin Only Dropdown) */}
          {companies.length > 1 && currentUser?.role === 'admin' && (
            <div className="flex items-center space-x-1.5 text-sm bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Building className="h-4 w-4 text-slate-400" />
              <select
                value={currentUser.companyId || ''}
                onChange={(e) => handleCompanySwitch(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-300 font-medium cursor-pointer"
              >
                {companies.map(c => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Logged in User */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-850 text-slate-200 text-sm font-semibold transition-all"
            >
              <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                {currentUser?.name?.slice(0, 2) || 'ST'}
              </div>
              <span className="hidden sm:inline">{currentUser?.name || 'Staff User'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 text-slate-200 animate-slide-in">
                <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
                  Logged in as <span className="font-semibold text-slate-300">{currentUser?.username}</span> ({currentUser?.role})
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Frame: Sidebar + Content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 top-[56px] z-40 bg-black/50 backdrop-blur-sm md:hidden transition-all duration-300"
          />
        )}

        {/* 2. SIDEBAR */}
        <aside className={`
          fixed top-[56px] bottom-0 left-0 z-50 w-64 bg-slate-900 md:bg-slate-900/60 border-r border-slate-850 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:flex no-print shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="space-y-1.5">
            {/* Mobile Sidebar Close Header */}
            <div className="flex items-center justify-between md:hidden mb-4 pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-100 text-sm">Navigation</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto space-y-1.5 pt-4 border-t border-slate-850">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
            <div className="text-center pt-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                {currentUser?.role === 'admin' ? 'Girvi Management' : 'Store Manager Panel'}
              </span>
              <span className="text-[9px] text-slate-600 font-mono mt-0.5 block">
                v1.0.0 (Financial Apr26)
              </span>
            </div>
          </div>
        </aside>

        {/* 3. MAIN CONTENT VIEW */}
        <main className="flex-1 p-6 overflow-y-auto max-w-full print:p-0">
          {children}
        </main>
      </div>

      {/* 4. PERSISTENT FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 px-6 py-4 text-center text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center no-print mt-auto">
        <div>
          <span className="font-semibold text-slate-400">
            {companyDetails ? companyDetails.name : 'Gold-Silver Loan System'}
          </span>
          {companyDetails?.address && ` — ${companyDetails.address}, ${companyDetails.city}`}
        </div>
        <div className="mt-1 md:mt-0 flex space-x-4">
          {companyDetails?.gstin && (
            <span>
              GSTIN: <span className="font-mono text-slate-400">{companyDetails.gstin}</span>
            </span>
          )}
          {companyDetails?.phone && (
            <span>
              Ph: <span className="text-slate-400">{companyDetails.phone}</span>
            </span>
          )}
        </div>
      </footer>

      {/* LEDGER OVERLAY MODAL (CTRL+L Shortcut) */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary-500" />
                <h2 className="text-xl font-bold text-white tracking-wide">General Ledger & Accounts</h2>
              </div>
              <button 
                onClick={() => setShowLedgerModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs Selector */}
            <div className="flex border-b border-slate-800 bg-slate-900/60 p-2">
              <button
                onClick={() => setLedgerSubTab('list')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  ledgerSubTab === 'list' ? 'bg-primary-600 text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Ledger Accounts List
              </button>
              <button
                onClick={() => setLedgerSubTab('details')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  ledgerSubTab === 'details' ? 'bg-primary-600 text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Detailed Statements & DDs
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
              {/* TAB 1: ACCOUNTS LIST VIEW */}
              {ledgerSubTab === 'list' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Account Creation/Editing Form */}
                  <div className="lg:col-span-1 bg-slate-950/20 p-5 border border-slate-850 rounded-xl space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                      {editingAccId ? 'Edit Ledger Account' : 'Create Custom Account'}
                    </h3>
                    {editingAccId ? (
                      <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Account Name</label>
                          <input
                            type="text"
                            required
                            value={editAccForm.name}
                            onChange={(e) => setEditAccForm({ ...editAccForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Accounting Group</label>
                          <select
                            value={editAccForm.group}
                            onChange={(e) => setEditAccForm({ ...editAccForm, group: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="crediter">Creditor</option>
                            <option value="debiter">Debtor</option>
                            <option value="custom">Custom...</option>
                          </select>
                        </div>
                        {editAccForm.group === 'custom' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Custom Group Name</label>
                            <input
                              type="text"
                              required
                              value={editAccForm.customGroup}
                              onChange={(e) => setEditAccForm({ ...editAccForm, customGroup: e.target.value })}
                              placeholder="e.g. expenses"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-slate-400 mb-1">Opening Balance (₹)</label>
                          <input
                            type="number"
                            required
                            value={editAccForm.openingBalance}
                            onChange={(e) => setEditAccForm({ ...editAccForm, openingBalance: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold">
                            Update
                          </button>
                          <button type="button" onClick={() => setEditingAccId(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Account Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HDFC Current A/C"
                            value={newAccForm.name}
                            onChange={(e) => setNewAccForm({ ...newAccForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Accounting Group</label>
                          <select
                            value={newAccForm.group}
                            onChange={(e) => setNewAccForm({ ...newAccForm, group: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="crediter">Creditor</option>
                            <option value="debiter">Debtor</option>
                            <option value="custom">Custom...</option>
                          </select>
                        </div>
                        {newAccForm.group === 'custom' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Custom Group Name</label>
                            <input
                              type="text"
                              required
                              value={newAccForm.customGroup}
                              onChange={(e) => setNewAccForm({ ...newAccForm, customGroup: e.target.value })}
                              placeholder="e.g. expenses"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-slate-400 mb-1">Opening Balance (₹)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newAccForm.openingBalance || ''}
                            onChange={(e) => setNewAccForm({ ...newAccForm, openingBalance: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                          />
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1">
                          <Plus className="h-4 w-4" />
                          <span>Add Account</span>
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Accounts List Table */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-455 uppercase font-bold tracking-wider">
                            <th className="py-3 px-4">Account Name</th>
                            <th className="py-3 px-4">Group</th>
                            <th className="py-3 px-4 text-right">Opening Bal</th>
                            <th className="py-3 px-4 text-right">Additions (DD)</th>
                            <th className="py-3 px-4 text-right">Deductions</th>
                            <th className="py-3 px-4 text-right">Closing Bal</th>
                            <th className="py-3 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs">
                          {ledgers.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-4 text-center text-slate-500 italic">No ledger accounts registered.</td>
                            </tr>
                          ) : (
                            ledgers.map(acc => (
                              <tr key={acc._id} className="hover:bg-slate-950/10">
                                <td className="py-3 px-4 font-semibold text-slate-200">{acc.name}</td>
                                <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-400">{acc.group}</td>
                                <td className="py-3 px-4 text-right font-mono">₹{acc.openingBalance.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-400">+₹{acc.totalAdd.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono text-rose-455">-₹{acc.totalDeduct.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-amber-500">₹{acc.closingBalance.toFixed(2)}</td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex justify-center space-x-2">
                                    <button
                                      onClick={() => {
                                        setEditingAccId(acc._id);
                                        setEditAccForm({
                                          name: acc.name,
                                          group: ['cash', 'bank', 'crediter', 'debiter'].includes(acc.group) ? acc.group : 'custom',
                                          customGroup: ['cash', 'bank', 'crediter', 'debiter'].includes(acc.group) ? '' : acc.group,
                                          openingBalance: acc.openingBalance
                                        });
                                      }}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                                    >
                                      Edit
                                    </button>
                                    {acc.name !== 'Cash' && !acc.bankId && (
                                      <button
                                        onClick={() => handleDeleteAccount(acc._id)}
                                        className="p-1 text-rose-500 hover:text-rose-400"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILED STATEMENT VIEW */}
              {ledgerSubTab === 'details' && (
                <div className="space-y-6">
                  {/* Account Selector & Summary */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-400">Select Account:</span>
                      <select
                        value={selectedLedgerId}
                        onChange={(e) => setSelectedLedgerId(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      >
                        {ledgers.map(l => (
                          <option key={l._id} value={l._id}>{l.name} ({l.group.toUpperCase()})</option>
                        ))}
                      </select>
                    </div>

                    {/* Account Balance Summary cards */}
                    {(() => {
                      const acc = ledgers.find(l => l._id === selectedLedgerId);
                      if (!acc) return null;
                      return (
                        <div className="flex flex-wrap gap-4 text-xs font-mono">
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-455 block text-[10px] uppercase font-sans">Opening</span>
                            <span className="text-slate-200">₹{acc.openingBalance.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-emerald-500/80 block text-[10px] uppercase font-sans">Total Add (DD)</span>
                            <span className="text-emerald-400">+₹{acc.totalAdd.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-rose-500/80 block text-[10px] uppercase font-sans">Total Deduct</span>
                            <span className="text-rose-455">-₹{acc.totalDeduct.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-amber-500 block text-[10px] uppercase font-sans">Closing Balance</span>
                            <span className="text-amber-400 font-bold">₹{acc.closingBalance.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={handlePrintLedger}
                            className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center space-x-1 font-sans font-semibold text-xs transition-colors"
                          >
                            <Printer className="h-4 w-4 text-primary-400" />
                            <span>Print Ledger</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add manual entry form */}
                    <div className="lg:col-span-1 bg-slate-950/20 p-5 border border-slate-850 rounded-xl space-y-4 h-fit">
                      <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Add Manual Ledger Transaction</h3>
                      <form onSubmit={handleCreateTx} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1">Date</label>
                            <input
                              type="date"
                              required
                              value={newTxForm.date}
                              onChange={(e) => setNewTxForm({ ...newTxForm, date: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Type</label>
                            <select
                              value={newTxForm.type}
                              onChange={(e) => setNewTxForm({ ...newTxForm, type: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                            >
                              <option value="add">Deposit / DD (+)</option>
                              <option value="deduct">Payment / Deduct (-)</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Amount (₹) *</label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={newTxForm.amount}
                            onChange={(e) => setNewTxForm({ ...newTxForm, amount: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Remarks / Narrative</label>
                          <textarea
                            rows="2"
                            placeholder="Transaction notes"
                            value={newTxForm.remarks}
                            onChange={(e) => setNewTxForm({ ...newTxForm, remarks: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                          />
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1">
                          <Plus className="h-4 w-4" />
                          <span>Post Transaction</span>
                        </button>
                      </form>
                    </div>

                    {/* Transaction History log */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-white">Statement of Account</h3>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-455 G uppercase font-bold tracking-wider">
                              <th className="py-2.5 px-4">Date</th>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4">Source</th>
                              <th className="py-2.5 px-4">Remarks</th>
                              <th className="py-2.5 px-4 text-right">Amount</th>
                              <th className="py-2.5 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-xs font-mono">
                            {ledgerTransactions.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="py-4 text-center text-slate-500 italic font-sans">No transactions recorded.</td>
                              </tr>
                            ) : (
                              ledgerTransactions.map(t => (
                                <tr key={t._id} className="hover:bg-slate-955/20 text-slate-300">
                                  <td className="py-2 px-4">{new Date(t.date).toLocaleDateString()}</td>
                                  <td className={`py-2 px-4 font-bold ${t.type === 'add' ? 'text-emerald-400' : 'text-rose-455'}`}>
                                    {t.type === 'add' ? 'ADD' : 'DEDUCT'}
                                  </td>
                                  <td className="py-2 px-4 text-[10px] text-slate-400">{t.refType.toUpperCase()}</td>
                                  <td className="py-2 px-4 text-slate-350 font-sans max-w-[200px] truncate" title={t.remarks}>{t.remarks}</td>
                                  <td className="py-2 px-4 text-right font-bold">₹{t.amount.toFixed(2)}</td>
                                  <td className="py-2 px-4 text-center">
                                    {t.refType === 'manual' ? (
                                      <button onClick={() => handleDeleteTx(t._id)} className="text-rose-500 hover:text-rose-400 p-0.5">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-slate-600 font-sans italic">Auto</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer hint */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-center text-[10px] text-slate-550 flex justify-between items-center">
              <span>Press <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold font-mono">Ctrl + L</kbd> at any time to toggle this ledger board.</span>
              <span>Jeweller Mortgage Ledger v1.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
