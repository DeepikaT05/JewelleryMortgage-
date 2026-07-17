import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2, Users, ShieldCheck, LayoutDashboard, Settings,
  Plus, Pencil, Trash2, Eye, EyeOff, Lock, User as UserIcon,
  Coins, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, X
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const getToken = () => localStorage.getItem('sa_token');
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Input = ({ label, type = 'text', value, onChange, placeholder, rightSlot }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-600 transition-all pr-10"
      />
      {rightSlot && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightSlot}</div>
      )}
    </div>
  </div>
);

const Select = ({ label, value, onChange, children }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 transition-all appearance-none"
    >
      {children}
    </select>
  </div>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border ${type === 'success' ? 'bg-emerald-950/80 border-emerald-700/40 text-emerald-300' : 'bg-rose-950/80 border-rose-700/40 text-rose-300'}`}>
      {type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {msg}
    </div>
  );
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-100 text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="inline-flex p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400 mb-4">
          <Trash2 className="h-6 w-6" />
        </div>
        <p className="text-slate-200 mb-6 text-sm">{msg}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm font-semibold hover:from-rose-500 hover:to-red-500 transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

const Badge = ({ active }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/30' : 'bg-rose-950/60 text-rose-400 border border-rose-700/30'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, Icon }) {
  return (
    <div className="flex-1 min-w-[140px] glass-panel rounded-2xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="text-3xl font-black text-slate-100">{value ?? '—'}</div>
    </div>
  );
}

// ─── COMPANIES TAB ────────────────────────────────────────────────────────────
function CompaniesTab({ showToast }) {
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await axios.get(`${API}/api/superadmin/companies`, authHeaders());
    setCompanies(r.data);
  };
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setErr('');
    try {
      if (!modal.id) await axios.post(`${API}/api/superadmin/companies`, form, authHeaders());
      else await axios.put(`${API}/api/superadmin/companies/${modal.id}`, form, authHeaders());
      setModal(null); load(); showToast('Company saved successfully', 'success');
    } catch (e) { setErr(e.response?.data?.message || 'Error saving'); }
  };

  const del = async (id) => {
    try { await axios.delete(`${API}/api/superadmin/companies/${id}`, authHeaders()); load(); showToast('Company deleted', 'success'); }
    catch (e) { showToast(e.response?.data?.message || 'Error deleting', 'error'); }
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-slate-400">Total: {companies.length} companies</span>
        <button onClick={() => {
          const currentYear = new Date().getFullYear();
          setForm({
            financialYearStart: `${currentYear}-04-01`,
            financialYearEnd: `${currentYear + 1}-03-31`
          });
          setErr('');
          setModal({ id: null });
        }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-primary-950/20">
          <Plus className="h-4 w-4" /> New Company
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              {['Name', 'City', 'GSTIN', 'Phone', 'Email', 'Financial Year', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-100">{c.name}</td>
                <td className="px-4 py-3 text-slate-400">{c.city || '—'}</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.gstin || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{c.email || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.financialYearStart ? `${c.financialYearStart} → ${c.financialYearEnd}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setForm({ ...c }); setErr(''); setModal({ id: c._id }); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setConfirm({ id: c._id, name: c.name })} className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">No companies found. Create the first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.id ? 'Edit Company' : 'New Company'} onClose={() => setModal(null)}>
          {err && <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
          <Input label="Company Name *" value={form.name || ''} onChange={f('name')} placeholder="e.g. Demo Jewellery & Pawnbrokers" />
          <Input label="Address" value={form.address || ''} onChange={f('address')} placeholder="e.g. 123 Gold Bazaar Street" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city || ''} onChange={f('city')} placeholder="e.g. Mumbai" />
            <Input label="Area" value={form.area || ''} onChange={f('area')} placeholder="e.g. Zaveri Bazaar" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="PIN" value={form.pin || ''} onChange={f('pin')} placeholder="e.g. 400002" />
            <Input label="GSTIN" value={form.gstin || ''} onChange={f('gstin')} placeholder="e.g. 27AAAAA1111A1Z1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone || ''} onChange={f('phone')} placeholder="e.g. 022-23456789" />
            <Input label="Email" value={form.email || ''} onChange={f('email')} placeholder="e.g. info@demojewellers.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="FY Start" value={form.financialYearStart || ''} onChange={f('financialYearStart')} placeholder="e.g. 2026-04-01" />
            <Input label="FY End" value={form.financialYearEnd || ''} onChange={f('financialYearEnd')} placeholder="e.g. 2027-03-31" />
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={save} className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white text-sm font-semibold rounded-xl transition-all">Save</button>
            <button onClick={() => setModal(null)} className="px-4 py-2.5 bg-slate-800 text-slate-300 text-sm rounded-xl hover:bg-slate-700 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmModal
          msg={`Delete company "${confirm.name}" and all its admins? This cannot be undone.`}
          onConfirm={() => del(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── ADMINS TAB ───────────────────────────────────────────────────────────────
function AdminsTab({ showToast }) {
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [useNewCo, setUseNewCo] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const [a, c] = await Promise.all([
      axios.get(`${API}/api/superadmin/admins`, authHeaders()),
      axios.get(`${API}/api/superadmin/companies`, authHeaders()),
    ]);
    setAdmins(a.data); setCompanies(c.data);
  };
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setErr('');
    try {
      if (!modal.id) {
        const payload = { ...form };
        if (useNewCo) { payload.newCompanyName = form.newCompanyName; delete payload.companyId; }
        await axios.post(`${API}/api/superadmin/admins`, payload, authHeaders());
      } else {
        await axios.put(`${API}/api/superadmin/admins/${modal.id}`, form, authHeaders());
      }
      setModal(null); load(); showToast('Admin saved successfully', 'success');
    } catch (e) { setErr(e.response?.data?.message || 'Error saving'); }
  };

  const del = async (id) => {
    try { await axios.delete(`${API}/api/superadmin/admins/${id}`, authHeaders()); load(); showToast('Admin deleted', 'success'); }
    catch (e) { showToast(e.response?.data?.message || 'Error deleting', 'error'); }
    setConfirm(null);
  };

  const toggleActive = async (a) => {
    try {
      await axios.put(`${API}/api/superadmin/admins/${a._id}`, { isActive: !a.isActive }, authHeaders());
      load(); showToast(`Admin ${a.isActive ? 'deactivated' : 'activated'}`, 'success');
    } catch (e) { showToast('Error updating status', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-slate-400">Total: {admins.length} admins</span>
        <button
          onClick={() => { setForm({}); setUseNewCo(false); setShowPass(false); setErr(''); setModal({ id: null }); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-primary-950/20"
        >
          <Plus className="h-4 w-4" /> New Admin
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              {['Name', 'Username', 'Company', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-100">{a.name}</td>
                <td className="px-4 py-3 text-primary-400 font-mono text-xs">{a.username}</td>
                <td className="px-4 py-3 text-slate-300">{a.companyId?.name || <span className="text-slate-600">Not Assigned</span>}</td>
                <td className="px-4 py-3"><Badge active={a.isActive} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setForm({ name: a.name, companyId: a.companyId?._id || '' }); setShowPass(false); setErr(''); setModal({ id: a._id }); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => toggleActive(a)} className={`p-1.5 rounded-lg transition-all ${a.isActive ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-400' : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400'}`}>
                      {a.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setConfirm({ id: a._id, name: a.name })} className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-600">No admins yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.id ? 'Edit Admin' : 'New Admin'} onClose={() => setModal(null)}>
          {err && <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
          <Input label="Full Name *" value={form.name || ''} onChange={f('name')} placeholder="e.g. Rohan Gupta" />
          {!modal.id && <Input label="Username *" value={form.username || ''} onChange={f('username')} placeholder="e.g. rohan_gupta" />}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Password {modal.id ? '(leave blank to keep)' : '*'}</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password || ''}
                onChange={f('password')}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-600 transition-all"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!modal.id && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 ml-1">Company Assignment</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setUseNewCo(false)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${!useNewCo ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>Existing Company</button>
                <button onClick={() => setUseNewCo(true)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${useNewCo ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>Create New Company</button>
              </div>
              {useNewCo
                ? <Input label="New Company Name *" value={form.newCompanyName || ''} onChange={f('newCompanyName')} placeholder="e.g. Gupta Jewellers" />
                : (
                  <Select label="Select Company *" value={form.companyId || ''} onChange={f('companyId')}>
                    <option value="">— Select —</option>
                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </Select>
                )
              }
            </div>
          )}

          {modal.id && (
            <Select label="Reassign Company" value={form.companyId || ''} onChange={f('companyId')}>
              <option value="">— Keep current —</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={save} className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white text-sm font-semibold rounded-xl transition-all">Save</button>
            <button onClick={() => setModal(null)} className="px-4 py-2.5 bg-slate-800 text-slate-300 text-sm rounded-xl hover:bg-slate-700 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmModal
          msg={`Delete admin "${confirm.name}"? This cannot be undone.`}
          onConfirm={() => del(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ showToast }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const changePassword = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return setErr('All fields are required');
    }
    if (form.newPassword !== form.confirmPassword) {
      return setErr('New password and confirm password do not match');
    }
    if (form.newPassword.length < 6) {
      return setErr('New password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/superadmin/change-password`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      }, authHeaders());
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully', 'success');
    } catch (e) {
      setErr(e.response?.data?.message || 'Error changing password');
    } finally { setLoading(false); }
  };

  const PwField = ({ label, field, show, toggle }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={form[field]}
          onChange={f(field)}
          placeholder="••••••••"
          className="w-full px-3 py-2.5 pr-10 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-600 transition-all"
        />
        <button type="button" onClick={toggle} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md">
      <h3 className="font-bold text-slate-100 text-base mb-6">Change Super Admin Password</h3>
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        {err && (
          <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />{err}
          </div>
        )}
        <form onSubmit={changePassword}>
          <PwField label="Current Password" field="currentPassword" show={showCurrent} toggle={() => setShowCurrent(v => !v)} />
          <PwField label="New Password" field="newPassword" show={showNew} toggle={() => setShowNew(v => !v)} />
          <PwField label="Confirm New Password" field="confirmPassword" show={showConfirm} toggle={() => setShowConfirm(v => !v)} />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN SUPERADMIN PAGE ─────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [page, setPage] = useState('login');
  const [tab, setTab] = useState('companies');
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    // Check sa_token first, then fallback to regular token for super admin users
    let token = getToken();
    if (!token) {
      token = localStorage.getItem('token');
      if (token) localStorage.setItem('sa_token', token);
    }
    if (token) { setPage('dashboard'); loadStats(); }
  }, []);

  const loadStats = async () => {
    try {
      const r = await axios.get(`${API}/api/superadmin/stats`, authHeaders());
      setStats(r.data);
    } catch { /* silent */ }
  };

  const login = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await axios.post(`${API}/api/superadmin/login`, creds);
      localStorage.setItem('sa_token', r.data.token);
      setPage('dashboard'); loadStats();
    } catch (e) {
      setErr(e.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const logout = () => { localStorage.removeItem('sa_token'); localStorage.removeItem('token'); setPage('login'); setStats(null); window.location.href = '/login'; };

  const TABS = [
    { key: 'companies', label: 'Companies', Icon: Building2 },
    { key: 'admins', label: 'Admins', Icon: Users },
    { key: 'settings', label: 'Settings', Icon: Settings },
  ];

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  if (page === 'login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-slate-800 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-primary-500/10 rounded-2xl border border-primary-500/20 text-primary-500 mb-3">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Super Admin Panel</h2>
            <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
              Girvi Management — Control Center
            </p>
          </div>

          {err && (
            <div className="flex items-center space-x-2 p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm rounded-xl mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={login} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={creds.username}
                  onChange={e => setCreds(c => ({ ...c, username: e.target.value }))}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={creds.password}
                  onChange={e => setCreds(c => ({ ...c, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-primary-950/20 disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
            <p>Super Admin Control Center — Secure Access</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="glass-panel border-b border-slate-800 px-6 flex items-center justify-between h-16 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/10 rounded-xl border border-primary-500/20 text-primary-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-100">Girvi Super Admin</div>
            <div className="text-xs text-slate-500">Control Center</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
        >
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="flex gap-4 flex-wrap mb-8">
            <StatCard label="Total Companies" value={stats.totalCompanies} Icon={Building2} />
            <StatCard label="Total Admins" value={stats.totalAdmins} Icon={Users} />
            <StatCard label="Active Admins" value={stats.activeAdmins} Icon={CheckCircle} />
            <StatCard label="Total Users" value={stats.totalUsers} Icon={LayoutDashboard} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass-panel border border-slate-800 rounded-2xl p-1 w-fit">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-gradient-to-r from-primary-600 to-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          {tab === 'companies' && <CompaniesTab showToast={showToast} />}
          {tab === 'admins' && <AdminsTab showToast={showToast} />}
          {tab === 'settings' && <SettingsTab showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
