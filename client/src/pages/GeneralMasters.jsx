import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toolbar from '../components/Toolbar';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Search, Upload, FileSpreadsheet, X, Save } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const baseUrl = axios.defaults.baseURL || '';
  const base = baseUrl.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

const GeneralMasters = () => {
  const [activeSubTab, setActiveSubTab] = useState('customers');
  const [toast, setToast] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Common Date/Time Clock State for footer panels
  const [companyDetails, setCompanyDetails] = useState(null);
  const [time, setTime] = useState(new Date());

  // Directory collections
  const [customers, setCustomers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [termsText, setTermsText] = useState('');

  // Active indices for navigation
  const [customerIndex, setCustomerIndex] = useState(-1);
  const [groupIndex, setGroupIndex] = useState(-1);
  const [itemIndex, setItemIndex] = useState(-1);

  // Form states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [findSearchQuery, setFindSearchQuery] = useState('');

  // Extract unique values for Country, State, City, Area dropdowns
  const uniqueCountries = Array.from(new Set([
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore', 'Nepal', 'Sri Lanka', 'Bangladesh',
    ...customers.map(c => c.country).filter(Boolean)
  ]));
  const uniqueStates = Array.from(new Set([
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
    ...customers.map(c => c.state).filter(Boolean)
  ]));
  const uniqueCities = Array.from(new Set([
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad', 'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Aligarh', 'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur', 'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar', 'Nellore', 'Jammu', 'Sangli-Miraj & Kupwad', 'Belgaum', 'Mangalore', 'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala',
    ...customers.map(c => c.city).filter(Boolean)
  ]));
  const uniqueAreas = Array.from(new Set([
    ...customers.map(c => c.area).filter(Boolean)
  ]));

  // --- FORM DATA FIELDS STRUCTURES ---

  const [customerForm, setCustomerForm] = useState({
    _id: '', customerCode: 'Auto', name: '', fatherHusbandName: '', address: '', area: '', city: 'Mumbai',
    state: 'Maharashtra', country: 'India', pin: '', email: '', phone1: '', phone2: '', phone3: '', mobile: '',
    idProofName: 'Aadhaar Card', idProofNumber: '', idProofImageUrl: '', interestType: 'simple',
    interestRate: 2.0, interestFrequency: 'monthly', compoundMonthDefault: true, compoundMonth: 1,
    compoundDate: '', minimumInterestPeriod: 'NA'
  });
  const [idFile, setIdFile] = useState(null);
  const [idFilePreview, setIdFilePreview] = useState(null);

  const [groupForm, setGroupForm] = useState({
    _id: '', groupId: 'Auto', groupName: '', defaultRate: 0
  });

  const [itemForm, setItemForm] = useState({
    _id: '', itemId: 'Auto', itemName: '', groupId: ''
  });



  const [companyForm, setCompanyForm] = useState({
    name: '', address: '', city: '', area: '', pin: '', gstin: '', phone: '', email: '', financialYearStart: '', financialYearEnd: ''
  });

  const [defaultSettings, setDefaultSettings] = useState({
    defaultArea: '',
    defaultCity: 'Mumbai',
    defaultState: 'Maharashtra',
    defaultCountry: 'India'
  });

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const getDefaultFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 is Jan, 2 is Mar
    let fyStartYear = year;
    if (month < 3) {
      fyStartYear = year - 1;
    }
    const fyStart = `${fyStartYear}-04-01`;
    const fyEnd = `${fyStartYear + 1}-03-31`;
    return { fyStart, fyEnd };
  };

  // --- TIME & COMPANY METRICS LOADER ---
  const fetchActiveCompany = async () => {
    try {
      const userRes = await axios.get('/api/auth/me');
      const compListRes = await axios.get('/api/companies');
      let activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
      if (!activeComp && compListRes.data.length > 0) {
        activeComp = compListRes.data[0];
      }
      setCompanyDetails(activeComp);
      if (activeComp) {
        const { fyStart, fyEnd } = getDefaultFinancialYear();
        setCompanyForm({
          name: activeComp.name || '',
          address: activeComp.address || '',
          city: activeComp.city || '',
          area: activeComp.area || '',
          pin: activeComp.pin || '',
          gstin: activeComp.gstin || '',
          phone: activeComp.phone || '',
          email: activeComp.email || '',
          financialYearStart: activeComp.financialYearStart ? activeComp.financialYearStart.split('T')[0] : fyStart,
          financialYearEnd: activeComp.financialYearEnd ? activeComp.financialYearEnd.split('T')[0] : fyEnd
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDefaultSettings = async () => {
    try {
      const res = await axios.get('/api/settings/girvi');
      if (res.data) {
        setDefaultSettings({
          defaultArea: res.data.defaultArea || '',
          defaultCity: res.data.defaultCity || 'Mumbai',
          defaultState: res.data.defaultState || 'Maharashtra',
          defaultCountry: res.data.defaultCountry || 'India'
        });
      }
    } catch (err) {
      console.error('Error loading default location settings:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      let companyId = companyDetails?._id;
      if (!companyId) {
        const userRes = await axios.get('/api/auth/me');
        companyId = userRes.data.companyId;
      }
      if (!companyId) {
        triggerToast('No active company found. Please log in again.', 'error');
        return;
      }

      // 1. Save Company location & info
      const compRes = await axios.put(`/api/companies/${companyId}`, companyForm);
      setCompanyDetails(compRes.data);

      // 2. Save Address Defaults
      await axios.put('/api/settings/girvi', {
        defaultArea: defaultSettings.defaultArea,
        defaultCity: defaultSettings.defaultCity,
        defaultState: defaultSettings.defaultState,
        defaultCountry: defaultSettings.defaultCountry
      });

      triggerToast('Store profile & customer defaults updated successfully');
    } catch (err) {
      console.error(err);
      triggerToast('Error updating store settings', 'error');
    }
  };

  useEffect(() => {
    fetchActiveCompany();
    fetchDefaultSettings();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- DATA RETRIEVAL API HANDLERS ---

  const fetchCustomersList = async (selectId = null) => {
    try {
      const res = await axios.get('/api/customers?limit=1000');
      const list = res.data.customers;
      setCustomers(list);
      if (activeSubTab === 'customers') {
        if (list.length > 0) {
          let idx = selectId ? list.findIndex(c => c._id === selectId) : 0;
          if (idx === -1) idx = 0;
          setCustomerIndex(idx);
          loadCustomerDetails(list[idx]._id);
        } else {
          handleAddNewCustomer();
        }
      }
    } catch (err) {
      triggerToast('Error loading customer records', 'error');
    }
  };

  const loadCustomerDetails = async (id) => {
    try {
      const res = await axios.get(`/api/customers/${id}`);
      const c = res.data;
      setCustomerForm({
        ...c,
        idProofImageUrl: c.idProofImageUrl || '',
        compoundDate: c.compoundDate || ''
      });
      setIdFilePreview(c.idProofImageUrl ? getImageUrl(c.idProofImageUrl) : null);
      setIdFile(null);
      setIsEditMode(false);
      setIsNewRecord(false);
    } catch (err) {
      triggerToast('Failed to fetch customer profile details', 'error');
    }
  };

  const fetchGroupsList = async (selectId = null) => {
    try {
      const res = await axios.get('/api/groups');
      setGroups(res.data);
      if (activeSubTab === 'groups') {
        if (res.data.length > 0) {
          let idx = selectId ? res.data.findIndex(g => g._id === selectId) : 0;
          if (idx === -1) idx = 0;
          setGroupIndex(idx);
          loadGroupDetails(res.data[idx]);
        } else {
          handleAddNewGroup();
        }
      }
    } catch (err) {
      triggerToast('Error fetching groups', 'error');
    }
  };

  const loadGroupDetails = (g) => {
    setGroupForm({
      _id: g._id,
      groupId: g.groupId,
      groupName: g.groupName,
      defaultRate: g.defaultRate || 0
    });
    setIsEditMode(false);
    setIsNewRecord(false);
  };

  const fetchItemsList = async (selectId = null) => {
    try {
      const res = await axios.get('/api/items');
      setItems(res.data);
      if (activeSubTab === 'items') {
        if (res.data.length > 0) {
          let idx = selectId ? res.data.findIndex(it => it._id === selectId) : 0;
          if (idx === -1) idx = 0;
          setItemIndex(idx);
          loadItemDetails(res.data[idx]);
        } else {
          handleAddNewItem();
        }
      }
    } catch (err) {
      triggerToast('Error fetching items', 'error');
    }
  };

  const loadItemDetails = (it) => {
    setItemForm({
      _id: it._id,
      itemId: it.itemId,
      itemName: it.itemName,
      groupId: it.groupId?._id || it.groupId || ''
    });
    setIsEditMode(false);
    setIsNewRecord(false);
  };



  const fetchTermsConfig = async () => {
    try {
      const res = await axios.get('/api/terms');
      setTermsText(res.data.termsText);
    } catch (err) {
      triggerToast('Error fetching terms config', 'error');
    }
  };

  // Switch Sub-Tabs
  useEffect(() => {
    setIsEditMode(false);
    setIsNewRecord(false);
    setShowFindModal(false);
    setFindSearchQuery('');

    if (activeSubTab === 'customers') {
      fetchCustomersList();
    } else if (activeSubTab === 'groups') {
      fetchGroupsList();
    } else if (activeSubTab === 'items') {
      fetchGroupsList(); // Needed for item select dropdown
      fetchItemsList();
    } else if (activeSubTab === 'terms') {
      fetchTermsConfig();
    }
  }, [activeSubTab]);

  // --- PREV / NEXT NAVIGATION SCOPES ---

  const handlePrev = () => {
    if (activeSubTab === 'customers' && customerIndex > 0) {
      const idx = customerIndex - 1;
      setCustomerIndex(idx);
      loadCustomerDetails(customers[idx]._id);
    } else if (activeSubTab === 'groups' && groupIndex > 0) {
      const idx = groupIndex - 1;
      setGroupIndex(idx);
      loadGroupDetails(groups[idx]);
    } else if (activeSubTab === 'items' && itemIndex > 0) {
      const idx = itemIndex - 1;
      setItemIndex(idx);
      loadItemDetails(items[idx]);
    }
  };

  const handleNext = () => {
    if (activeSubTab === 'customers' && customerIndex < customers.length - 1) {
      const idx = customerIndex + 1;
      setCustomerIndex(idx);
      loadCustomerDetails(customers[idx]._id);
    } else if (activeSubTab === 'groups' && groupIndex < groups.length - 1) {
      const idx = groupIndex + 1;
      setGroupIndex(idx);
      loadGroupDetails(groups[idx]);
    } else if (activeSubTab === 'items' && itemIndex < items.length - 1) {
      const idx = itemIndex + 1;
      setItemIndex(idx);
      loadItemDetails(items[idx]);
    }
  };

  // --- ADD ACTIONS ---

  const handleAddNewCustomer = async () => {
    let nextCode = 'Auto';
    try {
      const res = await axios.get('/api/counters/customerCode');
      if (res.data && res.data.nextSeq) {
        nextCode = res.data.nextSeq;
      }
    } catch (err) {
      console.error(err);
    }
    setCustomerForm({
      _id: '', customerCode: nextCode, name: '', fatherHusbandName: '', address: '',
      area: defaultSettings.defaultArea,
      city: defaultSettings.defaultCity,
      state: defaultSettings.defaultState,
      country: defaultSettings.defaultCountry,
      pin: '', email: '', phone1: '', phone2: '', phone3: '', mobile: '',
      idProofName: 'Aadhaar Card', idProofNumber: '', idProofImageUrl: '', interestType: 'simple',
      interestRate: 2.0, interestFrequency: 'monthly', compoundMonthDefault: true, compoundMonth: 1,
      compoundDate: '', minimumInterestPeriod: 'NA'
    });
    setIdFile(null);
    setIdFilePreview(null);
    setIsEditMode(true);
    setIsNewRecord(true);
  };

  const handleAddNewGroup = async () => {
    let nextCode = 'Auto';
    try {
      const res = await axios.get('/api/counters/groupId');
      if (res.data && res.data.nextSeq) {
        nextCode = res.data.nextSeq;
      }
    } catch (err) {
      console.error(err);
    }
    setGroupForm({ _id: '', groupId: nextCode, groupName: '', defaultRate: 0 });
    setIsEditMode(true);
    setIsNewRecord(true);
  };

  const handleAddNewItem = async () => {
    let nextCode = 'Auto';
    try {
      const res = await axios.get('/api/counters/itemId');
      if (res.data && res.data.nextSeq) {
        nextCode = res.data.nextSeq;
      }
    } catch (err) {
      console.error(err);
    }
    setItemForm({ _id: '', itemId: nextCode, itemName: '', groupId: groups[0]?._id || '' });
    setIsEditMode(true);
    setIsNewRecord(true);
  };

  const handleAdd = () => {
    if (activeSubTab === 'customers') handleAddNewCustomer();
    else if (activeSubTab === 'groups') handleAddNewGroup();
    else if (activeSubTab === 'items') handleAddNewItem();
  };

  // --- CANCEL ACTIONS ---

  const handleCancel = () => {
    setIsEditMode(false);
    setIsNewRecord(false);
    if (activeSubTab === 'customers') {
      if (customers.length > 0 && customerIndex !== -1) loadCustomerDetails(customers[customerIndex]._id);
      else handleAddNewCustomer();
    } else if (activeSubTab === 'groups') {
      if (groups.length > 0 && groupIndex !== -1) loadGroupDetails(groups[groupIndex]);
      else handleAddNewGroup();
    } else if (activeSubTab === 'items') {
      if (items.length > 0 && itemIndex !== -1) loadItemDetails(items[itemIndex]);
      else handleAddNewItem();
    }
  };

  // --- SAVE ACTIONS ---

  const handleSave = async () => {
    try {
      if (activeSubTab === 'customers') {
        if (!customerForm.name || !customerForm.mobile) {
          triggerToast('Customer Name and Mobile are required', 'error');
          return;
        }

        const data = new FormData();
        Object.keys(customerForm).forEach(key => {
          if (key !== 'idProofImageUrl') {
            data.append(key, customerForm[key]);
          }
        });

        if (idFile) {
          data.append('idProofImage', idFile);
        }

        if (isNewRecord) {
          const res = await axios.post('/api/customers', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          triggerToast('Customer created successfully');
          fetchCustomersList(res.data._id);
        } else {
          const res = await axios.put(`/api/customers/${customerForm._id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          triggerToast('Customer profile updated');
          fetchCustomersList(res.data._id);
        }
      } else if (activeSubTab === 'groups') {
        if (!groupForm.groupName) {
          triggerToast('Group name is required', 'error');
          return;
        }
        if (isNewRecord) {
          const res = await axios.post('/api/groups', groupForm);
          triggerToast('Metal group created');
          fetchGroupsList(res.data._id);
        } else {
          const res = await axios.put(`/api/groups/${groupForm._id}`, groupForm);
          triggerToast('Metal group updated');
          fetchGroupsList(res.data._id);
        }
      } else if (activeSubTab === 'items') {
        if (!itemForm.itemName || !itemForm.groupId) {
          triggerToast('Item name and metal group selection are required', 'error');
          return;
        }
        if (isNewRecord) {
          const res = await axios.post('/api/items', itemForm);
          triggerToast('Item added successfully');
          fetchItemsList(res.data._id);
        } else {
          const res = await axios.put(`/api/items/${itemForm._id}`, itemForm);
          triggerToast('Item updated successfully');
          fetchItemsList(res.data._id);
        }
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error saving master record', 'error');
    }
  };

  // --- DELETE ACTIONS ---

  const handleDelete = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      if (activeSubTab === 'customers') {
        await axios.delete(`/api/customers/${customerForm._id}`);
        triggerToast('Customer profile deleted');
        fetchCustomersList();
      } else if (activeSubTab === 'groups') {
        await axios.delete(`/api/groups/${groupForm._id}`);
        triggerToast('Metal group deleted');
        fetchGroupsList();
      } else if (activeSubTab === 'items') {
        await axios.delete(`/api/items/${itemForm._id}`);
        triggerToast('Item deleted successfully');
        fetchItemsList();
      }
    } catch (err) {
      triggerToast('Permission denied or record is referenced elsewhere', 'error');
    }
  };

  // Terms and Conditions save
  const handleSaveTerms = async () => {
    try {
      await axios.put('/api/terms', { termsText });
      triggerToast('Terms and Conditions updated');
    } catch (err) {
      triggerToast('Error saving terms config', 'error');
    }
  };

  // File Change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdFile(file);
      setIdFilePreview(URL.createObjectURL(file));
    }
  };

  // Excel bulk export
  const handleExportExcel = () => {
    window.open('/api/customers/export', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">General Masters</h1>
        <p className="text-slate-400 text-sm mt-1">Configure customer profiles, metal configurations, items catalogs, and payment routes.</p>
      </div>

      {/* Unified Master Options Tab Selector */}
      <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-3xl no-print">
        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'customers' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Customer Master
        </button>
        <button
          onClick={() => setActiveSubTab('groups')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'groups' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Group Master
        </button>
        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'items' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Item Master
        </button>

        <button
          onClick={() => setActiveSubTab('terms')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'terms' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terms & Conditions
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'settings' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Store Settings
        </button>
      </div>

      {/* Consistent Navigation Toolbar */}
      {activeSubTab !== 'terms' && activeSubTab !== 'settings' && (
        <Toolbar
          onPrev={handlePrev}
          onNext={handleNext}
          onFind={() => setShowFindModal(true)}
          onAdd={handleAdd}
          onEdit={() => setIsEditMode(true)}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={handleCancel}
          showPrint={false}
          isEditMode={isEditMode}
          hasPrev={
            activeSubTab === 'customers' ? customerIndex > 0 :
            activeSubTab === 'groups' ? groupIndex > 0 :
            activeSubTab === 'items' ? itemIndex > 0 :
            bankIndex > 0
          }
          hasNext={
            activeSubTab === 'customers' ? customerIndex < customers.length - 1 :
            activeSubTab === 'groups' ? groupIndex < groups.length - 1 :
            activeSubTab === 'items' ? itemIndex < items.length - 1 :
            bankIndex < banks.length - 1
          }
        />
      )}

      {/* Dynamic Master Card forms */}
      <div className={`glass-panel p-8 rounded-2xl border border-slate-800 shadow-xl ${
        activeSubTab === 'customers' || activeSubTab === 'settings' ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
        
        {/* VIEW 1: CUSTOMER MASTER FORM */}
        {activeSubTab === 'customers' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-2">Customer Master Details</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column inputs */}
              <div className="lg:col-span-2 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-450 font-semibold mb-1">
                    Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditMode}
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    placeholder="e.g. Mohit Kumar"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">F/H Name</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={customerForm.fatherHusbandName}
                    onChange={(e) => setCustomerForm({ ...customerForm, fatherHusbandName: e.target.value })}
                    placeholder="Father/Husband name"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Address</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    placeholder="Street / landmark address"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Country</label>
                    <input
                      type="text"
                      list="countries-list"
                      disabled={!isEditMode}
                      value={customerForm.country || ''}
                      onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                      placeholder="Select or type Country"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none disabled:opacity-60 text-slate-100"
                    />
                    <datalist id="countries-list">
                      {uniqueCountries.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">State</label>
                    <input
                      type="text"
                      list="states-list"
                      disabled={!isEditMode}
                      value={customerForm.state}
                      onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                      placeholder="Select or type State"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none disabled:opacity-60 text-slate-100"
                    />
                    <datalist id="states-list">
                      {uniqueStates.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">E-Mail</label>
                    <input
                      type="email"
                      disabled={!isEditMode}
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-650 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">
                      Mobile <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isEditMode}
                      value={customerForm.mobile}
                      onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                      placeholder="Mobile number"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">I.D. Name</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={customerForm.idProofName}
                      onChange={(e) => setCustomerForm({ ...customerForm, idProofName: e.target.value })}
                      placeholder="e.g. Aadhaar Card"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60"
                  />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">I.D. Number</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={customerForm.idProofNumber}
                      onChange={(e) => setCustomerForm({ ...customerForm, idProofNumber: e.target.value })}
                      placeholder="Doc number"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Right column inputs */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-450 font-semibold mb-1">Client Code</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      disabled
                      value={customerForm.customerCode}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono font-bold text-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-3 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-emerald-400 hover:text-emerald-350 transition-colors flex items-center justify-center font-bold text-[10px] space-x-1"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export to Excel</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    list="cities-list"
                    disabled={!isEditMode}
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    placeholder="Select or type City"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none disabled:opacity-60 text-slate-100"
                  />
                  <datalist id="cities-list">
                    {uniqueCities.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Area</label>
                  <input
                    type="text"
                    list="areas-list"
                    disabled={!isEditMode}
                    value={customerForm.area}
                    onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
                    placeholder="Select or type Area"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none disabled:opacity-60 text-slate-100"
                  />
                  <datalist id="areas-list">
                    {uniqueAreas.map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Pin Code</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={customerForm.pin}
                    onChange={(e) => setCustomerForm({ ...customerForm, pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none disabled:opacity-60 text-slate-100 font-mono"
                  />
                </div>

                {/* ID Image */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-slate-455 font-semibold">I.D. Image</label>
                  
                  {idFilePreview ? (
                    <div className="relative border border-slate-800 rounded-xl overflow-hidden aspect-[4/3] bg-slate-950 flex items-center justify-center group">
                      <img src={idFilePreview} alt="Proof preview" className="max-h-full max-w-full object-contain" />
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => { setIdFile(null); setIdFilePreview(null); }}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 text-white rounded-full"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-850 rounded-xl p-4 text-center text-slate-500 bg-slate-950/20 text-[10px]">
                      No image uploaded
                    </div>
                  )}

                  {isEditMode && !idFilePreview && (
                    <label className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-350 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-primary-400" />
                      <span>Upload Proof Image</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Calculations Rules */}
            <div className="border-t border-slate-850 pt-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-300">
              {/* Radios for Calculation type */}
              <div>
                <span className="block text-[11px] text-slate-400 font-semibold mb-2">Interest Type</span>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      disabled={!isEditMode}
                      name="interestType"
                      value="simple"
                      checked={customerForm.interestType === 'simple'}
                      onChange={(e) => setCustomerForm({ ...customerForm, interestType: e.target.value })}
                      className="accent-primary-500"
                    />
                    <span>Simple Interest</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      disabled={!isEditMode}
                      name="interestType"
                      value="compound"
                      checked={customerForm.interestType === 'compound'}
                      onChange={(e) => setCustomerForm({ ...customerForm, interestType: e.target.value })}
                      className="accent-primary-500"
                    />
                    <span>Compound Interest</span>
                  </label>
                </div>
              </div>

              {/* Interest Rate & Frequency Radios */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Interest Rate <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={true}
                    value={customerForm.interestRate}
                    onChange={(e) => setCustomerForm({ ...customerForm, interestRate: e.target.value })}
                    className="w-24 px-2 py-1 bg-slate-955 border border-slate-850 rounded text-slate-400 font-mono focus:outline-none"
                  />
                </div>

                <div className="flex space-x-3">
                  {['yearly', 'monthly', 'daily'].map(freq => (
                    <label key={freq} className="flex items-center space-x-1.5 cursor-pointer capitalize">
                      <input
                        type="radio"
                        disabled={!isEditMode}
                        name="interestFrequency"
                        value={freq}
                        checked={customerForm.interestFrequency === freq}
                        onChange={(e) => setCustomerForm({ ...customerForm, interestFrequency: e.target.value })}
                        className="accent-primary-500"
                      />
                      <span>{freq}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hidden Minimum Interest Section */}
            </div>
          </div>
        )}

        {/* VIEW 2: GROUP MASTER FORM */}
        {activeSubTab === 'groups' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-2 font-sans">Group Master</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Group Id</label>
                <input
                  type="text"
                  disabled
                  value={groupForm.groupId}
                  className="w-full px-3 py-2.5 bg-slate-955 border border-slate-850 rounded-lg text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-405 font-semibold mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={groupForm.groupName}
                  onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
                  placeholder="Group name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-405 font-semibold mb-1">Rate</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isEditMode}
                  value={groupForm.defaultRate}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultRate: Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ITEM MASTER FORM */}
        {activeSubTab === 'items' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-2">Item Master Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item ID</label>
                <input
                  type="text"
                  disabled
                  value={itemForm.itemId}
                  className="w-full px-3 py-2.5 bg-slate-955 border border-slate-850 rounded-lg text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-405 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  placeholder="e.g. Ring, Chain"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-405 font-semibold mb-1">Linked Metal Category Group *</label>
                <select
                  required
                  disabled={!isEditMode}
                  value={itemForm.groupId}
                  onChange={(e) => setItemForm({ ...itemForm, groupId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-350 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select metal group...</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.groupName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: BANK MASTER FORM */}
        {activeSubTab === 'banks' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-2 font-sans">Bank Master</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank Id</label>
                <input
                  type="text"
                  disabled
                  value={bankForm.bankId}
                  className="w-full px-3 py-2.5 bg-slate-955 border border-slate-850 rounded-lg text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-405 font-semibold mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="Bank name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: TERMS AND CONDITIONS EDITOR */}
        {activeSubTab === 'terms' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <h3 className="text-lg font-bold text-slate-200">Legal Receipt Invoices Terms</h3>
              <button
                onClick={handleSaveTerms}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Update Terms</span>
              </button>
            </div>
            
            <textarea
              rows="10"
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              placeholder="Legal safety terms, compounding policies or payment default rules..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
            />
          </div>
        )}

        {/* VIEW 6: STORE SETTINGS & CUSTOMER DEFAULT FIELDS */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <h3 className="text-lg font-bold text-slate-200">Store & Address Defaults Settings</h3>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              {/* Left Column: Store Profile Settings */}
              <div className="space-y-4">
                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850/50 pb-1">Store / Company Details</span>
                
                <div>
                  <label className="block text-slate-450 font-semibold mb-1">Company/Store Name *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500"
                    placeholder="Rama Jewellers Store"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Address</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500"
                    placeholder="e.g. 45 Bazar Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Area</label>
                    <input
                      type="text"
                      value={companyForm.area}
                      onChange={(e) => setCompanyForm({ ...companyForm, area: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={companyForm.pin}
                      onChange={(e) => setCompanyForm({ ...companyForm, pin: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={companyForm.gstin}
                      onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Phone</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Financial Year Start</label>
                    <input
                      type="date"
                      value={companyForm.financialYearStart}
                      onChange={(e) => setCompanyForm({ ...companyForm, financialYearStart: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-455 font-semibold mb-1">Financial Year End</label>
                    <input
                      type="date"
                      value={companyForm.financialYearEnd}
                      onChange={(e) => setCompanyForm({ ...companyForm, financialYearEnd: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Customer Default Fields Settings */}
              <div className="space-y-4">
                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850/50 pb-1">Default Customer address details</span>
                
                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Default Country</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultCountry}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultCountry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    placeholder="e.g. India"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Default State</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultState}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultState: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    placeholder="e.g. Maharashtra"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Default City</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultCity}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultCity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    placeholder="e.g. Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 font-semibold mb-1">Default Area</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultArea}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultArea: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    placeholder="e.g. Bandra"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* FOOTER CLOCK CARD CARD (EXCEPT ON TERMS & CONDITIONS) */}
        {activeSubTab !== 'terms' && activeSubTab !== 'settings' && (
          <div className="mt-8 border-t border-slate-850 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 font-sans">
            <div>
              <p className="font-bold text-slate-350 uppercase tracking-wider">{companyDetails?.name || 'INDRAVIAJY ENT & JWELLERY-JIJI'}</p>
              <p className="text-slate-450">{companyDetails?.address || 'BORI'}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Period:{' '}
                <span className="font-semibold text-slate-400">
                  {companyDetails?.financialYearStart ? new Date(companyDetails.financialYearStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Apr., 2026'}{' '}
                  -{' '}
                  {companyDetails?.financialYearEnd ? new Date(companyDetails.financialYearEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Mar., 2027'}
                </span>
              </p>
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
        )}
      </div>

      {/* SEARCH / FIND DIALOG MODAL */}
      {showFindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
              <h3 className="text-base font-bold text-slate-200">
                Find {
                  activeSubTab === 'customers' ? 'Customer' :
                  activeSubTab === 'groups' ? 'Metal Group' :
                  activeSubTab === 'items' ? 'Item' : 'Bank Partner'
                }
              </h3>
              <button onClick={() => setShowFindModal(false)} className="text-slate-400 hover:text-slate-200">
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
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-900 pr-1">
              {/* CUSTOMERS FIND */}
              {activeSubTab === 'customers' &&
                customers
                  .filter(c => 
                    c.name.toLowerCase().includes(findSearchQuery.toLowerCase()) || 
                    c.mobile.includes(findSearchQuery) || 
                    String(c.customerCode).includes(findSearchQuery) ||
                    (c.idProofNumber && c.idProofNumber.toLowerCase().includes(findSearchQuery.toLowerCase()))
                  )
                  .map(c => (
                    <button
                      key={c._id}
                      onClick={() => {
                        const idx = customers.findIndex(item => item._id === c._id);
                        setCustomerIndex(idx);
                        loadCustomerDetails(c._id);
                        setShowFindModal(false);
                        setFindSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-300 hover:text-white rounded-lg text-xs flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-semibold block">{c.name}</span>
                        <span className="text-[10px] text-slate-500">Mob: {c.mobile}</span>
                      </div>
                      <span className="font-mono text-amber-500 text-[10px] font-bold">#{c.customerCode}</span>
                    </button>
                  ))
              }

              {/* GROUPS FIND */}
              {activeSubTab === 'groups' &&
                groups
                  .filter(g => g.groupName.toLowerCase().includes(findSearchQuery.toLowerCase()))
                  .map(g => (
                    <button
                      key={g._id}
                      onClick={() => {
                        const idx = groups.findIndex(item => item._id === g._id);
                        setGroupIndex(idx);
                        loadGroupDetails(g);
                        setShowFindModal(false);
                        setFindSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-300 hover:text-white rounded-lg text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">{g.groupName}</span>
                      <span className="font-mono text-amber-500 text-[10px]">#{g.groupId}</span>
                    </button>
                  ))
              }

              {/* ITEMS FIND */}
              {activeSubTab === 'items' &&
                items
                  .filter(it => it.itemName.toLowerCase().includes(findSearchQuery.toLowerCase()))
                  .map(it => (
                    <button
                      key={it._id}
                      onClick={() => {
                        const idx = items.findIndex(item => item._id === it._id);
                        setItemIndex(idx);
                        loadItemDetails(it);
                        setShowFindModal(false);
                        setFindSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-350 hover:text-white rounded-lg text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold block">{it.itemName}</span>
                        <span className="text-[10px] text-slate-500">Group: {it.groupId?.groupName || 'Unlinked'}</span>
                      </div>
                      <span className="font-mono text-amber-500 text-[10px]">#{it.itemId}</span>
                    </button>
                  ))
              }

              {/* BANKS FIND */}
              {activeSubTab === 'banks' &&
                banks
                  .filter(b => b.bankName.toLowerCase().includes(findSearchQuery.toLowerCase()))
                  .map(b => (
                    <button
                      key={b._id}
                      onClick={() => {
                        const idx = banks.findIndex(item => item._id === b._id);
                        setBankIndex(idx);
                        loadBankDetails(b);
                        setShowFindModal(false);
                        setFindSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-300 hover:text-white rounded-lg text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">{b.bankName}</span>
                      <span className="font-mono text-amber-500 text-[10px]">#{b.bankId}</span>
                    </button>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal delete */}
      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        title="Delete Record"
        message="Are you sure you want to permanently delete this master record? References in deals or configurations might be broken."
        onConfirm={handleConfirmDelete}
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

export default GeneralMasters;
