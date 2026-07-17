import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../components/Toast';
import { Save, Upload, ShieldCheck, KeyRound, Image, X, Building2, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

const GirviSetup = () => {
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'sms', 'users', 'companies'

  // User Management State
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'operator', companyId: '', isActive: true });

  // Store Management State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '', financialYearStart: '', financialYearEnd: '', loginId: '', password: ''
  });
  const [showStorePassword, setShowStorePassword] = useState(false);
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/companies', companyForm);
      
      // Auto-create manager user for this store if credentials are provided
      if (companyForm.loginId && companyForm.password) {
        await axios.post('/api/auth/register', {
          name: `${companyForm.name} Manager`,
          username: companyForm.loginId,
          password: companyForm.password,
          role: 'manager',
          companyId: res.data._id
        });
      }
      
      triggerToast('Store & Manager created successfully');
      setShowCompanyModal(false);
      setCompanyForm({ name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '', financialYearStart: '', financialYearEnd: '', loginId: '', password: '' });
      loadUserAndCompanies();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error creating store', 'error');
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/companies/${editingCompanyId}`, companyForm);
      triggerToast('Store updated successfully');
      setShowCompanyModal(false);
      setEditingCompanyId(null);
      setCompanyForm({ name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '', financialYearStart: '', financialYearEnd: '', loginId: '', password: '' });
      loadUserAndCompanies();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error updating store', 'error');
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Are you sure you want to delete this store? All associated records will be affected.')) return;
    try {
      await axios.delete(`/api/companies/${id}`);
      triggerToast('Store deleted successfully');
      loadUserAndCompanies();
    } catch (err) {
      triggerToast('Error deleting store', 'error');
    }
  };

  const handleToggleCompanyActive = async (company) => {
    try {
      const updatedStatus = company.isActive === undefined ? false : !company.isActive;
      await axios.put(`/api/companies/${company._id}`, { isActive: updatedStatus });
      triggerToast(`Store ${updatedStatus ? 'activated' : 'deactivated'} successfully`);
      loadUserAndCompanies();
    } catch (err) {
      triggerToast('Error toggling store status', 'error');
    }
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadSettingsData = async () => {
    try {
      // Fetch general setup
      const setupRes = await axios.get('/api/settings/girvi');
      if (setupRes.data) {
        setGirviForm({
          ...setupRes.data,
          defaultRateOfInterest: setupRes.data.defaultRateOfInterest || 3.00,
          openingBalance: setupRes.data.openingBalance || 641860.00
        });
        if (setupRes.data.logoFileUrl) {
          setLogoPreview(`${setupRes.data.logoFileUrl}`);
        }
      }

      // Fetch SMS setup
      const smsRes = await axios.get('/api/settings/sms');
      if (smsRes.data) {
        setSmsForm(smsRes.data);
      }
    } catch (err) {
      triggerToast('Error loading configuration parameters', 'error');
    }
  };

  const loadUserAndCompanies = async () => {
    try {
      const meRes = await axios.get('/api/auth/me');
      setCurrentUser(meRes.data);
      
      const compRes = await axios.get('/api/companies?all=true');
      setCompanies(compRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const [girviForm, setGirviForm] = useState({
    printCompanyNameAddress: true,
    displayLogoInReceipt: true,
    autoReminderUnsettledGirvi: false,
    allowIssueMoreThanEstimatedAmount: false,
    defaultRateOfInterest: 3.00,
    customerNoticeSubject: 'Outstanding Pledge Loan Reminder',
    openingBalance: 641860.00,
    dealPrintHeading: 'Girvi Mortgage Loan Receipt',
    logoFileUrl: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [smsForm, setSmsForm] = useState({
    smsApiProvider: 'mock',
    apiKey: '',
    senderId: 'SHOPGR',
    autoReminderTemplate: 'Dear {customerName}, your deal #{dealNo} has outstanding balance of {balanceAmount}.',
    isEnabled: false
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsersList(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register', {
        name: userForm.name,
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
        companyId: userForm.role === 'admin' ? undefined : userForm.companyId
      });
      triggerToast('User created successfully');
      setShowUserModal(false);
      setUserForm({ name: '', username: '', password: '', role: 'operator', companyId: '', isActive: true });
      fetchUsers();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error creating user', 'error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/auth/users/${editingUserId}`, {
        name: userForm.name,
        role: userForm.role,
        companyId: userForm.role === 'admin' ? undefined : userForm.companyId,
        isActive: userForm.isActive,
        password: userForm.password || undefined
      });
      triggerToast('User updated successfully');
      setShowUserModal(false);
      setEditingUserId(null);
      setUserForm({ name: '', username: '', password: '', role: 'operator', companyId: '', isActive: true });
      fetchUsers();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error updating user', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      triggerToast('User deleted successfully');
      fetchUsers();
    } catch (err) {
      triggerToast('Error deleting user', 'error');
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadUserAndCompanies();
  }, []);

  const handleSaveGirvi = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(girviForm).forEach(key => {
      if (key !== 'logoFileUrl') {
        data.append(key, girviForm[key]);
      }
    });

    if (logoFile) {
      data.append('logo', logoFile);
    }

    try {
      await axios.put('/api/settings/girvi', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      triggerToast('General setup entries updated successfully');
      loadSettingsData();
    } catch (err) {
      triggerToast('Error saving configuration details', 'error');
    }
  };

  const handleSaveSms = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/settings/sms', smsForm);
      triggerToast('SMS dispatch entries updated successfully');
      loadSettingsData();
    } catch (err) {
      triggerToast('Error updating SMS gateway rules', 'error');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Girvi Setup</h1>
        <p className="text-slate-400 text-sm mt-1">Configure company profiles, receipt templates, lock values, and notification APIs.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-lg">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'general' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          General Setup
        </button>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'users' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            User Management
          </button>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl max-w-4xl">
        {/* TAB 1: GENERAL SETUP */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGirvi} className="space-y-6">
            <h3 className="text-base font-bold text-slate-200 border-b border-slate-850 pb-2 flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-primary-400" />
              <span>General Setup</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              <div className="space-y-4">
                
                {/* 1) Want to Print Company Name, Address */}
                <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                  <span className="font-semibold text-slate-350">1) Want to Print Company Name, Address</span>
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printCompanyNameAddress"
                        checked={girviForm.printCompanyNameAddress === true}
                        onChange={() => setGirviForm({ ...girviForm, printCompanyNameAddress: true })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printCompanyNameAddress"
                        checked={girviForm.printCompanyNameAddress === false}
                        onChange={() => setGirviForm({ ...girviForm, printCompanyNameAddress: false })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* 2) Display Company Logo in Receipt */}
                <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                  <span className="font-semibold text-slate-350">2) Display Company Logo in Receipt</span>
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="displayLogoInReceipt"
                        checked={girviForm.displayLogoInReceipt === true}
                        onChange={() => setGirviForm({ ...girviForm, displayLogoInReceipt: true })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="displayLogoInReceipt"
                        checked={girviForm.displayLogoInReceipt === false}
                        onChange={() => setGirviForm({ ...girviForm, displayLogoInReceipt: false })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* 3) Auto Reminder of Unsettled Girvi but completed as per time */}
                <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                  <span className="font-semibold text-slate-350">3) Auto Reminder of Unsettled Girvi but completed as per time</span>
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoReminderUnsettledGirvi"
                        checked={girviForm.autoReminderUnsettledGirvi === true}
                        onChange={() => setGirviForm({ ...girviForm, autoReminderUnsettledGirvi: true })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoReminderUnsettledGirvi"
                        checked={girviForm.autoReminderUnsettledGirvi === false}
                        onChange={() => setGirviForm({ ...girviForm, autoReminderUnsettledGirvi: false })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* 4) Want to Issue more than estimated amount in Deal Master */}
                <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                  <span className="font-semibold text-slate-350">4) Want to Issue more than estimated amount in Deal Master</span>
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="allowIssueMoreThanEstimatedAmount"
                        checked={girviForm.allowIssueMoreThanEstimatedAmount === true}
                        onChange={() => setGirviForm({ ...girviForm, allowIssueMoreThanEstimatedAmount: true })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="allowIssueMoreThanEstimatedAmount"
                        checked={girviForm.allowIssueMoreThanEstimatedAmount === false}
                        onChange={() => setGirviForm({ ...girviForm, allowIssueMoreThanEstimatedAmount: false })}
                        className="accent-primary-500 h-4 w-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* 5) Rate of Interest */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">5) Rate of Interest</label>
                  <input
                    type="number"
                    step="0.01"
                    value={girviForm.defaultRateOfInterest}
                    onChange={(e) => setGirviForm({ ...girviForm, defaultRateOfInterest: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none"
                  />
                </div>

              </div>

              <div className="space-y-4">
                {/* 6) Customer Notice Subject */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">6) Customer Notice Subject</label>
                  <input
                    type="text"
                    value={girviForm.customerNoticeSubject}
                    onChange={(e) => setGirviForm({ ...girviForm, customerNoticeSubject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                  />
                </div>

                {/* 7) Opening Balance */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">7) Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={girviForm.openingBalance}
                    onChange={(e) => setGirviForm({ ...girviForm, openingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                {/* 8) Deal Print Heading */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">8) Deal Print Heading</label>
                  <input
                    type="text"
                    value={girviForm.dealPrintHeading}
                    onChange={(e) => setGirviForm({ ...girviForm, dealPrintHeading: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                  />
                </div>

                {/* Logo file */}
                <div className="space-y-2">
                  <span className="block text-slate-400 font-semibold">Logo File</span>
                  {logoPreview ? (
                    <div className="relative border border-slate-800 rounded-xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center">
                      <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-red-650 text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center text-slate-500 bg-slate-950/20 text-xs">
                      <Image className="h-6 w-6 mx-auto opacity-35 mb-1" />
                      <span>No image attached</span>
                    </div>
                  )}

                  {!logoPreview && (
                    <label className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                      <Upload className="h-4 w-4 text-primary-400" />
                      <span>Upload Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  )}
                </div>

              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Update Entries</span>
            </button>
          </form>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-primary-400" />
                <span>Store Users Management</span>
              </h3>
              <button
                onClick={() => {
                  setEditingUserId(null);
                  setUserForm({ name: '', username: '', password: '', role: 'operator', companyId: companies[0]?._id || '', isActive: true });
                  setShowUserModal(true);
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-md"
              >
                Register New User
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-850 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4 font-mono">Role</th>
                    <th className="py-3 px-4">Scope Store / Company</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-slate-500 italic">No users found.</td>
                    </tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u._id} className="hover:bg-slate-950/10">
                        <td className="py-3 px-4 font-semibold text-slate-200">{u.name}</td>
                        <td className="py-3 px-4 font-mono">{u.username}</td>
                        <td className="py-3 px-4 uppercase text-[10px] text-primary-400 font-bold">{u.role}</td>
                        <td className="py-3 px-4 text-slate-400">{u.companyId?.name || 'ALL STORES (Global)'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            u.isActive ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950/50 text-rose-455 border border-rose-500/20'
                          }`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingUserId(u._id);
                                setUserForm({
                                  name: u.name,
                                  username: u.username,
                                  password: '',
                                  role: u.role,
                                  companyId: u.companyId?._id || companies[0]?._id || '',
                                  isActive: u.isActive
                                });
                                setShowUserModal(true);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                            >
                              Edit
                            </button>
                            {u.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u._id)}
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

            {/* REGISTER / EDIT USER DIALOG MODAL */}
            {showUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-white">
                      {editingUserId ? 'Edit User Credentials' : 'Register Store User'}
                    </h4>
                    <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Username</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingUserId}
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none disabled:opacity-40"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        Password {editingUserId && '(Leave blank to keep same)'}
                      </label>
                      <input
                        type="password"
                        required={!editingUserId}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                        >
                          <option value="operator">Operator</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>

                        </select>
                      </div>

                      {userForm.role !== 'admin' && (
                        <div>
                          <label className="block text-slate-400 mb-1">Assign Store</label>
                          <select
                            required
                            value={userForm.companyId}
                            onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                          >
                            {companies.map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {editingUserId && (
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="userActive"
                          checked={userForm.isActive}
                          onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                          className="accent-primary-500 rounded h-4 w-4"
                        />
                        <label htmlFor="userActive" className="text-slate-300 font-bold select-none cursor-pointer">
                          Account is Active
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold tracking-wide"
                    >
                      {editingUserId ? 'Save User Settings' : 'Register User'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

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

export default GirviSetup;
