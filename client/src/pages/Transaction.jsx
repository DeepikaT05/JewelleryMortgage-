import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toolbar from '../components/Toolbar';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { formatIndianCurrency } from '../utils/format';
import { Search, X } from 'lucide-react';

const Transaction = () => {
  const [toast, setToast] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [custSearchFocused, setCustSearchFocused] = useState(false);
  const [custSearchText, setCustSearchText] = useState('');

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
  const [transactions, setTransactions] = useState([]);
  const [tranIndex, setTranIndex] = useState(-1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [findSearchQuery, setFindSearchQuery] = useState('');

  const [form, setForm] = useState({
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
    status: 'partial'
  });

  // Print Profile
  const [printProfile, setPrintProfile] = useState(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // --- TIME & COMPANY METRICS ---
  const fetchActiveCompany = async () => {
    try {
      const userRes = await axios.get('http://localhost:5000/api/auth/me');
      setCurrentUser(userRes.data);
      const compListRes = await axios.get('http://localhost:5000/api/companies');
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
        setCustSearchText(`${selected.name} (${selected.customerCode})`);
      } else {
        setCustSearchText('');
      }
    } else {
      setCustSearchText('');
    }
  }, [form.customerId, customers]);

  // --- GENERAL LOADER SYSTEM ---
  const loadMasters = async () => {
    try {
      const [custRes, dealRes, bankRes] = await Promise.all([
        axios.get('http://localhost:5000/api/customers?limit=1000'),
        axios.get('http://localhost:5000/api/deals?limit=1000'),
        axios.get('http://localhost:5000/api/banks')
      ]);
      setCustomers(custRes.data.customers);
      setDeals(dealRes.data.deals);
      setBanks(bankRes.data);
    } catch (err) {
      triggerToast('Error loading masters data', 'error');
    }
  };

  const loadTransactionsList = async (selectId = null) => {
    try {
      const res = await axios.get('http://localhost:5000/api/transactions?limit=1000');
      const list = res.data.transactions;
      setTransactions(list);

      if (list.length > 0) {
        let idx = selectId ? list.findIndex(t => t._id === selectId) : 0;
        if (idx === -1) idx = 0;
        setTranIndex(idx);
        fetchTransactionDetails(list[idx]._id);
      } else {
        handleAddNewTran();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMasters();
    loadTransactionsList();
  }, []);

  const fetchTransactionDetails = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/transactions/${id}`);
      const t = res.data;
      setForm({
        ...t,
        tranDate: t.tranDate ? t.tranDate.split('T')[0] : '',
        closingDate: t.closingDate ? t.closingDate.split('T')[0] : '',
        dealId: t.dealId?._id || t.dealId,
        customerId: t.customerId?._id || t.customerId,
        bankId: t.bankId?._id || t.bankId || '',
        submittedBy: t.submittedBy || '',
        remarks: t.remarks || '',
        chequeNo: t.chequeNo || '0'
      });
      setIsEditMode(false);
      setIsNewRecord(false);
    } catch (err) {
      triggerToast('Failed to load transaction details', 'error');
    }
  };

  const triggerAutoCalc = async (dealId, dateStr) => {
    if (!dealId || !dateStr) return;
    try {
      const res = await axios.post('http://localhost:5000/api/transactions/calculate', {
        dealId,
        tranDate: dateStr
      });
      const calc = res.data;
      setForm(prev => {
        const next = {
          ...prev,
          dealAmount: calc.dealAmount,
          ratePercentPerMonth: calc.interestRatePerMonth,
          interestPerMonth: calc.interestAmountPerMonth,
          noOfMonths: calc.noOfMonths,
          noOfDays: calc.noOfDays,
          closingDate: prev.isSettlement ? dateStr : '',
          principle: {
            ...prev.principle,
            toBePaid: calc.remainingPrincipal,
            amountPaid: prev.principle.amountPaid || 0,
            balance: Math.max(0, calc.remainingPrincipal - (prev.principle.amountPaid || 0))
          },
          compound: {
            ...prev.compound,
            lastBalance: calc.lastBalance || 0,
            currentBalance: calc.currentBalance || 0,
            toBePaid: calc.interestToBePaid,
            amountPaid: prev.compound.amountPaid || 0,
            balance: Math.max(0, calc.interestToBePaid - (prev.compound.amountPaid || 0))
          }
        };
        next.totalPaid = Number(next.principle.amountPaid) + Number(next.compound.amountPaid) - Number(next.discount || 0);
        return next;
      });
    } catch (err) {
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
      customerId: activeDeal ? (activeDeal.customerId?._id || activeDeal.customerId) : ''
    }));
    triggerAutoCalc(dealId, form.tranDate);
  };

  const handleTranDateChange = (dateStr) => {
    setForm(prev => ({ ...prev, tranDate: dateStr }));
    if (form.dealId) {
      triggerAutoCalc(form.dealId, dateStr);
    }
  };

  const handlePaymentInput = (box, field, val) => {
    setForm(prev => {
      const num = Number(val || 0);
      const next = { ...prev };
      next[box] = {
        ...prev[box],
        [field]: num,
        balance: Math.max(0, Number(prev[box].toBePaid) - num)
      };
      next.totalPaid = Number(next.principle.amountPaid) + Number(next.compound.amountPaid) - Number(next.discount || 0);
      
      if (next.principle.balance === 0 && next.compound.balance === 0) {
        next.status = 'settled';
      } else {
        next.status = 'partial';
      }
      return next;
    });
  };

  const handleDiscountChange = (val) => {
    const disc = Number(val || 0);
    setForm(prev => ({
      ...prev,
      discount: disc,
      totalPaid: Number(prev.principle.amountPaid) + Number(prev.compound.amountPaid) - disc
    }));
  };

  const handleSettlementAmountChange = (val) => {
    const sett = Number(val || 0);
    setForm(prev => {
      const totalToBePaid = Number(prev.principle.toBePaid || 0) + Number(prev.compound.toBePaid || 0);
      const disc = Math.max(0, totalToBePaid - sett);
      return {
        ...prev,
        settlementAmount: sett,
        discount: disc,
        principle: {
          ...prev.principle,
          amountPaid: prev.principle.toBePaid,
          balance: 0
        },
        compound: {
          ...prev.compound,
          amountPaid: prev.compound.toBePaid,
          balance: 0
        },
        totalPaid: sett,
        status: 'settled'
      };
    });
  };

  const handleAddNewTran = () => {
    const activeDeal = deals[0];
    setForm({
      _id: '',
      transactionNo: 'Auto',
      dealId: activeDeal ? activeDeal._id : '',
      customerId: activeDeal ? (activeDeal.customerId?._id || activeDeal.customerId) : '',
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
      status: 'partial'
    });
    setIsEditMode(true);
    setIsNewRecord(true);
    if (activeDeal) {
      setTimeout(() => triggerAutoCalc(activeDeal._id, new Date().toISOString().split('T')[0]), 50);
    }
  };

  const handleSaveTran = async () => {
    if (!form.dealId || !form.totalPaid) {
      triggerToast('Deal reference and payment inputs are required', 'error');
      return;
    }
    try {
      if (isNewRecord) {
        const res = await axios.post('http://localhost:5000/api/transactions', form);
        triggerToast('Payment transaction saved');
        loadTransactionsList(res.data._id);
      } else {
        const res = await axios.put(`http://localhost:5000/api/transactions/${form._id}`, form);
        triggerToast('Payment transaction updated');
        loadTransactionsList(res.data._id);
      }
    } catch (err) {
      triggerToast('Error saving transaction', 'error');
    }
  };

  const handleDeleteTran = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDeleteTran = async () => {
    setConfirmDeleteOpen(false);
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${form._id}`);
      triggerToast('Payment transaction deleted');
      loadTransactionsList();
    } catch (err) {
      triggerToast('Error deleting transaction', 'error');
    }
  };

  const handlePrintReceipt = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/transactions/${form._id}/print`);
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

  const handlePrev = () => {
    if (tranIndex > 0) {
      const nextIdx = tranIndex - 1;
      setTranIndex(nextIdx);
      fetchTransactionDetails(transactions[nextIdx]._id);
    }
  };

  const handleNext = () => {
    if (tranIndex < transactions.length - 1) {
      const nextIdx = tranIndex + 1;
      setTranIndex(nextIdx);
      fetchTransactionDetails(transactions[nextIdx]._id);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setIsNewRecord(false);
    if (transactions.length > 0 && tranIndex !== -1) fetchTransactionDetails(transactions[tranIndex]._id);
    else handleAddNewTran();
  };

  // Find dynamic details
  const activeDealInfo = deals.find(d => d._id === form.dealId);
  const activeCustInfo = customers.find(c => c._id === form.customerId);

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

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Transaction</h1>
          <p className="text-slate-400 text-sm mt-1">Settle outstanding loans and manage interest payment receipts.</p>
        </div>
      </div>

      <Toolbar
        onPrev={handlePrev}
        onNext={handleNext}
        onFind={() => setShowFindModal(true)}
        onAdd={handleAddNewTran}
        onEdit={() => setIsEditMode(true)}
        onSave={handleSaveTran}
        onDelete={handleDeleteTran}
        onPrint={handlePrintReceipt}
        onCancel={handleCancel}
        isEditMode={isEditMode}
        hasPrev={tranIndex > 0}
        hasNext={tranIndex < transactions.length - 1}
      />

      {/* Main retro form workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start no-print">
        
        {/* LEFT COLUMN: DETAILS & ACCRUAL CALCULATIONS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-sm font-bold text-slate-350 uppercase">Transaction Details</h3>
          </div>

          <div className="space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-3 items-center relative">
              <label className="text-slate-400 font-semibold">Customer * :</label>
              <div className="col-span-2 relative">
                <input
                  type="text"
                  disabled={!isEditMode}
                  placeholder="Type name, mobile, or code to search..."
                  value={custSearchText}
                  onChange={(e) => {
                    setCustSearchText(e.target.value);
                    setCustSearchFocused(true);
                    if (e.target.value === '') {
                      setForm(prev => ({ ...prev, customerId: '', dealId: '' }));
                    }
                  }}
                  onFocus={() => {
                    setCustSearchFocused(true);
                    setCustSearchText('');
                  }}
                  onBlur={() => {
                    setTimeout(() => setCustSearchFocused(false), 250);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500"
                />

                {isEditMode && custSearchFocused && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                    {customers.filter(c => {
                      const search = custSearchText.toLowerCase();
                      return (
                        (c.name && c.name.toLowerCase().includes(search)) ||
                        (c.customerCode && c.customerCode.toString().includes(search)) ||
                        (c.mobile && c.mobile.includes(search)) ||
                        (c.idProofNumber && c.idProofNumber.toLowerCase().includes(search))
                      );
                    }).length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 italic">No matching customers found</div>
                    ) : (
                      customers.filter(c => {
                        const search = custSearchText.toLowerCase();
                        return (
                          (c.name && c.name.toLowerCase().includes(search)) ||
                          (c.customerCode && c.customerCode.toString().includes(search)) ||
                          (c.mobile && c.mobile.includes(search)) ||
                          (c.idProofNumber && c.idProofNumber.toLowerCase().includes(search))
                        );
                      }).map(c => (
                        <div
                          key={c._id}
                          onMouseDown={() => {
                            handleCustomerChange(c._id);
                            setCustSearchText(`${c.name} (${c.customerCode})`);
                            setCustSearchFocused(false);
                          }}
                          className="p-3 text-xs text-slate-300 hover:bg-slate-900 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-slate-500 ml-2 font-mono">#{c.customerCode}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.mobile}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Tran Date * :</label>
              <div className="col-span-2">
                <input
                  type="date"
                  required
                  disabled={!isEditMode || currentUser?.role === 'operator' || currentUser?.role === 'staff'}
                  value={form.tranDate}
                  onChange={(e) => handleTranDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Deal Amount */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Deal Amount :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled
                  value={form.dealAmount?.toFixed(2)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg font-mono text-slate-400 text-right"
                />
              </div>
            </div>

            {/* Interest/Month */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Interest/Month :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled
                  value={form.interestPerMonth?.toFixed(2)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg font-mono text-slate-400 text-right"
                />
              </div>
            </div>

            {/* Rate */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Rate :</label>
              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="text"
                  disabled
                  value={form.ratePercentPerMonth?.toFixed(2)}
                  className="w-32 px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg font-mono text-slate-400 text-right"
                />
                <span className="text-slate-500 font-semibold">% Per Month</span>
              </div>
            </div>

            {/* No of Month */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">No. of Month :</label>
              <div className="col-span-2 flex items-center justify-between">
                <input
                  type="text"
                  disabled
                  value={form.noOfMonths}
                  className="w-24 px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg font-mono text-slate-400 text-right"
                />
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={form.isSettlement}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm(prev => {
                        const totalToBePaid = Number(prev.principle.toBePaid || 0) + Number(prev.compound.toBePaid || 0);
                        return {
                          ...prev,
                          isSettlement: checked,
                          closingDate: checked ? prev.tranDate : '',
                          settlementAmount: checked ? totalToBePaid : 0,
                          discount: 0,
                          principle: {
                            ...prev.principle,
                            amountPaid: checked ? prev.principle.toBePaid : 0,
                            balance: checked ? 0 : prev.principle.toBePaid
                          },
                          compound: {
                            ...prev.compound,
                            amountPaid: checked ? prev.compound.toBePaid : 0,
                            balance: checked ? 0 : prev.compound.toBePaid
                          },
                          totalPaid: checked ? totalToBePaid : 0,
                          status: checked ? 'settled' : 'partial'
                        };
                      });
                    }}
                    className="rounded accent-primary-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-slate-300 font-bold">Settlement</span>
                </label>
              </div>
            </div>

            {/* No of Days */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">No. of Days :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled
                  value={form.noOfDays}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg font-mono text-slate-400 text-right"
                />
              </div>
            </div>

            {/* Closing Date */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Closing Date :</label>
              <div className="col-span-2">
                <input
                  type="date"
                  disabled={!isEditMode || !form.isSettlement || currentUser?.role === 'operator' || currentUser?.role === 'staff'}
                  value={form.closingDate}
                  onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none disabled:opacity-30"
                />
              </div>
            </div>

            {/* Pay Mode */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Pay Mode :</label>
              <div className="col-span-2 flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    disabled={!isEditMode}
                    name="payMode"
                    value="cash"
                    checked={form.payMode === 'cash'}
                    onChange={(e) => setForm({ ...form, payMode: e.target.value })}
                    className="accent-primary-500 h-4.5 w-4.5"
                  />
                  <span>Cash</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    disabled={!isEditMode}
                    name="payMode"
                    value="bank"
                    checked={form.payMode === 'bank'}
                    onChange={(e) => setForm({ ...form, payMode: e.target.value })}
                    className="accent-primary-500 h-4.5 w-4.5"
                  />
                  <span>Bank</span>
                </label>
              </div>
            </div>

            {/* Bank Name */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Bank Name :</label>
              <div className="col-span-2">
                <select
                  disabled={!isEditMode || form.payMode === 'cash'}
                  value={form.bankId}
                  onChange={(e) => setForm({ ...form, bankId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-350 focus:outline-none disabled:opacity-30"
                >
                  <option value="">Select bank partner...</option>
                  {banks.map(b => (
                    <option key={b._id} value={b._id}>{b.bankName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cheque No */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Cheque No. :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={!isEditMode || form.payMode === 'cash'}
                  value={form.chequeNo}
                  onChange={(e) => setForm({ ...form, chequeNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono disabled:opacity-30 focus:outline-none"
                />
              </div>
            </div>

            {/* Submitted by */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Submitted by :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={form.submittedBy}
                  onChange={(e) => setForm({ ...form, submittedBy: e.target.value })}
                  placeholder="Receiver name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Remarks :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SPECS, PRICIPLE & COMPOUND CALCULATORS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-xs relative">
          
          {/* Settled / Active status indicator at top right */}
          <div className="absolute top-6 right-6">
            <span className={`text-lg font-extrabold tracking-widest uppercase ${
              form.status === 'settled' ? 'text-red-500 font-sans' : 'text-emerald-450 font-sans'
            }`}>
              {form.status === 'settled' ? 'SETTLED' : 'ACTIVE'}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-sm font-bold text-slate-350 uppercase">Deal Specs</h3>
          </div>

          <div className="space-y-4">
            {/* Transaction No */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Transaction No. :</label>
              <span className="col-span-2 font-mono font-bold text-amber-500 text-sm">#{form.transactionNo}</span>
            </div>

            {/* Deal No selector */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Deal No. * :</label>
              <div className="col-span-2">
                <select
                  required
                  disabled={!isEditMode}
                  value={form.dealId}
                  onChange={(e) => handleDealChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-350 focus:outline-none"
                >
                  <option value="">Select active deal...</option>
                  {deals
                    .filter(d => d.customerId?._id === form.customerId || d.customerId === form.customerId)
                    .map(d => (
                      <option key={d._id} value={d._id}>
                        Deal #{d.dealNo} (₹{d.dealAmount})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Deal Start Date */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Deal Start Date :</label>
              <span className="col-span-2 font-mono text-slate-300">
                {activeDealInfo?.dealDate ? new Date(activeDealInfo.dealDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </span>
            </div>

            {/* Deal End Date */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Deal End Date :</label>
              <span className="col-span-2 font-mono text-slate-300">
                {activeDealInfo?.dealEndDate ? new Date(activeDealInfo.dealEndDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </span>
            </div>

            {/* Last Paid Upto */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Last Paid Upto :</label>
              <span className="col-span-2 font-mono text-slate-300">
                {activeDealInfo?.lastPaidUpto ? new Date(activeDealInfo.lastPaidUpto).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </span>
            </div>

            {/* Paid Upto */}
            <div className="grid grid-cols-3 items-center">
              <label className="text-slate-400 font-semibold">Paid Upto :</label>
              <span className="col-span-2 font-mono text-slate-300">
                {form.tranDate ? new Date(form.tranDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </span>
            </div>

            {/* Principle box card layout */}
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="bg-blue-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                Principle
              </div>
              <div className="p-3 bg-slate-950/20 space-y-2">
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400">To be Paid :</label>
                  <span className="col-span-2 text-right font-mono font-bold text-slate-200">₹{formatIndianCurrency(form.principle.toBePaid)}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400">Amount Paid :</label>
                  <div className="col-span-2">
                    <input
                      type="number"
                      disabled={!isEditMode}
                      value={form.principle.amountPaid}
                      onChange={(e) => handlePaymentInput('principle', 'amountPaid', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-100 text-right"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center border-t border-slate-850/60 pt-1">
                  <label className="text-slate-500">Balance :</label>
                  <span className="col-span-2 text-right font-mono text-slate-400">₹{formatIndianCurrency(form.principle.balance)}</span>
                </div>
              </div>
            </div>

            {/* Compound box card layout */}
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="bg-red-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                Compound
              </div>
              <div className="p-3 bg-slate-955/20 space-y-2">
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400">Last Balance :</label>
                  <span className="col-span-2 text-right font-mono text-slate-300">₹{formatIndianCurrency(form.compound.lastBalance)}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400">Current Balance :</label>
                  <span className="col-span-2 text-right font-mono text-slate-300 font-bold">₹{formatIndianCurrency(form.compound.currentBalance)}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400 font-semibold">To be Paid :</label>
                  <span className="col-span-2 text-right font-mono font-bold text-slate-100">₹{formatIndianCurrency(form.compound.toBePaid)}</span>
                </div>
                <div className="grid grid-cols-3 items-center border-t border-slate-850/60 pt-1">
                  <label className="text-slate-450 font-semibold">Amount Paid :</label>
                  <div className="col-span-2">
                    <input
                      type="number"
                      disabled={!isEditMode}
                      value={form.compound.amountPaid}
                      onChange={(e) => handlePaymentInput('compound', 'amountPaid', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-100 text-right"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center border-t border-slate-850/60 pt-1">
                  <label className="text-slate-500">Balance :</label>
                  <span className="col-span-2 text-right font-mono text-slate-400 font-semibold">₹{formatIndianCurrency(form.compound.balance)}</span>
                </div>
              </div>
            </div>

            {/* Discount & Total Paid */}
            <div className="border-t border-slate-850 pt-4 space-y-3">
              {form.isSettlement && (
                <div className="grid grid-cols-3 items-center">
                  <label className="text-slate-400 font-semibold">Settlement Amt :</label>
                  <div className="col-span-2">
                    <input
                      type="number"
                      disabled={!isEditMode}
                      value={form.settlementAmount}
                      onChange={(e) => handleSettlementAmountChange(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-100 text-right focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 items-center">
                <label className="text-slate-400 font-semibold">Discount :</label>
                <div className="col-span-2">
                  <input
                    type="number"
                    disabled={!isEditMode || form.isSettlement}
                    value={form.discount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-100 text-right focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center font-bold text-sm pt-2">
                <label className="text-slate-350">Total Paid :</label>
                <span className="col-span-2 text-right font-mono text-emerald-400 text-base">₹{formatIndianCurrency(form.totalPaid)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLOCK & COMPANY METRICS FOOTER */}
      <div className="mt-8 border-t border-slate-850 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 font-sans no-print">
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

      {/* FIND TRANSACTION RECEIPT DIALOG MODAL */}
      {showFindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-850 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200">Find Transaction Receipt</h3>
              <button onClick={() => setShowFindModal(false)} className="text-slate-400 hover:text-slate-250">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={findSearchQuery}
                onChange={(e) => setFindSearchQuery(e.target.value)}
                placeholder="Search by receipt or borrower..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-900 pr-1">
              {transactions
                .filter(t => 
                  String(t.transactionNo).includes(findSearchQuery) || 
                  t.customerId?.name?.toLowerCase().includes(findSearchQuery.toLowerCase())
                )
                .map(t => (
                  <button
                    key={t._id}
                    onClick={() => {
                      const idx = transactions.findIndex(item => item._id === t._id);
                      setTranIndex(idx);
                      fetchTransactionDetails(t._id);
                      setShowFindModal(false);
                      setFindSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-350 hover:text-white rounded-lg text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold block">{t.customerId?.name}</span>
                      <span className="text-[10px] text-slate-500">Paid: ₹{formatIndianCurrency(t.totalPaid)}</span>
                    </div>
                    <span className="font-mono text-amber-500 text-[10px] font-bold">#{t.transactionNo}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        title="Delete Transaction Record"
        message="Are you sure you want to delete this payment receipt record?"
        onConfirm={handleConfirmDeleteTran}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

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
