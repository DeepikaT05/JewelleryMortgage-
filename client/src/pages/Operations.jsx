import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatIndianCurrency } from '../utils/format';
import Toast from '../components/Toast';
import {
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Plus
} from 'lucide-react';

const Operations = () => {
  const [activeTab, setActiveTab] = useState('contra'); // 'contra', 'receipt', 'payment', 'general'
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reference accounts
  const [accounts, setAccounts] = useState([]);

  // Category Lists (saved dynamically)
  const [contraCategories, setContraCategories] = useState([
    'Cash to Bank (C to B)',
    'Bank to Cash (B to C)',
    'Bank to Bank (B to B)'
  ]);

  const [receiptCategories, setReceiptCategories] = useState([
    'Owner Capital Addition',
    'Customer Account Settlement',
    'Business Investment Received'
  ]);

  const [paymentCategories, setPaymentCategories] = useState([
    'Shop Rent',
    'Electricity / Utility Bill',
    'Staff / Employee Salary',
    'Tea & Refreshments',
    'Office Supplies & Stationery',
    'Shop Repair & Maintenance'
  ]);

  const [generalCategories, setGeneralCategories] = useState([
    'GST Inward (Expenses)',
    'GST Outward (Services)',
    'GST Reverse Charge',
    'GST Reversal',
    'Interest Journal'
  ]);

  // Inline Custom Account State
  const [showCustomAccountField, setShowCustomAccountField] = useState({
    contraFrom: false,
    contraTo: false,
    receiptDeposit: false,
    paymentSource: false,
    generalDebit: false,
    generalCredit: false
  });

  const [newCustomAccountName, setNewCustomAccountName] = useState({
    contraFrom: '',
    contraTo: '',
    receiptDeposit: '',
    paymentSource: '',
    generalDebit: '',
    generalCredit: ''
  });

  // 1. CONTRA FORM STATE
  const [contraForm, setContraForm] = useState({
    subType: 'Cash to Bank (C to B)',
    customCategory: '',
    date: new Date().toISOString().split('T')[0],
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    payMode: 'cash',
    customPayMode: '',
    refNo: '',
    remarks: ''
  });

  // 2. RECEIPT FORM STATE
  const [receiptForm, setReceiptForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Owner Capital Addition',
    customCategory: '',
    depositToAccountId: '',
    amount: '',
    payMode: 'cash',
    refNo: '',
    partyName: '',
    remarks: ''
  });

  // 3. PAYMENT FORM STATE
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Shop Rent',
    customCategory: '',
    paidFromAccountId: '',
    amount: '',
    payMode: 'cash',
    refNo: '',
    partyName: '',
    remarks: ''
  });

  // 4. GENERAL / JOURNAL FORM STATE
  const [generalForm, setGeneralForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'GST Inward (Expenses)',
    customCategory: '',
    debitAccountId: '',
    creditAccountId: '',
    amount: '',
    refNo: '',
    partyName: '',
    remarks: ''
  });

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Load Accounts
  const loadAccounts = async () => {
    try {
      const res = await axios.get('/api/operations/accounts');
      setAccounts(res.data || []);

      const cash = res.data.find(a => a.group === 'cash') || res.data[0];
      const bank = res.data.find(a => a.group === 'bank') || res.data[1] || res.data[0];

      if (cash && bank) {
        setContraForm(prev => ({
          ...prev,
          fromAccountId: prev.fromAccountId || cash._id,
          toAccountId: prev.toAccountId || bank._id
        }));
        setReceiptForm(prev => ({
          ...prev,
          depositToAccountId: prev.depositToAccountId || cash._id
        }));
        setPaymentForm(prev => ({
          ...prev,
          paidFromAccountId: prev.paidFromAccountId || cash._id
        }));
        setGeneralForm(prev => ({
          ...prev,
          debitAccountId: prev.debitAccountId || cash._id,
          creditAccountId: prev.creditAccountId || bank._id
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Inline Custom Account Creator helper
  const handleCreateInlineAccount = async (fieldKey, groupType = 'bank') => {
    const name = newCustomAccountName[fieldKey]?.trim();
    if (!name) {
      triggerToast('Please enter an account name', 'error');
      return null;
    }
    try {
      const res = await axios.post('/api/operations/custom-account', {
        name,
        group: groupType,
        openingBalance: 0
      });
      triggerToast(`Created new account "${res.data.name}"`);
      await loadAccounts();
      setShowCustomAccountField(prev => ({ ...prev, [fieldKey]: false }));
      setNewCustomAccountName(prev => ({ ...prev, [fieldKey]: '' }));
      return res.data._id;
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error creating custom account', 'error');
      return null;
    }
  };

  // Submit Handlers
  const handleSaveContra = async (e) => {
    e.preventDefault();
    if (!contraForm.amount || Number(contraForm.amount) <= 0) {
      return triggerToast('Please enter a valid transfer amount', 'error');
    }

    let fromId = contraForm.fromAccountId;
    let toId = contraForm.toAccountId;

    if (showCustomAccountField.contraFrom) {
      const createdId = await handleCreateInlineAccount('contraFrom', 'cash');
      if (!createdId) return;
      fromId = createdId;
    }
    if (showCustomAccountField.contraTo) {
      const createdId = await handleCreateInlineAccount('contraTo', 'bank');
      if (!createdId) return;
      toId = createdId;
    }

    if (fromId === toId) {
      return triggerToast('From Account and To Account cannot be the same', 'error');
    }

    setLoading(true);
    try {
      let finalCategory = contraForm.subType;
      if (contraForm.subType === 'Custom') {
        finalCategory = contraForm.customCategory || 'Custom Contra Transfer';
        if (contraForm.customCategory && !contraCategories.includes(contraForm.customCategory)) {
          setContraCategories(prev => [...prev, contraForm.customCategory]);
        }
      }

      await axios.post('/api/operations/contra', {
        ...contraForm,
        subType: finalCategory,
        fromAccountId: fromId,
        toAccountId: toId,
        amount: Number(contraForm.amount)
      });
      triggerToast('Contra Transfer recorded successfully');
      setContraForm(prev => ({ ...prev, amount: '', refNo: '', remarks: '', customCategory: '' }));
      loadAccounts();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error recording Contra Transfer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReceipt = async (e) => {
    e.preventDefault();
    if (!receiptForm.amount || Number(receiptForm.amount) <= 0) {
      return triggerToast('Please enter a valid receipt amount', 'error');
    }

    let depositId = receiptForm.depositToAccountId;

    if (showCustomAccountField.receiptDeposit) {
      const createdId = await handleCreateInlineAccount('receiptDeposit', 'cash');
      if (!createdId) return;
      depositId = createdId;
    }

    setLoading(true);
    try {
      let cat = receiptForm.category;
      if (receiptForm.category === 'Custom') {
        cat = receiptForm.customCategory || 'Custom Receipt';
        if (receiptForm.customCategory && !receiptCategories.includes(receiptForm.customCategory)) {
          setReceiptCategories(prev => [...prev, receiptForm.customCategory]);
        }
      }

      await axios.post('/api/operations/receipt', {
        ...receiptForm,
        category: cat,
        depositToAccountId: depositId,
        amount: Number(receiptForm.amount)
      });
      triggerToast('Receipt Voucher recorded successfully');
      setReceiptForm(prev => ({ ...prev, amount: '', refNo: '', partyName: '', remarks: '', customCategory: '' }));
      loadAccounts();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error recording Receipt Voucher', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      return triggerToast('Please enter a valid payment amount', 'error');
    }

    let paidFromId = paymentForm.paidFromAccountId;

    if (showCustomAccountField.paymentSource) {
      const createdId = await handleCreateInlineAccount('paymentSource', 'cash');
      if (!createdId) return;
      paidFromId = createdId;
    }

    setLoading(true);
    try {
      let cat = paymentForm.category;
      if (paymentForm.category === 'Custom') {
        cat = paymentForm.customCategory || 'Custom Expense';
        if (paymentForm.customCategory && !paymentCategories.includes(paymentForm.customCategory)) {
          setPaymentCategories(prev => [...prev, paymentForm.customCategory]);
        }
      }

      await axios.post('/api/operations/payment', {
        ...paymentForm,
        category: cat,
        paidFromAccountId: paidFromId,
        amount: Number(paymentForm.amount)
      });
      triggerToast('Payment Voucher recorded successfully');
      setPaymentForm(prev => ({ ...prev, amount: '', refNo: '', partyName: '', remarks: '', customCategory: '' }));
      loadAccounts();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error recording Payment Voucher', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!generalForm.amount || Number(generalForm.amount) <= 0) {
      return triggerToast('Please enter a valid journal amount', 'error');
    }

    let debitId = generalForm.debitAccountId;
    let creditId = generalForm.creditAccountId;

    if (showCustomAccountField.generalDebit) {
      const createdId = await handleCreateInlineAccount('generalDebit', 'expense');
      if (!createdId) return;
      debitId = createdId;
    }
    if (showCustomAccountField.generalCredit) {
      const createdId = await handleCreateInlineAccount('generalCredit', 'bank');
      if (!createdId) return;
      creditId = createdId;
    }

    setLoading(true);
    try {
      let cat = generalForm.category;
      if (generalForm.category === 'Custom') {
        cat = generalForm.customCategory || 'Custom Journal';
        if (generalForm.customCategory && !generalCategories.includes(generalForm.customCategory)) {
          setGeneralCategories(prev => [...prev, generalForm.customCategory]);
        }
      }

      await axios.post('/api/operations/general', {
        ...generalForm,
        category: cat,
        debitAccountId: debitId,
        creditAccountId: creditId,
        amount: Number(generalForm.amount)
      });
      triggerToast('General Journal Voucher recorded successfully');
      setGeneralForm(prev => ({ ...prev, amount: '', refNo: '', partyName: '', remarks: '', customCategory: '' }));
      loadAccounts();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error recording General Voucher', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ArrowRightLeft className="h-6 w-6 text-amber-400" />
            <span>Store Financial Operations & Vouchers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Contra Transfers, Receipt Credits, Expense Payments & GST General Journals.
          </p>
        </div>

        {/* OPERATION TYPE SELECTOR TABS */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
          <button
            onClick={() => setActiveTab('contra')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'contra' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Contra Transfer</span>
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'receipt' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Receipt (Credit)</span>
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'payment' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Payment (Expense)</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'general' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>General (Journal)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONTRA TRANSFER */}
      {/* ========================================================================= */}
      {activeTab === 'contra' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 border-t-4 border-t-amber-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <ArrowRightLeft className="h-5 w-5 text-amber-400" />
                  <span>Contra Voucher (Internal Cash & Bank Transfer)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfer funds between Cash Vault and Bank Accounts.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveContra} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Transfer Date *</label>
                <input
                  type="date"
                  value={contraForm.date}
                  onChange={e => setContraForm({ ...contraForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Contra Entry Head / Type *</label>
                <select
                  value={contraForm.subType}
                  onChange={e => setContraForm({ ...contraForm, subType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {contraCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                  <option value="Custom">+ Custom Contra Entry...</option>
                </select>
              </div>

              {contraForm.subType === 'Custom' && (
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Custom Contra Entry Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom contra name..."
                    value={contraForm.customCategory}
                    onChange={e => setContraForm({ ...contraForm, customCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">From Account (Source) *</label>
                {!showCustomAccountField.contraFrom ? (
                  <select
                    value={contraForm.fromAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, contraFrom: true }));
                        return;
                      }
                      setContraForm({ ...contraForm, fromAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select source account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#f59e0b', fontWeight: 'bold' }}>+ Add Custom Source Account...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom source name..."
                      value={newCustomAccountName.contraFrom}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, contraFrom: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-amber-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('contraFrom', 'cash')}
                      className="px-3 py-2 bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, contraFrom: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">To Account (Destination) *</label>
                {!showCustomAccountField.contraTo ? (
                  <select
                    value={contraForm.toAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, contraTo: true }));
                        return;
                      }
                      setContraForm({ ...contraForm, toAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select destination account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#f59e0b', fontWeight: 'bold' }}>+ Add Custom Destination Account...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom destination name..."
                      value={newCustomAccountName.contraTo}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, contraTo: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-amber-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('contraTo', 'bank')}
                      className="px-3 py-2 bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, contraTo: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter amount..."
                  value={contraForm.amount}
                  onChange={e => setContraForm({ ...contraForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Payment / Transfer Mode</label>
                <select
                  value={contraForm.payMode}
                  onChange={e => setContraForm({ ...contraForm, payMode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer / NEFT / RTGS</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Ref / Cheque / Transaction No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque No..."
                  value={contraForm.refNo}
                  onChange={e => setContraForm({ ...contraForm, refNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Deposited cash to HDFC bank account..."
                  value={contraForm.remarks}
                  onChange={e => setContraForm({ ...contraForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Save Contra Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECEIPT (CREDIT / MONEY IN) */}
      {/* ========================================================================= */}
      {activeTab === 'receipt' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 border-t-4 border-t-emerald-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-855 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
                  <span>Receipt Voucher (Credit / Money In)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record incoming funds (Owner Capital, Customer Credit, Investment).
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveReceipt} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Receipt Date *</label>
                <input
                  type="date"
                  value={receiptForm.date}
                  onChange={e => setReceiptForm({ ...receiptForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Receipt Category / Type *</label>
                <select
                  value={receiptForm.category}
                  onChange={e => setReceiptForm({ ...receiptForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {receiptCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                  <option value="Custom">+ Custom Receipt Head...</option>
                </select>
              </div>

              {receiptForm.category === 'Custom' && (
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Custom Receipt Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom receipt category name..."
                    value={receiptForm.customCategory}
                    onChange={e => setReceiptForm({ ...receiptForm, customCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Deposit To (Cash / Bank) *</label>
                {!showCustomAccountField.receiptDeposit ? (
                  <select
                    value={receiptForm.depositToAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, receiptDeposit: true }));
                        return;
                      }
                      setReceiptForm({ ...receiptForm, depositToAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select receiving account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#10b981', fontWeight: 'bold' }}>+ Add Custom Receiving Account...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom receiving account..."
                      value={newCustomAccountName.receiptDeposit}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, receiptDeposit: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-emerald-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('receiptDeposit', 'bank')}
                      className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, receiptDeposit: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter receipt amount..."
                  value={receiptForm.amount}
                  onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Party / Payer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar..."
                  value={receiptForm.partyName}
                  onChange={e => setReceiptForm({ ...receiptForm, partyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Capital added to shop vault..."
                  value={receiptForm.remarks}
                  onChange={e => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  <span>Save Receipt (Credit)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENT (EXPENSES / MONEY OUT) */}
      {/* ========================================================================= */}
      {activeTab === 'payment' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 border-t-4 border-t-rose-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-855 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <ArrowUpRight className="h-5 w-5 text-rose-400" />
                  <span>Payment Voucher (Expenses / Money Out)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record shop expenses (Rent, Electricity, Salary, Maintenance).
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Expense Category / Head *</label>
                <select
                  value={paymentForm.category}
                  onChange={e => setPaymentForm({ ...paymentForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-semibold"
                >
                  {paymentCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                  <option value="Custom">+ Custom Expense Head...</option>
                </select>
              </div>

              {paymentForm.category === 'Custom' && (
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Custom Expense Name</label>
                  <input
                    type="text"
                    placeholder="Enter expense category name..."
                    value={paymentForm.customCategory}
                    onChange={e => setPaymentForm({ ...paymentForm, customCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Paid From (Cash / Bank) *</label>
                {!showCustomAccountField.paymentSource ? (
                  <select
                    value={paymentForm.paidFromAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, paymentSource: true }));
                        return;
                      }
                      setPaymentForm({ ...paymentForm, paidFromAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select payment source...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#f43f5e', fontWeight: 'bold' }}>+ Add Custom Payment Source...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom payment source..."
                      value={newCustomAccountName.paymentSource}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, paymentSource: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-rose-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('paymentSource', 'cash')}
                      className="px-3 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, paymentSource: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter expense amount..."
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Payee / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Landlord / Vendor Name..."
                  value={paymentForm.partyName}
                  onChange={e => setPaymentForm({ ...paymentForm, partyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Remarks / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly shop rent paid in cash..."
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Save Payment (Expense)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GENERAL (JOURNAL & GST) */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 border-t-4 border-t-sky-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-855 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-sky-400" />
                  <span>General Voucher (GST & Journal Postings)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record GST Inward, GST Outward, Reverse Charge, GST Reversal & Interest Journal entries.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGeneral} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Journal Date *</label>
                <input
                  type="date"
                  value={generalForm.date}
                  onChange={e => setGeneralForm({ ...generalForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Journal Entry Head / Type *</label>
                <select
                  value={generalForm.category}
                  onChange={e => setGeneralForm({ ...generalForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  {generalCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                  <option value="Custom">+ Custom Journal Entry...</option>
                </select>
              </div>

              {generalForm.category === 'Custom' && (
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Custom Journal Entry Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom journal name..."
                    value={generalForm.customCategory}
                    onChange={e => setGeneralForm({ ...generalForm, customCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Debit Account *</label>
                {!showCustomAccountField.generalDebit ? (
                  <select
                    value={generalForm.debitAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, generalDebit: true }));
                        return;
                      }
                      setGeneralForm({ ...generalForm, debitAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select debit account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#0284c7', fontWeight: 'bold' }}>+ Add Custom Debit Account...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom debit account..."
                      value={newCustomAccountName.generalDebit}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, generalDebit: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-sky-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('generalDebit', 'expense')}
                      className="px-3 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, generalDebit: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Credit Account *</label>
                {!showCustomAccountField.generalCredit ? (
                  <select
                    value={generalForm.creditAccountId}
                    onChange={e => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomAccountField(prev => ({ ...prev, generalCredit: true }));
                        return;
                      }
                      setGeneralForm({ ...generalForm, creditAccountId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select credit account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.group.toUpperCase()})</option>
                    ))}
                    <option value="__add_custom__" style={{ color: '#0284c7', fontWeight: 'bold' }}>+ Add Custom Credit Account...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type custom credit account..."
                      value={newCustomAccountName.generalCredit}
                      onChange={e => setNewCustomAccountName(prev => ({ ...prev, generalCredit: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-sky-500 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInlineAccount('generalCredit', 'bank')}
                      className="px-3 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomAccountField(prev => ({ ...prev, generalCredit: false }))}
                      className="px-2 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter journal amount..."
                  value={generalForm.amount}
                  onChange={e => setGeneralForm({ ...generalForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Ref / Invoice No</label>
                <input
                  type="text"
                  placeholder="e.g. GST-INV/2026/001..."
                  value={generalForm.refNo}
                  onChange={e => setGeneralForm({ ...generalForm, refNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Input GST credit claimed on shop expenses..."
                  value={generalForm.remarks}
                  onChange={e => setGeneralForm({ ...generalForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Save General Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operations;
