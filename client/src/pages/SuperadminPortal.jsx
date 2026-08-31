import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../components/Toast';
import {
  Building2, Users, ShieldCheck, Plus, Pencil, Trash2,
  Lock, User as UserIcon, CheckCircle, AlertCircle, RefreshCw,
  Eye, EyeOff, Search, Phone, Mail, MapPin, Calendar, ArrowRight
} from 'lucide-react';

const SuperadminPortal = () => {
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('stores'); // 'stores', 'admins'
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Store modal state
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '',
    financialYearStart: '', financialYearEnd: '', adminUsername: '', adminPassword: '', adminName: ''
  });

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', username: '', password: '', role: 'admin', companyId: '', isActive: true
  });

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [compRes, userRes] = await Promise.all([
        axios.get('/api/companies?all=true'),
        axios.get('/api/auth/users')
      ]);
      setCompanies(Array.isArray(compRes.data) ? compRes.data : []);
      setUsers(Array.isArray(userRes.data) ? userRes.data : []);
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Error loading Superadmin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── STORE HANDLERS ────────────────────────────────────────────────────────
  const handleOpenCreateStore = () => {
    setEditingStoreId(null);
    setStoreForm({
      name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '',
      financialYearStart: '2026-04-01', financialYearEnd: '2027-03-31', adminUsername: '', adminPassword: '', adminName: ''
    });
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (comp) => {
    setEditingStoreId(comp._id);
    setStoreForm({
      name: comp.name || '',
      address: comp.address || '',
      city: comp.city || '',
      area: comp.area || '',
      pin: comp.pin || '',
      gstin: comp.gstin || '',
      phone: comp.phone || '',
      email: comp.email || '',
      financialYearStart: comp.financialYearStart ? comp.financialYearStart.split('T')[0] : '',
      financialYearEnd: comp.financialYearEnd ? comp.financialYearEnd.split('T')[0] : '',
      adminUsername: '',
      adminPassword: '',
      adminName: ''
    });
    setShowStoreModal(true);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.name.trim()) {
      triggerToast('Store name is required', 'error');
      return;
    }
    try {
      if (editingStoreId) {
        await axios.put(`/api/companies/${editingStoreId}`, storeForm);
        triggerToast('Store updated successfully');
      } else {
        const res = await axios.post('/api/companies', storeForm);
        // Auto create store admin user if credentials supplied
        if (storeForm.adminUsername && storeForm.adminPassword) {
          await axios.post('/api/auth/register', {
            name: storeForm.adminName || `${storeForm.name} Admin`,
            username: storeForm.adminUsername,
            password: storeForm.adminPassword,
            role: 'admin',
            companyId: res.data._id
          });
        }
        triggerToast('Store and Admin created successfully');
      }
      setShowStoreModal(false);
      loadData();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error saving store', 'error');
    }
  };

  const handleToggleStoreActive = async (comp) => {
    try {
      const nextStatus = comp.isActive === undefined ? false : !comp.isActive;
      await axios.put(`/api/companies/${comp._id}`, { isActive: nextStatus });
      triggerToast(`Store ${nextStatus ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (err) {
      triggerToast('Error updating store status', 'error');
    }
  };

  const handleDeleteStore = async (id) => {
    if (!window.confirm('Are you sure you want to delete this store? All associated records and user associations will be impacted.')) return;
    try {
      await axios.delete(`/api/companies/${id}`);
      triggerToast('Store deleted successfully');
      loadData();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error deleting store', 'error');
    }
  };

  const handleSwitchStore = async (comp) => {
    try {
      await axios.post('/api/companies/switch', { companyId: comp._id });
      localStorage.setItem('companyDetails', JSON.stringify(comp));
      window.dispatchEvent(new Event('companyDetailsUpdated'));
      triggerToast(`Switched active workspace to ${comp.name}`);
      window.location.href = '/';
    } catch (err) {
      triggerToast('Error switching store workspace', 'error');
    }
  };

  // ─── USER / ADMIN HANDLERS ──────────────────────────────────────────────────
  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserForm({
      name: '', username: '', password: '', role: 'admin',
      companyId: companies[0]?._id || '', isActive: true
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUserId(u._id);
    setUserForm({
      name: u.name || '',
      username: u.username || '',
      password: '',
      role: u.role || 'admin',
      companyId: u.companyId?._id || u.companyId || companies[0]?._id || '',
      isActive: u.isActive !== undefined ? u.isActive : true
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await axios.put(`/api/auth/users/${editingUserId}`, {
          name: userForm.name,
          role: userForm.role,
          companyId: userForm.role === 'superadmin' ? undefined : userForm.companyId,
          isActive: userForm.isActive,
          password: userForm.password || undefined
        });
        triggerToast('User / Admin updated successfully');
      } else {
        if (!userForm.password) {
          triggerToast('Password is required for new accounts', 'error');
          return;
        }
        await axios.post('/api/auth/register', {
          name: userForm.name,
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
          companyId: userForm.role === 'superadmin' ? undefined : userForm.companyId
        });
        triggerToast('New User / Admin account created successfully');
      }
      setShowUserModal(false);
      loadData();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error saving user details', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      triggerToast('User deleted successfully');
      loadData();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error deleting user', 'error');
    }
  };

  const filteredCompanies = companies.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Super Administrator Portal</h1>
              <p className="text-slate-400 text-xs mt-0.5">Manage stores, create admin accounts, and configure system workspaces.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {activeTab === 'stores' ? (
            <button
              onClick={handleOpenCreateStore}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-primary-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Store</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateUser}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-primary-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Admin / User</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-purple-500 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Registered Stores</span>
          <div className="text-2xl font-black text-white mt-1">{companies.length}</div>
          <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
            {companies.filter(c => c.isActive !== false).length} Active stores
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-primary-500 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Admins & Staff</span>
          <div className="text-2xl font-black text-white mt-1">{users.length}</div>
          <span className="text-[10px] text-primary-400 font-semibold block mt-1">
            {users.filter(u => u.role === 'admin').length} Admins • {users.filter(u => u.role === 'manager' || u.role === 'operator').length} Store Users
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-emerald-500 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">System Status</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">Online & Active</div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Multi-store database connected
          </span>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xs w-full">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'stores' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stores ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'admins' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admins & Users ({users.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'stores' ? 'Search store name, city...' : 'Search admin name, username...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* TAB 1: STORES TABLE */}
      {activeTab === 'stores' && (
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-3.5">Store / Business Name</th>
                  <th className="p-3.5">Address & City</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Financial Year</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No stores found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-primary-400 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block text-sm">{c.name}</span>
                            {c.gstin && <span className="text-[10px] text-slate-500 font-mono">GSTIN: {c.gstin}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <div className="flex items-start space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>{c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}${c.pin ? ` - ${c.pin}` : ''}` : '-'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-mono">
                        {c.phone && <div className="text-slate-300">Ph: {c.phone}</div>}
                        {c.email && <div className="text-slate-500 text-[10px]">{c.email}</div>}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {c.financialYearStart && c.financialYearEnd ? (
                          `${new Date(c.financialYearStart).getFullYear()} - ${String(new Date(c.financialYearEnd).getFullYear() % 100).padStart(2, '0')}`
                        ) : '2026 - 27'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleStoreActive(c)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            c.isActive !== false
                              ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-400'
                              : 'bg-rose-950/80 border border-rose-700/50 text-rose-400'
                          }`}
                        >
                          {c.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleSwitchStore(c)}
                            title="Open / Switch to this Store Workspace"
                            className="px-2.5 py-1.5 bg-primary-600/20 hover:bg-primary-600/40 text-primary-300 border border-primary-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleOpenEditStore(c)}
                            title="Edit Store Details"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStore(c._id)}
                            title="Delete Store"
                            className="p-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ADMINS & USERS TABLE */}
      {activeTab === 'admins' && (
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-3.5">Name & Username</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Assigned Store</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No admin or user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 shrink-0">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block text-sm">{u.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          u.role === 'superadmin' || u.role === 'super admin'
                            ? 'bg-purple-950 border border-purple-600 text-purple-300'
                            : u.role === 'admin'
                            ? 'bg-amber-950 border border-amber-600 text-amber-300'
                            : u.role === 'manager'
                            ? 'bg-blue-950 border border-blue-600 text-blue-300'
                            : 'bg-slate-850 border border-slate-700 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">
                        {u.role === 'superadmin' || u.role === 'super admin' ? (
                          <span className="text-purple-400 font-bold">Global / All Stores</span>
                        ) : (
                          u.companyId?.name || companies.find(c => c._id === u.companyId)?.name || 'Unassigned'
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive !== false
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            title="Edit User / Change Password"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {u.role !== 'superadmin' && u.role !== 'super admin' && (
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              title="Delete User"
                              className="p-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
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
      )}

      {/* MODAL: CREATE / EDIT STORE */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary-400" />
                <span>{editingStoreId ? 'Edit Store Profile' : 'Register New Store / Branch'}</span>
              </h3>
              <button
                onClick={() => setShowStoreModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    placeholder="e.g. Jewellery & Pawnbrokers"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500 font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Full Store Address *</label>
                  <textarea
                    rows="2"
                    required
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    placeholder="e.g. 123, Gold Bazaar Street, Jewel City"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / Town</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={storeForm.area}
                    onChange={(e) => setStoreForm({ ...storeForm, area: e.target.value })}
                    placeholder="e.g. Gold Market"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={storeForm.pin}
                    onChange={(e) => setStoreForm({ ...storeForm, pin: e.target.value })}
                    placeholder="e.g. 400001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={storeForm.gstin}
                    onChange={(e) => setStoreForm({ ...storeForm, gstin: e.target.value })}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono uppercase focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Phone / Mobile</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    placeholder="e.g. store@jewellery.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Financial Year Start</label>
                  <input
                    type="date"
                    value={storeForm.financialYearStart}
                    onChange={(e) => setStoreForm({ ...storeForm, financialYearStart: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Financial Year End</label>
                  <input
                    type="date"
                    value={storeForm.financialYearEnd}
                    onChange={(e) => setStoreForm({ ...storeForm, financialYearEnd: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {!editingStoreId && (
                <div className="border-t border-slate-800 pt-4 mt-2 space-y-3">
                  <span className="block text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    Optional: Auto-Provision Admin User for this Store
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Admin Username</label>
                      <input
                        type="text"
                        value={storeForm.adminUsername}
                        onChange={(e) => setStoreForm({ ...storeForm, adminUsername: e.target.value })}
                        placeholder="e.g. store1_admin"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Admin Password</label>
                      <input
                        type="password"
                        value={storeForm.adminPassword}
                        onChange={(e) => setStoreForm({ ...storeForm, adminPassword: e.target.value })}
                        placeholder="e.g. admin123"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {editingStoreId ? 'Save Changes' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT USER */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-primary-400" />
                <span>{editingUserId ? 'Edit Account' : 'Create Admin / User Account'}</span>
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUserId}
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="e.g. store_admin"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-primary-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {editingUserId ? 'New Password (leave blank to keep existing)' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUserId}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder={editingUserId ? '••••••••' : 'Enter account password'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-primary-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500 font-bold"
                  >
                    <option value="admin">Admin (Store Head)</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator (Staff)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Assign Store *</label>
                  <select
                    value={userForm.companyId}
                    onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-primary-500"
                  >
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingUserId && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="userActiveCheck"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    className="accent-primary-500 rounded h-4 w-4"
                  />
                  <label htmlFor="userActiveCheck" className="text-slate-300 font-bold select-none cursor-pointer">
                    Account is Active
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {editingUserId ? 'Save User Settings' : 'Create User'}
                </button>
              </div>
            </form>
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

export default SuperadminPortal;
