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
  Calendar
} from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('reminder');
  const [toast, setToast] = useState(null);

  // General Report States
  const [loading, setLoading] = useState(false);

  // 1. Reminder Report State
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderData, setReminderData] = useState([]);
  const [selectedDeals, setSelectedDeals] = useState([]);

  // 2. Ledger Report State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);

  // 3. Stock Report State
  const [stockData, setStockData] = useState([]);

  // 4. Profit & Loss State
  const [plRange, setPlRange] = useState({ startDate: '', endDate: '' });
  const [plData, setPlData] = useState(null);

  // 5. Outstanding Report State
  const [outstandingData, setOutstandingData] = useState([]);

  // 6. Accounting Group Report State
  const [ledgers, setLedgers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('cash');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerFyPreset, setLedgerFyPreset] = useState('custom');



  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchFilteredLedgers = async () => {
    try {
      let url = 'http://localhost:5000/api/ledgers';
      const params = [];
      if (ledgerStartDate) params.push(`startDate=${ledgerStartDate}`);
      if (ledgerEndDate) params.push(`endDate=${ledgerEndDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await axios.get(url);
      setLedgers(res.data);
      triggerToast('Ledger accounts compiled successfully');
    } catch (err) {
      console.error(err);
      triggerToast('Error compiling ledger statement', 'error');
    }
  };

  const handleFyPresetChange = (preset) => {
    setLedgerFyPreset(preset);
    if (preset === 'fy2526') {
      setLedgerStartDate('2025-04-01');
      setLedgerEndDate('2026-03-31');
    } else if (preset === 'fy2627') {
      setLedgerStartDate('2026-04-01');
      setLedgerEndDate('2027-03-31');
    } else if (preset === 'fy2728') {
      setLedgerStartDate('2027-04-01');
      setLedgerEndDate('2028-03-31');
    } else {
      setLedgerStartDate('');
      setLedgerEndDate('');
    }
  };

  // Load initial reference data
  useEffect(() => {
    const loadDirectory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/customers?limit=1000');
        setCustomers(res.data.customers);
      } catch (err) {
        console.error(err);
      }
    };
    const loadLedgerAccounts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/ledgers');
        setLedgers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadDirectory();
    loadLedgerAccounts();
  }, []);

  // Fetch Report 1 (Reminder List)
  const fetchReminderReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/unsettled-reminder?upToDate=${reminderDate}&search=${reminderSearch}`);
      setReminderData(res.data);
      setSelectedDeals([]); // Reset checkbox selection
    } catch (err) {
      triggerToast('Error fetching reminder list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Report 2 (Ledger)
  const fetchLedgerReport = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/customer-ledger/${selectedCustomerId}`);
      setLedgerData(res.data);
    } catch (err) {
      triggerToast('Error compiling ledger statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Report 3 (Stock)
  const fetchStockReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/reports/stock-summary');
      setStockData(res.data);
    } catch (err) {
      triggerToast('Error compiling stock data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Report 4 (Profit & Loss)
  const fetchPLReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/profit-loss?startDate=${plRange.startDate}&endDate=${plRange.endDate}`);
      setPlData(res.data);
    } catch (err) {
      triggerToast('Error compiling profit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Report 5 (Outstanding list)
  const fetchOutstandingReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/reports/outstanding');
      setOutstandingData(res.data);
    } catch (err) {
      triggerToast('Error compiling outstanding balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Hook report fetching to tab toggle
  useEffect(() => {
    if (activeTab === 'reminder') fetchReminderReport();
    if (activeTab === 'stock') fetchStockReport();
    if (activeTab === 'pl') fetchPLReport();
    if (activeTab === 'outstanding') fetchOutstandingReport();
  }, [activeTab]);

  // Bulk Send Reminders (SMS Setup Log Trigger)
  const handleBulkReminders = async () => {
    if (selectedDeals.length === 0) {
      triggerToast('Please select at least one record', 'info');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/reports/unsettled-reminder/send-sms', {
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

  // Trigger browser print action
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">System Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Access pawnbroking summaries, stocks indices, profit margins, and ledgers.</p>
        </div>
        
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-all"
          >
            <Printer className="h-4 w-4 text-sky-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-4xl no-print">
        <button
          onClick={() => setActiveTab('reminder')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'reminder' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overdue Reminders
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'ledger' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Customer Ledger
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'stock' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Collateral Stock
        </button>
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'pl' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'outstanding' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Outstanding Balances
        </button>
        <button
          onClick={() => setActiveTab('accounting_group')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'accounting_group' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Accounting Group Report
        </button>

      </div>

      {/* Core Report Content wrapper */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
        
        {/* REPORT 1: REMINDER OVERDUES */}
        {activeTab === 'reminder' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4 no-print">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Overdue Unsettled Pledge Loans</h3>
                <p className="text-xs text-slate-400">Pledges whose term dates have lapsed up to the target date.</p>
              </div>

              <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl text-xs text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="bg-transparent focus:outline-none"
                  />
                </div>

                <div className="relative w-full md:w-56">
                  <input
                    type="text"
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    placeholder="Search name or mobile..."
                    className="w-full pl-3 pr-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <button
                  onClick={fetchReminderReport}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-xl"
                >
                  Apply
                </button>

                <button
                  onClick={handleBulkReminders}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-amber-500"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send reminders ({selectedDeals.length})</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Compiling ledger balances...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
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
                      <th className="py-2.5 px-3">Completed Date</th>
                      <th className="py-2.5 px-3 text-right">Deal Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs">
                    {reminderData.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-6 text-center text-slate-500">No overdue deals found.</td>
                      </tr>
                    ) : (
                      reminderData.map((row, idx) => (
                        <tr key={row.dealId} className="hover:bg-slate-900/10 text-slate-200">
                          <td className="py-3 px-3 no-print">
                            <input
                              type="checkbox"
                              checked={selectedDeals.includes(row.dealId)}
                              onChange={() => toggleSelectDeal(row.dealId)}
                              className="rounded accent-primary-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-amber-500 font-semibold">{row.dealNo}</td>
                          <td className="py-3 px-3 font-mono">{new Date(row.dealDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-semibold text-slate-100">{row.customerName}</td>
                          <td className="py-3 px-3 text-slate-400">{row.area || '—'}</td>
                          <td className="py-3 px-3 font-mono">{row.mobile}</td>
                          <td className="py-3 px-3 text-right font-mono">{row.returnPeriodMonths}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {row.dealEndDate ? new Date(row.dealEndDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">₹{formatIndianCurrency(row.dealAmount)}</td>
                          <td className="py-3 px-3 text-right font-mono text-rose-400 font-bold">
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
        )}

        {/* REPORT 2: CUSTOMER LEDGER STATEMENT */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4 no-print">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Customer Ledger / Account Statement</h3>
                <p className="text-xs text-slate-400">Pledges chronologically merged with payment receipts.</p>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350 focus:outline-none"
                >
                  <option value="">Select customer ledger...</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} (Code: {c.customerCode})</option>
                  ))}
                </select>

                <button
                  onClick={fetchLedgerReport}
                  disabled={!selectedCustomerId}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-xl disabled:opacity-40"
                >
                  Generate Statement
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Compiling customer statements...</div>
            ) : ledgerData ? (
              <div className="space-y-6">
                {/* Ledger Profile details */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer profile</span>
                    <p className="text-sm font-bold text-slate-100">{ledgerData.customer.name}</p>
                    <p className="text-slate-400">{ledgerData.customer.address}, {ledgerData.customer.area}</p>
                    <p className="text-slate-400">{ledgerData.customer.city}, {ledgerData.customer.state}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Account metadata</span>
                    <p>Customer Code: <span className="font-mono text-amber-500 font-semibold">#{ledgerData.customer.customerCode}</span></p>
                    <p>Phone Contact: <span className="font-mono text-slate-300">{ledgerData.customer.mobile}</span></p>
                    <p>Calculation Basis: <span className="font-semibold text-slate-200 capitalize">
                      {ledgerData.customer.interestType} ({ledgerData.customer.interestRate}%/{ledgerData.customer.interestFrequency})
                    </span></p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Voucher Type</th>
                        <th className="py-2.5 px-3">Doc No</th>
                        <th className="py-2.5 px-3">Particulars Details</th>
                        <th className="py-2.5 px-3 text-right">Debit Owed (+)</th>
                        <th className="py-2.5 px-3 text-right">Credit Recv (-)</th>
                        <th className="py-2.5 px-3 text-right">Principal Running Bal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs font-mono">
                      {ledgerData.ledger.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-900/10 text-slate-200">
                          <td className="py-3 px-3 text-slate-400">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              item.type === 'Deal' ? 'bg-amber-950 text-amber-400 border border-amber-500/10' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/10'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-300">#{item.no}</td>
                          <td className="py-3 px-3 font-sans text-slate-400">{item.particulars}</td>
                          <td className="py-3 px-3 text-right text-rose-400 font-bold">
                            {item.principalImpact > 0 ? `₹${formatIndianCurrency(item.principalImpact)}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                            {item.principalImpact < 0 ? `₹${formatIndianCurrency(Math.abs(item.principalImpact))}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-100 font-bold bg-slate-900/30">
                            ₹{formatIndianCurrency(item.runningPrincipalOwed)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 border border-slate-900 rounded-xl bg-slate-950/20">
                <Users className="h-8 w-8 mx-auto opacity-35 mb-2" />
                <p className="text-xs">Please select a customer profile to compile ledger.</p>
              </div>
            )}
          </div>
        )}

        {/* REPORT 3: STOCK SUMMARY */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-200">Collateral Stock Inventory</h3>
              <p className="text-xs text-slate-400">Total weight and valuation of gold/silver currently in lockers.</p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Compiling stock inventory...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
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
                  <tbody className="divide-y divide-slate-850 text-xs font-mono text-slate-350">
                    {stockData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-4 text-center text-slate-500 text-xs">No active collateral found.</td>
                      </tr>
                    ) : (
                      stockData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/10">
                          <td className="py-3 px-3 font-semibold font-sans text-slate-200">{row.groupName}</td>
                          <td className="py-3 px-3 text-right">{row.pcs}</td>
                          <td className="py-3 px-3 text-right">{row.grossWeight?.toFixed(3)}g</td>
                          <td className="py-3 px-3 text-right">{row.lessWeight?.toFixed(3)}g</td>
                          <td className="py-3 px-3 text-right">{row.netWeight?.toFixed(3)}g</td>
                          <td className="py-3 px-3 text-right">{row.pureWeight?.toFixed(3)}g</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-500">₹{formatIndianCurrency(row.estimatedValue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORT 4: PROFIT & LOSS */}
        {activeTab === 'pl' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4 no-print">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Interest Revenue Dashboard</h3>
                <p className="text-xs text-slate-400">Total interest collected vs discounts allowed.</p>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <input
                  type="date"
                  value={plRange.startDate}
                  onChange={(e) => setPlRange({ ...plRange, startDate: e.target.value })}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="date"
                  value={plRange.endDate}
                  onChange={(e) => setPlRange({ ...plRange, endDate: e.target.value })}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={fetchPLReport}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-xl"
                >
                  Calculate
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Computing profit matrices...</div>
            ) : plData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Gross Interest Earned</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">₹{formatIndianCurrency(plData.totalInterestEarned)}</span>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Discounts Allowed</span>
                  <span className="text-2xl font-bold text-rose-400 font-mono">₹{formatIndianCurrency(plData.totalDiscountsGiven)}</span>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 text-center relative overflow-hidden border-t-4 border-t-primary-500">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Net Pawnbroking Profit</span>
                  <span className="text-2xl font-bold text-slate-100 font-mono">₹{formatIndianCurrency(plData.netProfit)}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 border border-slate-900 rounded-xl bg-slate-950/20">
                <TrendingUp className="h-8 w-8 mx-auto opacity-35 mb-2 text-primary-500" />
                <p className="text-xs">Specify date ranges above to load profit matrices.</p>
              </div>
            )}
          </div>
        )}

        {/* REPORT 5: OUTSTANDING BALANCES */}
        {activeTab === 'outstanding' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-200">Outstanding Owed Balances</h3>
              <p className="text-xs text-slate-400">Total principal plus accrued interest for active borrowers.</p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Compiling outstanding balances...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
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
                  <tbody className="divide-y divide-slate-850 text-xs font-mono text-slate-300">
                    {outstandingData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-4 text-center text-slate-500 text-xs font-sans">No outstanding balances.</td>
                      </tr>
                    ) : (
                      outstandingData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="py-3 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3 text-amber-500 font-semibold">#{row.dealNo}</td>
                          <td className="py-3 px-3 font-semibold font-sans text-slate-100">{row.customerName}</td>
                          <td className="py-3 px-3 text-slate-400">{row.mobile}</td>
                          <td className="py-3 px-3 text-right">₹{formatIndianCurrency(row.principalOwed)}</td>
                          <td className="py-3 px-3 text-right text-rose-400">₹{formatIndianCurrency(row.interestOwed)}</td>
                          <td className="py-3 px-3 text-right text-slate-100 font-bold bg-slate-900/30">
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
        )}

        {/* REPORT 6: ACCOUNTING GROUP REPORT */}
        {activeTab === 'accounting_group' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4 no-print">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Accounting Group Ledger Summaries</h3>
                <p className="text-xs text-slate-400">Total deposits, payouts, opening and closing balance metrics by ledger classification group.</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-semibold">Select Accounting Group:</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none capitalize"
                >
                  {Array.from(new Set([
                    'cash', 'bank', 'crediter', 'debiter',
                    ...ledgers.map(l => l.group).filter(Boolean)
                  ])).map(g => (
                    <option key={g} value={g}>{g.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl space-y-4 no-print">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Filters (Financial Year)</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Financial Year Preset:</label>
                  <select
                    value={ledgerFyPreset}
                    onChange={(e) => handleFyPresetChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="custom">Custom (Show All)</option>
                    <option value="fy2526">FY 2025-26 (Apr 25 - Mar 26)</option>
                    <option value="fy2627">FY 2026-27 (Apr 26 - Mar 27)</option>
                    <option value="fy2728">FY 2027-28 (Apr 27 - Mar 28)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start Date:</label>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => {
                      setLedgerStartDate(e.target.value);
                      setLedgerFyPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date:</label>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => {
                      setLedgerEndDate(e.target.value);
                      setLedgerFyPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <button
                    onClick={fetchFilteredLedgers}
                    className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-950/20"
                  >
                    Filter Ledger Accounts
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-850 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-955/40 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4 font-mono">Classification Group</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right">Total Deposits (Add)</th>
                    <th className="py-3 px-4 text-right">Total Deduct (Paid)</th>
                    <th className="py-3 px-4 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {ledgers.filter(l => l.group === selectedGroup).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-slate-500 italic">No ledger accounts in this group.</td>
                    </tr>
                  ) : (
                    ledgers.filter(l => l.group === selectedGroup).map(l => (
                      <tr key={l._id} className="hover:bg-slate-955/20 text-slate-300">
                        <td className="py-3 px-4 font-semibold text-slate-200">{l.name}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-400">{l.group}</td>
                        <td className="py-3 px-4 text-right font-mono">₹{l.openingBalance.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">+₹{l.totalAdd.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-rose-455">-₹{l.totalDeduct.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-500">₹{l.closingBalance.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

export default Reports;
