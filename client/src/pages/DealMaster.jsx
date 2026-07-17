import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toolbar from '../components/Toolbar';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { formatIndianCurrency } from '../utils/format';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Search, 
  X
} from 'lucide-react';

const DealMaster = () => {
  const [toast, setToast] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Masters cache
  const [customers, setCustomers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);

  // Footer Company / Clock details
  const [companyDetails, setCompanyDetails] = useState(null);
  const [time, setTime] = useState(new Date());

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // --- STATE FOR DEAL MASTER ---
  const [deals, setDeals] = useState([]);
  const [dealIndex, setDealIndex] = useState(-1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  
  const [showCustModal, setShowCustModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);

  const [newCustForm, setNewCustForm] = useState({ name: '', mobile: '', city: 'Mumbai', state: 'Maharashtra', interestType: 'simple', interestRate: 2.0 });
  const [newItemForm, setNewItemForm] = useState({ itemName: '', groupId: '' });
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [findSearchQuery, setFindSearchQuery] = useState('');
  const [custSearchFocused, setCustSearchFocused] = useState(false);
  const [custSearchText, setCustSearchText] = useState('');

  const [form, setForm] = useState({
    _id: '',
    dealNo: 'Auto',
    dealDate: new Date().toISOString().split('T')[0],
    refNo: '',
    customerId: '',
    items: [],
    groupTotals: [],
    dealAmount: 0,
    paidPercent: 100,
    paidAmount: 0,
    totalValue: 0,
    interestRatePerMonth: 2.0,
    interestAmountPerMonth: 0,
    returnPeriodMonths: 12,
    payMode: 'cash',
    bankId: '',
    chequeNo: '',
    chequeDate: '',
    location: '',
    remarks: '',
    stopDate: '',
    status: 'active'
  });

  // Print Profile
  const [printProfile, setPrintProfile] = useState(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // --- TIME & COMPANY METRICS LOADER ---
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
      const [custRes, groupRes, catalogRes] = await Promise.all([
        axios.get('/api/customers?limit=1000'),
        axios.get('/api/groups'),
        axios.get('/api/items')
      ]);
      setCustomers(custRes.data.customers);
      setGroups(groupRes.data);
      setItemsCatalog(catalogRes.data);
    } catch (err) {
      triggerToast('Error loading configurations', 'error');
    }
  };

  const loadDealsList = async (selectId = null) => {
    try {
      const res = await axios.get('/api/deals?limit=1000');
      const list = res.data.deals;
      setDeals(list);
      
      if (list.length > 0) {
        let idx = selectId ? list.findIndex(d => d._id === selectId) : 0;
        if (idx === -1) idx = 0;
        setDealIndex(idx);
        fetchDealDetails(list[idx]._id);
      } else {
        handleAddNewDeal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMasters();
    loadDealsList();
  }, []);

  const fetchDealDetails = async (id) => {
    try {
      const res = await axios.get(`/api/deals/${id}`);
      const d = res.data;
      setForm({
        ...d,
        dealDate: d.dealDate ? d.dealDate.split('T')[0] : '',
        chequeDate: d.chequeDate ? d.chequeDate.split('T')[0] : '',
        stopDate: d.stopDate ? d.stopDate.split('T')[0] : '',
        customerId: d.customerId?._id || d.customerId,
        bankId: d.bankId?._id || d.bankId || ''
      });
      setIsEditMode(false);
      setIsNewRecord(false);
    } catch (err) {
      triggerToast('Failed to load deal details', 'error');
    }
  };

  const handleAddItemRow = () => {
    const defaultGroup = groups[0] ? groups[0]._id : '';
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          groupId: defaultGroup, itemName: '', pcs: 1, remarks: '', grossWeight: 0, lessWeight: 0,
          netWeight: 0, purityPercent: 100, pureWeight: 0, rate: 0, estimatedValue: 0, imageUrl: ''
        }
      ]
    }));
  };

  const handleRemoveItemRow = (idx) => {
    const updated = [...form.items];
    updated.splice(idx, 1);
    recomputeTotals(updated);
  };

  const handleRowChange = (idx, field, val) => {
    const updated = [...form.items];
    updated[idx][field] = val;

    if (field === 'grossWeight' || field === 'lessWeight') {
      const gross = Number(updated[idx].grossWeight || 0);
      const less = Number(updated[idx].lessWeight || 0);
      updated[idx].netWeight = parseFloat((gross - less).toFixed(3));
    }

    if (field === 'netWeight' || field === 'purityPercent' || field === 'grossWeight' || field === 'lessWeight') {
      const net = Number(updated[idx].netWeight || 0);
      const purity = Number(updated[idx].purityPercent || 100);
      updated[idx].pureWeight = parseFloat((net * (purity / 100)).toFixed(3));
    }

    if (field === 'pureWeight' || field === 'rate' || field === 'netWeight' || field === 'purityPercent' || field === 'grossWeight' || field === 'lessWeight') {
      const pure = Number(updated[idx].pureWeight || 0);
      const rate = Number(updated[idx].rate || 0);
      updated[idx].estimatedValue = parseFloat((pure * rate).toFixed(2));
    }

    recomputeTotals(updated);
  };

  const recomputeTotals = (updatedItems) => {
    const sumValue = updatedItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
    const rolls = {};
    updatedItems.forEach(item => {
      if (!item.groupId) return;
      const gid = item.groupId.toString();
      if (!rolls[gid]) {
        rolls[gid] = { groupId: item.groupId, grossWeight: 0, lessWeight: 0, netWeight: 0, pureWeight: 0, estimatedValue: 0 };
      }
      rolls[gid].grossWeight += Number(item.grossWeight || 0);
      rolls[gid].lessWeight += Number(item.lessWeight || 0);
      rolls[gid].netWeight += Number(item.netWeight || 0);
      rolls[gid].pureWeight += Number(item.pureWeight || 0);
      rolls[gid].estimatedValue += Number(item.estimatedValue || 0);
    });

    const groupTotals = Object.values(rolls).map(r => ({
      groupId: r.groupId,
      grossWeight: parseFloat(r.grossWeight.toFixed(3)),
      lessWeight: parseFloat(r.lessWeight.toFixed(3)),
      netWeight: parseFloat(r.netWeight.toFixed(3)),
      pureWeight: parseFloat(r.pureWeight.toFixed(3)),
      estimatedValue: parseFloat(r.estimatedValue.toFixed(2))
    }));

    setForm(prev => {
      const next = {
        ...prev,
        items: updatedItems,
        groupTotals,
        totalValue: parseFloat(sumValue.toFixed(2)),
        dealAmount: parseFloat(sumValue.toFixed(2))
      };
      const pct = Number(prev.paidPercent || 100);
      next.paidAmount = parseFloat((next.dealAmount * (pct / 100)).toFixed(2));
      next.interestAmountPerMonth = parseFloat((next.dealAmount * (prev.interestRatePerMonth / 100)).toFixed(2));
      return next;
    });
  };

  const handleFinancialChange = (field, val) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'dealAmount' || field === 'paidPercent') {
        const amt = Number(next.dealAmount || 0);
        const pct = Number(next.paidPercent || 100);
        next.paidAmount = parseFloat((amt * (pct / 100)).toFixed(2));
      }
      if (field === 'paidAmount' && Number(next.dealAmount || 0) > 0) {
        const amt = Number(next.dealAmount || 0);
        const paid = Number(next.paidAmount || 0);
        next.paidPercent = parseFloat(((paid / amt) * 100).toFixed(2));
      }
      if (field === 'dealAmount' || field === 'interestRatePerMonth') {
        const amt = Number(next.dealAmount || 0);
        const rate = Number(next.interestRatePerMonth || 2.0);
        next.interestAmountPerMonth = parseFloat((amt * (rate / 100)).toFixed(2));
      }
      return next;
    });
  };

  const handleCustomerChange = (customerId) => {
    const cust = customers.find(c => c._id === customerId);
    setForm(prev => ({
      ...prev,
      customerId,
      interestRatePerMonth: cust ? cust.interestRate : prev.interestRatePerMonth
    }));
    handleFinancialChange('interestRatePerMonth', cust ? cust.interestRate : form.interestRatePerMonth);
  };

  const handleAddNewDeal = () => {
    const yy = new Date().getFullYear().toString().slice(-2);
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const autoRef = `REF-${yy}${mm}-${rand}`;
    setForm({
      _id: '', dealNo: 'Auto', dealDate: new Date().toISOString().split('T')[0], refNo: autoRef,
      customerId: '', items: [], groupTotals: [], dealAmount: 0,
      paidPercent: 100, paidAmount: 0, totalValue: 0, interestRatePerMonth: 2.0, interestAmountPerMonth: 0,
      returnPeriodMonths: 12, payMode: 'cash', bankId: '', chequeNo: '',
      chequeDate: '', location: '', remarks: '', stopDate: '', status: 'active'
    });
    setIsEditMode(true);
    setIsNewRecord(true);
    setTimeout(() => handleAddItemRow(), 50);
  };

  const handleSaveDeal = async () => {
    if (!form.customerId || !form.dealAmount) {
      triggerToast('Customer and Deal Amount are required', 'error');
      return;
    }
    try {
      if (isNewRecord) {
        const res = await axios.post('/api/deals', form);
        triggerToast('Deal saved');
        loadDealsList(res.data._id);
      } else {
        const res = await axios.put(`/api/deals/${form._id}`, form);
        triggerToast('Deal updated');
        loadDealsList(res.data._id);
      }
    } catch (err) {
      triggerToast('Error saving deal', 'error');
    }
  };

  const handleDeleteDeal = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDeleteDeal = async () => {
    setConfirmDeleteOpen(false);
    try {
      await axios.delete(`/api/deals/${form._id}`);
      triggerToast('Deal deleted');
      loadDealsList();
    } catch (err) {
      triggerToast('Error deleting deal', 'error');
    }
  };

  const handleCopyDeal = async (copyId) => {
    try {
      const res = await axios.get(`/api/deals/copy/${copyId}`);
      setForm(prev => ({
        ...prev,
        ...res.data,
        dealNo: 'Auto',
        dealDate: new Date().toISOString().split('T')[0],
        _id: ''
      }));
      setShowCopyModal(false);
      triggerToast('Copied deal configuration');
    } catch (err) {
      triggerToast('Error copying deal', 'error');
    }
  };

  const handleItemImageUpload = async (idx, file) => {
    if (!file) return;
    const data = new FormData();
    data.append('itemImage', file);
    try {
      const res = await axios.post('/api/deals/upload-item-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleRowChange(idx, 'imageUrl', res.data.imageUrl);
      triggerToast('Collateral image uploaded');
    } catch (err) {
      triggerToast('Image upload failed', 'error');
    }
  };

  const handleDealPrint = async () => {
    try {
      const res = await axios.get(`/api/deals/${form._id}/print`);
      setPrintProfile(res.data);
      setIsPrintMode(true);
      setTimeout(() => {
        window.print();
        setIsPrintMode(false);
      }, 300);
    } catch (err) {
      triggerToast('Error preparing receipt print', 'error');
    }
  };

  const handleQuickCreateCust = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/customers', {
        ...newCustForm,
        companyId: companyDetails?._id
      });
      triggerToast('Borrower created');
      const custRes = await axios.get('/api/customers?limit=1000');
      setCustomers(custRes.data.customers);
      handleCustomerChange(res.data._id);
      setShowCustModal(false);
    } catch (err) {
      triggerToast('Error creating borrower', 'error');
    }
  };

  const handleQuickCreateItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/items', newItemForm);
      triggerToast('Catalog item added');
      const catalogRes = await axios.get('/api/items');
      setItemsCatalog(catalogRes.data);
      setShowItemModal(false);
    } catch (err) {
      triggerToast('Error adding catalog item', 'error');
    }
  };

  const getFilteredItems = (groupId) => {
    if (!groupId) return [];
    return itemsCatalog.filter(it => (it.groupId?._id || it.groupId) === groupId);
  };

  const handlePrev = () => {
    if (dealIndex > 0) {
      const nextIdx = dealIndex - 1;
      setDealIndex(nextIdx);
      fetchDealDetails(deals[nextIdx]._id);
    }
  };

  const handleNext = () => {
    if (dealIndex < deals.length - 1) {
      const nextIdx = dealIndex + 1;
      setDealIndex(nextIdx);
      fetchDealDetails(deals[nextIdx]._id);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setIsNewRecord(false);
    if (deals.length > 0 && dealIndex !== -1) fetchDealDetails(deals[dealIndex]._id);
    else handleAddNewDeal();
  };

  if (isPrintMode && printProfile) {
    const { deal: pd, company: pc, terms: pt } = printProfile;
    return (
      <div className="print-area p-8 text-black bg-white min-h-screen text-xs">
        <div className="flex justify-between items-center border-b border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">{pc.name}</h1>
            <p>{pc.address}, {pc.city} - {pc.pin}</p>
            <p>Ph: {pc.phone} | GSTIN: {pc.gstin}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold border border-black px-3 py-1 uppercase">{pd.dealNo}</h2>
            <p className="mt-1">Date: {new Date(pd.dealDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="my-6 grid grid-cols-2 gap-4 border border-black p-4 rounded text-sm">
          <div>
            <h3 className="font-bold text-xs uppercase text-slate-500 mb-1">Borrower Details</h3>
            <p className="font-bold">{pd.customerId?.name}</p>
            <p>{pd.customerId?.address}, {pd.customerId?.area}</p>
            <p>{pd.customerId?.city}, {pd.customerId?.state} - {pd.customerId?.pin}</p>
            <p className="font-mono">Mobile: {pd.customerId?.mobile}</p>
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase text-slate-500 mb-1">Pledge Specifications</h3>
            <p>Loan Amount: <span className="font-bold">₹{formatIndianCurrency(pd.dealAmount)}</span></p>
            <p>Pledge Date: {new Date(pd.dealDate).toLocaleDateString()}</p>
            <p>Return Period: {pd.returnPeriodMonths} Months</p>
            <p>Interest: {pd.interestRatePerMonth}% per month (₹{formatIndianCurrency(pd.interestAmountPerMonth)}/mo)</p>
          </div>
        </div>
        <table className="w-full text-left border-collapse border border-black text-[11px] font-mono">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-semibold text-xs">
              <th className="p-2 border-r border-black font-sans">S.No</th>
              <th className="p-2 border-r border-black font-sans">Metal</th>
              <th className="p-2 border-r border-black font-sans">Item</th>
              <th className="p-2 border-r border-black text-right font-sans">Pcs</th>
              <th className="p-2 border-r border-black text-right">Gross Wt</th>
              <th className="p-2 border-r border-black text-right">Less Wt</th>
              <th className="p-2 border-r border-black text-right">Net Wt</th>
              <th className="p-2 border-r border-black text-right">Purity %</th>
              <th className="p-2 border-r border-black text-right">Pure Wt</th>
              <th className="p-2 text-right font-sans">Estimate Value</th>
            </tr>
          </thead>
          <tbody>
            {pd.items.map((it, i) => (
              <tr key={i} className="border-b border-black">
                <td className="p-2 border-r border-black">{i + 1}</td>
                <td className="p-2 border-r border-black font-sans">{it.groupId?.groupName}</td>
                <td className="p-2 border-r border-black font-sans">{it.itemName}</td>
                <td className="p-2 border-r border-black text-right">{it.pcs}</td>
                <td className="p-2 border-r border-black text-right">{it.grossWeight?.toFixed(3)}g</td>
                <td className="p-2 border-r border-black text-right">{it.lessWeight?.toFixed(3)}g</td>
                <td className="p-2 border-r border-black text-right">{it.netWeight?.toFixed(3)}g</td>
                <td className="p-2 border-r border-black text-right">{it.purityPercent}%</td>
                <td className="p-2 border-r border-black text-right">{it.pureWeight?.toFixed(3)}g</td>
                <td className="p-2 text-right">₹{formatIndianCurrency(it.estimatedValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Deal Master</h1>
          <p className="text-slate-400 text-sm mt-1 font-sans font-medium">Issue pledge loans and register dynamic metal collaterals details.</p>
        </div>
      </div>

      <Toolbar
        onPrev={handlePrev}
        onNext={handleNext}
        onFind={() => setShowFindModal(true)}
        onAdd={handleAddNewDeal}
        onEdit={() => setIsEditMode(true)}
        onSave={handleSaveDeal}
        onPrint={handleDealPrint}
        onCancel={handleCancel}
        isEditMode={isEditMode}
        hasPrev={dealIndex > 0}
        hasNext={dealIndex < deals.length - 1}
        showDelete={false}
      />

      <div className="space-y-6 no-print">
        
        {/* Deal Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-855 pb-2">
            <h3 className="text-sm font-bold text-slate-350 uppercase">Deal Parameters</h3>
            <div className="flex space-x-2 text-xs">
              <span className="bg-slate-950 px-3 py-1 rounded-md text-amber-500 font-bold border border-slate-855 font-mono">
                Deal No: {form.dealNo}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2 relative">
              <label className="block text-slate-400 font-semibold mb-1">Customer * (Search by name, ID, contact)</label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="Type name, mobile, or code to search..."
                    value={custSearchText}
                    onChange={(e) => {
                      setCustSearchText(e.target.value);
                      setCustSearchFocused(true);
                      if (e.target.value === '') {
                        setForm(prev => ({ ...prev, customerId: '' }));
                      }
                    }}
                    onFocus={() => {
                      setCustSearchFocused(true);
                      setCustSearchText('');
                    }}
                    onBlur={() => {
                      setTimeout(() => setCustSearchFocused(false), 250);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500"
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
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
                <span>Ref No.</span>
                <span className="text-[10px] text-primary-400 font-mono">(auto-generated, editable)</span>
              </label>
              <input
                type="text"
                disabled={!isEditMode}
                value={form.refNo}
                onChange={(e) => setForm({ ...form, refNo: e.target.value })}
                placeholder="REF-..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none disabled:opacity-60 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Date *</label>
              <input
                type="date"
                required
                disabled={!isEditMode || currentUser?.role !== 'admin'}
                value={form.dealDate}
                onChange={(e) => handleFinancialChange('dealDate', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Detail grid */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-sm font-bold text-slate-350 uppercase">Group Detail</h3>
            {isEditMode && (
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center space-x-1 px-3 py-1.5 bg-primary-600/10 border border-primary-500/20 text-primary-400 rounded-lg text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item row</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2 px-3">S.No</th>
                  <th className="py-2 px-1 w-44">Group</th>
                  <th className="py-2 px-1 w-48">Item Name</th>
                  <th className="py-2 px-1 w-16 text-right">Pcs</th>
                  <th className="py-2 px-1 w-48">Remarks</th>
                  <th className="py-2 px-1 w-24 text-right">Gross Wt.</th>
                  <th className="py-2 px-1 w-24 text-right">Less Wt.</th>
                  <th className="py-2 px-1 w-24 text-right">Net Wt.</th>
                  <th className="py-2 px-1 w-20 text-right">Purity %</th>
                  <th className="py-2 px-1 w-24 text-right">Pure Wt.</th>
                  <th className="py-2 px-1 w-24 text-right">Rate</th>
                  <th className="py-2 px-1 w-32 text-right">Estimated Value</th>
                  <th className="py-2 px-1 w-20 text-center">Image</th>
                  {isEditMode && <th className="py-2 px-1 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="py-6 text-center text-slate-500">No items configured. Click 'Add Item row'.</td>
                  </tr>
                ) : (
                  form.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/20 text-slate-200">
                      <td className="py-2 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                      
                      <td className="py-1 px-1">
                        <select
                          disabled={!isEditMode}
                          value={item.groupId}
                          onChange={(e) => handleRowChange(idx, 'groupId', e.target.value)}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded focus:outline-none text-[11px]"
                        >
                          {groups.map(g => (
                            <option key={g._id} value={g._id}>{g.groupName}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-1 px-1">
                        <select
                          disabled={!isEditMode}
                          value={item.itemName}
                          onChange={(e) => handleRowChange(idx, 'itemName', e.target.value)}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded focus:outline-none text-[11px]"
                        >
                          <option value="">Select item...</option>
                          {getFilteredItems(item.groupId).map(catalogItem => (
                            <option key={catalogItem._id} value={catalogItem.itemName}>
                              {catalogItem.itemName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="number"
                          disabled={!isEditMode}
                          value={item.pcs}
                          onChange={(e) => handleRowChange(idx, 'pcs', Number(e.target.value))}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded text-right focus:outline-none font-mono text-[11px]"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={item.remarks}
                          onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                          placeholder="Notes"
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded focus:outline-none text-[11px] text-slate-100"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="0.001"
                          disabled={!isEditMode}
                          value={item.grossWeight}
                          onChange={(e) => handleRowChange(idx, 'grossWeight', Number(e.target.value))}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded text-right focus:outline-none font-mono text-[11px]"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="0.001"
                          disabled={!isEditMode}
                          value={item.lessWeight}
                          onChange={(e) => handleRowChange(idx, 'lessWeight', Number(e.target.value))}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded text-right focus:outline-none font-mono text-[11px]"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="text"
                          disabled
                          value={item.netWeight?.toFixed(3)}
                          className="w-full p-1 bg-slate-950 border border-slate-855 rounded text-right font-mono text-[11px] text-slate-400"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="0.1"
                          disabled={!isEditMode}
                          value={item.purityPercent}
                          onChange={(e) => handleRowChange(idx, 'purityPercent', Number(e.target.value))}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded text-right focus:outline-none font-mono text-[11px]"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="text"
                          disabled
                          value={item.pureWeight?.toFixed(3)}
                          className="w-full p-1 bg-slate-950 border border-slate-855 rounded text-right font-mono text-[11px] text-slate-400"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="number"
                          disabled={!isEditMode}
                          value={item.rate}
                          onChange={(e) => handleRowChange(idx, 'rate', Number(e.target.value))}
                          className="w-full p-1 bg-slate-900 border border-slate-800 rounded text-right focus:outline-none font-mono text-[11px]"
                        />
                      </td>

                      <td className="py-1 px-1">
                        <input
                          type="text"
                          disabled
                          value={`₹${formatIndianCurrency(item.estimatedValue)}`}
                          className="w-full p-1 bg-slate-955 border border-slate-855 rounded text-right font-mono text-[11px] text-slate-400"
                        />
                      </td>

                      <td className="py-1 px-1 text-center">
                        {item.imageUrl ? (
                          <div className="relative inline-block border border-slate-850 rounded overflow-hidden h-7 w-10 bg-slate-955 group">
                            <img src={`${item.imageUrl}`} alt="collateral" className="h-full w-full object-cover" />
                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() => handleRowChange(idx, 'imageUrl', '')}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 transition-opacity"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          isEditMode && (
                            <label className="flex items-center justify-center p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded cursor-pointer transition-colors w-10 mx-auto">
                              <Upload className="h-3.5 w-3.5 text-primary-400" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleItemImageUpload(idx, e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          )
                        )}
                      </td>

                      {isEditMode && (
                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1 text-rose-500 hover:text-rose-455"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Group Gross Totals intentionally removed per business requirements */}

        {/* Bottom accounting blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 lg:col-span-3 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Deal Amount : *</label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={form.dealAmount}
                  onChange={(e) => handleFinancialChange('dealAmount', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Int. Rate/Mnth % :</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isEditMode}
                  value={form.interestRatePerMonth}
                  onChange={(e) => handleFinancialChange('interestRatePerMonth', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Int. Amt/Mnth :</label>
                <input
                  type="text"
                  disabled
                  value={form.interestAmountPerMonth?.toFixed(2)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg text-sm text-slate-400 font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Return Period : *</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={!isEditMode}
                    value={form.returnPeriodMonths}
                    onChange={(e) => handleFinancialChange('returnPeriodMonths', Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none"
                  />
                  <span className="text-slate-500 font-semibold">Month</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Cash/Bank :</label>
                <select
                  disabled={!isEditMode}
                  value={form.payMode}
                  onChange={(e) => setForm({ ...form, payMode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-350 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Cheque No. :</label>
                <input
                  type="text"
                  disabled={!isEditMode || form.payMode === 'cash'}
                  value={form.chequeNo}
                  onChange={(e) => setForm({ ...form, chequeNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono disabled:opacity-30 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 font-sans">Location :</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Vault location tag"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
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
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-850 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200">Quick Add Borrower</h3>
              <button onClick={() => setShowCustModal(false)} className="text-slate-400 hover:text-slate-250">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCreateCust} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Borrower Name *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Mobile No *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.mobile}
                  onChange={(e) => setNewCustForm({ ...newCustForm, mobile: e.target.value })}
                  placeholder="Mobile"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE CATALOG ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-855 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200">Create Catalog Item</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-255">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItemForm.itemName}
                  onChange={(e) => setNewItemForm({ ...newItemForm, itemName: e.target.value })}
                  placeholder="Item name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Metal Group *</label>
                <select
                  required
                  value={newItemForm.groupId}
                  onChange={(e) => setNewItemForm({ ...newItemForm, groupId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-355 focus:outline-none"
                >
                  <option value="">Select group...</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.groupName}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg"
              >
                Create Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COPY DEAL MODAL */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-850 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-855 pb-2">
              <h3 className="text-base font-bold text-slate-200">Copy Configuration from Deal</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-slate-400 hover:text-slate-250">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={copySearchQuery}
                onChange={(e) => setCopySearchQuery(e.target.value)}
                placeholder="Search deal..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-900 pr-1">
              {deals
                .filter(d => 
                  String(d.dealNo).includes(copySearchQuery) || 
                  d.customerId?.name?.toLowerCase().includes(copySearchQuery.toLowerCase()) ||
                  (d.customerId?.idProofNumber && d.customerId.idProofNumber.toLowerCase().includes(copySearchQuery.toLowerCase()))
                )
                .map(d => (
                  <button
                    key={d._id}
                    onClick={() => handleCopyDeal(d._id)}
                    className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-350 hover:text-white rounded-lg text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold block">{d.customerId?.name}</span>
                      <span className="text-[10px] text-slate-500">Amount: ₹{formatIndianCurrency(d.dealAmount)}</span>
                    </div>
                    <span className="font-mono text-amber-500 text-[10px] font-bold">#{d.dealNo}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* DEALS FIND MODAL */}
      {showFindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-850 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-855 pb-2">
              <h3 className="text-base font-bold text-slate-200">Find Gold Deal</h3>
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
                placeholder="Search deal..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-900 pr-1">
              {deals
                .filter(d => 
                  String(d.dealNo).includes(findSearchQuery) || 
                  d.customerId?.name?.toLowerCase().includes(findSearchQuery.toLowerCase()) ||
                  (d.customerId?.idProofNumber && d.customerId.idProofNumber.toLowerCase().includes(findSearchQuery.toLowerCase()))
                )
                .map(d => (
                  <button
                    key={d._id}
                    onClick={() => {
                      const idx = deals.findIndex(item => item._id === d._id);
                      setDealIndex(idx);
                      fetchDealDetails(d._id);
                      setShowFindModal(false);
                      setFindSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-350 hover:text-white rounded-lg text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold block">{d.customerId?.name}</span>
                      <span className="text-[10px] text-slate-500">Date: {new Date(d.dealDate).toLocaleDateString()}</span>
                    </div>
                    <span className="font-mono text-amber-500 text-[10px] font-bold">#{d.dealNo}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        title="Delete Deal"
        message="Are you sure you want to delete this deal master record?"
        onConfirm={handleConfirmDeleteDeal}
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

export default DealMaster;
