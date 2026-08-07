import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../components/Toast';
import { formatIndianCurrency } from '../utils/format';
import { 
  CheckCircle2, 
  Search, 
  Printer, 
  RefreshCw, 
  Calendar, 
  User, 
  Receipt,
  FileCheck,
  X
} from 'lucide-react';

const TransactionDone = () => {
  const [toast, setToast] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fyPreset, setFyPreset] = useState('custom');
  const [storeFY, setStoreFY] = useState(null); // { start, end, label }
  
  // Modal view for receipt
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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
        // Auto-select store FY on load
        setStartDate(fy.start);
        setEndDate(fy.end);
        setFyPreset('store');
      }
    } catch (err) {
      console.error('Error loading store FY:', err);
    }
  };

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

  const fetchClosedTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions?limit=1000');
      const list = res.data.transactions || [];
      setTransactions(list);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      triggerToast('Error loading transaction history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedTransactions();
    loadStoreFY();
  }, []);

  const handleOpenReceiptModal = async (transactionId) => {
    try {
      const res = await axios.get(`/api/transactions/${transactionId}/print`);
      setActiveReceipt(res.data);
      setShowReceiptModal(true);
    } catch (err) {
      triggerToast('Error generating print receipt', 'error');
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // Filter transactions by query & dates
  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const custName = t.customerId?.name?.toLowerCase() || '';
    const custMobile = t.customerId?.mobile || '';
    const tranNo = String(t.transactionNo || '').toLowerCase();
    const dealNo = String(t.dealId?.dealNo || '').toLowerCase();

    const matchesQuery = !q || custName.includes(q) || custMobile.includes(q) || tranNo.includes(q) || dealNo.includes(q);

    let matchesDate = true;
    if (startDate || endDate) {
      const tDate = new Date(t.tranDate).setHours(0, 0, 0, 0);
      if (startDate) {
        const sDate = new Date(startDate).setHours(0, 0, 0, 0);
        if (tDate < sDate) matchesDate = false;
      }
      if (endDate) {
        const eDate = new Date(endDate).setHours(23, 59, 59, 999);
        if (tDate > eDate) matchesDate = false;
      }
    }

    return matchesQuery && matchesDate;
  });

  const totalCollected = filteredTransactions.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  const totalPrinciplePaid = filteredTransactions.reduce((acc, curr) => acc + (curr.principle?.amountPaid || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Transaction Done</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">View completed transactions, loan settlements, and payment history.</p>
          {storeFY && (
            <span className="inline-block mt-1.5 text-[10px] font-mono text-primary-400 bg-primary-600/10 border border-primary-600/20 rounded px-2 py-0.5">
              FY {storeFY.label}
            </span>
          )}
        </div>
        <button
          onClick={fetchClosedTransactions}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Completed Transactions</p>
            <p className="text-2xl font-extrabold text-white font-mono mt-1">{filteredTransactions.length}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <FileCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Principle Collected</p>
            <p className="text-2xl font-extrabold text-amber-400 font-mono mt-1">₹{formatIndianCurrency(totalPrinciplePaid)}</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Amount Received</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">₹{formatIndianCurrency(totalCollected)}</p>
          </div>
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs no-print">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, mobile, transaction no, deal no..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={fyPreset}
              onChange={(e) => handleFyPresetChange(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none cursor-pointer text-xs"
            >
              <option value="custom">All Dates</option>
              {storeFY && <option value="store">FY {storeFY.label} (Store)</option>}
              <option value="fy2526">FY 2025-26</option>
              <option value="fy2627">FY 2026-27</option>
              <option value="fy2728">FY 2027-28</option>
            </select>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFyPreset('custom'); }}
              className="bg-transparent text-slate-100 focus:outline-none font-mono cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFyPreset('custom'); }}
              className="bg-transparent text-slate-100 focus:outline-none font-mono cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {(startDate || endDate || searchQuery) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); setFyPreset('custom'); }}
              className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transactions List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden no-print">
        <div className="p-4 border-b border-slate-850 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Completed Transaction Records</h3>
          <span className="text-xs text-slate-400 font-mono">Showing {filteredTransactions.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-850">
              <tr>
                <th className="py-3.5 px-4">TRANSACTION NO</th>
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4">CUSTOMER NAME</th>
                <th className="py-3.5 px-4">MOBILE</th>
                <th className="py-3.5 px-4">DEAL NO</th>
                <th className="py-3.5 px-4 text-right">PRINCIPLE PAID</th>
                <th className="py-3.5 px-4 text-right">TOTAL PAID</th>
                <th className="py-3.5 px-4 text-center">MODE</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 font-medium">
                    Loading completed transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 italic">
                    No completed transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      #{t.transactionNo || 'Auto'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {t.tranDate ? t.tranDate.split('T')[0] : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t.customerId?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {t.customerId?.mobile || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      #{t.dealId?.dealNo || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200 font-semibold">
                      ₹{formatIndianCurrency(t.principle?.amountPaid || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ₹{formatIndianCurrency(t.totalPaid || 0)}
                    </td>
                    <td className="py-3 px-4 text-center uppercase font-mono text-[10px]">
                      <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {t.payMode || 'CASH'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                        DONE
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenReceiptModal(t._id)}
                        className="px-3 py-1.5 bg-sky-900/30 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1"
                        title="View / Print Payment Receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT VIEW MODAL */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 no-print relative">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Payment Receipt #{activeReceipt.transaction?.transactionNo}</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Receipt Layout inside Modal */}
            <div className="bg-white text-black p-6 rounded-xl space-y-4 text-xs font-sans">
              <div className="text-center border-b border-black pb-3">
                <h1 className="text-base font-extrabold uppercase tracking-wider">{activeReceipt.company?.name || 'JEWELLERY MORTGAGE'}</h1>
                <p className="text-[10px] text-gray-700">{activeReceipt.company?.address || ''}</p>
                <p className="text-[10px] text-gray-700">Mobile: {activeReceipt.company?.mobile || activeReceipt.company?.phone || ''}</p>
              </div>
              
              <div className="flex justify-between items-center text-xs font-bold border-b border-black pb-2">
                <span>PAYMENT RECEIPT</span>
                <span className="font-mono text-amber-700">#{activeReceipt.transaction?.transactionNo}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p><strong>Customer:</strong> {activeReceipt.transaction?.customerId?.name || 'N/A'}</p>
                  <p><strong>Mobile:</strong> {activeReceipt.transaction?.customerId?.mobile || 'N/A'}</p>
                </div>
                <div className="text-right font-mono">
                  <p><strong>Date:</strong> {activeReceipt.transaction?.tranDate ? activeReceipt.transaction.tranDate.split('T')[0] : ''}</p>
                  <p><strong>Deal No:</strong> #{activeReceipt.transaction?.dealId?.dealNo || 'N/A'}</p>
                </div>
              </div>

              <div className="border border-black p-3 space-y-1.5 bg-gray-50 font-mono text-xs">
                <div className="flex justify-between">
                  <span>Principle Repaid:</span>
                  <span>₹{formatIndianCurrency(activeReceipt.transaction?.principle?.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest Repaid:</span>
                  <span>₹{formatIndianCurrency(activeReceipt.transaction?.compound?.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-black pt-1 font-bold text-sm">
                  <span>TOTAL PAID:</span>
                  <span className="text-emerald-700">₹{formatIndianCurrency(activeReceipt.transaction?.totalPaid || 0)}</span>
                </div>
              </div>

              <div className="text-[10px] text-right font-bold pt-4 text-gray-700">
                Authorized Signature
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={handleTriggerPrint}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Download PDF</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDone;
