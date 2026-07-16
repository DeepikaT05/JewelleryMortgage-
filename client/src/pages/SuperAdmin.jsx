import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('sa_token');
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}44`, borderRadius: 14, padding: '20px 24px', minWidth: 160 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 480, maxWidth: '95vw', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px',
  color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none'
};
const labelStyle = { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 };
const btnPrimary = {
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600
};
const btnDanger = {
  background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600
};
const btnSecondary = {
  background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 8,
  padding: '7px 14px', cursor: 'pointer', fontSize: 13
};

// ─── COMPANIES TAB ────────────────────────────────────────────────────────────
function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | {edit, data}
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  const load = async () => {
    const r = await axios.get(`${API}/api/superadmin/companies`, authHeaders());
    setCompanies(r.data);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({}); setModal('add'); setMsg(''); };
  const openEdit = (c) => { setForm({ ...c }); setModal({ type: 'edit', id: c._id }); setMsg(''); };

  const save = async () => {
    try {
      if (modal === 'add') {
        await axios.post(`${API}/api/superadmin/companies`, form, authHeaders());
      } else {
        await axios.put(`${API}/api/superadmin/companies/${modal.id}`, form, authHeaders());
      }
      setModal(null); load();
    } catch (e) { setMsg(e.response?.data?.message || 'Error saving'); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Delete company "${name}" and all its admins?`)) return;
    try { await axios.delete(`${API}/api/superadmin/companies/${id}`, authHeaders()); load(); }
    catch (e) { alert(e.response?.data?.message || 'Error deleting'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#f1f5f9', margin: 0 }}>All Companies ({companies.length})</h3>
        <button onClick={openAdd} style={btnPrimary}>+ New Company</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Name', 'City', 'GSTIN', 'Phone', 'Email', 'Financial Year', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #1e293b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c._id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px 14px', color: '#f1f5f9', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{c.city || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.gstin || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.financialYearStart ? `${c.financialYearStart} → ${c.financialYearEnd}` : '—'}</td>
                <td style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(c)} style={btnSecondary}>Edit</button>
                  <button onClick={() => del(c._id, c.name)} style={btnDanger}>Delete</button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#475569' }}>No companies yet. Create one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'New Company' : 'Edit Company'} onClose={() => setModal(null)}>
          {msg && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{msg}</div>}
          {[
            ['name', 'Company Name *'], ['address', 'Address'], ['city', 'City'],
            ['area', 'Area'], ['pin', 'PIN'], ['gstin', 'GSTIN'],
            ['phone', 'Phone'], ['email', 'Email'],
            ['financialYearStart', 'Financial Year Start (YYYY-MM-DD)'],
            ['financialYearEnd', 'Financial Year End (YYYY-MM-DD)'],
          ].map(([k, l]) => (
            <div key={k}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={save} style={btnPrimary}>Save</button>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ADMINS TAB ───────────────────────────────────────────────────────────────
function AdminsTab() {
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [useNewCo, setUseNewCo] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [a, c] = await Promise.all([
      axios.get(`${API}/api/superadmin/admins`, authHeaders()),
      axios.get(`${API}/api/superadmin/companies`, authHeaders()),
    ]);
    setAdmins(a.data); setCompanies(c.data);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({}); setUseNewCo(false); setModal('add'); setMsg(''); };
  const openEdit = (a) => { setForm({ name: a.name, companyId: a.companyId?._id || '' }); setModal({ type: 'edit', id: a._id }); setMsg(''); };

  const save = async () => {
    try {
      if (modal === 'add') {
        const payload = { ...form };
        if (useNewCo) { payload.newCompanyName = form.newCompanyName; delete payload.companyId; }
        await axios.post(`${API}/api/superadmin/admins`, payload, authHeaders());
      } else {
        await axios.put(`${API}/api/superadmin/admins/${modal.id}`, form, authHeaders());
      }
      setModal(null); load();
    } catch (e) { setMsg(e.response?.data?.message || 'Error saving'); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Delete admin "${name}"?`)) return;
    try { await axios.delete(`${API}/api/superadmin/admins/${id}`, authHeaders()); load(); }
    catch (e) { alert(e.response?.data?.message || 'Error deleting'); }
  };

  const toggleActive = async (a) => {
    try {
      await axios.put(`${API}/api/superadmin/admins/${a._id}`, { isActive: !a.isActive }, authHeaders());
      load();
    } catch (e) { alert('Error updating status'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#f1f5f9', margin: 0 }}>All Admins ({admins.length})</h3>
        <button onClick={openAdd} style={btnPrimary}>+ New Admin</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Name', 'Username', 'Company', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #1e293b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a._id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px 14px', color: '#f1f5f9', fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: '12px 14px', color: '#a78bfa', fontFamily: 'monospace' }}>{a.username}</td>
                <td style={{ padding: '12px 14px', color: '#60a5fa' }}>{a.companyId?.name || <span style={{ color: '#475569' }}>Not Assigned</span>}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: a.isActive ? '#16a34a22' : '#ef444422', color: a.isActive ? '#4ade80' : '#f87171', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(a)} style={btnSecondary}>Edit</button>
                  <button onClick={() => toggleActive(a)} style={{ ...btnSecondary, color: a.isActive ? '#fbbf24' : '#4ade80' }}>
                    {a.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => del(a._id, a.name)} style={btnDanger}>Delete</button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#475569' }}>No admins yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'New Admin' : 'Edit Admin'} onClose={() => setModal(null)}>
          {msg && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{msg}</div>}
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} placeholder="e.g. Rohan Gupta" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          {modal === 'add' && (
            <>
              <label style={labelStyle}>Username *</label>
              <input style={inputStyle} placeholder="e.g. rohan_gupta" value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </>
          )}

          <label style={labelStyle}>Password {modal === 'add' ? '*' : '(leave blank to keep existing)'}</label>
          <input style={inputStyle} type="password" placeholder="••••••••" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

          {modal === 'add' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button onClick={() => setUseNewCo(false)} style={{ ...btnSecondary, background: !useNewCo ? '#6366f1' : '#334155', color: !useNewCo ? '#fff' : '#cbd5e1', fontSize: 12 }}>Existing Company</button>
                <button onClick={() => setUseNewCo(true)} style={{ ...btnSecondary, background: useNewCo ? '#6366f1' : '#334155', color: useNewCo ? '#fff' : '#cbd5e1', fontSize: 12 }}>+ Create New Company</button>
              </div>
              {useNewCo ? (
                <>
                  <label style={labelStyle}>New Company Name *</label>
                  <input style={inputStyle} placeholder="e.g. Sharma Jewellers" value={form.newCompanyName || ''} onChange={e => setForm(f => ({ ...f, newCompanyName: e.target.value }))} />
                </>
              ) : (
                <>
                  <label style={labelStyle}>Assign to Company *</label>
                  <select style={inputStyle} value={form.companyId || ''} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                    <option value="">— Select Company —</option>
                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </>
              )}
            </div>
          )}

          {modal !== 'add' && (
            <>
              <label style={labelStyle}>Reassign Company</label>
              <select style={inputStyle} value={form.companyId || ''} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                <option value="">— Keep current —</option>
                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={save} style={btnPrimary}>Save</button>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MAIN SUPERADMIN PAGE ─────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [page, setPage] = useState('login'); // 'login' | 'dashboard'
  const [tab, setTab] = useState('companies');
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) { setPage('dashboard'); loadStats(); }
  }, []);

  const loadStats = async () => {
    try {
      const r = await axios.get(`${API}/api/superadmin/stats`, authHeaders());
      setStats(r.data);
    } catch (e) { /* ignore */ }
  };

  const login = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await axios.post(`${API}/api/superadmin/login`, creds);
      localStorage.setItem('sa_token', r.data.token);
      setPage('dashboard'); loadStats();
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const logout = () => { localStorage.removeItem('sa_token'); setPage('login'); setStats(null); };

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #0f172a, #1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ width: 400, background: '#0f172a', borderRadius: 20, padding: 40, border: '1px solid #312e81', boxShadow: '0 25px 50px rgba(99,102,241,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👑</div>
            <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Super Admin</h1>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Girvi Management — Control Panel</p>
          </div>
          {err && <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{err}</div>}
          <form onSubmit={login}>
            <label style={labelStyle}>Username</label>
            <input id="sa-username" style={inputStyle} placeholder="superadmin" value={creds.username} onChange={e => setCreds(c => ({ ...c, username: e.target.value }))} />
            <label style={labelStyle}>Password</label>
            <input id="sa-password" style={inputStyle} type="password" placeholder="••••••••" value={creds.password} onChange={e => setCreds(c => ({ ...c, password: e.target.value }))} />
            <button id="sa-login-btn" type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', padding: '13px', fontSize: 15, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#020617', fontFamily: "'Outfit', sans-serif", color: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #1e1b4b, #0f172a)', borderBottom: '1px solid #1e293b', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>👑</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#a78bfa' }}>Girvi Super Admin</div>
            <div style={{ fontSize: 11, color: '#475569' }}>Control Panel</div>
          </div>
        </div>
        <button onClick={logout} style={{ ...btnSecondary, fontSize: 13 }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
            <StatCard label="Total Companies" value={stats.totalCompanies} color="#6366f1" />
            <StatCard label="Total Admins" value={stats.totalAdmins} color="#8b5cf6" />
            <StatCard label="Active Admins" value={stats.activeAdmins} color="#4ade80" />
            <StatCard label="Total Users" value={stats.totalUsers} color="#60a5fa" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0f172a', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[['companies', '🏢 Companies'], ['admins', '👤 Admins']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: tab === key ? '#fff' : '#64748b', border: 'none', borderRadius: 8,
              padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: 24, border: '1px solid #1e293b' }}>
          {tab === 'companies' && <CompaniesTab />}
          {tab === 'admins' && <AdminsTab />}
        </div>
      </div>
    </div>
  );
}
