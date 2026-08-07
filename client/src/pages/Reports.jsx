import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatIndianCurrency } from '../utils/format';
import Toast from '../components/Toast';
import { 
  FileText, 
  Search, 
  Send, 
  Printer, 
  FileSpreadsheet, 
  Users, 
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Receipt,
  User,
  RefreshCw,
  X,
  FileCheck,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2
} from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('reminder');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Helper for CSV Downloads
  const downloadCSV = (data, filename = 'report.csv', headersMap = {}) => {
    if (!data || data.length === 0) {
      triggerToast('No records to download', 'info');
      return;
    }
    const headers = Object.keys(headersMap);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${headersMap[h]}"`).join(','));
    
    data.forEach(item => {
      const row = headers.map(key => {
        let val = key.split('.').reduce((obj, k) => (obj ? obj[k] : ''), item);
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Reminder Report State
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState(getTodayStr());
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderData, setReminderData] = useState([]);
  const [selectedDeals, setSelectedDeals] = useState([]);

  // 2. Stock Report State
  const [stockData, setStockData] = useState([]);
  const [stockStartDate, setStockStartDate] = useState('');
  const [stockEndDate, setStockEndDate] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // 3. Profit & Loss State
  const [plRange, setPlRange] = useState({ startDate: '', endDate: getTodayStr() });
  const [plData, setPlData] = useState(null);

  // 4. Outstanding Report State
  const [outstandingData, setOutstandingData] = useState([]);
  const [outstandingStartDate, setOutstandingStartDate] = useState('');
  const [outstandingEndDate, setOutstandingEndDate] = useState('');
  const [outstandingSearchQuery, setOutstandingSearchQuery] = useState('');

  // 5. Transaction Done State
  const [transactionsDone, setTransactionsDone] = useState([]);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [txReceipt, setTxReceipt] = useState(null);
  const [showTxReceiptModal, setShowTxReceiptModal] = useState(false);

  // 6. Deals Done State
  const [dealsDone, setDealsDone] = useState([]);
  const [dealsSearchQuery, setDealsSearchQuery] = useState('');
  const [dealsStartDate, setDealsStartDate] = useState('');
  const [dealsEndDate, setDealsEndDate] = useState('');

  // 7. Operations Ledger State
  const [opsVouchers, setOpsVouchers] = useState({ contra: [], receipt: [], payment: [] });
  const [opsTab, setOpsTab] = useState('contra');
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsStartDate, setOpsStartDate] = useState(getTodayStr().slice(0, 7) + '-01');
  const [opsEndDate, setOpsEndDate] = useState(getTodayStr());
  const [opsSearchQuery, setOpsSearchQuery] = useState('');

  // --- FETCHERS ---
  const fetchReminderReport = async () => {
    setLoading(true);
    try {
      const targetDate = reminderEndDate || getTodayStr();
      const res = await axios.get(`/api/reports/unsettled-reminder?upToDate=${targetDate}&search=${reminderSearch}`);
      let list = res.data || [];
      if (reminderStartDate) {
        list = list.filter(r => {
          const d = r.dealDate ? r.dealDate.split('T')[0] : '';
          return d >= reminderStartDate;
        });
      }
      setReminderData(list);
      setSelectedDeals([]);
    } catch (err) {
      triggerToast('Error fetching reminder list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/stock-summary');
      setStockData(res.data || []);
    } catch (err) {
      triggerToast('Error compiling stock data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPLReport = async (sDate = plRange.startDate, eDate = plRange.endDate) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reports/profit-loss?startDate=${sDate || ''}&endDate=${eDate || ''}`);
      setPlData(res.data);
    } catch (err) {
      triggerToast('Error compiling profit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/outstanding');
      setOutstandingData(res.data || []);
    } catch (err) {
      triggerToast('Error compiling outstanding balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsDone = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions?limit=1000');
      setTransactionsDone(res.data.transactions || []);
    } catch (err) {
      triggerToast('Error loading transaction history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDealsDone = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/deals?limit=1000');
      setDealsDone(res.data.deals || []);
    } catch (err) {
      triggerToast('Error loading deals data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsVouchers = async (sDate = opsStartDate, eDate = opsEndDate) => {
    setOpsLoading(true);
    try {
      const [contraRes, receiptRes, paymentRes] = await Promise.all([
        axios.get(`/api/operations/vouchers?voucherType=contra&startDate=${sDate}&endDate=${eDate}`),
        axios.get(`/api/operations/vouchers?voucherType=receipt&startDate=${sDate}&endDate=${eDate}`),
        axios.get(`/api/operations/vouchers?voucherType=payment&startDate=${sDate}&endDate=${eDate}`),
      ]);
      setOpsVouchers({
        contra: contraRes.data || [],
        receipt: receiptRes.data || [],
        payment: paymentRes.data || [],
      });
    } catch (err) {
      triggerToast('Error loading operations ledger', 'error');
    } finally {
      setOpsLoading(false);
    }
  };

  const handleDeleteOpsVoucher = async (id) => {
    if (!window.confirm('Delete this voucher? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/operations/voucher/${id}`);
      triggerToast('Voucher deleted');
      fetchOpsVouchers();
    } catch (err) {
      triggerToast('Error deleting voucher', 'error');
    }
  };

  const handleOpenTxReceipt = async (id) => {
    try {
      const res = await axios.get(`/api/transactions/${id}/print`);
      setTxReceipt(res.data);
      setShowTxReceiptModal(true);
    } catch (err) { triggerToast('Error generating receipt', 'error'); }
  };

  const handleBulkReminders = async () => {
    if (selectedDeals.length === 0) {
      triggerToast('Please select at least one record', 'info');
      return;
    }
    try {
      const res = await axios.post('/api/reports/unsettled-reminder/send-sms', {
        dealIds: selectedDeals
      });
      triggerToast(res.data.message);
      setSelectedDeals([]);
    } catch (err) {
      triggerToast('Error sending alerts', 'error');
    }
  };

  const toggleSelectDeal = (id) => {
    setSelectedDeals(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDeals.length === reminderData.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(reminderData.map(r => r.dealId));
    }
  };

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'reminder') fetchReminderReport();
    if (activeTab === 'stock') fetchStockReport();
    if (activeTab === 'pl') fetchPLReport();
    if (activeTab === 'outstanding') fetchOutstandingReport();
    if (activeTab === 'transaction_done') fetchTransactionsDone();
    if (activeTab === 'deals_done') fetchDealsDone();
    if (activeTab === 'ops_ledger') fetchOpsVouchers();
  }, [activeTab]);

  return (
    <div className="space-y-4 font-sans">
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center no-print">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">System Reports</h1>
          <p className="text-slate-400 text-xs mt-0.5">Pawnbroking loan summaries, stocks inventory, profit matrices, and ledgers.</p>
        </div>
        
        <div className="flex space-x-2 mt-2 md:mt-0">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-all shadow-sm"
          >
            <Printer className="h-4 w-4 text-sky-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full no-print">
        <button
          onClick={() => setActiveTab('reminder')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'reminder' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Overdue Reminders
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'stock' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Collateral Stock
        </button>

        <button
          onClick={() => setActiveTab('pl')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'pl' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Profit &amp; Loss
        </button>

        <button
          onClick={() => setActiveTab('outstanding')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'outstanding' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Outstanding Balances
        </button>

        <button
          onClick={() => setActiveTab('transaction_done')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'transaction_done' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Transaction Done
        </button>

        <button
          onClick={() => setActiveTab('deals_done')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'deals_done' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          Deals Done
        </button>

        <button
          onClick={() => { setActiveTab('ops_ledger'); fetchOpsVouchers(); }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'ops_ledger' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Operations Ledger</span>
        </button>
      </div>

      {/* Core Report Container */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 shadow-xl">

        {/* 1. OVERDUE REMINDERS */}
        {activeTab === 'reminder' && (() => {
          const filtered = reminderData.filter(r => {
            const q = reminderSearch.toLowerCase();
            return !q || 
              (r.customerName || '').toLowerCase().includes(q) ||
              (r.mobile || '').includes(q) ||
              String(r.dealNo || '').includes(q);
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setReminderStartDate(today);
                      setReminderEndDate(today);
                      fetchReminderReport();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={reminderStartDate}
                      onChange={(e) => setReminderStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={reminderEndDate}
                      onChange={(e) => setReminderEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={reminderSearch}
                      onChange={(e) => setReminderSearch(e.target.value)}
                      placeholder="Search name, mobile..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={fetchReminderReport}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs"
                  >
                    Filter
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkReminders}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 text-amber-400 rounded-lg font-bold text-xs hover:bg-slate-850"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>SMS ({selectedDeals.length})</span>
                  </button>
                  <button
                    onClick={() => downloadCSV(filtered, 'overdue_reminders.csv', {
                      dealNo: 'Deal No',
                      dealDate: 'Deal Date',
                      customerName: 'Customer Name',
                      mobile: 'Mobile',
                      dealAmount: 'Deal Amount',
                      balanceAmount: 'Balance Owed'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500">Compiling overdue reminders...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3 no-print">
                          <input
                            type="checkbox"
                            checked={reminderData.length > 0 && selectedDeals.length === reminderData.length}
                            onChange={toggleSelectAll}
                            className="rounded accent-primary-500"
                          />
                        </th>
                        <th className="py-2.5 px-3">S.No</th>
                        <th className="py-2.5 px-3">Deal No</th>
                        <th className="py-2.5 px-3">Deal Date</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Area</th>
                        <th className="py-2.5 px-3">Mobile No</th>
                        <th className="py-2.5 px-3 text-right">Period (Mo)</th>
                        <th className="py-2.5 px-3 text-right">Deal Amount</th>
                        <th className="py-2.5 px-3 text-right">Balance Owed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="py-6 text-center text-slate-500">No overdue deals found.</td>
                        </tr>
                      ) : (
                        filtered.map((row, idx) => (
                          <tr key={row.dealId || idx} className="hover:bg-slate-900/10">
                            <td className="py-2.5 px-3 no-print">
                              <input
                                type="checkbox"
                                checked={selectedDeals.includes(row.dealId)}
                                onChange={() => toggleSelectDeal(row.dealId)}
                                className="rounded accent-primary-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-amber-500 font-semibold">{row.dealNo}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{row.dealDate ? row.dealDate.split('T')[0] : '—'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-100">{row.customerName}</td>
                            <td className="py-2.5 px-3 text-slate-400">{row.area || '—'}</td>
                            <td className="py-2.5 px-3 font-mono">{row.mobile}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{row.returnPeriodMonths}</td>
                            <td className="py-2.5 px-3 text-right font-mono">₹{formatIndianCurrency(row.dealAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-bold">
                              ₹{formatIndianCurrency(row.balanceAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. COLLATERAL STOCK */}
        {activeTab === 'stock' && (() => {
          const filtered = stockData.filter(s => {
            const q = stockSearchQuery.toLowerCase();
            return !q || (s.groupName || '').toLowerCase().includes(q);
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setStockStartDate(today);
                      setStockEndDate(today);
                      fetchStockReport();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={stockStartDate}
                      onChange={(e) => setStockStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={stockEndDate}
                      onChange={(e) => setStockEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder="Search metal group..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(filtered, 'collateral_stock.csv', {
                      groupName: 'Metal Category',
                      pcs: 'Pcs',
                      grossWeight: 'Gross Wt',
                      lessWeight: 'Less Wt',
                      netWeight: 'Net Wt',
                      pureWeight: 'Pure Wt',
                      estimatedValue: 'Collateral Valuation'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500">Compiling stock inventory...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Metal Category</th>
                        <th className="py-2.5 px-3 text-right">Pcs</th>
                        <th className="py-2.5 px-3 text-right">Gross Weight</th>
                        <th className="py-2.5 px-3 text-right">Less Weight</th>
                        <th className="py-2.5 px-3 text-right">Net Weight</th>
                        <th className="py-2.5 px-3 text-right">Pure Weight</th>
                        <th className="py-2.5 px-3 text-right">Collateral Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-6 text-center text-slate-500 text-xs font-sans">No active collateral found.</td>
                        </tr>
                      ) : (
                        filtered.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/10">
                            <td className="py-2.5 px-3 font-semibold font-sans text-slate-200">{row.groupName}</td>
                            <td className="py-2.5 px-3 text-right">{row.pcs}</td>
                            <td className="py-2.5 px-3 text-right">{row.grossWeight?.toFixed(3)}g</td>
                            <td className="py-2.5 px-3 text-right">{row.lessWeight?.toFixed(3)}g</td>
                            <td className="py-2.5 px-3 text-right">{row.netWeight?.toFixed(3)}g</td>
                            <td className="py-2.5 px-3 text-right">{row.pureWeight?.toFixed(3)}g</td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">₹{formatIndianCurrency(row.estimatedValue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. PROFIT & LOSS */}
        {activeTab === 'pl' && (
          <div className="space-y-3">
            {/* Standard Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const today = getTodayStr();
                    setPlRange({ startDate: today, endDate: today });
                    fetchPLReport(today, today);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                >
                  Today
                </button>
                <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                  <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                  <input
                    type="date"
                    value={plRange.startDate}
                    onChange={(e) => setPlRange({ ...plRange, startDate: e.target.value })}
                    className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                  <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                  <input
                    type="date"
                    value={plRange.endDate}
                    onChange={(e) => setPlRange({ ...plRange, endDate: e.target.value })}
                    className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <button
                  onClick={() => fetchPLReport()}
                  className="px-3.5 py-1 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs"
                >
                  Calculate
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCSV(plData ? [plData] : [], 'profit_loss_summary.csv', {
                    totalInterestEarned: 'Gross Interest Earned',
                    totalDiscountsGiven: 'Discounts Allowed',
                    netProfit: 'Net Pawnbroking Profit'
                  })}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Computing profit matrices...</div>
            ) : plData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Gross Interest Earned</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">₹{formatIndianCurrency(plData.totalInterestEarned)}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Discounts Allowed</span>
                  <span className="text-xl font-bold text-rose-400 font-mono">₹{formatIndianCurrency(plData.totalDiscountsGiven)}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden border-t-2 border-t-primary-500">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Net Pawnbroking Profit</span>
                  <span className="text-xl font-bold text-slate-100 font-mono">₹{formatIndianCurrency(plData.netProfit)}</span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 border border-slate-900 rounded-xl bg-slate-950/20">
                <TrendingUp className="h-7 w-7 mx-auto opacity-35 mb-2 text-primary-500" />
                <p className="text-xs">Specify date range or click "Today" to calculate profit matrices.</p>
              </div>
            )}
          </div>
        )}

        {/* 4. OUTSTANDING BALANCES */}
        {activeTab === 'outstanding' && (() => {
          const filtered = outstandingData.filter(r => {
            const q = outstandingSearchQuery.toLowerCase();
            const matchQ = !q ||
              (r.customerName || '').toLowerCase().includes(q) ||
              (r.mobile || '').includes(q) ||
              String(r.dealNo || '').includes(q);
            let matchDate = true;
            if (outstandingStartDate || outstandingEndDate) {
              const d = r.dealDate ? r.dealDate.split('T')[0] : '';
              if (outstandingStartDate && d < outstandingStartDate) matchDate = false;
              if (outstandingEndDate && d > outstandingEndDate) matchDate = false;
            }
            return matchQ && matchDate;
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setOutstandingStartDate(today);
                      setOutstandingEndDate(today);
                      fetchOutstandingReport();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={outstandingStartDate}
                      onChange={(e) => setOutstandingStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={outstandingEndDate}
                      onChange={(e) => setOutstandingEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={outstandingSearchQuery}
                      onChange={(e) => setOutstandingSearchQuery(e.target.value)}
                      placeholder="Search name, deal no..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(filtered, 'outstanding_balances.csv', {
                      dealNo: 'Deal No',
                      customerName: 'Customer Name',
                      mobile: 'Mobile',
                      principalOwed: 'Principal Bal',
                      interestOwed: 'Interest Accrued',
                      totalOutstanding: 'Total Outstanding'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500">Compiling outstanding balances...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">S.No</th>
                        <th className="py-2.5 px-3">Deal No</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-right">Principal Bal</th>
                        <th className="py-2.5 px-3 text-right">Interest Accrued</th>
                        <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-6 text-center text-slate-500 text-xs font-sans">No outstanding balances found.</td>
                        </tr>
                      ) : (
                        filtered.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/10">
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-amber-500 font-semibold">#{row.dealNo}</td>
                            <td className="py-2.5 px-3 font-semibold font-sans text-slate-100">{row.customerName}</td>
                            <td className="py-2.5 px-3 text-slate-400">{row.mobile}</td>
                            <td className="py-2.5 px-3 text-right">₹{formatIndianCurrency(row.principalOwed)}</td>
                            <td className="py-2.5 px-3 text-right text-rose-400">₹{formatIndianCurrency(row.interestOwed)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-100 font-bold bg-slate-900/30">
                              ₹{formatIndianCurrency(row.totalOutstanding)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* 5. TRANSACTION DONE */}
        {activeTab === 'transaction_done' && (() => {
          const filtered = transactionsDone.filter(t => {
            const q = txSearchQuery.toLowerCase();
            const matchQ = !q ||
              (t.customerId?.name || '').toLowerCase().includes(q) ||
              (t.customerId?.mobile || '').includes(q) ||
              String(t.transactionNo || '').includes(q) ||
              String(t.dealId?.dealNo || '').includes(q);
            let matchDate = true;
            if (txStartDate || txEndDate) {
              const d = t.tranDate ? t.tranDate.split('T')[0] : '';
              if (txStartDate && d < txStartDate) matchDate = false;
              if (txEndDate && d > txEndDate) matchDate = false;
            }
            return matchQ && matchDate;
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setTxStartDate(today);
                      setTxEndDate(today);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={txStartDate}
                      onChange={(e) => setTxStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={txEndDate}
                      onChange={(e) => setTxEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      placeholder="Search tran, customer..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(filtered, 'transactions_done.csv', {
                      transactionNo: 'Tran No',
                      tranDate: 'Tran Date',
                      'customerId.name': 'Customer',
                      'customerId.mobile': 'Mobile',
                      'dealId.dealNo': 'Deal No',
                      'principle.amountPaid': 'Principle Paid',
                      totalPaid: 'Total Paid',
                      payMode: 'Mode'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500">Loading transactions...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Tran No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">Deal No</th>
                        <th className="py-2.5 px-3 text-right">Principle</th>
                        <th className="py-2.5 px-3 text-right">Total Paid</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {filtered.length === 0 ? (
                        <tr><td colSpan="9" className="py-6 text-center text-slate-500 italic">No transactions found.</td></tr>
                      ) : (
                        filtered.map((t, idx) => (
                          <tr key={t._id || idx} className="hover:bg-slate-900/20">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-500">#{t.transactionNo}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{t.tranDate ? t.tranDate.split('T')[0] : '—'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-100">{t.customerId?.name || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{t.customerId?.mobile || '—'}</td>
                            <td className="py-2.5 px-3 font-mono">#{t.dealId?.dealNo || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono">₹{formatIndianCurrency(t.principle?.amountPaid || 0)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">₹{formatIndianCurrency(t.totalPaid || 0)}</td>
                            <td className="py-2.5 px-3 uppercase text-[10px] font-mono">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">{t.payMode || 'cash'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button onClick={() => handleOpenTxReceipt(t._id)}
                                className="px-2.5 py-1 bg-sky-900/30 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 rounded-lg text-[10px] font-semibold inline-flex items-center space-x-1">
                                <Printer className="h-3 w-3" />
                                <span>Print</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Receipt Modal */}
              {showTxReceiptModal && txReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <div className="flex items-center space-x-2">
                        <Receipt className="h-5 w-5 text-amber-400" />
                        <h3 className="text-base font-bold text-white">Receipt #{txReceipt.transaction?.transactionNo}</h3>
                      </div>
                      <button onClick={() => setShowTxReceiptModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="bg-white text-black p-5 rounded-xl space-y-3 text-xs font-sans">
                      <div className="text-center border-b border-black pb-2">
                        <h1 className="text-base font-extrabold uppercase">{txReceipt.company?.name || 'JEWELLERY MORTGAGE'}</h1>
                        <p className="text-[10px] text-gray-600">{txReceipt.company?.address || ''}</p>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-black pb-1.5">
                        <span>PAYMENT RECEIPT</span>
                        <span className="font-mono text-amber-700">#{txReceipt.transaction?.transactionNo}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p><strong>Customer:</strong> {txReceipt.transaction?.customerId?.name || 'N/A'}</p>
                          <p><strong>Mobile:</strong> {txReceipt.transaction?.customerId?.mobile || 'N/A'}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p><strong>Date:</strong> {txReceipt.transaction?.tranDate?.split('T')[0] || ''}</p>
                          <p><strong>Deal No:</strong> #{txReceipt.transaction?.dealId?.dealNo || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="border border-black p-2.5 space-y-1 bg-gray-50 font-mono text-xs">
                        <div className="flex justify-between"><span>Principle Repaid:</span><span>₹{formatIndianCurrency(txReceipt.transaction?.principle?.amountPaid || 0)}</span></div>
                        <div className="flex justify-between"><span>Interest Repaid:</span><span>₹{formatIndianCurrency(txReceipt.transaction?.compound?.amountPaid || 0)}</span></div>
                        <div className="flex justify-between border-t border-black pt-1 font-bold text-sm">
                          <span>TOTAL PAID:</span><span className="text-emerald-700">₹{formatIndianCurrency(txReceipt.transaction?.totalPaid || 0)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-right font-bold pt-2 text-gray-700">Authorized Signature</div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button onClick={() => window.print()}
                        className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5">
                        <Printer className="h-4 w-4" /><span>Print / PDF</span>
                      </button>
                      <button onClick={() => setShowTxReceiptModal(false)}
                        className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 6. DEALS DONE */}
        {activeTab === 'deals_done' && (() => {
          const filtered = dealsDone.filter(d => {
            const q = dealsSearchQuery.toLowerCase();
            const matchQ = !q ||
              (d.customerId?.name || '').toLowerCase().includes(q) ||
              String(d.dealNo || '').toLowerCase().includes(q);
            let matchDate = true;
            if (dealsStartDate || dealsEndDate) {
              const dt = d.dealDate ? d.dealDate.split('T')[0] : '';
              if (dealsStartDate && dt < dealsStartDate) matchDate = false;
              if (dealsEndDate && dt > dealsEndDate) matchDate = false;
            }
            return matchQ && matchDate;
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setDealsStartDate(today);
                      setDealsEndDate(today);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={dealsStartDate}
                      onChange={(e) => setDealsStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={dealsEndDate}
                      onChange={(e) => setDealsEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={dealsSearchQuery}
                      onChange={(e) => setDealsSearchQuery(e.target.value)}
                      placeholder="Search customer, deal no..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(filtered, 'deals_done.csv', {
                      dealNo: 'Deal No',
                      dealDate: 'Deal Date',
                      'customerId.name': 'Customer',
                      'customerId.mobile': 'Mobile',
                      dealAmount: 'Deal Amount',
                      interestAmountPerMonth: 'Interest/Mo',
                      status: 'Status'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500">Loading deals...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">S.No</th>
                        <th className="py-2.5 px-3">Deal No</th>
                        <th className="py-2.5 px-3">Deal Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3 text-right">Deal Amount</th>
                        <th className="py-2.5 px-3 text-right">Interest/Mo</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {filtered.length === 0 ? (
                        <tr><td colSpan="8" className="py-6 text-center text-slate-500 italic">No deals found.</td></tr>
                      ) : (
                        filtered.map((d, idx) => (
                          <tr key={d._id || idx} className="hover:bg-slate-900/10">
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-500">#{d.dealNo}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{d.dealDate ? d.dealDate.split('T')[0] : '—'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-100">{d.customerId?.name || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{d.customerId?.mobile || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">₹{formatIndianCurrency(d.dealAmount || 0)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-400">₹{formatIndianCurrency(d.interestAmountPerMonth || 0)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === 'settled' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' :
                                d.status === 'active' ? 'bg-primary-900/30 text-primary-400 border border-primary-900/50' :
                                'bg-slate-900/30 text-slate-400 border border-slate-700'
                              }`}>{(d.status || 'active').toUpperCase()}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* 7. OPERATIONS LEDGER */}
        {activeTab === 'ops_ledger' && (() => {
          const list = opsVouchers[opsTab] || [];
          const filtered = list.filter(v => {
            const q = opsSearchQuery.toLowerCase();
            return !q ||
              (v.voucherNo || '').toLowerCase().includes(q) ||
              (v.partyName || '').toLowerCase().includes(q) ||
              (v.remarks || '').toLowerCase().includes(q) ||
              (v.fromAccountName || '').toLowerCase().includes(q) ||
              (v.toAccountName || '').toLowerCase().includes(q);
          });
          return (
            <div className="space-y-3">
              {/* Standard Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const today = getTodayStr();
                      setOpsStartDate(today);
                      setOpsEndDate(today);
                      fetchOpsVouchers(today, today);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                  >
                    Today
                  </button>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">From:</span>
                    <input
                      type="date"
                      value={opsStartDate}
                      onChange={(e) => setOpsStartDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-955 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-slate-400 font-semibold text-[10px]">To:</span>
                    <input
                      type="date"
                      value={opsEndDate}
                      onChange={(e) => setOpsEndDate(e.target.value)}
                      className="bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="relative w-44">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={opsSearchQuery}
                      onChange={(e) => setOpsSearchQuery(e.target.value)}
                      placeholder="Search voucher, party..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => fetchOpsVouchers()}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                  >
                    Load
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(filtered, `ops_ledger_${opsTab}.csv`, {
                      voucherNo: 'Voucher No',
                      date: 'Date',
                      partyName: 'Party Name',
                      fromAccountName: 'From Account',
                      toAccountName: 'To Account',
                      amount: 'Amount',
                      payMode: 'Pay Mode',
                      remarks: 'Remarks'
                    })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-bold text-xs shadow transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 flex-wrap pt-1">
                <button onClick={() => setOpsTab('contra')}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    opsTab === 'contra' ? 'bg-amber-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Contra ({opsVouchers.contra.length})</span>
                </button>
                <button onClick={() => setOpsTab('receipt')}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    opsTab === 'receipt' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}>
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Receipt / Credit ({opsVouchers.receipt.length})</span>
                </button>
                <button onClick={() => setOpsTab('payment')}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    opsTab === 'payment' ? 'bg-rose-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Payment / Expense ({opsVouchers.payment.length})</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party / Account</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3">Mode / Ref</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-center no-print">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {filtered.length === 0 ? (
                      <tr><td colSpan="7" className="py-8 text-center text-slate-500 italic">No voucher entries found for this range.</td></tr>
                    ) : filtered.map(v => (
                      <tr key={v._id} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-500">{v.voucherNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{v.date ? v.date.split('T')[0] : '—'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{v.partyName || v.fromAccountName || v.toAccountName || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">₹{formatIndianCurrency(v.amount)}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-mono">
                          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{v.payMode}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{v.remarks || '—'}</td>
                        <td className="py-2.5 px-3 text-center no-print">
                          <button onClick={() => handleDeleteOpsVoucher(v._id)} className="p-1 text-rose-400 hover:bg-rose-900/30 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900/60 border-t-2 border-slate-800 text-xs font-bold">
                        <td colSpan="3" className="py-2.5 px-3 text-slate-400 uppercase">Total ({opsTab})</td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-400">₹{formatIndianCurrency(filtered.reduce((s,v) => s + (v.amount || 0), 0))}</td>
                        <td colSpan="3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })()}

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

export default Reports;
