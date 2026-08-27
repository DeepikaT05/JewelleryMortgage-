import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Printer, Calendar, Users, Briefcase, Plus, Download, X } from 'lucide-react';
import { formatIndianCurrency } from '../utils/format';
import Toast from '../components/Toast';

const PREDEFINED_GROUPS = ['cash', 'bank', 'creditor', 'debtor'];

const AccountingGroup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const activeGroupId = searchParams.get('groupId');
  const activeGroupName = searchParams.get('groupName');

  const [deals, setDeals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [custSearchText, setCustSearchText] = useState('All Customers');
  const [custSearchFocused, setCustSearchFocused] = useState(false);
  const [custDropdownIdx, setCustDropdownIdx] = useState(-1);

  const getFilteredCustomersList = () => {
    const search = custSearchText.toLowerCase();
    return customers.filter(c => 
      (c.name && c.name.toLowerCase().includes(search)) ||
      (c.customerCode && c.customerCode.toString().includes(search)) ||
      (c.mobile && c.mobile.includes(search))
    );
  };

  const handleCustKeyDown = (e) => {
    const list = getFilteredCustomersList();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustSearchFocused(true);
      setCustDropdownIdx(prev => Math.min(prev + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustDropdownIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (custDropdownIdx >= 0 && list[custDropdownIdx]) {
        const c = list[custDropdownIdx];
        setSelectedCustomerId(c._id);
        setCustSearchText(`${c.name} (${c.customerCode})`);
        setCustSearchFocused(false);
        setCustDropdownIdx(-1);
      } else if (custDropdownIdx === -1 && list.length > 0) {
        const c = list[0];
        setSelectedCustomerId(c._id);
        setCustSearchText(`${c.name} (${c.customerCode})`);
        setCustSearchFocused(false);
      }
    } else if (e.key === 'Escape') {
      setCustSearchFocused(false);
      setCustDropdownIdx(-1);
    }
  };

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fyPreset, setFyPreset] = useState('custom');

  // Store FY from Company settings
  const [storeFY, setStoreFY] = useState(null);

  // Group filter for accounting group display
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [allGroups, setAllGroups] = useState(PREDEFINED_GROUPS);

  // Ledger Output Data
  const [ledgerData, setLedgerData] = useState({
    openingPrincipal: 0,
    closingPrincipal: 0,
    ledger: []
  });

  // Create New Accounting Group form
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    group: 'cash',
    customGroup: '',
    openingBalance: 0
  });
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const printRef = useRef(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Load store's configured financial year from Company settings
  const loadStoreFY = async () => {
    try {
      const userRes = await axios.get('/api/auth/me');
      const compRes = await axios.get('/api/companies');
      const activeComp = compRes.data.find(c => c._id === userRes.data.companyId) || compRes.data[0];
      if (activeComp && activeComp.financialYearStart) {
        const s = new Date(activeComp.financialYearStart);
        const e = new Date(activeComp.financialYearEnd || activeComp.financialYearStart);
        const label = `${s.getFullYear()}-${String(e.getFullYear() % 100).padStart(2, '0')}`;
        const fy = { start: activeComp.financialYearStart.split('T')[0], end: activeComp.financialYearEnd ? activeComp.financialYearEnd.split('T')[0] : '', label };
        setStoreFY(fy);
        setStartDate(fy.start);
        setEndDate(fy.end);
        setFyPreset('store');
      }
    } catch (err) {
      console.error('Error loading store FY:', err);
    }
  };

  // Load ledgers to get custom groups
  const loadGroups = async () => {
    try {
      const res = await axios.get('/api/ledgers');
      const customGroups = [...new Set(res.data.map(l => l.group).filter(Boolean))];
      const all = [...new Set([...PREDEFINED_GROUPS, ...customGroups])];
      setAllGroups(all);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadGroupData = async () => {
      try {
        const [custRes, dealRes, txRes] = await Promise.all([
          axios.get('/api/customers?limit=1000'),
          axios.get('/api/deals?limit=1000'),
          axios.get('/api/transactions?limit=1000')
        ]);
        setCustomers(custRes.data.customers || []);
        setDeals(dealRes.data.deals || []);
        setTransactions(txRes.data.transactions || []);
      } catch (err) {
        console.error('Error loading group data:', err);
      }
    };
    loadGroupData();
    loadStoreFY();
    loadGroups();
  }, []);

  const displayGroupCustomers = customers.filter(c => {
    if (!activeGroupName && !activeGroupId) return true;
    const gName = (activeGroupName || '').toLowerCase();
    const gId = activeGroupId || '';
    const matchesGroup = (
      (gId && String(c.customerGroupId) === String(gId)) ||
      (gName && c.area && c.area.toLowerCase().includes(gName)) ||
      (gName && c.group && c.group.toLowerCase().includes(gName)) ||
      (gName && c.city && c.city.toLowerCase().includes(gName))
    );
    if (!matchesGroup) return false;

    if (!groupSearchQuery.trim()) return true;
    const q = groupSearchQuery.trim().toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.customerCode && String(c.customerCode).includes(q)) ||
      (c.area && c.area.toLowerCase().includes(q))
    );
  }).map(c => {
    const custDeals = deals.filter(d => (d.customerId?._id || d.customerId) === c._id);
    const custTxs = transactions.filter(t => (t.customerId?._id || t.customerId) === c._id);

    const totalDebit = custDeals.reduce((sum, d) => sum + (d.dealAmount || 0), 0);
    const totalCredit = custTxs.reduce((sum, t) => sum + (t.totalPaid || 0), 0);
    const opening = Number(c.openingBalance || 0);
    const netBalance = opening + totalDebit - totalCredit;

    return {
      ...c,
      totalDebit,
      totalCredit,
      netBalance
    };
  });

  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
  const [selectedCustomerModal, setSelectedCustomerModal] = useState(null);

  const getCustomerStatement = (c) => {
    if (!c) return { summary: { opening: 0, debit: 0, credit: 0, closing: 0 }, list: [] };
    const custDeals = deals.filter(d => (d.customerId?._id || d.customerId) === c._id);
    const custTxs = transactions.filter(t => (t.customerId?._id || t.customerId) === c._id);

    const chronological = [];
    custDeals.forEach(d => {
      chronological.push({
        date: d.dealDate ? d.dealDate.split('T')[0] : '',
        type: 'Loan / Deal Issued',
        refNo: d.dealNo,
        narration: `Pledged collateral (Deal #${d.dealNo})`,
        debit: d.dealAmount || 0,
        credit: 0
      });
    });

    custTxs.forEach(t => {
      chronological.push({
        date: t.tranDate ? t.tranDate.split('T')[0] : '',
        type: 'Payment / Receipt',
        refNo: t.transactionNo,
        narration: `Receipt #${t.transactionNo} (Mode: ${t.payMode || 'Cash'})`,
        debit: 0,
        credit: t.totalPaid || 0
      });
    });

    chronological.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = Number(c.openingBalance || 0);
    const list = chronological.map(row => {
      running += (row.debit - row.credit);
      return {
        ...row,
        balance: running
      };
    });

    const totalDebit = custDeals.reduce((s, d) => s + (d.dealAmount || 0), 0);
    const totalCredit = custTxs.reduce((s, t) => s + (t.totalPaid || 0), 0);
    const opening = Number(c.openingBalance || 0);
    const closing = opening + totalDebit - totalCredit;

    return {
      summary: { opening, debit: totalDebit, credit: totalCredit, closing },
      list
    };
  };

  useEffect(() => {
    const handleAccountingGroupKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (['input', 'textarea', 'select'].includes(activeTag) && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape') {
        return;
      }

      if (selectedCustomerModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedCustomerModal(null);
        }
        return;
      }

      if (!displayGroupCustomers || displayGroupCustomers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCustomerIndex(prev => (prev + 1) % displayGroupCustomers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCustomerIndex(prev => (prev - 1 + displayGroupCustomers.length) % displayGroupCustomers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeCust = displayGroupCustomers[activeCustomerIndex] || displayGroupCustomers[0];
        if (activeCust) {
          setSelectedCustomerModal(activeCust);
        }
      }
    };

    window.addEventListener('keydown', handleAccountingGroupKeyDown);
    return () => window.removeEventListener('keydown', handleAccountingGroupKeyDown);
  }, [displayGroupCustomers, activeCustomerIndex, selectedCustomerModal]);

  const handleFyPresetChange = (preset) => {
    setFyPreset(preset);
    if (preset === 'store' && storeFY) {
      setStartDate(storeFY.start);
      setEndDate(storeFY.end);
    } else if (preset === 'fy2526') {
      setStartDate('2025-04-01');
      setEndDate('2026-03-31');
    } else if (preset === 'fy2627') {
      setStartDate('2026-04-01');
      setEndDate('2027-03-31');
    } else if (preset === 'fy2728') {
      setStartDate('2027-04-01');
      setEndDate('2028-03-31');
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/accounting-group-ledger?customerId=${selectedCustomerId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await axios.get(url);
      setLedgerData(res.data);
      triggerToast('Accounting Group Ledger statement compiled');
    } catch (err) {
      console.error(err);
      triggerToast('Error loading ledger statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedCustomerId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    setDownloadingPDF(true);
    const element = printRef.current;
    if (!element) { setDownloadingPDF(false); return; }

    const cleanFileName = `Accounting_Group_Ledger_${new Date().toISOString().split('T')[0]}`;

    const tryHtml2pdf = () => {
      if (window.html2pdf) {
        const opt = {
          margin: [8, 6, 8, 6],
          filename: `${cleanFileName}.pdf`,
          image: { type: 'jpeg', quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(element).save()
          .then(() => setDownloadingPDF(false))
          .catch(() => { downloadHTML(); });
      } else {
        downloadHTML();
      }
    };

    const downloadHTML = () => {
      const html = `<!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;padding:15px;color:#000;font-size:11px;}
        table{width:100%;border-collapse:collapse;margin-top:10px;}
        th,td{border:1px solid #333;padding:5px 7px;font-size:10px;}
        th{background:#f0f0f0;text-transform:uppercase;}
        .right{text-align:right;} .mono{font-family:monospace;}
        @page{size:A4 portrait;margin:8mm;}
        @media print{body{padding:0;}}
      </style></head><body>${element.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${cleanFileName}.html`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      setDownloadingPDF(false);
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = tryHtml2pdf;
      script.onerror = downloadHTML;
      document.body.appendChild(script);
    } else {
      tryHtml2pdf();
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const groupName = newGroupForm.group === 'custom' ? newGroupForm.customGroup : newGroupForm.group;
    if (!newGroupForm.name.trim()) {
      triggerToast('Account name is required', 'error');
      return;
    }
    try {
      await axios.post('/api/ledgers', {
        name: newGroupForm.name.trim(),
        group: groupName,
        openingBalance: Number(newGroupForm.openingBalance || 0)
      });
      triggerToast('New accounting group created successfully!');
      setShowCreateGroupForm(false);
      setNewGroupForm({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });
      loadGroups();
      fetchLedger();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error creating accounting group', 'error');
    }
  };

  // Filter ledger by selected group
  const filteredLedger = selectedGroup === 'all'
    ? ledgerData.ledger
    : ledgerData.ledger.filter(item => item.group?.toLowerCase() === selectedGroup.toLowerCase());

  return (
    <div className="space-y-5 font-sans">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            {activeGroupName ? `Ledger Group: ${activeGroupName}` : 'Accounting Group Ledger Master'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customizable customer statements, transaction ledgers, and consolidated lending audits by group & station.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateGroupForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Accounting Group</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingPDF ? 'Generating...' : 'Download PDF'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* GROUP CUSTOMER LEDGER MEMBERS SECTION */}
      <div className="bg-slate-955 border-2 border-slate-700/60 rounded-2xl p-4 md:p-5 shadow-2xl space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <div className="flex items-center space-x-3">
              <span className="bg-slate-900 text-white border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-black uppercase font-mono">
                Group Section
              </span>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {activeGroupName ? `LEDGER GROUP: ${activeGroupName}` : 'ALL LEDGER GROUPS & CUSTOMERS'}
              </h2>
            </div>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              Select any customer below using your mouse to inspect their debit, credit, and net balance statement.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-700" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Filter customers by name / mobile / station..."
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-400 rounded-lg text-xs text-slate-900 font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-800 w-64"
              />
            </div>
          </div>
        </div>

        {/* Group Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
            <span className="text-[10px] text-slate-600 font-sans block uppercase font-black">TOTAL CUSTOMERS</span>
            <span className="text-slate-950 text-base font-black">{displayGroupCustomers.length}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
            <span className="text-[10px] text-emerald-800 font-sans block uppercase font-black">TOTAL DEBIT (Dr)</span>
            <span className="text-emerald-800 text-base font-black">
              ₹{formatIndianCurrency(displayGroupCustomers.reduce((s, c) => s + c.totalDebit, 0))}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
            <span className="text-[10px] text-rose-800 font-sans block uppercase font-black">TOTAL CREDIT (Cr)</span>
            <span className="text-rose-800 text-base font-black">
              ₹{formatIndianCurrency(displayGroupCustomers.reduce((s, c) => s + c.totalCredit, 0))}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
            <span className="text-[10px] text-slate-800 font-sans block uppercase font-black">NET GROUP BALANCE</span>
            <span className="text-slate-950 text-base font-black">
              ₹{formatIndianCurrency(Math.abs(displayGroupCustomers.reduce((s, c) => s + c.netBalance, 0)))}
            </span>
          </div>
        </div>

        {/* Customers Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-400 bg-white max-h-96 overflow-y-auto shadow-inner">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-black text-white uppercase tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Code / ID</th>
                <th className="py-2.5 px-3">Mobile No.</th>
                <th className="py-2.5 px-3">Station / Area</th>
                <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                <th className="py-2.5 px-3 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {displayGroupCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-700 font-black italic">
                    No customers found in this group.
                  </td>
                </tr>
              ) : (
                displayGroupCustomers.map((c, idx) => {
                  const isActive = idx === activeCustomerIndex;
                  return (
                    <tr
                      key={c._id}
                      ref={(el) => {
                        if (isActive && el) {
                          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                      }}
                      onClick={() => {
                        setActiveCustomerIndex(idx);
                        setSelectedCustomerModal(c);
                      }}
                      onMouseEnter={() => setActiveCustomerIndex(idx)}
                      className={`cursor-pointer transition-all ${
                        isActive
                          ? 'bg-emerald-200 text-slate-950 font-black border-l-4 border-emerald-800 shadow-md ring-2 ring-emerald-600/50'
                          : 'bg-white text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-black text-slate-950 flex items-center space-x-2">
                        <span>{c.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.customerCode || c.idProofNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-mono font-bold">{c.mobile || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{c.area || c.city || c.group || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800">₹{c.totalDebit.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-800">₹{c.totalCredit.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-black">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-black ${c.netBalance >= 0 ? 'bg-emerald-100 text-emerald-950 border border-emerald-600' : 'bg-rose-100 text-rose-950 border border-rose-600'}`}>
                          ₹{Math.abs(c.netBalance).toFixed(2)} {c.netBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Shortcut Hint */}
        <div className="bg-slate-900 px-4 py-2 rounded-xl flex justify-between items-center text-[11px] text-white font-mono shrink-0">
          <span>Use <kbd className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700 font-black">↑</kbd> <kbd className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700 font-black">↓</kbd> Arrow keys &amp; <kbd className="bg-emerald-600 text-slate-950 px-2 py-0.5 rounded font-black">Enter</kbd> (or Click) to View Customer Details &amp; Full Statement Popup</span>
          <span className="text-slate-300">Press <kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded border border-slate-700">Esc</kbd> to Close Popup</span>
        </div>
      </div>

      {/* CUSTOMER DETAILS & STATEMENT POPUP MODAL */}
      {selectedCustomerModal && (() => {
        const c = selectedCustomerModal;
        const stmt = getCustomerStatement(c);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 no-print font-sans">
            <div className="bg-white border-2 border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-950">
              
              {/* Modal Header */}
              <div className="bg-slate-900 px-5 py-3.5 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded font-black text-xs uppercase font-mono">
                    Customer Statement
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">
                    {c.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCustomerModal(null)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Customer Master Details Bar */}
              <div className="p-4 bg-slate-100 border-b border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-950 shrink-0">
                <div>
                  <span className="text-[10px] text-slate-600 font-sans block uppercase font-bold">Customer ID / Code</span>
                  <span className="font-black text-slate-950 text-sm">{c.customerCode || c.idProofNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-sans block uppercase font-bold">Mobile No.</span>
                  <span className="font-black text-slate-950 text-sm">{c.mobile || 'No Mobile'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-sans block uppercase font-bold">Station / Area</span>
                  <span className="font-black text-slate-950 text-sm">{c.area || c.city || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-sans block uppercase font-bold">Group / City</span>
                  <span className="font-black text-slate-950 text-sm">{c.group || c.city || '-'}</span>
                </div>
              </div>

              {/* Financial Metrics Summary */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-white shrink-0">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 shadow-sm">
                  <span className="text-[10px] text-slate-600 font-sans block uppercase font-black">Opening Balance</span>
                  <span className="text-slate-950 text-base font-black">₹{stmt.summary.opening.toFixed(2)}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 shadow-sm">
                  <span className="text-[10px] text-emerald-900 font-sans block uppercase font-black">Total Loans Issued (Dr)</span>
                  <span className="text-emerald-900 text-base font-black">₹{stmt.summary.debit.toFixed(2)}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-300 shadow-sm">
                  <span className="text-[10px] text-rose-900 font-sans block uppercase font-black">Total Received (Cr)</span>
                  <span className="text-rose-900 text-base font-black">₹{stmt.summary.credit.toFixed(2)}</span>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-400 shadow-sm">
                  <span className="text-[10px] text-slate-800 font-sans block uppercase font-black">Net Closing Balance</span>
                  <span className="text-slate-950 text-base font-black">
                    ₹{Math.abs(stmt.summary.closing).toFixed(2)} {stmt.summary.closing >= 0 ? 'Dr' : 'Cr'}
                  </span>
                </div>
              </div>

              {/* Chronological Statement Table */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border-t border-slate-300">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[11px] sticky top-0 z-10">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Narration / Particulars</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stmt.list.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-600 font-black italic">
                          No transactions or deals registered for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      stmt.list.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-100 text-slate-950">
                          <td className="py-2.5 px-3 font-bold">{row.date}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">{row.type}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{row.narration}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                            {row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">
                            {row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-950">
                            ₹{Math.abs(row.balance).toFixed(2)} {row.balance >= 0 ? 'Dr' : 'Cr'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex justify-between items-center shrink-0">
                <span className="text-xs text-slate-600 font-mono font-bold">
                  Showing all {stmt.list.length} transaction entries
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerModal(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs shadow-md"
                >
                  Close (Esc)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create New Accounting Group Modal */}
      {showCreateGroupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold text-white">Create New Accounting Group</h3>
              <button onClick={() => setShowCreateGroupForm(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Account Name *</label>
                <input
                  type="text"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. HDFC Bank Account, Petty Cash..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Select Accounting Group *</label>
                <select
                  value={newGroupForm.group}
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, group: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="creditor">Creditor</option>
                  <option value="debtor">Debtor</option>
                  <option value="custom">Custom Group (type your own name)</option>
                </select>
                {newGroupForm.group !== 'custom' && (
                  <p className="text-[10px] text-slate-500 mt-1">Select <strong className="text-primary-400">Custom Group</strong> to create your own group name (e.g. Investment, Expense, Salary, etc.)</p>
                )}
              </div>
              {newGroupForm.group === 'custom' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Custom Group Name *
                    <span className="ml-2 font-normal text-slate-500">(e.g. Investment, Salary, Expense, Loan...)</span>
                  </label>
                  <input
                    type="text"
                    value={newGroupForm.customGroup}
                    onChange={(e) => setNewGroupForm(prev => ({ ...prev, customGroup: e.target.value }))}
                    placeholder="Type your custom group name here..."
                    className="w-full px-3 py-2 bg-slate-900 border border-primary-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-400 font-semibold"
                    autoFocus
                    required
                  />
                  <p className="text-[10px] text-emerald-400 mt-1">✓ This custom group will appear as a filter tab in Accounting Group page.</p>
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Opening Balance</label>
                <input
                  type="number"
                  value={newGroupForm.openingBalance}
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupForm(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Accounting Group filter bar */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Select Accounting Group:</span>
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedGroup === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'}`}
          >
            All Groups
          </button>
          {allGroups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${selectedGroup === g ? 'bg-primary-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Section (Hidden on Print) */}
      <div className="bg-slate-900/40 p-5 border border-slate-850 rounded-2xl space-y-4 no-print">
        <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center space-x-2">
          <Briefcase className="h-4 w-4 text-primary-405" />
          <span>Ledger Filter Parameters</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
          
          {/* Autocomplete Customer Selector */}
          <div className="relative">
            <label className="block text-slate-400 font-semibold mb-1.5">Customer Scoping:</label>
            <div className="relative">
              <input
                type="text"
                value={custSearchText}
                placeholder="Search customer name, ID, or mobile..."
                onChange={(e) => {
                  setCustSearchText(e.target.value);
                  setCustSearchFocused(true);
                  setCustDropdownIdx(-1);
                  if (e.target.value === '') {
                    setSelectedCustomerId('all');
                  }
                }}
                onKeyDown={handleCustKeyDown}
                onFocus={() => {
                  setCustSearchFocused(true);
                  setCustSearchText('');
                  setCustDropdownIdx(-1);
                }}
                onBlur={() => {
                  setTimeout(() => setCustSearchFocused(false), 250);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-sans"
              />

              {custSearchFocused && (
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedCustomerId('all');
                      setCustSearchText('All Customers');
                      setCustSearchFocused(false);
                      setCustDropdownIdx(-1);
                    }}
                    className={`p-3 text-xs cursor-pointer font-semibold ${custDropdownIdx === -1 ? 'bg-primary-600/30 text-white font-bold border-l-4 border-l-primary-500' : 'text-slate-250 hover:bg-slate-900'}`}
                  >
                    All Customers (Consolidated)
                  </div>
                  
                  {getFilteredCustomersList().map((c, idx) => (
                    <div
                      key={c._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCustomerId(c._id);
                        setCustSearchText(`${c.name} (${c.customerCode})`);
                        setCustSearchFocused(false);
                        setCustDropdownIdx(-1);
                      }}
                      className={`p-3 text-xs cursor-pointer flex justify-between items-center ${idx === custDropdownIdx ? 'bg-primary-600/30 text-white font-bold border-l-4 border-l-primary-500' : 'text-slate-350 hover:bg-slate-900'}`}
                    >
                      <div>
                        <span className="font-semibold text-slate-250">{c.name}</span>
                        <span className="text-slate-500 ml-2 font-mono">#{c.customerCode}</span>
                      </div>
                      <span className="text-[10px] text-slate-450 font-mono">{c.mobile}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Financial Year Preset */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Financial Year Range:</label>
            <select
              value={fyPreset}
              onChange={(e) => handleFyPresetChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none"
            >
              <option value="custom">Custom Range (Show All)</option>
              {storeFY && (
                <option value="store">FY {storeFY.label} (Store Setting)</option>
              )}
              <option value="fy2526">FY 2025-26 (Apr 25 - Mar 26)</option>
              <option value="fy2627">FY 2026-27 (Apr 26 - Mar 27)</option>
              <option value="fy2728">FY 2027-28 (Apr 27 - Mar 28)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">From Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFyPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">To Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFyPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none font-mono"
            />
          </div>

        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={fetchLedger}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold transition-all shadow-md"
          >
            Load Ledger Master
          </button>
        </div>
      </div>

      {/* Printable Report Statement Workspace */}
      <div
        ref={printRef}
        className="bg-slate-950 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
        style={{ pageBreakInside: 'auto' }}
      >
        
        {/* Printable Letterhead Statement Banner */}
        <div className="flex justify-between items-start border-b border-slate-850 pb-4 print:border-black">
          <div>
            <h2 className="text-xl font-bold text-slate-205 print:text-black">Accounting Group Ledger Master</h2>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Period Scoped: <span className="font-mono">{startDate || 'Carried Fwd'}</span> to <span className="font-mono">{endDate || 'Present'}</span>
            </p>
            {selectedGroup !== 'all' && (
              <p className="text-xs text-primary-400 print:text-primary-700 font-mono mt-1">Group Filter: <strong className="capitalize">{selectedGroup}</strong></p>
            )}
          </div>
          <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
            <p className="font-bold text-slate-350 print:text-black">Scope: {selectedCustomerId === 'all' ? 'All Customers (Consolidated)' : 'Single Customer Statement'}</p>
            {selectedCustomerId !== 'all' && ledgerData.customers?.[0] && (
              <p className="font-mono text-primary-400 print:text-primary-600 font-bold">
                Code: #{ledgerData.customers[0].customerCode} | {ledgerData.customers[0].mobile}
              </p>
            )}
          </div>
        </div>

        {/* Balance Summaries Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300 print:bg-slate-50">
            <span className="text-slate-500 block uppercase font-bold text-[10px] print:text-slate-600">Opening Principal Balance</span>
            <span className="text-lg font-bold text-slate-200 print:text-black mt-1 block">₹{formatIndianCurrency(ledgerData.openingPrincipal)}</span>
          </div>
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300 print:bg-slate-50">
            <span className="text-slate-500 block uppercase font-bold text-[10px] print:text-slate-600">Net Period Change</span>
            <span className={`text-lg font-bold mt-1 block ${(ledgerData.closingPrincipal - ledgerData.openingPrincipal) >= 0 ? 'text-rose-400 print:text-rose-600' : 'text-emerald-400 print:text-emerald-600'}`}>
              ₹{formatIndianCurrency(Math.abs(ledgerData.closingPrincipal - ledgerData.openingPrincipal))}
            </span>
          </div>
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300 print:bg-slate-50">
            <span className="text-slate-500 block uppercase font-bold text-[10px] print:text-slate-600">Closing Principal Balance</span>
            <span className="text-lg font-bold text-amber-500 print:text-amber-600 mt-1 block">₹{formatIndianCurrency(ledgerData.closingPrincipal)}</span>
          </div>
        </div>

        {/* Ledger Details List Table */}
        <div className="overflow-x-auto border border-slate-850 rounded-xl print:border-slate-300 print:rounded-none" style={{ pageBreakInside: 'auto' }}>
          <table className="w-full text-left border-collapse" style={{ pageBreakInside: 'auto' }}>
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider print:bg-slate-100 print:text-black print:border-slate-305">
                <th className="py-3 px-4 print:py-2 print:px-3">Date</th>
                <th className="py-3 px-4 print:py-2 print:px-3">Type</th>
                <th className="py-3 px-4 print:py-2 print:px-3">Voucher / Ref</th>
                <th className="py-3 px-4 print:py-2 print:px-3">Customer Name</th>
                <th className="py-3 px-4 print:py-2 print:px-3">Particulars</th>
                <th className="py-3 px-4 text-right print:py-2 print:px-3">Debit (Loans Disbursed)</th>
                <th className="py-3 px-4 text-right print:py-2 print:px-3">Credit (Repayments)</th>
                <th className="py-3 px-4 text-right print:py-2 print:px-3">Outstanding Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs text-slate-300 print:divide-slate-200 print:text-black">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 italic">Compiling ledger statements...</td>
                </tr>
              ) : filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 italic">No ledger items recorded in this scoping.</td>
                </tr>
              ) : (
                filteredLedger.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/20 transition-colors" style={{ pageBreakInside: 'avoid' }}>
                    <td className="py-3 px-4 print:py-2 print:px-3 font-mono whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 print:py-2 print:px-3 font-semibold">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wider ${
                        item.type === 'Deal' 
                          ? 'bg-rose-900 text-white border border-rose-700 shadow-sm print:bg-rose-100 print:text-rose-800' 
                          : 'bg-emerald-900 text-white border border-emerald-700 shadow-sm print:bg-emerald-100 print:text-emerald-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 font-mono font-bold text-slate-200 print:text-black">
                      {item.no}
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 font-semibold text-slate-200 print:text-black">
                      {item.customerName} <span className="text-[10px] text-slate-500 font-mono">({item.customerCode})</span>
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 text-slate-400 print:text-slate-600 max-w-xs truncate" title={item.particulars}>
                      {item.particulars}
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 text-right font-mono text-rose-400 print:text-rose-600">
                      {item.type === 'Deal' ? `₹${formatIndianCurrency(item.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 text-right font-mono text-emerald-400 print:text-emerald-600">
                      {item.type === 'Receipt' ? `₹${formatIndianCurrency(item.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 print:py-2 print:px-3 text-right font-mono font-bold text-amber-500 print:text-amber-600">
                      ₹{formatIndianCurrency(item.runningPrincipalOwed)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Print-specific CSS to prevent cut-off */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          th, td { font-size: 9px !important; padding: 4px 5px !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default AccountingGroup;
