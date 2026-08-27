import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toolbar from '../components/Toolbar';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Search, Upload, FileSpreadsheet, X, Save, Users } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const baseUrl = axios.defaults.baseURL || '';
  const base = baseUrl.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

const GeneralMasters = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [rateType, setRateType] = useState('2');
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

  // Customer Ledger Group state
  const [customerGroups, setCustomerGroups] = useState([]);
  const [customerGroupIndex, setCustomerGroupIndex] = useState(-1);
  const [customerGroupForm, setCustomerGroupForm] = useState({
    _id: '', groupName: '', groupCode: '', description: ''
  });
  const [selectedLedgerGroup, setSelectedLedgerGroup] = useState(null);
  const [ledgerGroupSearchText, setLedgerGroupSearchText] = useState('');
  const [ledgerGroupMembers, setLedgerGroupMembers] = useState([]);

  // Save prompt modal state
  const [showSaveGroupModal, setShowSaveGroupModal] = useState(false);
  const [saveGroupInput, setSaveGroupInput] = useState('');
  const [modalActiveIndex, setModalActiveIndex] = useState(0);



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
      setCurrentUser(userRes.data);
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
        if (selectId) {
          // After a save, navigate to the saved record
          const idx = list.findIndex(c => c._id === selectId);
          if (idx !== -1) {
            setCustomerIndex(idx);
            loadCustomerDetails(list[idx]._id);
            return;
          }
        }
        // Default: always show blank new form (not last customer)
        setCustomerIndex(-1);
        handleAddNewCustomer();
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
      if (c.interestRate === 2) {
        setRateType('2');
      } else if (c.interestRate === 3) {
        setRateType('3');
      } else {
        setRateType('custom');
      }
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



  const fetchCustomerGroupsList = async (selectId = null) => {
    try {
      const res = await axios.get('/api/customer-groups');
      setCustomerGroups(res.data);
      if (res.data.length > 0) {
        let idx = selectId ? res.data.findIndex(cg => cg._id === selectId) : 0;
        if (idx === -1) idx = 0;
        setCustomerGroupIndex(idx);
        loadCustomerGroupDetails(res.data[idx]);
      } else {
        handleAddNewCustomerGroup();
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error fetching customer groups', 'error');
    }
  };

  const loadCustomerGroupDetails = (cg) => {
    setCustomerGroupForm({
      _id: cg._id,
      groupName: cg.groupName,
      groupCode: cg.groupCode || '',
      description: cg.description || ''
    });
    setSelectedLedgerGroup(cg);
    fetchGroupMembers(cg._id);
    setIsEditMode(false);
    setIsNewRecord(false);
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const res = await axios.get(`/api/customer-groups/${groupId}/members`);
      setLedgerGroupMembers(res.data);
    } catch (err) {
      console.error(err);
    }
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
      fetchCustomerGroupsList(); // Needed for customer group dropdown
      fetchCustomersList();
    } else if (activeSubTab === 'groups') {
      fetchGroupsList();
    } else if (activeSubTab === 'items') {
      fetchGroupsList(); // Needed for item select dropdown
      fetchItemsList();
    } else if (activeSubTab === 'ledger-groups') {
      fetchCustomerGroupsList();
      fetchCustomersList();
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
    setRateType('2');
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

  const handleAddNewCustomerGroup = () => {
    setCustomerGroupForm({ _id: '', groupName: '', groupCode: '', description: '' });
    setSelectedLedgerGroup(null);
    setLedgerGroupMembers([]);
    setIsEditMode(true);
    setIsNewRecord(true);
  };

  const handleAdd = () => {
    if (activeSubTab === 'customers') handleAddNewCustomer();
    else if (activeSubTab === 'groups') handleAddNewGroup();
    else if (activeSubTab === 'items') handleAddNewItem();
    else if (activeSubTab === 'ledger-groups') handleAddNewCustomerGroup();
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
    } else if (activeSubTab === 'ledger-groups') {
      if (customerGroups.length > 0 && customerGroupIndex !== -1) loadCustomerGroupDetails(customerGroups[customerGroupIndex]);
      else handleAddNewCustomerGroup();
    }
  };

  // --- SAVE ACTIONS ---

  const executeCustomerSave = async (groupNameToSave) => {
    try {
      const finalGroup = (groupNameToSave || customerForm.customerGroup || 'General').trim();
      const matchedGroup = customerGroups.find(cg => cg.groupName.toLowerCase() === finalGroup.toLowerCase());
      const groupIdToSave = matchedGroup ? matchedGroup._id : null;

      const data = new FormData();
      Object.keys(customerForm).forEach(key => {
        if (key !== 'idProofImageUrl' && key !== 'customerGroup' && key !== 'customerGroupId') {
          data.append(key, customerForm[key]);
        }
      });
      data.append('customerGroup', finalGroup);
      if (groupIdToSave) {
        data.append('customerGroupId', groupIdToSave);
      }

      if (idFile) {
        data.append('idProofImage', idFile);
      }

      if (isNewRecord) {
        const res = await axios.post('/api/customers', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        triggerToast(`Customer created successfully in Group "${finalGroup}"`);
        setShowSaveGroupModal(false);
        fetchCustomersList(res.data._id);
      } else {
        const res = await axios.put(`/api/customers/${customerForm._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        triggerToast(`Customer profile updated in Group "${finalGroup}"`);
        setShowSaveGroupModal(false);
        fetchCustomersList(res.data._id);
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Error saving customer profile', 'error');
    }
  };

  const handleSave = async () => {
    try {
      if (activeSubTab === 'customers') {
        if (!customerForm.name) {
          triggerToast('Customer Name is required', 'error');
          return;
        }
        // Open group assignment modal prompt immediately on save
        setSaveGroupInput('');
        setModalActiveIndex(0);
        setShowSaveGroupModal(true);
        return;
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
      } else if (activeSubTab === 'ledger-groups') {
        if (!customerGroupForm.groupName) {
          triggerToast('Ledger Group Name is required', 'error');
          return;
        }
        if (isNewRecord) {
          const res = await axios.post('/api/customer-groups', customerGroupForm);
          triggerToast('Customer Ledger Group created successfully');
          fetchCustomerGroupsList(res.data._id);
        } else {
          const res = await axios.put(`/api/customer-groups/${customerGroupForm._id}`, customerGroupForm);
          triggerToast('Customer Ledger Group updated successfully');
          fetchCustomerGroupsList(res.data._id);
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
      } else if (activeSubTab === 'ledger-groups') {
        await axios.delete(`/api/customer-groups/${customerGroupForm._id}`);
        triggerToast('Customer Ledger Group deleted');
        fetchCustomerGroupsList();
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
    <div className="space-y-3">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">General Masters</h1>
        <p className="text-slate-400 text-xs mt-0.5">Configure customer profiles, metal configurations, items catalogs, and payment routes.</p>
      </div>

      {/* Unified Master Options Tab Selector */}
      <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-3xl no-print">
        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'customers' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Ledger Master
        </button>
        <button
          onClick={() => setActiveSubTab('groups')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'groups' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Group Master
        </button>
        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'items' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Item Master
        </button>

        <button
          onClick={() => setActiveSubTab('ledger-groups')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'ledger-groups' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Ledger Group
        </button>

        <button
          onClick={() => setActiveSubTab('terms')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'terms' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terms &amp; Conditions
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'settings' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Store Settings
        </button>
      </div>

      {/* Dynamic Master Card forms */}
      <div className={`glass-panel p-3.5 md:p-4 rounded-xl border border-slate-800 shadow-xl ${
        activeSubTab === 'customers' || activeSubTab === 'settings' ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
        
        {/* Top Navigation Toolbar */}
        {activeSubTab !== 'terms' && activeSubTab !== 'settings' && (
          <div className="mb-3 border-b border-slate-850 pb-2.5 no-print">
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
              showEdit={currentUser?.role === 'admin'}
              showSave={true}
              showCancel={true}
              showDelete={currentUser?.role === 'admin'}
              isEditMode={isEditMode}
              hasPrev={
                activeSubTab === 'customers' ? customerIndex > 0 :
                activeSubTab === 'groups' ? groupIndex > 0 :
                activeSubTab === 'items' ? itemIndex > 0 : false
              }
              hasNext={
                activeSubTab === 'customers' ? customerIndex < customers.length - 1 :
                activeSubTab === 'groups' ? groupIndex < groups.length - 1 :
                activeSubTab === 'items' ? itemIndex < items.length - 1 : false
              }
            />
          </div>
        )}

        {/* VIEW 1: CUSTOMER MASTER FORM */}
        {activeSubTab === 'customers' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-850 pb-1">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Customer Master Details</h3>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 h-6 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-md text-emerald-400 hover:text-emerald-350 transition-colors flex items-center justify-center font-bold text-[10px] space-x-1"
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>Export to Excel</span>
              </button>
            </div>
            
            {/* Multi-column grid: 4 fields per row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
              
              {/* Row 1: Client Code, Name, F/H Name */}
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Client Code</label>
                <input
                  type="text"
                  disabled
                  value={customerForm.customerCode}
                  className="w-full h-7 py-0.5 px-2 bg-slate-955 border border-slate-850 rounded-md text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">
                  Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="e.g. Mohit Kumar"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">F/H Name</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={customerForm.fatherHusbandName}
                  onChange={(e) => setCustomerForm({ ...customerForm, fatherHusbandName: e.target.value })}
                  placeholder="Father/Husband name"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                />
              </div>

              {/* Row 2: Address (col-2), Area, City */}
              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Address</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Street / landmark address"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Area</label>
                <input
                  type="text"
                  list="areas-list"
                  disabled={!isEditMode}
                  value={customerForm.area}
                  onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
                  placeholder="Select or type Area"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs focus:outline-none disabled:opacity-60 text-slate-100"
                />
                <datalist id="areas-list">
                  {uniqueAreas.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">City</label>
                <input
                  type="text"
                  list="cities-list"
                  disabled={!isEditMode}
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  placeholder="Select or type City"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs focus:outline-none disabled:opacity-60 text-slate-100"
                />
                <datalist id="cities-list">
                  {uniqueCities.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-amber-400 font-semibold mb-0.5 text-[11px]">Ledger Group</label>
                <input
                  type="text"
                  list="customer-groups-list"
                  disabled={!isEditMode}
                  value={customerForm.customerGroup || 'General'}
                  onChange={(e) => {
                    const gName = e.target.value;
                    const matched = customerGroups.find(cg => cg.groupName.toLowerCase() === gName.toLowerCase());
                    setCustomerForm({
                      ...customerForm,
                      customerGroup: gName,
                      customerGroupId: matched ? matched._id : ''
                    });
                  }}
                  placeholder="Select or type Group"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-amber-500/40 rounded-md text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                />
                <datalist id="customer-groups-list">
                  <option value="General" />
                  {customerGroups.map(cg => <option key={cg._id} value={cg.groupName} />)}
                </datalist>
              </div>

              {/* Row 3: Country, State, Pin Code, E-Mail */}
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Country</label>
                <input
                  type="text"
                  list="countries-list"
                  disabled={!isEditMode}
                  value={customerForm.country || ''}
                  onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                  placeholder="Country"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                />
                <datalist id="countries-list">
                  {uniqueCountries.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">State</label>
                <input
                  type="text"
                  list="states-list"
                  disabled={!isEditMode}
                  value={customerForm.state}
                  onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                  placeholder="State"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                />
                <datalist id="states-list">
                  {uniqueStates.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Pin Code</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={customerForm.pin}
                  onChange={(e) => setCustomerForm({ ...customerForm, pin: e.target.value })}
                  placeholder="PIN"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs focus:outline-none disabled:opacity-60 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">E-Mail</label>
                <input
                  type="email"
                  disabled={!isEditMode}
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-60"
                />
              </div>

              {/* Row 4: Mobile, I.D. Name, I.D. Number, I.D. Image Upload */}
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Mobile *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                  placeholder="Mobile number"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">I.D. Name</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={customerForm.idProofName}
                  onChange={(e) => setCustomerForm({ ...customerForm, idProofName: e.target.value })}
                  placeholder="Aadhaar Card"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">I.D. Number</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={customerForm.idProofNumber}
                  onChange={(e) => setCustomerForm({ ...customerForm, idProofNumber: e.target.value })}
                  placeholder="Doc number"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">I.D. Image</label>
                {idFilePreview ? (
                  <div className="relative border border-slate-800 rounded-md overflow-hidden h-7 bg-slate-950 flex items-center justify-between px-2 text-[10px] text-slate-300">
                    <span className="truncate">Proof uploaded</span>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => { setIdFile(null); setIdFilePreview(null); }}
                        className="text-red-400 hover:text-red-300 font-bold ml-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : isEditMode ? (
                  <label className="w-full h-7 py-0.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-350 rounded-md text-[10px] font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors">
                    <Upload className="h-3 w-3 text-primary-400" />
                    <span>Upload Proof</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                ) : (
                  <div className="h-7 border border-slate-850 rounded-md flex items-center justify-center text-slate-500 bg-slate-950/20 text-[10px]">
                    No image
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: Interest Type & Interest Rate inline */}
            <div className="border-t border-slate-850 pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
              {/* Radios for Calculation type */}
              <div className="flex items-center space-x-4">
                <span className="text-[11px] text-slate-400 font-semibold">Interest Type:</span>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    disabled={!isEditMode}
                    name="interestType"
                    value="simple"
                    checked={customerForm.interestType === 'simple'}
                    onChange={(e) => setCustomerForm({ ...customerForm, interestType: e.target.value })}
                    className="accent-primary-500"
                  />
                  <span>Simple</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    disabled={!isEditMode}
                    name="interestType"
                    value="compound"
                    checked={customerForm.interestType === 'compound'}
                    onChange={(e) => setCustomerForm({ ...customerForm, interestType: e.target.value })}
                    className="accent-primary-500"
                  />
                  <span>Compound</span>
                </label>
              </div>

              {/* Interest Rate & Frequency Radios */}
              <div className="flex items-center space-x-4">
                <span className="text-[11px] text-slate-400 font-semibold">Interest Rate *:</span>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      disabled={!isEditMode}
                      name="rateType"
                      value="2"
                      checked={rateType === '2'}
                      onChange={() => {
                        setRateType('2');
                        setCustomerForm({ ...customerForm, interestRate: 2.0 });
                      }}
                      className="accent-primary-500"
                    />
                    <span>2%</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      disabled={!isEditMode}
                      name="rateType"
                      value="3"
                      checked={rateType === '3'}
                      onChange={() => {
                        setRateType('3');
                        setCustomerForm({ ...customerForm, interestRate: 3.0 });
                      }}
                      className="accent-primary-500"
                    />
                    <span>3%</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      disabled={!isEditMode}
                      name="rateType"
                      value="custom"
                      checked={rateType === 'custom'}
                      onChange={() => {
                        setRateType('custom');
                      }}
                      className="accent-primary-500"
                    />
                    <span>Custom</span>
                  </label>

                  {rateType === 'custom' && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate %"
                      disabled={!isEditMode}
                      value={customerForm.interestRate}
                      onChange={(e) => setCustomerForm({ ...customerForm, interestRate: Number(e.target.value) })}
                      className="w-16 h-6 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    />
                  )}
                </div>

                <div className="flex space-x-2 border-l border-slate-800 pl-3">
                  {['yearly', 'monthly', 'daily'].map(freq => (
                    <label key={freq} className="flex items-center space-x-1 cursor-pointer capitalize text-[11px]">
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
            </div>
          </div>
        )}

        {/* VIEW 2: GROUP MASTER FORM */}
        {activeSubTab === 'groups' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-850 pb-1 font-sans uppercase tracking-widest">Group Master</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Group Id</label>
                <input
                  type="text"
                  disabled
                  value={groupForm.groupId}
                  className="w-full h-7 py-0.5 px-2 bg-slate-955 border border-slate-850 rounded-md text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Group Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={groupForm.groupName}
                  onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
                  placeholder="Group name"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Rate</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isEditMode}
                  value={groupForm.defaultRate}
                  onChange={(e) => setGroupForm({ ...groupForm, defaultRate: Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 font-mono focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ITEM MASTER FORM */}
        {activeSubTab === 'items' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-850 pb-1 uppercase tracking-widest">Item Master Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Item ID</label>
                <input
                  type="text"
                  disabled
                  value={itemForm.itemId}
                  className="w-full h-7 py-0.5 px-2 bg-slate-955 border border-slate-850 rounded-md text-xs font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Item Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  placeholder="e.g. Ring, Chain"
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Linked Metal Category Group *</label>
                <select
                  required
                  disabled={!isEditMode}
                  value={itemForm.groupId}
                  onChange={(e) => setItemForm({ ...itemForm, groupId: e.target.value })}
                  className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none disabled:opacity-60"
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

        {/* VIEW 4: LEDGER GROUP MASTER & MEMBERS PANEL */}
        {activeSubTab === 'ledger-groups' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Customer Ledger Groups</h3>
                <p className="text-[11px] text-slate-400">Manage customer categories, groups, and search assigned group members.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column: Ledger Group Edit & Card List */}
              <div className="space-y-3 lg:col-span-1 border-r border-slate-850 pr-3">
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Group Details</span>
                  
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Group Name *</label>
                    <input
                      type="text"
                      required
                      disabled={!isEditMode}
                      value={customerGroupForm.groupName}
                      onChange={(e) => setCustomerGroupForm({ ...customerGroupForm, groupName: e.target.value })}
                      placeholder="e.g. VIP, Wholesale, Regular"
                      className="w-full h-7 py-0.5 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none focus:border-primary-500 disabled:opacity-60 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Group Code / ID</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={customerGroupForm.groupCode}
                      onChange={(e) => setCustomerGroupForm({ ...customerGroupForm, groupCode: e.target.value })}
                      placeholder="e.g. GRP-01"
                      className="w-full h-7 py-0.5 px-2 bg-slate-955 border border-slate-850 rounded-md text-xs text-slate-300 font-mono focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Description</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={customerGroupForm.description}
                      onChange={(e) => setCustomerGroupForm({ ...customerGroupForm, description: e.target.value })}
                      placeholder="Notes or description"
                      className="w-full h-7 py-0.5 px-2 bg-slate-955 border border-slate-850 rounded-md text-xs text-slate-300 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* List of Created Customer Groups */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Customer Groups ({customerGroups.length})</span>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {customerGroups.map((cg, idx) => {
                      const count = customers.filter(c => c.customerGroup === cg.groupName || c.customerGroupId === cg._id).length;
                      const isSelected = selectedLedgerGroup?._id === cg._id;
                      return (
                        <div
                          key={cg._id}
                          onClick={() => {
                            setCustomerGroupIndex(idx);
                            loadCustomerGroupDetails(cg);
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex justify-between items-center transition-all ${
                            isSelected 
                              ? 'bg-primary-600/30 border-primary-500/50 text-white font-bold' 
                              : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div>
                            <span className="block font-semibold text-slate-100">{cg.groupName}</span>
                            {cg.groupCode && <span className="text-[10px] text-amber-400/80 font-mono">#{cg.groupCode}</span>}
                          </div>
                          <span className="px-2 py-0.5 bg-slate-800 rounded-full text-[10px] font-mono text-slate-300 font-bold border border-slate-700">
                            {count} Members
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Group Members Inspection & Live Search */}
              <div className="space-y-3 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Group Members: {selectedLedgerGroup ? selectedLedgerGroup.groupName : 'All'}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Showing customers assigned to this group
                    </span>
                  </div>

                  {/* Member Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={ledgerGroupSearchText}
                      onChange={(e) => setLedgerGroupSearchText(e.target.value)}
                      placeholder="Search member name, code, mobile..."
                      className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Customer Members Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30 max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">Area / City</th>
                        <th className="p-2.5">Group</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-sans">
                      {ledgerGroupMembers
                        .filter(c => {
                          const q = ledgerGroupSearchText.toLowerCase();
                          return !q || 
                            (c.name && c.name.toLowerCase().includes(q)) ||
                            (c.customerCode && String(c.customerCode).includes(q)) ||
                            (c.mobile && c.mobile.includes(q)) ||
                            (c.area && c.area.toLowerCase().includes(q)) ||
                            (c.city && c.city.toLowerCase().includes(q));
                        })
                        .map(c => (
                          <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-mono text-amber-500 font-bold">#{c.customerCode}</td>
                            <td className="p-2.5 font-semibold text-slate-100">{c.name}</td>
                            <td className="p-2.5 font-mono text-slate-400">{c.mobile || '-'}</td>
                            <td className="p-2.5 text-slate-400">{c.area ? `${c.area}, ${c.city}` : c.city || '-'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-primary-950/60 border border-primary-500/30 text-primary-300 rounded text-[10px] font-bold">
                                {c.customerGroup || selectedLedgerGroup?.groupName || 'General'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {ledgerGroupMembers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-slate-500 text-xs">
                            No customers found in this group.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: TERMS AND CONDITIONS EDITOR */}
        {activeSubTab === 'terms' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-850 pb-1">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Legal Receipt Invoices Terms</h3>
              <button
                onClick={handleSaveTerms}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-md text-xs font-semibold shadow flex items-center space-x-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Update Terms</span>
              </button>
            </div>
            
            <textarea
              rows="6"
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              placeholder="Legal safety terms, compounding policies or payment default rules..."
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
            />
          </div>
        )}

        {/* VIEW 6: STORE SETTINGS & CUSTOMER DEFAULT FIELDS */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-850 pb-1">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Store &amp; Address Defaults Settings</h3>
              <button
                type="submit"
                className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-md text-xs font-semibold shadow flex items-center space-x-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: Store Profile Settings */}
              <div className="space-y-2">
                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850/50 pb-0.5">Store / Company Details</span>
                
                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Company/Store Name *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                    placeholder="Rama Jewellers Store"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Address</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                    placeholder="e.g. 45 Bazar Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">City</label>
                    <input
                      type="text"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Area</label>
                    <input
                      type="text"
                      value={companyForm.area}
                      onChange={(e) => setCompanyForm({ ...companyForm, area: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">PIN Code</label>
                    <input
                      type="text"
                      value={companyForm.pin}
                      onChange={(e) => setCompanyForm({ ...companyForm, pin: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">GSTIN</label>
                    <input
                      type="text"
                      value={companyForm.gstin}
                      onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Phone</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Financial Year</label>
                  <select
                    value={companyForm.financialYearStart ? `${new Date(companyForm.financialYearStart).getFullYear()}` : ''}
                    onChange={(e) => {
                      const yr = Number(e.target.value);
                      if (yr) {
                        setCompanyForm({ ...companyForm, financialYearStart: `${yr}-04-01`, financialYearEnd: `${yr + 1}-03-31` });
                      }
                    }}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none font-mono"
                  >
                    <option value="">Select Financial Year</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const startYear = 2020;
                      const options = [];
                      for (let y = currentYear; y >= startYear; y--) {
                        options.push(<option key={y} value={y}>FY {y}-{String((y + 1) % 100).padStart(2, '0')} (Apr {y} - Mar {y + 1})</option>);
                      }
                      return options;
                    })()}
                  </select>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                    {companyForm.financialYearStart && companyForm.financialYearEnd
                      ? `${companyForm.financialYearStart} to ${companyForm.financialYearEnd}`
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Right Column: Customer Default Fields Settings */}
              <div className="space-y-2">
                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-850/50 pb-0.5">Default Customer address details</span>
                
                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Default Country</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultCountry}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultCountry: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    placeholder="e.g. India"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Default State</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultState}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultState: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    placeholder="e.g. Maharashtra"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Default City</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultCity}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultCity: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    placeholder="e.g. Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5 text-[11px]">Default Area</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultArea}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultArea: e.target.value })}
                    className="w-full h-7 py-0.5 px-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none"
                    placeholder="e.g. Dadar"
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

              {/* LEDGER GROUPS FIND */}
              {activeSubTab === 'ledger-groups' &&
                customerGroups
                  .filter(cg => cg.groupName.toLowerCase().includes(findSearchQuery.toLowerCase()))
                  .map(cg => (
                    <button
                      key={cg._id}
                      onClick={() => {
                        const idx = customerGroups.findIndex(item => item._id === cg._id);
                        setCustomerGroupIndex(idx);
                        loadCustomerGroupDetails(cg);
                        setShowFindModal(false);
                        setFindSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800/40 text-slate-300 hover:text-white rounded-lg text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">{cg.groupName}</span>
                      <span className="font-mono text-amber-500 text-[10px]">#{cg.groupCode || 'GRP'}</span>
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

      {/* SAVE CUSTOMER GROUP PROMPT MODAL */}
      {showSaveGroupModal && (() => {
        const baseGroups = Array.from(new Set(['General', ...customerGroups.map(cg => cg.groupName).filter(Boolean)]));
        const query = saveGroupInput.trim().toLowerCase();
        let modalGroupList = baseGroups.filter(g => !query || g.toLowerCase().includes(query));
        if (query && !baseGroups.some(g => g.toLowerCase() === query)) {
          modalGroupList.push(`+ Create "${saveGroupInput.trim()}"`);
        }

        const handleModalKeyDown = (e) => {
          if (modalGroupList.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setModalActiveIndex(prev => (prev + 1) % modalGroupList.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setModalActiveIndex(prev => (prev - 1 + modalGroupList.length) % modalGroupList.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const chosen = modalGroupList[modalActiveIndex] || saveGroupInput || 'General';
            const cleanName = chosen.startsWith('+ Create "') ? chosen.replace('+ Create "', '').replace('"', '') : chosen;
            executeCustomerSave(cleanName);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSaveGroupModal(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Customer Group</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveGroupModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-955 p-3 rounded-xl border border-slate-850 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Saving Customer</span>
                    <span className="font-bold text-slate-100 text-sm">{customerForm.name}</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded">
                    #{customerForm.customerCode}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                    Filter / Type Group (Press ↓ ↑ to Navigate, Enter to Select):
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={saveGroupInput}
                    onChange={(e) => {
                      setSaveGroupInput(e.target.value);
                      setModalActiveIndex(0);
                    }}
                    onKeyDown={handleModalKeyDown}
                    placeholder="Search or type group name..."
                    className="w-full h-9 px-3 bg-slate-950 border border-amber-500/50 rounded-xl text-xs font-semibold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Vertical Group Options List with Keyboard Highlight */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block px-1">
                    Group Options ({modalGroupList.length}):
                  </span>
                  
                  <div className="max-h-60 overflow-y-auto space-y-1 p-1 bg-slate-955 rounded-xl border border-slate-850">
                    {modalGroupList.map((gName, idx) => {
                      const isActive = modalActiveIndex === idx;
                      const isNewOption = gName.startsWith('+ Create "');
                      const cleanName = isNewOption ? gName.replace('+ Create "', '').replace('"', '') : gName;
                      const memberCount = customers.filter(c => c.customerGroup === cleanName).length;

                      return (
                        <div
                          key={gName}
                          ref={(el) => {
                            if (isActive && el) {
                              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          }}
                          onClick={() => executeCustomerSave(cleanName)}
                          onMouseEnter={() => setModalActiveIndex(idx)}
                          className={`p-3 rounded-xl text-xs cursor-pointer flex justify-between items-center transition-all ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-lg scale-[1.01]'
                              : 'bg-slate-900/60 text-slate-200 hover:bg-slate-850 border border-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-slate-950' : 'bg-amber-400'}`} />
                            <span className="text-xs font-bold">{gName}</span>
                          </div>

                          {!isNewOption && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {memberCount} Members
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {modalGroupList.length === 0 && (
                      <div className="p-4 text-center text-slate-500 text-xs italic">
                        Press Enter to save customer in "General" group.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="text-[10px] font-mono text-slate-500">Press Esc to cancel</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveGroupModal(false)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const chosen = modalGroupList[modalActiveIndex] || saveGroupInput || 'General';
                      const cleanName = chosen.startsWith('+ Create "') ? chosen.replace('+ Create "', '').replace('"', '') : chosen;
                      executeCustomerSave(cleanName);
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg flex items-center space-x-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
