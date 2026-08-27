import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { formatIndianCurrency } from '../utils/format';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Search, 
  X,
  Save,
  Printer,
  Edit2,
  XSquare
} from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const baseUrl = axios.defaults.baseURL || '';
  const base = baseUrl.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

// Allow only digits and a single decimal point while typing, keeping the raw
// string so intermediate values like "0." or "12." are preserved. Downstream
// calculations coerce with Number(), and the payload is normalised before save.
const sanitizeNumericInput = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  let cleaned = String(raw).replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
};

// Coerce a possibly-string numeric field to a real number for the API payload.
const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

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
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const [newCustForm, setNewCustForm] = useState({ name: '', mobile: '', city: 'Mumbai', state: 'Maharashtra', interestType: 'simple', interestRate: 2.0 });
  const [newItemForm, setNewItemForm] = useState({ itemName: '', groupId: '' });
  const [newGroupForm, setNewGroupForm] = useState({ groupName: '', defaultRate: 0 });
  const [activeRowIndex, setActiveRowIndex] = useState(-1);
  const [copySearchQuery, setCopySearchQuery] = useState('');

  // Separate customer lookup fields (Name / Mobile / ID). Selecting any one fills the rest.
  const [custNameText, setCustNameText] = useState('');
  const [custMobileText, setCustMobileText] = useState('');
  const [custIdText, setCustIdText] = useState('');
  const [custFocusField, setCustFocusField] = useState(null); // 'name' | 'mobile' | 'id' | null
  const [custDropdownIdx, setCustDropdownIdx] = useState(-1); // keyboard highlight index

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

  const [defaultSettings, setDefaultSettings] = useState({
    defaultArea: '',
    defaultCity: 'Mumbai',
    defaultState: 'Maharashtra',
    defaultCountry: 'India'
  });

  // --- TIME & COMPANY METRICS LOADER ---
  const fetchActiveCompany = async () => {
    try {
      const userRes = await axios.get('/api/auth/me');
      setCurrentUser(userRes.data);
      const compListRes = await axios.get('/api/companies');
      let activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
      if (!activeComp && compListRes.data.length > 0) {
        activeComp = compListRes.data[0];
      }
      setCompanyDetails(activeComp);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDefaultSettings = async () => {
    try {
      const res = await axios.get('/api/settings/girvi');
      if (res.data) {
        const defaults = {
          defaultArea: res.data.defaultArea || '',
          defaultCity: res.data.defaultCity || 'Mumbai',
          defaultState: res.data.defaultState || 'Maharashtra',
          defaultCountry: res.data.defaultCountry || 'India'
        };
        setDefaultSettings(defaults);
        setNewCustForm(prev => ({
          ...prev,
          area: defaults.defaultArea,
          city: defaults.defaultCity,
          state: defaults.defaultState,
          country: defaults.defaultCountry
        }));
      }
    } catch (err) {
      console.error('Error loading location defaults:', err);
    }
  };

  useEffect(() => {
    fetchActiveCompany();
    fetchDefaultSettings();
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

  // Apply a full customer selection to all lookup fields & auto-populate location/address
  const applyCustomerSelection = (c) => {
    handleCustomerChange(c._id);
    setCustNameText(c.name || '');
    setCustMobileText(c.mobile || '');
    setCustIdText(c.idProofNumber || (c.customerCode ? String(c.customerCode) : ''));
    
    const fullAddr = [c.address, c.area, c.city, c.state].filter(Boolean).join(', ');
    setForm(prev => ({
      ...prev,
      customerId: c._id,
      location: fullAddr || prev.location
    }));
    
    setCustFocusField(null);
    setCustDropdownIdx(-1);
  };

  // Keyboard navigation helper for customer dropdowns
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
      if (list[idx]) applyCustomerSelection(list[idx]);
    } else if (e.key === 'Escape') {
      setCustFocusField(null);
      setCustDropdownIdx(-1);
    }
  };

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

  const location = useLocation();

  const loadDealsList = async () => {
    try {
      const res = await axios.get('/api/deals?limit=1000');
      const list = res.data.deals || [];
      setDeals(list);

      const targetDeal = location.state?.dealNo || location.state?.dealId;
      if (targetDeal) {
        const found = list.find(d => 
          String(d.dealNo).toLowerCase() === String(targetDeal).toLowerCase() ||
          String(d.refNo).toLowerCase() === String(targetDeal).toLowerCase() ||
          String(d._id) === String(targetDeal)
        );
        if (found) {
          await fetchDealDetails(found._id);
          const idx = list.findIndex(d => d._id === found._id);
          if (idx !== -1) setDealIndex(idx);
          return;
        }
      }

      // Otherwise keep form ready for new record entry
      await handleAddNewDeal();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadMasters();
      await loadDealsList();
    };
    init();
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
          groupId: defaultGroup, itemName: '', pcs: 1, remarks: '', grossWeight: '', lessWeight: '',
          netWeight: 0, purityPercent: 100, pureWeight: 0, rate: '', estimatedValue: 0, imageUrl: ''
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

  const handleAddNewDeal = async () => {
    const yy = new Date().getFullYear().toString().slice(-2);
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const autoRef = `REF-${yy}${mm}-${rand}`;
    let nextDealNo = 'Loading...';
    try {
      const res = await axios.get('/api/deals/next-number');
      nextDealNo = res.data.dealNo;
    } catch (err) {
      console.error('Could not preview the next deal number', err);
    }

    const defaultGroup = groups[0]?._id || '';
    setForm({
      _id: '', dealNo: nextDealNo, dealDate: new Date().toISOString().split('T')[0], refNo: autoRef,
      customerId: '',
      items: [{
        groupId: defaultGroup, itemName: '', pcs: 1, remarks: '', grossWeight: '', lessWeight: '',
        netWeight: 0, purityPercent: 100, pureWeight: 0, rate: '', estimatedValue: 0, imageUrl: ''
      }],
      groupTotals: [], dealAmount: 0,
      paidPercent: 100, paidAmount: 0, totalValue: 0, interestRatePerMonth: 2.0, interestAmountPerMonth: 0,
      returnPeriodMonths: 12, payMode: 'cash', bankId: '', chequeNo: '',
      chequeDate: '', location: '', remarks: '', stopDate: '', status: 'active'
    });
    setDealIndex(-1);
    setIsEditMode(true);
    setIsNewRecord(true);
  };

  const handleSaveDeal = async () => {
    if (!form.customerId || !form.dealAmount) {
      triggerToast('Customer and Deal Amount are required', 'error');
      return;
    }
    const payload = {
      ...form,
      dealAmount: toNumber(form.dealAmount),
      paidPercent: toNumber(form.paidPercent),
      paidAmount: toNumber(form.paidAmount),
      totalValue: toNumber(form.totalValue),
      interestRatePerMonth: toNumber(form.interestRatePerMonth),
      interestAmountPerMonth: toNumber(form.interestAmountPerMonth),
      returnPeriodMonths: toNumber(form.returnPeriodMonths),
      items: (form.items || []).map((it) => ({
        ...it,
        pcs: toNumber(it.pcs),
        grossWeight: toNumber(it.grossWeight),
        lessWeight: toNumber(it.lessWeight),
        netWeight: toNumber(it.netWeight),
        purityPercent: toNumber(it.purityPercent),
        pureWeight: toNumber(it.pureWeight),
        rate: toNumber(it.rate),
        estimatedValue: toNumber(it.estimatedValue),
      })),
    };
    try {
      if (!form._id) {
        // New deal
        const res = await axios.post('/api/deals', payload);
        triggerToast('Deal saved successfully!');
        // Refresh deal list for copy/reference
        const listRes = await axios.get('/api/deals?limit=1000');
        setDeals(listRes.data.deals);
        // Auto-reset to a fresh new deal form
        await handleAddNewDeal();
      } else {
        // Update existing deal
        const res = await axios.put(`/api/deals/${form._id}`, payload);
        triggerToast('Deal updated successfully!');
        // After update, reset to new deal ready state
        const listRes = await axios.get('/api/deals?limit=1000');
        setDeals(listRes.data.deals);
        await handleAddNewDeal();
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
    if (!form._id) {
      triggerToast('Save the deal before printing', 'error');
      return;
    }
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
      const res = await axios.post('/api/items', newItemForm);
      triggerToast('Catalog item added');
      const catalogRes = await axios.get('/api/items');
      setItemsCatalog(catalogRes.data);
      if (activeRowIndex !== -1) {
        handleRowChange(activeRowIndex, 'itemName', res.data.itemName);
      }
      setShowItemModal(false);
      setActiveRowIndex(-1);
    } catch (err) {
      triggerToast('Error adding catalog item', 'error');
    }
  };

  const handleQuickCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/groups', newGroupForm);
      triggerToast('Metal group added');
      const groupRes = await axios.get('/api/groups');
      setGroups(groupRes.data);
      if (activeRowIndex !== -1) {
        handleRowChange(activeRowIndex, 'groupId', res.data._id);
      }
      setShowGroupModal(false);
      setActiveRowIndex(-1);
    } catch (err) {
      triggerToast('Error adding metal group', 'error');
    }
  };

  const getFilteredItems = (groupId) => {
    if (!groupId) return itemsCatalog;
    const targetGroupId = typeof groupId === 'object' ? (groupId._id || groupId) : groupId;
    const filtered = itemsCatalog.filter(it => {
      const itGroupId = it.groupId?._id || it.groupId;
      return String(itGroupId) === String(targetGroupId);
    });
    return filtered.length > 0 ? filtered : itemsCatalog;
  };

  const handleEdit = () => {
    if (!form._id) {
      triggerToast('Add a new deal or load an existing one to edit', 'error');
      return;
    }
    setIsEditMode(true);
    setIsNewRecord(false);
  };

  const handleCancel = () => {
    setIsNewRecord(false);
    if (deals.length > 0) {
      const idx = dealIndex >= 0 ? dealIndex : 0;
      setDealIndex(idx);
      fetchDealDetails(deals[idx]._id); // resets isEditMode/isNewRecord to false
    } else {
      // No saved deals yet: exit edit mode and clear the form
      setIsEditMode(false);
    }
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

      <div className="space-y-6 no-print">
        
        {/* Deal Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-855 pb-2">
            <h3 className="text-sm font-bold text-slate-350 uppercase">Deal Parameters</h3>
            <div className="flex space-x-2 text-xs">
              {companyDetails?.financialYearStart && (
                <span className="bg-primary-600/10 px-3 py-1 rounded-md text-primary-400 font-bold border border-primary-600/20 font-mono">
                  FY {(() => {
                    const s = new Date(companyDetails.financialYearStart);
                    const e = new Date(companyDetails.financialYearEnd || companyDetails.financialYearStart);
                    return `${s.getFullYear()}-${String(e.getFullYear() % 100).padStart(2, '0')}`;
                  })()}
                </span>
              )}
              <span className="bg-slate-950 px-3 py-1 rounded-md text-amber-500 font-bold border border-slate-855 font-mono">
                Deal No: {form.dealNo}
              </span>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowCopyModal(true)}
                  className="px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-400 rounded-md font-semibold transition-all"
                >
                  Copy from deal
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            {/* Customer Name lookup */}
            <div className="relative">
              <label className="block text-slate-400 font-semibold mb-1">Customer Name *</label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    disabled={false}
                    placeholder="Search by name..."
                    value={custNameText}
                    onChange={(e) => {
                      setCustNameText(e.target.value);
                      setCustFocusField('name');
                      setCustDropdownIdx(-1);
                      if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '' }));
                    }}
                    onFocus={() => setCustFocusField('name')}
                    onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                    onKeyDown={(e) => handleCustKeyDown(e, 'name')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500"
                  />
                  {isEditMode && custFocusField === 'name' && (() => {
                    const list = getFilteredCustomers('name');
                    if (!list.length) return <div className="absolute left-0 right-0 mt-1 bg-slate-955 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 text-xs text-slate-500 italic">No matching customers</div>;
                    return (
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-955 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                        {list.map((c, i) => (
                          <div
                            key={c._id}
                            onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                            onTouchStart={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                            className={`p-3 text-xs cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
                          >
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{c.mobile || 'No mobile'}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Customer Mobile lookup */}
            <div className="relative">
              <label className="block text-slate-400 font-semibold mb-1">Mobile No.</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={false}
                  placeholder="Search by mobile..."
                  value={custMobileText}
                  onChange={(e) => {
                    setCustMobileText(e.target.value);
                    setCustFocusField('mobile');
                    setCustDropdownIdx(-1);
                    if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '' }));
                  }}
                  onFocus={() => setCustFocusField('mobile')}
                  onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                  onKeyDown={(e) => handleCustKeyDown(e, 'mobile')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-mono"
                />
                {isEditMode && custFocusField === 'mobile' && (() => {
                  const list = getFilteredCustomers('mobile');
                  if (!list.length) return null;
                  return (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-955 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                      {list.map((c, i) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          onTouchStart={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          className={`p-3 text-xs cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
                        >
                          <span className="font-mono text-slate-200">{c.mobile}</span>
                          <span className="text-[10px] text-slate-400">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer ID lookup */}
            <div className="relative">
              <label className="block text-slate-400 font-semibold mb-1">Customer ID</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={false}
                  placeholder="Search by ID / code..."
                  value={custIdText}
                  onChange={(e) => {
                    setCustIdText(e.target.value);
                    setCustFocusField('id');
                    setCustDropdownIdx(-1);
                    if (e.target.value === '') setForm(prev => ({ ...prev, customerId: '' }));
                  }}
                  onFocus={() => setCustFocusField('id')}
                  onBlur={() => setTimeout(() => { setCustFocusField(null); setCustDropdownIdx(-1); }, 250)}
                  onKeyDown={(e) => handleCustKeyDown(e, 'id')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500 font-mono"
                />
                {isEditMode && custFocusField === 'id' && (() => {
                  const list = getFilteredCustomers('id');
                  if (!list.length) return null;
                  return (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-955 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-850">
                      {list.map((c, i) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          onTouchStart={(e) => { e.preventDefault(); applyCustomerSelection(c); }}
                          className={`p-3 text-xs cursor-pointer flex justify-between items-center ${i === custDropdownIdx ? 'bg-primary-700/40 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
                        >
                          <span className="font-mono text-slate-200">{c.idProofNumber || `#${c.customerCode}`}</span>
                          <span className="text-[10px] text-slate-400">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Ref No (auto-generated, non-editable) */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
                <span>Ref No.</span>
                <span className="text-[10px] text-primary-400 font-mono">(auto-generated)</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={form.refNo}
                placeholder="REF-..."
                className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-lg text-sm text-slate-400 focus:outline-none font-mono cursor-not-allowed"
              />
            </div>

            {/* Deal Date (past/present date selector) */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Deal Date *</label>
              <input
                type="date"
                disabled={!isEditMode}
                value={form.dealDate}
                onChange={(e) => setForm(prev => ({ ...prev, dealDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-primary-500 font-mono disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Side-by-Side Compact Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT COLUMN: Group & Item Details (col-span-7) */}
          <div className="lg:col-span-7 glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-855 pb-2">
              <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Group &amp; Item Details</h3>
            </div>

            <div className="space-y-3">
              {form.items.length === 0 ? (
                <div className="py-6 text-center text-slate-500 bg-slate-900/10 border border-slate-800/40 rounded-xl text-xs">
                  No items configured. Click '+ Add Group / Item'.
                </div>
              ) : (
                form.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 space-y-2 relative hover:border-slate-700/60 transition-all">
                    {/* Item Header */}
                    <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                      <span className="text-[11px] font-bold text-amber-500 font-mono">Item #{idx + 1}</span>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-rose-500 hover:text-rose-400 hover:bg-rose-550/10 rounded transition-colors"
                          title="Remove Item Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Compact Item Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                      {/* Metal Group & Item Name & Remarks */}
                      <div className="md:col-span-5 space-y-1.5">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Group</label>
                          <select
                            disabled={false}
                            value={item.groupId?._id || item.groupId || ''}
                            onChange={(e) => {
                              const selGroupId = e.target.value;
                              handleRowChange(idx, 'groupId', selGroupId);
                              const grpObj = groups.find(g => String(g._id) === String(selGroupId));
                              if (grpObj && grpObj.defaultRate) {
                                handleRowChange(idx, 'rate', grpObj.defaultRate);
                              }
                            }}
                            className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md focus:outline-none text-xs text-slate-200"
                          >
                            <option value="">Select metal group...</option>
                            {groups.map(g => (
                              <option key={g._id} value={g._id}>{g.groupName}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Item Name</label>
                          <select
                            disabled={false}
                            value={item.itemName}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              handleRowChange(idx, 'itemName', selectedName);
                              const catalogMatch = itemsCatalog.find(it => it.itemName === selectedName);
                              if (catalogMatch) {
                                const matchedGroupId = catalogMatch.groupId?._id || catalogMatch.groupId;
                                if (matchedGroupId) {
                                  handleRowChange(idx, 'groupId', matchedGroupId);
                                  const grpObj = groups.find(g => String(g._id) === String(matchedGroupId));
                                  if (grpObj && grpObj.defaultRate) {
                                    handleRowChange(idx, 'rate', grpObj.defaultRate);
                                  }
                                }
                              }
                            }}
                            className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md focus:outline-none text-xs text-slate-200"
                          >
                            <option value="">Select item...</option>
                            {getFilteredItems(item.groupId).map(catalogItem => (
                              <option key={catalogItem._id} value={catalogItem.itemName}>
                                {catalogItem.itemName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Remarks / Notes</label>
                          <input
                            type="text"
                            disabled={false}
                            value={item.remarks}
                            onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                            placeholder="Notes"
                            className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md focus:outline-none text-xs text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Weight Specs (Pcs, Purity, Gross, Less, Net, Pure Wt) */}
                      <div className="md:col-span-5 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Pcs</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={false}
                              value={item.pcs}
                              onChange={(e) => handleRowChange(idx, 'pcs', sanitizeNumericInput(e.target.value))}
                              placeholder="0"
                              className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-right focus:outline-none font-mono text-xs text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Purity %</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={false}
                              value={item.purityPercent}
                              onChange={(e) => handleRowChange(idx, 'purityPercent', sanitizeNumericInput(e.target.value))}
                              placeholder="0"
                              className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-right focus:outline-none font-mono text-xs text-slate-200"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Gross Wt</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={false}
                              value={item.grossWeight}
                              onChange={(e) => handleRowChange(idx, 'grossWeight', sanitizeNumericInput(e.target.value))}
                              placeholder="0.000"
                              className="w-full py-0.5 px-1.5 h-7 bg-slate-900 border border-slate-800 rounded-md text-right focus:outline-none font-mono text-[11px] text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Less Wt</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={false}
                              value={item.lessWeight}
                              onChange={(e) => handleRowChange(idx, 'lessWeight', sanitizeNumericInput(e.target.value))}
                              placeholder="0.000"
                              className="w-full py-0.5 px-1.5 h-7 bg-slate-900 border border-slate-800 rounded-md text-right focus:outline-none font-mono text-[11px] text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Net Wt</label>
                            <input
                              type="text"
                              disabled
                              value={item.netWeight?.toFixed(3)}
                              className="w-full py-0.5 px-1.5 h-7 bg-slate-955 border border-slate-850 rounded-md text-right font-mono text-[11px] text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Pure Wt</label>
                            <input
                              type="text"
                              disabled
                              value={item.pureWeight?.toFixed(3)}
                              className="w-full py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md text-right font-mono text-[11px] text-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Rate</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={false}
                              value={item.rate}
                              onChange={(e) => handleRowChange(idx, 'rate', sanitizeNumericInput(e.target.value))}
                              placeholder="0"
                              className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-right focus:outline-none font-mono text-xs text-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Estimated Value & Photo Upload */}
                      <div className="md:col-span-2 flex flex-col justify-between space-y-1.5 border-l border-slate-850 pl-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">Est. Value</label>
                          <input
                            type="text"
                            disabled
                            value={`₹${formatIndianCurrency(item.estimatedValue)}`}
                            className="w-full py-0.5 px-1 h-7 bg-slate-955 border border-slate-850 rounded-md text-right font-mono text-[10px] font-bold text-amber-500/80"
                          />
                        </div>

                        <div className="flex flex-col items-center">
                          <label className="block text-[8px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider text-center">Image</label>
                          {item.imageUrl ? (
                            <div className="relative group rounded-md overflow-hidden border border-slate-700 bg-slate-950 w-14 h-12">
                              <img
                                src={getImageUrl(item.imageUrl)}
                                alt="collateral"
                                className="w-full h-full object-cover"
                              />
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => handleRowChange(idx, 'imageUrl', '')}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            isEditMode ? (
                              <label className="flex flex-col items-center justify-center p-1 bg-slate-900 border border-dashed border-slate-700 hover:border-primary-500 rounded-md cursor-pointer transition-colors w-14 h-12">
                                <Upload className="h-3.5 w-3.5 text-primary-400" />
                                <span className="text-[8px] text-slate-400">Upload</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleItemImageUpload(idx, e.target.files[0])}
                                  className="hidden"
                                />
                              </label>
                            ) : (
                              <div className="flex items-center justify-center border border-slate-800 bg-slate-900/40 rounded-md w-14 h-12 text-slate-500 text-[8px]">
                                No Img
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-855">
              <button
                type="button"
                onClick={handleAddItemRow}
                tabIndex={0}
                className="flex items-center space-x-1.5 px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-md text-xs font-bold transition-all shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Group / Item</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Deal Financial Parameters & Actions (col-span-5) */}
          <div className="lg:col-span-5 glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
            <div className="border-b border-slate-855 pb-1.5">
              <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Deal Financial Parameters</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Deal Amount : *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={false}
                  value={form.dealAmount === 0 ? '' : form.dealAmount}
                  onChange={(e) => handleFinancialChange('dealAmount', sanitizeNumericInput(e.target.value))}
                  placeholder="Enter deal amount"
                  className="w-full py-1 px-2.5 h-7.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-emerald-400 font-mono font-bold placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Int. Rate/Mnth % :</label>
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={false}
                  value={form.interestRatePerMonth === 0 ? '' : form.interestRatePerMonth}
                  onChange={(e) => handleFinancialChange('interestRatePerMonth', sanitizeNumericInput(e.target.value))}
                  placeholder="e.g. 2"
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Int. Amt/Mnth :</label>
                <input
                  type="text"
                  disabled
                  value={form.interestAmountPerMonth?.toFixed(2)}
                  className="w-full py-0.5 px-2 h-7 bg-slate-955 border border-slate-850 rounded-md text-xs text-amber-400 font-mono text-right font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Return Period : *</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={false}
                    value={form.returnPeriodMonths === 0 ? '' : form.returnPeriodMonths}
                    onChange={(e) => handleFinancialChange('returnPeriodMonths', sanitizeNumericInput(e.target.value))}
                    placeholder="e.g. 12"
                    className="flex-1 py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 font-mono focus:outline-none"
                  />
                  <span className="text-slate-400 font-semibold text-[10px]">Month</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Cash/Bank :</label>
                <select
                  disabled={false}
                  value={form.payMode}
                  onChange={(e) => setForm({ ...form, payMode: e.target.value })}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Cheque No. :</label>
                <input
                  type="text"
                  disabled={!isEditMode || form.payMode === 'cash'}
                  value={form.chequeNo}
                  onChange={(e) => setForm({ ...form, chequeNo: e.target.value })}
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 font-mono disabled:opacity-30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[10px]">Location :</label>
                <input
                  type="text"
                  disabled={false}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Vault location tag"
                  className="w-full py-0.5 px-2 h-7 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons Anchored to Bottom Right */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-850 pt-3 no-print">
              <button
                id="toolbar-save-button"
                type="button"
                onClick={handleSaveDeal}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Deal</span>
              </button>

              <button
                id="toolbar-print-button"
                type="button"
                onClick={handleDealPrint}
                disabled={!form._id}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-40 transition-all"
                title={!form._id ? 'Save the deal first to print' : 'Print / Export PDF'}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={handleDeleteDeal}
                  disabled={isEditMode || !form._id}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-40 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
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
                <label className="block text-xs text-slate-400 font-semibold mb-1">Mobile No</label>
                <input
                  type="text"
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

      {/* QUICK CREATE METAL GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-855 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200">Create Metal Group</h3>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-255">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupForm.groupName}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, groupName: e.target.value })}
                  placeholder="e.g. Gold 22k, Silver 925"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Default Rate per gram (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGroupForm.defaultRate || ''}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, defaultRate: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 6200"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg"
              >
                Create Group
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
