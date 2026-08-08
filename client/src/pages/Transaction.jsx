import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Toast from '../components/Toast';
import { formatIndianCurrency } from '../utils/format';

const Transaction = () => {
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const calcReqId = React.useRef(0); // tracks latest calculate request to avoid race condition

  // Separate customer lookup fields (Name / Mobile / ID). Selecting any one fills the rest.
  const [custNameText, setCustNameText] = useState('');
  const [custMobileText, setCustMobileText] = useState('');
  const [custIdText, setCustIdText] = useState('');
  const [custFocusField, setCustFocusField] = useState(null); // 'name' | 'mobile' | 'id' | null
  const [custDropdownIdx, setCustDropdownIdx] = useState(-1);

  // Masters cache
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [banks, setBanks] = useState([]);

  // Footer Company / Clock details
  const [companyDetails, setCompanyDetails] = useState(null);
  const [time, setTime] = useState(new Date());

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // --- STATE FOR TRANSACTIONS ---
  const [isEditMode, setIsEditMode] = useState(true);
  const [lastSavedTransactionId, setLastSavedTransactionId] = useState('');

  const blankForm = {
    _id: '',
    transactionNo: 'Auto',
    dealId: '',
    customerId: '',
    tranDate: new Date().toISOString().split('T')[0],
    dealAmount: 0,
    interestPerMonth: 0,
    ratePercentPerMonth: 0,
    noOfMonths: 0,
    noOfDays: 0,
    isSettlement: false,
    closingDate: '',
    payMode: 'cash',
    bankId: '',
    chequeNo: '0',
    submittedBy: '',
    remarks: '',
    principle: { toBePaid: 0, amountPaid: 0, balance: 0 },
    compound: { lastBalance: 0, currentBalance: 0, toBePaid: 0, amountPaid: 0, balance: 0 },
    discount: 0,
    settlementAmount: 0,
    totalPaid: 0,
    status: 'partial',
    yearlyBreakdown: []
  };

  const [form, setForm] = useState(blankForm);

  // Print Profile
  const [printProfile, setPrintProfile] = useState(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // --- TIME & COMPANY METRICS ---
  const fetchActiveCompany = async () => {
    try {
      const userRes = await axios.get('/api/auth/me');
      setCurrentUser(userRes.data);
      const compListRes = await axios.get('/api/companies');
      const activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
      setCompanyDetails(activeComp);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveCompany();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (form.customerId) {
      const selected = customers.find(c => c._id === form.customerId);
      if (selected) {
        setCustNameText(selected.name || '');
        setCustMobileText(selected.mobile || '');
        setCustIdText(selected.idProofNumber || (selected.customerCode ? String(selected.customerCode) : ''));
      }
    } else {
      setCustNameText('');
      setCustMobileText('');
      setCustIdText('');
    }
  }, [form.customerId, customers]);

  // Apply a full customer selection to all three lookup fields
  const applyCustomerSelection = (c) => {
    handleCustomerChange(c._id);
    setCustNameText(c.name || '');
    setCustMobileText(c.mobile || '');
    setCustIdText(c.idProofNumber || (c.customerCode ? String(c.customerCode) : ''));
    setCustFocusField(null);
    setCustDropdownIdx(-1);
  };

  // --- GENERAL LOADER SYSTEM ---
  const loadMasters = async () => {
    try {
      const [custRes, dealRes, bankRes] = await Promise.all([
        axios.get('/api/customers?limit=1000'),
        axios.get('/api/deals?limit=1000'),
        axios.get('/api/banks')
      ]);
      setCustomers(custRes.data.customers);
      setDeals(dealRes.data.deals);
      setBanks(bankRes.data);
    } catch (err) {
      triggerToast('Error loading masters data', 'error');
    }
  };

  useEffect(() => {
    const initializeTransaction = async () => {
      await loadMasters();
      // Always start with a completely blank form — no pre-filled deal
      setForm({ ...blankForm, tranDate: new Date().toISOString().split('T')[0] });
      setIsEditMode(true);
    };
    initializeTransaction();
  }, []);

  const triggerAutoCalc = async (dealId, dateStr) => {
    if (!dealId || !dateStr) return;
    const myReqId = ++calcReqId.current; // bump and capture current id
    try {
      const res = await axios.post('/api/transactions/calculate', {
        dealId,
        tranDate: dateStr
      });
      if (myReqId !== calcReqId.current) return; // stale response — discard
      const calc = res.data;
      setForm(prev => {
        const interestToBePaid = calc.interestToBePaid || 0;
        const principalToBePaid = calc.remainingPrincipal || 0;
        const totalDue = principalToBePaid + interestToBePaid;
        const disc = Number(prev.discount || 0);
        const finalDue = Math.max(0, totalDue - disc);

        // Auto-allocate payment: interest first, then principal
        const cPaid = interestToBePaid;
        const pPaid = principalToBePaid;

        const next = {
          ...prev,
          dealAmount: calc.dealAmount,
          ratePercentPerMonth: calc.interestRatePerMonth,
          interestPerMonth: calc.interestAmountPerMonth,
          noOfMonths: calc.noOfMonths,
          noOfDays: calc.noOfDays,
          yearlyBreakdown: calc.yearlyBreakdown || [],
          closingDate: prev.isSettlement ? dateStr : '',
          principle: {
            toBePaid: principalToBePaid,
            amountPaid: pPaid,
            balance: 0
          },
          compound: {
            lastBalance: calc.lastBalance || 0,
            currentBalance: calc.currentBalance || 0,
            toBePaid: interestToBePaid,
            amountPaid: cPaid,
            balance: 0
          },
          totalPaid: finalDue,
          status: 'settled'
        };
        return next;
      });
    } catch (err) {
      if (myReqId !== calcReqId.current) return;
      triggerToast('Calculation error', 'error');
    }
  };

  const handleCustomerChange = (customerId) => {
    setForm(prev => ({
      ...prev,
      customerId,
      dealId: '' // reset deal
    }));
  };

  const handleDealChange = (dealId) => {
    const activeDeal = deals.find(d => d._id === dealId);
    setForm(prev => ({
      ...prev,
      dealId,
      customerId: activeDeal ? (activeDeal.customerId?._id || activeDeal.customerId) : prev.customerId
    }));
    triggerAutoCalc(dealId, form.tranDate);
  };

  const handleTranDateChange = (dateStr) => {
    setForm(prev => ({ ...prev, tranDate: dateStr }));
    if (form.dealId) {
      triggerAutoCalc(form.dealId, dateStr);
    }
  };

  const handleDiscountChange = (val) => {
    const disc = Number(val || 0);
    setForm(prev => ({
      ...prev,
      discount: disc,
      totalPaid: Number(prev.principle.amountPaid) + Number(prev.compound.amountPaid) - disc
    }));
  };

  const handleAddNewTran = () => {
    setForm({ ...blankForm, tranDate: new Date().toISOString().split('T')[0] });
    setIsEditMode(true);
    setCustNameText('');
    setCustMobileText('');
    setCustIdText('');
  };

  const handleSaveTran = async () => {
    if (!form.dealId) {
      triggerToast('Please select a Deal reference', 'error');
      return;
    }
    try {
      const res = await axios.post('/api/transactions', form);
      setLastSavedTransactionId(res.data._id);
      triggerToast('Payment saved successfully!');
      handleAddNewTran();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error saving transaction', 'error');
    }
  };

  const handlePrintReceipt = async () => {
    const transactionId = form._id || lastSavedTransactionId;
    if (!transactionId) {
      triggerToast('Save a transaction before printing', 'error');
      return;
    }
    try {
      const res = await axios.get(`/api/transactions/${transactionId}/print`);
      setPrintProfile(res.data);
      setIsPrintMode(true);
      setTimeout(() => {
        window.print();
        setIsPrintMode(false);
      }, 300);
    } catch (err) {
      triggerToast('Print compile error', 'error');
    }
  };

  const handleCancel = () => {
    handleAddNewTran();
  };

  // Computed values for display
  const activeDealInfo = deals.find(d => d._id === form.dealId);
  // Total amount = deal amount + cumulative interest (compound.toBePaid)
  const totalInterestAmount = Number(form.compound?.toBePaid || 0);
  const totalAmount = Number(form.dealAmount || 0) + totalInterestAmount;
  const finalTotal = totalAmount - Number(form.discount || 0);

  // Customer dropdown keyboard nav helpers
  const getFilteredCustomers = (field) => {
    if (field === 'name') {
      const q = custNameText.toLowerCase();
      return customers.filter(c => c.name && c.name.toLowerCase().includes(q));
    }
    if (field === 'mobile') {
      const q = custMobileText.toLowerCase();
      return customers.filter(c => c.mobile && c.mobile.toLowerCase().includes(q));
    }
    if (field === 'id') {
      const q = custIdText.toLowerCase();
      return customers.filter(c =>
        (c.idProofNumber && c.idProofNumber.toLowerCase().includes(q)) ||
        (c.customerCode && c.customerCode.toString().includes(q))
      );
    }
    return [];
  };

  const handleCustKeyDown = (e, field) => {
    const list = getFilteredCustomers(field);
    if (!list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      setCustDropdownIdx(prev => Math.min(prev + 1, list.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      setCustDropdownIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = custDropdownIdx >= 0 ? custDropdownIdx : 0;
      if (list[idx]) {
        applyCustomerSelection(list[idx]);
      }
    } else if (e.key === 'Escape') {
      setCustFocusField(null);
      setCustDropdownIdx(-1);
    }
  };

  if (isPrintMode && printProfile) {
    const { transaction: pt, company: pc } = printProfile;
    return (
      <div className="print-area p-8 text-black bg-white min-h-screen text-xs font-mono">
        <div className="flex justify-between items-center border-b border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">{pc.name}</h1>
            <p>{pc.address}</p>
            <p>GSTIN: {pc.gstin}</p>
          </div>
          <div className="text-right font-sans">
            <h2 className="text-base font-bold border border-black px-2 py-1 uppercase">{pt.transactionNo}</h2>
            <p className="mt-1">Date: {new Date(pt.tranDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="my-6 space-y-2 text-sm leading-relaxed font-sans">
          <p>Received with thanks from <span className="font-bold uppercase">{pt.customerId?.name}</span></p>
          <p>Against Gold Loan Deal Reference <span className="font-bold">#{pt.dealId?.dealNo}</span></p>
          <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs border border-black p-3">
            <p>Principal Repaid: ₹{formatIndianCurrency(pt.principle?.amountPaid || 0)}</p>
            <p>Interest Repaid: ₹{formatIndianCurrency(pt.compound?.amountPaid || 0)}</p>
            <p>Discount Allowed: ₹{formatIndianCurrency(pt.discount || 0)}</p>
            <p className="font-sans font-bold text-sm col-span-2 border-t pt-1">Net Collection: ₹{formatIndianCurrency(pt.totalPaid)}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeals = deals.filter(d => 
    !form.customerId || 
    d.customerId?._id === form.customerId || 
    d.customerId === form.customerId
  );

  return (
    <div className="font-sans flex flex-col h-full space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center no-print pb-1 border-b border-slate-850/60">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Transaction</h1>
          <p className="text-slate-400 text-[11px]">Settle outstanding loans and manage interest payment receipts.</p>
        </div>
      </div>

      {/* Main compact form — designed to fit in one screen */}
      <div className="glass-panel rounded-xl border border-slate-800/80 p-3 no-print flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-1.5 text-xs">

          {/* === LEFT COLUMN: Customer & Deal Lookup === */}
          <div className="space-y-1.5 lg:border-r lg:border-slate-800/80 lg:pr-8">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-0.5 mb-1.5">Customer &amp; Deal</div>

            {/* Customer Name */}
            <div className="flex items-center space-x-2 relative">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Customer Name *:</label>
              <div className="relative flex-1 max-w-[210px]">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={custNameText}
                  onChange={(e) => {
                    setCustNameText(e.target.value);
                    setCustFocusField('name');
                    setCustDropdownIdx(-1);
                    if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '', dealId: '' }));
                  }}
                  onFocus={() => setCustFocusField('name')}
                  onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                  onKeyDown={(e) => handleCustKeyDown(e, 'name')}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500"
                />
                {custFocusField === 'name' && (() => {
                  const list = getFilteredCustomers('name');
                  if (!list.length) return null;
                  return (
                    <div className="absolute left-0 mt-1 w-60 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 divide-y divide-slate-850">
                      {list.map((c, i) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          className={`p-1.5 text-xs text-slate-300 cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'hover:bg-slate-900'}`}
                        >
                          <span className="font-semibold text-slate-200">{c.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{c.mobile || 'No mobile'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Mobile */}
            <div className="flex items-center space-x-2 relative">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Mobile No.:</label>
              <div className="relative flex-1 max-w-[210px]">
                <input
                  type="text"
                  placeholder="Search by mobile..."
                  value={custMobileText}
                  onChange={(e) => {
                    setCustMobileText(e.target.value);
                    setCustFocusField('mobile');
                    setCustDropdownIdx(-1);
                    if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '', dealId: '' }));
                  }}
                  onFocus={() => setCustFocusField('mobile')}
                  onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                  onKeyDown={(e) => handleCustKeyDown(e, 'mobile')}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-mono"
                />
                {custFocusField === 'mobile' && (() => {
                  const list = getFilteredCustomers('mobile');
                  if (!list.length) return null;
                  return (
                    <div className="absolute left-0 mt-1 w-60 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 divide-y divide-slate-850">
                      {list.map((c, i) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          className={`p-1.5 text-xs cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                        >
                          <span className="font-mono text-slate-200">{c.mobile}</span>
                          <span className="text-[9px] text-slate-400">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer ID */}
            <div className="flex items-center space-x-2 relative">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Customer ID:</label>
              <div className="relative flex-1 max-w-[210px]">
                <input
                  type="text"
                  placeholder="Search by ID / code..."
                  value={custIdText}
                  onChange={(e) => {
                    setCustIdText(e.target.value);
                    setCustFocusField('id');
                    setCustDropdownIdx(-1);
                    if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '', dealId: '' }));
                  }}
                  onFocus={() => setCustFocusField('id')}
                  onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                  onKeyDown={(e) => handleCustKeyDown(e, 'id')}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-mono"
                />
                {custFocusField === 'id' && (() => {
                  const list = getFilteredCustomers('id');
                  if (!list.length) return null;
                  return (
                    <div className="absolute left-0 mt-1 w-60 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 divide-y divide-slate-850">
                      {list.map((c, i) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          className={`p-1.5 text-xs cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                        >
                          <span className="font-mono text-slate-200">{c.idProofNumber || `#${c.customerCode}`}</span>
                          <span className="text-[9px] text-slate-400">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Deal No */}
            <div className="flex items-center space-x-2">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Deal No. *:</label>
              <select
                value={form.dealId}
                onChange={(e) => handleDealChange(e.target.value)}
                className="flex-1 max-w-[210px] py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Select active deal...</option>
                {filteredDeals.map(d => (
                  <option key={d._id} value={d._id}>
                    Deal #{d.dealNo} (₹{d.dealAmount})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Date */}
            <div className="flex items-center space-x-2">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Tran Date *:</label>
              <div className="flex flex-col flex-1 max-w-[210px]">
                <input
                  type="date"
                  disabled={currentUser?.role !== 'admin'}
                  value={form.tranDate}
                  onChange={(e) => handleTranDateChange(e.target.value)}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
                />
                {form.tranDate && (
                  <span className="text-[9px] text-amber-400 font-mono mt-0.5">
                    {(() => {
                      const [y, m, d] = form.tranDate.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </span>
                )}
              </div>
            </div>

            {/* Deal Date (read-only) */}
            <div className="flex items-center space-x-2">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Deal Date:</label>
              <input
                type="text"
                disabled
                value={activeDealInfo?.dealDate ? (() => {
                  const d = new Date(activeDealInfo.dealDate);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
                  return `${day}/${month}/${year} (${day} ${monthName} ${year})`;
                })() : '—'}
                className="flex-1 max-w-[210px] py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right"
              />
            </div>

            {/* Pay Mode */}
            <div className="flex items-center space-x-2">
              <label className="w-28 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Pay Mode:</label>
              <select
                value={form.payMode}
                onChange={(e) => setForm(prev => ({ ...prev, payMode: e.target.value }))}
                className="flex-1 max-w-[210px] py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          </div>

          {/* === RIGHT COLUMN: Calculation Details === */}
          <div className="space-y-1.5 lg:pl-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-0.5 mb-1.5">Calculation &amp; Payment</div>

            {/* Deal Amount */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Deal Amount:</label>
              <input type="text" disabled value={`₹${formatIndianCurrency(form.dealAmount || 0)}`}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right font-bold" />
            </div>

            {/* Interest/Month */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Interest/Month:</label>
              <input type="text" disabled value={`₹${formatIndianCurrency(form.interestPerMonth || 0)}`}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right font-bold" />
            </div>

            {/* Rate (Per Month text before text box) */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Rate (Per Month %):</label>
              <input type="text" disabled value={`${(form.ratePercentPerMonth || 0).toFixed(2)}%`}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right font-bold" />
            </div>

            {/* Total Interest (Accrued interest for all months) */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-amber-400 font-semibold text-[11px] text-left">Total Interest:</label>
              <input type="text" disabled value={`₹${formatIndianCurrency(form.compound?.toBePaid || 0)}`}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-amber-500/30 rounded-md font-mono text-amber-400 text-xs text-right font-bold" />
            </div>

            {/* No. of Months */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">No. of Months:</label>
              <input type="text" disabled value={form.noOfMonths}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right" />
            </div>

            {/* No. of Days */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">No. of Days:</label>
              <input type="text" disabled value={form.noOfDays}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md font-mono text-slate-400 text-xs text-right" />
            </div>

            {/* Total Amount = Deal Amount + Interest accrued */}
            <div className="flex items-center space-x-2 border-t border-slate-800 pt-1">
              <label className="w-36 shrink-0 text-amber-400 font-bold text-[11px] text-left">Total Amount:</label>
              <input type="text" disabled value={`₹${formatIndianCurrency(totalAmount)}`}
                className="w-36 py-0.5 px-2 h-7 bg-slate-955 border border-amber-500/30 rounded-md font-mono text-amber-400 text-xs font-bold text-right" />
            </div>

            {/* Remarks */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Remarks:</label>
              <input
                type="text"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Notes"
                className="w-36 py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
              />
            </div>

            {/* Discount */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-400 font-semibold text-[11px] text-left">Discount:</label>
              <input
                type="number"
                value={form.discount || ''}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0"
                className="w-36 py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 font-mono text-right focus:outline-none"
              />
            </div>

            {/* Final Total = Total Amount - Discount */}
            <div className="flex items-center space-x-2 border-t border-slate-800 pt-1">
              <label className="w-36 shrink-0 text-emerald-400 font-bold text-xs text-left">Final Total:</label>
              <input type="text" disabled value={`₹${formatIndianCurrency(finalTotal)}`}
                className="w-36 py-0.5 px-2 h-7.5 bg-slate-955 border border-emerald-500/40 rounded-md font-mono text-emerald-400 font-extrabold text-xs text-right" />
            </div>

            {/* Amount Paid */}
            <div className="flex items-center space-x-2">
              <label className="w-36 shrink-0 text-slate-200 font-bold text-[11px] text-left">Amount Paid *:</label>
              <input
                type="number"
                placeholder="0"
                value={form.totalPaid !== undefined && form.totalPaid !== null ? form.totalPaid : ''}
                onChange={(e) => {
                  const enteredVal = Number(e.target.value || 0);
                  setForm(prev => {
                    const interestToBePaid = prev.compound?.toBePaid || 0;
                    const principalToBePaid = prev.principle?.toBePaid || 0;
                    const cPaid = Math.min(enteredVal, interestToBePaid);
                    const pPaid = Math.max(0, enteredVal - cPaid);
                    const pBalance = Math.max(0, principalToBePaid - pPaid);
                    const cBalance = Math.max(0, interestToBePaid - cPaid);
                    return {
                      ...prev,
                      principle: {
                        ...prev.principle,
                        amountPaid: pPaid,
                        balance: pBalance
                      },
                      compound: {
                        ...prev.compound,
                        amountPaid: cPaid,
                        balance: cBalance
                      },
                      totalPaid: enteredVal,
                      status: (pBalance === 0 && cBalance === 0) ? 'settled' : 'partial'
                    };
                  });
                }}
                className="w-36 py-0.5 px-2 h-7.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-primary-500 text-right"
              />
            </div>

            {/* Bottom-right Action Buttons */}
            <div className="col-span-3 flex justify-end items-center gap-2 pt-2 border-t border-slate-800 mt-1">
              <button
                id="toolbar-save-button"
                type="button"
                onClick={handleSaveTran}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold shadow transition-all"
              >
                Save Transaction
              </button>
              <button
                id="toolbar-print-button"
                type="button"
                onClick={handlePrintReceipt}
                disabled={!lastSavedTransactionId && !form._id}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Print Receipt
              </button>
              <button
                id="toolbar-cancel-button"
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold transition-all"
              >
                New / View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-0.5 border-t border-slate-850 pt-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-1 text-[10px] text-slate-500 no-print">
        <div>
          <p className="font-bold text-slate-350 uppercase tracking-wider">{companyDetails?.name || ''}</p>
          <p className="text-slate-450">{companyDetails?.address || ''}</p>
        </div>
        <div className="md:text-right space-y-0.5 font-sans">
          <p>Date: <span className="font-semibold text-slate-400">{time.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
          <p>Time: <span className="font-mono text-amber-500/80 font-bold">{time.toLocaleTimeString()}</span></p>
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

export default Transaction;
