import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatIndianCurrency } from '../utils/format';
import { 
  Users, 
  Coins, 
  TrendingUp, 
  TrendingDown,
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight,
  Clock,
  Calendar,
  Building,
  DollarSign
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Scoped date state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateMode, setDateMode] = useState('today'); // 'today' or 'tomorrow'
  const [time, setTime] = useState(new Date());
  const [companyDetails, setCompanyDetails] = useState(null);

  const fetchCompanyDetails = async () => {
    try {
      const userRes = await axios.get('/api/auth/me');
      const compListRes = await axios.get('/api/companies');
      const activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
      setCompanyDetails(activeComp);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateModeChange = (mode) => {
    setDateMode(mode);
    const targetDate = new Date();
    if (mode === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    setSelectedDate(targetDate.toISOString().split('T')[0]);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const metricsRes = await axios.get(`/api/dashboard?date=${selectedDate}`);
      setMetrics(metricsRes.data);

      const custRes = await axios.get(`/api/customers?search=${search}&page=${page}&limit=5`);
      setCustomers(custRes.data.customers);
      setTotalPages(custRes.data.totalPages);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDate, search, page]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper header summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">Girvi Financial Overview</h1>
          <p className="text-slate-400 text-xs mt-0.5">Real-time vault cash book entries, lending transactions, and customer master directory.</p>
        </div>

        {/* Side-by-side buttons row */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Today / Tomorrow pill switch */}
          <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl space-x-0.5">
            <button
              onClick={() => handleDateModeChange('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                dateMode === 'today' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateModeChange('tomorrow')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                dateMode === 'tomorrow' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tomorrow
            </button>
          </div>

          <button
            onClick={() => { setNewOpeningBalance(metrics?.openingBalance || ''); setShowOpeningModal(true); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-sky-400 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Set Opening Cash</span>
          </button>

          <button
            onClick={() => navigate('/deal-master')}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary-950/20 whitespace-nowrap"
          >
            <Coins className="h-4 w-4" />
            <span>New Pledge Loan (Deal)</span>
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" />
        </div>
      ) : (
        <>
          {/* Main Financial Balance Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* CARD 1: Cash in Hand */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-primary-500 shadow-md animate-slide-in overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash In Hand</span>
                <div className="p-1.5 bg-primary-600/10 rounded-lg text-primary-400 border border-primary-500/20 shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 break-all tracking-tight my-1">
                ₹{formatIndianCurrency(Math.abs(metrics?.cashInHand || 0))}
              </div>
            </div>

            {/* CARD 2: Bank Balance */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-emerald-600 shadow-md animate-slide-in overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Balance</span>
                <div className="p-1.5 bg-emerald-600/10 rounded-lg text-emerald-400 border border-emerald-600/20 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 break-all tracking-tight my-1">
                ₹{formatIndianCurrency(Math.abs(metrics?.bankBalance || 0))}
              </div>
            </div>

            {/* CARD 3: Closing Balance */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-amber-600 shadow-md animate-slide-in overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Closing Balance</span>
                <div className="p-1.5 bg-amber-600/10 rounded-lg text-amber-500 border border-amber-600/20 shrink-0">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 break-all tracking-tight my-1">
                ₹{formatIndianCurrency(Math.abs(metrics?.closingBalance || 0))}
              </div>
            </div>

          </div>

          {/* Secondary Lending & Day Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lending metrics summary panel */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-lg lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-350 tracking-wider uppercase border-b border-slate-850 pb-2 flex items-center space-x-1.5">
                <Users className="h-4.5 w-4.5 text-primary-400" />
                <span>Lending & Interest Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Disbursed (Total Pay)</span>
                  <span className="text-lg font-bold font-mono text-rose-400 block mt-1">
                    ₹{formatIndianCurrency(metrics?.totalPay || 0)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Received Amount</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">
                    ₹{formatIndianCurrency(metrics?.totalReceive || 0)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Interest Received</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">
                    ₹{formatIndianCurrency(metrics?.totalInterest || 0)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Interest from Closed Deals</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">
                    ₹{formatIndianCurrency(metrics?.totalInterestAfterClose || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-xs text-slate-400">
                <span>Principal Receivable (Active Outstanding):</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  ₹{formatIndianCurrency(metrics?.totalReceivable || 0)}
                </span>
              </div>
            </div>

            {/* Previous Day Details and Rollover card */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center space-x-1.5">
                  <Clock className="h-4.5 w-4.5 text-primary-400" />
                  <span>Previous Day Details</span>
                </h3>
                
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  Balances carried forward as today's starting base opening amounts.
                </p>

                <div className="space-y-3 pt-4 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Prev. Day Cash closing:</span>
                    <span className="text-slate-300">₹{formatIndianCurrency(Math.abs(metrics?.previousDay?.cash || 0))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Prev. Day Bank closing:</span>
                    <span className="text-slate-300">₹{formatIndianCurrency(Math.abs(metrics?.previousDay?.bank || 0))}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-sm border-t border-slate-800">
                    <span className="text-primary-400">Total Rollover opening:</span>
                    <span className="text-emerald-400">₹{formatIndianCurrency(Math.abs(metrics?.previousDay?.total || 0))}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 text-[10px] text-slate-500 italic font-medium leading-relaxed">
                * Vault closing roll-overs are automatically recalculated at midnight, shifting today's closing balances into tomorrow's base opening figures.
              </div>
            </div>

          </div>

          {/* Customer Reference Directory Table */}
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-200">Customer Reference Directory</h2>
                <p className="text-xs text-slate-400">Quickly locate codes, father names, and phone numbers.</p>
              </div>

              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name, mobile or code..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 transition-all font-sans"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-6 font-semibold">Code</th>
                    <th className="py-3.5 px-6 font-semibold">Name</th>
                    <th className="py-3.5 px-6 font-semibold">Father/Husband Name</th>
                    <th className="py-3.5 px-6 font-semibold">Address / Area</th>
                    <th className="py-3.5 px-6 font-semibold">City & State</th>
                    <th className="py-3.5 px-6 font-semibold">Mobile No</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        No customer records matched your query.
                      </td>
                    </tr>
                  ) : (
                    customers.map(c => (
                      <tr key={c._id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-amber-500 font-bold">{c.customerCode}</td>
                        <td className="py-4 px-6 font-semibold text-slate-100">{c.name}</td>
                        <td className="py-4 px-6 text-slate-400">{c.fatherHusbandName || '—'}</td>
                        <td className="py-4 px-6 text-slate-400">
                          {c.address ? `${c.address}, ` : ''}{c.area || ''}
                        </td>
                        <td className="py-4 px-6 text-slate-400">{c.city || '—'}, {c.state || '—'}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-200">{c.mobile}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => navigate(`/general-masters?tab=customers&edit=${c._id}`)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700 font-sans"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-850 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  Page {page} of {totalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Company clock footer panel */}
          <div className="mt-8 border-t border-slate-850 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 font-sans">
            <div>
              <p className="font-bold text-slate-350 uppercase tracking-wider">{companyDetails?.name || 'INDRAVIAJY ENT & JWELLERY-JIJI'}</p>
              <p className="text-slate-450">{companyDetails?.address || 'BORI'}</p>
            </div>
            <div className="md:text-right space-y-0.5 font-sans">
              <p>
                Date :{' '}
                <span className="font-semibold text-slate-400">
                  {time.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </p>
              <p>
                Day :{' '}
                <span className="font-semibold text-slate-400">{time.toLocaleDateString('en-US', { weekday: 'long' })}</span>
              </p>
              <p>
                Time :{' '}
                <span className="font-mono text-amber-500/80 font-bold">{time.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
        </>
      )}
      {/* EDIT OPENING BALANCE MODAL REMOVED */}
    </div>
  );
};

export default Dashboard;
