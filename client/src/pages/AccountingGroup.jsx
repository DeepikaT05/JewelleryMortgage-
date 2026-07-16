import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Printer, Calendar, Users, Briefcase } from 'lucide-react';
import { formatIndianCurrency } from '../utils/format';
import Toast from '../components/Toast';

const AccountingGroup = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [custSearchText, setCustSearchText] = useState('All Customers');
  const [custSearchFocused, setCustSearchFocused] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fyPreset, setFyPreset] = useState('custom');

  // Ledger Output Data
  const [ledgerData, setLedgerData] = useState({
    openingPrincipal: 0,
    closingPrincipal: 0,
    ledger: []
  });

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Load customer directory cache
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/customers?limit=1000');
        setCustomers(res.data.customers);
      } catch (err) {
        console.error(err);
      }
    };
    loadCustomers();
  }, []);

  const handleFyPresetChange = (preset) => {
    setFyPreset(preset);
    if (preset === 'fy2526') {
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
      let url = `http://localhost:5000/api/reports/accounting-group-ledger?customerId=${selectedCustomerId}`;
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

  // Initial compile load
  useEffect(() => {
    fetchLedger();
  }, [selectedCustomerId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Accounting Group Ledger Master</h1>
          <p className="text-xs text-slate-400 mt-1">
            Customizable customer statements, transaction ledgers, and consolidated lending audits by financial year.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          <Printer className="h-4 w-4" />
          <span>Print Statement</span>
        </button>
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
                  if (e.target.value === '') {
                    setSelectedCustomerId('all');
                  }
                }}
                onFocus={() => {
                  setCustSearchFocused(true);
                  setCustSearchText('');
                }}
                onBlur={() => {
                  setTimeout(() => setCustSearchFocused(false), 250);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-sans"
              />

              {custSearchFocused && (
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                  <div
                    onMouseDown={() => {
                      setSelectedCustomerId('all');
                      setCustSearchText('All Customers');
                      setCustSearchFocused(false);
                    }}
                    className="p-3 text-xs text-slate-250 hover:bg-slate-900 cursor-pointer font-semibold"
                  >
                    All Customers (Consolidated)
                  </div>
                  
                  {customers.filter(c => {
                    const search = custSearchText.toLowerCase();
                    return (
                      (c.name && c.name.toLowerCase().includes(search)) ||
                      (c.customerCode && c.customerCode.toString().includes(search)) ||
                      (c.mobile && c.mobile.includes(search))
                    );
                  }).map(c => (
                    <div
                      key={c._id}
                      onMouseDown={() => {
                        setSelectedCustomerId(c._id);
                        setCustSearchText(`${c.name} (${c.customerCode})`);
                        setCustSearchFocused(false);
                      }}
                      className="p-3 text-xs text-slate-350 hover:bg-slate-900 cursor-pointer flex justify-between items-center"
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
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        
        {/* Printable Letterhead Statement Banner */}
        <div className="flex justify-between items-start border-b border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-205 print:text-black">Accounting Group Ledger Master</h2>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Period Scoped: <span className="font-mono">{startDate || 'Carried Fwd'}</span> to <span className="font-mono">{endDate || 'Present'}</span>
            </p>
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
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Opening Principal Balance</span>
            <span className="text-lg font-bold text-slate-200 print:text-black mt-1 block">₹{formatIndianCurrency(ledgerData.openingPrincipal)}</span>
          </div>
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Net Period Change</span>
            <span className={`text-lg font-bold mt-1 block ${(ledgerData.closingPrincipal - ledgerData.openingPrincipal) >= 0 ? 'text-rose-400 print:text-rose-600' : 'text-emerald-400 print:text-emerald-600'}`}>
              ₹{formatIndianCurrency(ledgerData.closingPrincipal - ledgerData.openingPrincipal)}
            </span>
          </div>
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Closing Principal Balance</span>
            <span className="text-lg font-bold text-amber-500 print:text-amber-600 mt-1 block">₹{formatIndianCurrency(ledgerData.closingPrincipal)}</span>
          </div>
        </div>

        {/* Ledger Details List Table */}
        <div className="overflow-x-auto border border-slate-850 rounded-xl print:border-slate-300 print:rounded-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider print:bg-slate-100 print:text-black print:border-slate-305">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Voucher / Ref</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Particulars</th>
                <th className="py-3 px-4 text-right">Debit (Loans Disbursed)</th>
                <th className="py-3 px-4 text-right">Credit (Repayments)</th>
                <th className="py-3 px-4 text-right">Outstanding Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs text-slate-300 print:divide-slate-200 print:text-black">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 italic">Compiling ledger statements...</td>
                </tr>
              ) : ledgerData.ledger.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 italic">No ledger items recorded in this scoping.</td>
                </tr>
              ) : (
                ledgerData.ledger.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'Deal' 
                          ? 'bg-rose-900/30 text-rose-400 border border-rose-900/50 print:bg-rose-100 print:text-rose-700' 
                          : 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 print:bg-emerald-100 print:text-emerald-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200 print:text-black">
                      {item.no}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200 print:text-black">
                      {item.customerName} <span className="text-[10px] text-slate-500 font-mono">({item.customerCode})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 print:text-slate-600 max-w-xs truncate" title={item.particulars}>
                      {item.particulars}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400 print:text-rose-600">
                      {item.type === 'Deal' ? `₹${formatIndianCurrency(item.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 print:text-emerald-600">
                      {item.type === 'Receipt' ? `₹${formatIndianCurrency(item.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-500 print:text-amber-600">
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
    </div>
  );
};

export default AccountingGroup;
