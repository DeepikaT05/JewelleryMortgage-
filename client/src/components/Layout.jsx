import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  Coins, 
  ArrowLeftRight, 
  TrendingUp, 
  Database, 
  Briefcase,
  LogOut,
  Building,
  ChevronDown,
  Menu,
  X,
  Plus,
  Trash2,
  Printer,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search
} from 'lucide-react';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');
    return token && savedUser ? false : true;
  });
  const [companyDetails, setCompanyDetails] = useState(() => {
    try {
      const saved = localStorage.getItem('companyDetails');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [companies, setCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem('companies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [time, setTime] = useState(new Date());
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- LEDGER MODAL SYSTEM STATES ---
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerTxActiveIndex, setLedgerTxActiveIndex] = useState(0);
  const [ledgerSubTab, setLedgerSubTab] = useState('details'); // Default to details for full ledger statements
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);

  // Forms
  const [newAccForm, setNewAccForm] = useState({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });
  const [newTxForm, setNewTxForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'add', amount: '', remarks: '' });
  
  const [editingAccId, setEditingAccId] = useState(null);
  const [editAccForm, setEditAccForm] = useState({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });

  // --- CTRL + L GLOBAL MARG-STYLE LEDGER LOOKUP SYSTEM STATES ---
  const [showCtrlLLookup, setShowCtrlLLookup] = useState(false);
  const [ctrlLStep, setCtrlLStep] = useState('list'); // 'list' | 'datePrompt' | 'statement'
  const [ctrlLSearchQuery, setCtrlLSearchQuery] = useState('');
  const [ctrlLActiveIndex, setCtrlLActiveIndex] = useState(0);
  const [allCombinedLedgers, setAllCombinedLedgers] = useState([]);
  const [ctrlLLoading, setCtrlLLoading] = useState(false);
  const ctrlLSearchInputRef = useRef(null);

  useEffect(() => {
    if (showCtrlLLookup && ctrlLStep === 'list') {
      const timer = setTimeout(() => {
        ctrlLSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showCtrlLLookup, ctrlLStep]);

  // Active ledger item for statement
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);

  // Date Range Prompt States (Screen 2)
  const getFYStart = () => {
    const now = new Date();
    const year = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    return `${year}-04-01`;
  };
  const [ctrlLFromDate, setCtrlLFromDate] = useState(getFYStart);
  const [ctrlLToDate, setCtrlLToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [datePromptActiveBtn, setDatePromptActiveBtn] = useState(0); // 0: Ledger, 1: Monthly, 2: Daily, 3: Cancel

  // Statement Data States (Screen 3)
  const [ctrlLStatement, setCtrlLStatement] = useState([]);
  const [ctrlLSummary, setCtrlLSummary] = useState({ opening: 0, totalReceipt: 0, totalPayment: 0, closing: 0 });
  const [ctrlLStatementIndex, setCtrlLStatementIndex] = useState(0);
  const [ctrlLStatementLoading, setCtrlLStatementLoading] = useState(false);

  const fetchCombinedLedgersList = async () => {
    setCtrlLLoading(true);
    try {
      const [custRes, groupRes, bankRes, suppRes, dealsRes, txsRes] = await Promise.all([
        axios.get('/api/customers?limit=1000').catch(() => ({ data: { customers: [] } })),
        axios.get('/api/customer-groups').catch(() => ({ data: [] })),
        axios.get('/api/ledgers').catch(() => ({ data: [] })),
        axios.get('/api/suppliers').catch(() => ({ data: [] })),
        axios.get('/api/deals?limit=2000').catch(() => ({ data: { deals: [] } })),
        axios.get('/api/transactions?limit=2000').catch(() => ({ data: { transactions: [] } }))
      ]);

      const allDeals = dealsRes.data.deals || dealsRes.data || [];
      const allTxs = txsRes.data.transactions || txsRes.data || [];

      const custItems = (custRes.data.customers || []).map(c => {
        const custDeals = allDeals.filter(d => (d.customerId?._id || d.customerId) === c._id);
        const custReceipts = allTxs.filter(t => (t.customerId?._id || t.customerId) === c._id);

        const totalDebit = custDeals.reduce((sum, d) => sum + (d.dealAmount || 0), 0);
        const totalCredit = custReceipts.reduce((sum, t) => sum + (t.totalPaid || 0), 0);
        const netBal = totalDebit - totalCredit;

        return {
          id: c._id,
          rawId: c._id,
          name: c.name,
          code: c.customerCode ? `#${c.customerCode}` : '',
          type: 'Customer',
          group: c.customerGroup || 'General',
          mobile: c.mobile || '',
          address: c.address || '',
          area: c.area ? `${c.area}, ${c.city || ''}` : c.city || '',
          state: c.state || '22-CHHATTISGARH',
          gstin: c.gstin || '',
          opening: 0,
          debit: totalDebit,
          credit: totalCredit,
          balance: Math.abs(netBal),
          balanceType: netBal >= 0 ? 'Dr' : 'Cr',
          target: 'customer'
        };
      });

      const groupItems = (groupRes.data || []).map(cg => ({
        id: cg._id,
        rawId: cg._id,
        name: cg.groupName,
        code: cg.groupCode ? `#${cg.groupCode}` : '',
        type: 'Customer Group',
        group: 'Ledger Group',
        mobile: '',
        address: '',
        area: cg.description || '',
        state: '22-CHHATTISGARH',
        gstin: '',
        opening: 0,
        debit: 0,
        credit: 0,
        balance: 0,
        balanceType: 'Dr',
        target: 'customerGroup'
      }));

      const bankItems = (bankRes.data || []).map(l => {
        const debit = l.totalAdd || 0;
        const credit = l.totalDeduct || 0;
        const bal = l.closingBalance || (l.openingBalance + debit - credit);
        return {
          id: l._id,
          rawId: l._id,
          name: l.name,
          code: l.group ? l.group.toUpperCase() : '',
          type: 'Bank / Cash Ledger',
          group: l.group || 'general',
          mobile: '',
          address: '',
          area: l.group ? l.group.toUpperCase() : '',
          state: '22-CHHATTISGARH',
          gstin: '',
          opening: l.openingBalance || 0,
          debit: debit,
          credit: credit,
          balance: Math.abs(bal),
          balanceType: bal >= 0 ? 'Dr' : 'Cr',
          target: 'bankLedger'
        };
      });

      const suppItems = (suppRes.data || []).map(s => ({
        id: s._id,
        rawId: s._id,
        name: s.name,
        code: s.code || '#SUPP',
        type: 'Supplier Account',
        group: 'Supplier',
        mobile: s.phone || s.mobile || '',
        address: s.address || '',
        area: s.city || '',
        state: '22-CHHATTISGARH',
        gstin: s.gstin || '',
        opening: 0,
        debit: 0,
        credit: 0,
        balance: 0,
        balanceType: 'Dr',
        target: 'supplier'
      }));

      const combined = [...custItems, ...groupItems, ...bankItems, ...suppItems];
      combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAllCombinedLedgers(combined);
    } catch (err) {
      console.error('Error fetching combined ledgers:', err);
    } finally {
      setCtrlLLoading(false);
    }
  };

  const fetchLedgerStatement = async (item, fromD, toD) => {
    if (!item) return;
    setCtrlLStatementLoading(true);
    try {
      if (item.target === 'customer') {
        const res = await axios.get(`/api/reports/accounting-group-ledger?customerId=${item.rawId}&startDate=${fromD}&endDate=${toD}`);
        const rawLedger = res.data.ledger || [];
        const opening = res.data.openingPrincipal || 0;
        
        let runningBal = opening;
        let totalReceipt = 0;
        let totalPayment = 0;

        const formatted = rawLedger.map(row => {
          const dateStr = row.date ? new Date(row.date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : '';
          const isDeal = row.type === 'Deal';
          const isReceipt = row.type === 'Receipt';

          const debit = isDeal ? row.amount : 0;
          const credit = isReceipt ? row.amount : 0;

          totalReceipt += debit;
          totalPayment += credit;
          runningBal += (debit - credit);

          return {
            raw: row,
            date: dateStr,
            fullDate: row.date,
            type: isDeal ? 'Sale' : 'Rcpt',
            narration: row.particulars || `Bill / Receipt #${row.no}`,
            receipt: debit,
            payment: credit,
            balance: runningBal,
            balanceType: runningBal >= 0 ? 'Dr' : 'Cr',
            target: isDeal ? 'deal' : 'transaction',
            refNo: row.no
          };
        });

        setCtrlLStatement(formatted);
        setCtrlLSummary({
          opening,
          totalReceipt,
          totalPayment,
          closing: runningBal
        });
      } else if (item.target === 'bankLedger') {
        const res = await axios.get(`/api/ledgers/transactions/${item.rawId}`);
        const txs = res.data.transactions || [];
        const acc = res.data.account || {};

        let runningBal = acc.openingBalance || 0;
        let totalAdd = 0;
        let totalDeduct = 0;

        const formatted = txs.map(tx => {
          const dateStr = tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : '';
          const debit = tx.type === 'add' ? tx.amount : 0;
          const credit = tx.type === 'deduct' ? tx.amount : 0;

          totalAdd += debit;
          totalDeduct += credit;
          runningBal += (debit - credit);

          return {
            raw: tx,
            date: dateStr,
            fullDate: tx.date,
            type: tx.type === 'add' ? 'Rcpt' : 'Pymt',
            narration: tx.remarks || `Ledger Tx #${tx._id.slice(-6)}`,
            receipt: debit,
            payment: credit,
            balance: runningBal,
            balanceType: runningBal >= 0 ? 'Dr' : 'Cr',
            target: 'ledgerTx',
            refNo: tx._id
          };
        });

        setCtrlLStatement(formatted);
        setCtrlLSummary({
          opening: acc.openingBalance || 0,
          totalReceipt: totalAdd,
          totalPayment: totalDeduct,
          closing: runningBal
        });
      } else {
        setCtrlLStatement([]);
        setCtrlLSummary({ opening: 0, totalReceipt: 0, totalPayment: 0, closing: 0 });
      }
    } catch (err) {
      console.error('Error loading ledger statement:', err);
    } finally {
      setCtrlLStatementLoading(false);
    }
  };

  const handleSelectCombinedLedger = (item) => {
    if (!item) return;
    setSelectedLedgerItem(item);
    setDatePromptActiveBtn(0);
    setCtrlLStep('datePrompt');
  };

  const handleAlterTransaction = (txRow) => {
    setShowCtrlLLookup(false);
    if (!txRow) return;

    const statementContext = {
      selectedLedgerItem,
      ctrlLFromDate,
      ctrlLToDate,
      ctrlLStatementIndex
    };

    if (txRow.target === 'deal') {
      navigate('/deal-master', { 
        state: { 
          dealNo: txRow.refNo,
          fromCtrlLStatement: true,
          statementContext
        } 
      });
    } else if (txRow.target === 'transaction') {
      navigate('/transaction', { 
        state: { 
          transactionNo: txRow.refNo,
          fromCtrlLStatement: true,
          statementContext
        } 
      });
    } else if (txRow.target === 'ledgerTx') {
      setSelectedLedgerId(selectedLedgerItem?.rawId);
      setShowLedgerModal(true);
    }
  };

  // Reopen Ctrl+L Statement modal when coming back from deal-master or transaction
  useEffect(() => {
    const handleReopenStatement = (e) => {
      const ctx = e.detail;
      if (ctx && ctx.selectedLedgerItem) {
        setSelectedLedgerItem(ctx.selectedLedgerItem);
        if (ctx.ctrlLFromDate) setCtrlLFromDate(ctx.ctrlLFromDate);
        if (ctx.ctrlLToDate) setCtrlLToDate(ctx.ctrlLToDate);
        fetchLedgerStatement(ctx.selectedLedgerItem, ctx.ctrlLFromDate || ctrlLFromDate, ctx.ctrlLToDate || ctrlLToDate);
        setCtrlLStep('statement');
        if (ctx.ctrlLStatementIndex !== undefined) {
          setCtrlLStatementIndex(ctx.ctrlLStatementIndex);
        }
        setShowCtrlLLookup(true);
      }
    };

    window.addEventListener('reopen-ctrl-l-statement', handleReopenStatement);
    return () => window.removeEventListener('reopen-ctrl-l-statement', handleReopenStatement);
  }, [ctrlLFromDate, ctrlLToDate]);

  const fetchLedgers = async () => {
    try {
      const res = await axios.get('/api/ledgers');
      setLedgers(res.data);
      if (res.data.length > 0 && !selectedLedgerId) {
        setSelectedLedgerId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching ledgers:', err);
    }
  };

  const fetchLedgerTx = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/ledgers/${id}/transactions`);
      setLedgerTransactions(res.data);
      setLedgerTxActiveIndex(0);
    } catch (err) {
      console.error('Error fetching ledger transactions:', err);
    }
  };

  useEffect(() => {
    if (showLedgerModal) {
      fetchLedgers();
    }
  }, [showLedgerModal]);

  useEffect(() => {
    if (selectedLedgerId && showLedgerModal) {
      fetchLedgerTx(selectedLedgerId);
    }
  }, [selectedLedgerId, showLedgerModal]);

  // Auto-focus first input box on page navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = document.querySelector('main input:not([disabled]):not([type=hidden]):not([readonly]), main select:not([disabled]), main textarea:not([disabled])');
      if (firstInput) {
        firstInput.focus();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Global Keyboard Shortcuts (F2 for New, ESC for Back/Cancel, Alt + L for Ledger, PageUp/PageDown/Enter navigation, Arrow Key field navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Alt + L or Ctrl + L: Toggle Ledger Modal
      if ((e.altKey && e.key.toLowerCase() === 'l') || (e.ctrlKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setLedgerSubTab('details');
        setShowCreateForm(false);
        setShowTxForm(false);
        setShowLedgerModal(prev => !prev);
      }
      
      // 2. F2: Add new record
      if (e.key === 'F2') {
        e.preventDefault();
        const addBtn = document.getElementById('toolbar-add-button');
        if (addBtn) addBtn.click();
      }

      // 3. Escape: Back / Cancel
      if (e.key === 'Escape') {
        if (showLedgerModal) {
          e.preventDefault();
          setShowLedgerModal(false);
        } else {
          const cancelBtn = document.getElementById('toolbar-cancel-button');
          if (cancelBtn) {
            e.preventDefault();
            cancelBtn.click();
          }
        }
      }

      // 4. PageUp: Previous Record
      if (e.key === 'PageUp') {
        const prevBtn = document.getElementById('toolbar-prev-button');
        if (prevBtn) {
          e.preventDefault();
          prevBtn.click();
        }
      }

      // 5. PageDown: Next Record
      if (e.key === 'PageDown') {
        const nextBtn = document.getElementById('toolbar-next-button');
        if (nextBtn) {
          e.preventDefault();
          nextBtn.click();
        }
      }

      // 6. Enter & Arrow Key Navigation between form input fields and dropdowns
      const target = e.target;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
        if (e.key === 'Enter') {
          // A. If target is a Save/Update button, execute click to Save!
          if (target.tagName === 'BUTTON' || target.type === 'submit' || target.type === 'button') {
            const btnText = (target.innerText || target.value || '').toLowerCase();
            if (target.id === 'toolbar-save-button' || target.type === 'submit' || target.classList.contains('submit-btn') || btnText.includes('save') || btnText.includes('update')) {
              e.preventDefault();
              target.click();
              return;
            }
          }

          // B. If target is an INPUT, SELECT dropdown, or TEXTAREA
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
            if (target.tagName === 'TEXTAREA' && e.shiftKey) {
              return;
            }
            
            e.preventDefault();
            const form = target.form || target.closest('form') || document.querySelector('main') || document;
            const selector = 'input:not([disabled]):not([readonly]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button[type=submit]:not([disabled]), button.submit-btn:not([disabled]), #toolbar-save-button:not([disabled])';
            const focusables = Array.from(form.querySelectorAll(selector)).filter(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
            });
            const index = focusables.indexOf(target);

            if (index > -1 && index < focusables.length - 1) {
              focusables[index + 1].focus();
            } else if (index === focusables.length - 1) {
              // Pressing enter on last input field automatically triggers Save!
              const saveBtn = document.getElementById('toolbar-save-button') || form.querySelector('button[type=submit]') || form.querySelector('.submit-btn') || document.querySelector('button[type=submit]');
              if (saveBtn && !saveBtn.disabled) {
                saveBtn.focus();
                saveBtn.click();
              }
            }
          }
        } else if (e.key === 'ArrowDown') {
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
            if (target.type === 'radio' || target.type === 'checkbox' || target.selectionStart === (target.value ? target.value.length : 0)) {
              e.preventDefault();
              const form = target.form || target.closest('form') || document.querySelector('main') || document;
              const selector = 'input:not([disabled]):not([readonly]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button[type=submit]:not([disabled]), button.submit-btn:not([disabled]), #toolbar-save-button:not([disabled])';
              const focusables = Array.from(form.querySelectorAll(selector)).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
              });
              const index = focusables.indexOf(target);
              if (index > -1 && index < focusables.length - 1) {
                focusables[index + 1].focus();
              }
            }
          }
        } else if (e.key === 'ArrowUp') {
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
            if (target.type === 'radio' || target.type === 'checkbox' || target.selectionStart === 0) {
              e.preventDefault();
              const form = target.form || target.closest('form') || document.querySelector('main') || document;
              const selector = 'input:not([disabled]):not([readonly]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button[type=submit]:not([disabled]), button.submit-btn:not([disabled]), #toolbar-save-button:not([disabled])';
              const focusables = Array.from(form.querySelectorAll(selector)).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
              });
              const index = focusables.indexOf(target);
              if (index > 0) {
                focusables[index - 1].focus();
              }
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showLedgerModal]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      const groupValue = newAccForm.group === 'custom' ? newAccForm.customGroup : newAccForm.group;
      await axios.post('/api/ledgers', {
        name: newAccForm.name,
        group: groupValue,
        openingBalance: newAccForm.openingBalance
      });
      setNewAccForm({ name: '', group: 'cash', customGroup: '', openingBalance: 0 });
      setShowCreateForm(false);
      fetchLedgers();
    } catch (err) {
      console.error('Error creating ledger account:', err);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      const groupValue = editAccForm.group === 'custom' ? editAccForm.customGroup : editAccForm.group;
      await axios.put(`/api/ledgers/${editingAccId}`, {
        name: editAccForm.name,
        group: groupValue,
        openingBalance: editAccForm.openingBalance
      });
      setEditingAccId(null);
      setShowCreateForm(false);
      fetchLedgers();
    } catch (err) {
      console.error('Error updating ledger account:', err);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ledger account? All its transactions will be deleted.')) return;
    try {
      await axios.delete(`/api/ledgers/${id}`);
      if (selectedLedgerId === id) setSelectedLedgerId('');
      fetchLedgers();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!newTxForm.amount) return;
    try {
      await axios.post(`/api/ledgers/${selectedLedgerId}/transactions`, newTxForm);
      setNewTxForm({ date: new Date().toISOString().split('T')[0], type: 'add', amount: '', remarks: '' });
      setShowTxForm(false);
      fetchLedgerTx(selectedLedgerId);
      fetchLedgers();
    } catch (err) {
      console.error('Error creating transaction:', err);
    }
  };

  const handleDeleteTx = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await axios.delete(`/api/ledgers/transactions/${txId}`);
      fetchLedgerTx(selectedLedgerId);
      fetchLedgers();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handlePrintLedger = () => {
    const acc = ledgers.find(l => l._id === selectedLedgerId);
    if (!acc) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${acc.name} - Ledger Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 20px; background: #fafafa; padding: 15px; border: 1px solid #eee; }
            .amount { font-family: monospace; font-size: 14px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Ledger Account Statement</h2>
            <p><strong>Account Name:</strong> ${acc.name} (${acc.group.toUpperCase()})</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="summary">
            <div>Opening Balance: <strong>₹${acc.openingBalance.toFixed(2)}</strong></div>
            <div>Total Additions (DD): <strong>₹${acc.totalAdd.toFixed(2)}</strong></div>
            <div>Total Deductions: <strong>₹${acc.totalDeduct.toFixed(2)}</strong></div>
            <div>Closing Balance: <strong>₹${acc.closingBalance.toFixed(2)}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Source</th>
                <th>Remarks</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerTransactions.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString()}</td>
                  <td style="color: ${t.type === 'add' ? 'green' : 'red'}; text-transform: uppercase; font-weight: bold;">
                    ${t.type === 'add' ? 'Addition (DD)' : 'Deduction'}
                  </td>
                  <td>${t.refType.toUpperCase()}</td>
                  <td>${t.remarks || ''}</td>
                  <td class="amount">₹${t.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${ledgerTransactions.length === 0 ? '<tr><td colspan="5" style="text-align: center;">No transactions found.</td></tr>' : ''}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    // Live clock update
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Session data
  const fetchSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (currentUser) {
        // Refresh company details in the background so the financial year
        // badge stays current even when the user session is cached.
        try {
          const compListRes = await axios.get('/api/companies');
          setCompanies(compListRes.data);
          localStorage.setItem('companies', JSON.stringify(compListRes.data));
          if (currentUser.companyId) {
            const activeComp = compListRes.data.find(c => c._id === currentUser.companyId);
            if (activeComp) {
              setCompanyDetails(activeComp);
              localStorage.setItem('companyDetails', JSON.stringify(activeComp));
            }
          }
        } catch (refreshErr) {
          console.error('Company refresh failed:', refreshErr);
        }
        // Redirect store users to deal-master if they try to access restricted paths (like /)
        const isStoreUser = currentUser.role !== 'admin';
        const allowedPaths = ['/deal-master', '/transaction', '/day-report', '/customers'];
        if (isStoreUser && !allowedPaths.includes(location.pathname)) {
          navigate('/deal-master');
        }
        return;
      }
      
      // Get current user
      const userRes = await axios.get('/api/auth/me');
      setCurrentUser(userRes.data);
      localStorage.setItem('currentUser', JSON.stringify(userRes.data));

      // Get all companies
      const compListRes = await axios.get('/api/companies');
      setCompanies(compListRes.data);
      localStorage.setItem('companies', JSON.stringify(compListRes.data));

      // Get current active company
      if (userRes.data.companyId) {
        const activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
        setCompanyDetails(activeComp);
        if (activeComp) {
          localStorage.setItem('companyDetails', JSON.stringify(activeComp));
        }
      }
      
      // Redirect store users to deal-master if they try to access restricted paths (like /)
      const isStoreUser = userRes.data.role !== 'admin';
      const allowedPaths = ['/deal-master', '/transaction', '/day-report', '/customers'];
      if (isStoreUser && !allowedPaths.includes(location.pathname)) {
        navigate('/deal-master');
      }
      setLoading(false);
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('companyDetails');
      localStorage.removeItem('companies');
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchSession();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('companyDetails');
    localStorage.removeItem('companies');
    navigate('/login');
  };

  const handleCompanySwitch = async (companyId) => {
    try {
      const res = await axios.post('/api/companies/switch', { companyId });
      const activeComp = companies.find(c => c._id === companyId);
      if (activeComp) {
        localStorage.setItem('companyDetails', JSON.stringify(activeComp));
      }
      // Reload page to refresh all scoped database calls
      window.location.reload();
    } catch (err) {
      console.error('Error switching company', err);
    }
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isOperator = role === 'operator' || role === 'staff';

  const [sidebarGroups, setSidebarGroups] = useState([]);
  const [isGroupsSubmenuOpen, setIsGroupsSubmenuOpen] = useState(false);
  const [showCreateSidebarGroupModal, setShowCreateSidebarGroupModal] = useState(false);
  const [newSidebarGroupName, setNewSidebarGroupName] = useState('');

  const fetchSidebarGroups = async () => {
    try {
      const [cgRes, custRes] = await Promise.all([
        axios.get('/api/customer-groups'),
        axios.get('/api/customers?limit=1000')
      ]);
      const dbG = (cgRes.data || []).map(g => g.groupName);
      const custG = (custRes.data?.customers || []).map(c => c.area || c.group || c.city).filter(Boolean);
      const unique = Array.from(new Set([...dbG, ...custG])).filter(Boolean).sort();
      setSidebarGroups(unique);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSidebarGroups();
  }, []);

  const handleCreateSidebarGroup = async (e) => {
    e.preventDefault();
    if (!newSidebarGroupName.trim()) return;
    try {
      await axios.post('/api/customer-groups', { groupName: newSidebarGroupName.trim() });
      setNewSidebarGroupName('');
      setShowCreateSidebarGroupModal(false);
      await fetchSidebarGroups();
      navigate(`/accounting-group?groupName=${encodeURIComponent(newSidebarGroupName.trim())}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating group');
    }
  };

  const allMenuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Operations', path: '/operations', icon: <Layers className="h-5 w-5" />, roles: ['admin'] },
    { name: 'General Masters', path: '/general-masters', icon: <Briefcase className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Deal Master', path: '/deal-master', icon: <Coins className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Transaction', path: '/transaction', icon: <ArrowLeftRight className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Customers', path: '/customers', icon: <Users className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Reports', path: '/reports', icon: <FileText className="h-5 w-5" />, roles: ['admin'] },
    { name: 'Ledger Groups', path: '/accounting-group', icon: <BookOpen className="h-5 w-5" />, roles: ['admin'], hasSubmenu: true },
    { name: 'Day Report', path: '/day-report', icon: <CalendarDays className="h-5 w-5" />, roles: ['admin', 'manager', 'operator', 'staff'] },
    { name: 'Girvi Setup', path: '/girvi-setup', icon: <Settings className="h-5 w-5" />, roles: ['admin'] }
  ];

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuItems = role ? allMenuItems.filter(item => item.roles.includes(role)) : [];

  const [focusedMenuIdx, setFocusedMenuIdx] = useState(-1);

  // Sync focused index with active location path
  useEffect(() => {
    const activeIdx = menuItems.findIndex(i => i.path === location.pathname);
    if (activeIdx >= 0) setFocusedMenuIdx(activeIdx);
  }, [location.pathname, menuItems.length]);

  // Global keydown listener for sidebar menu navigation using ArrowUp / ArrowDown / Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = ['input', 'textarea', 'select'].includes(activeTag) || document.activeElement?.isContentEditable;

      if (isInput) return; // Allow normal input typing

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedMenuIdx(prev => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedMenuIdx(prev => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        if (focusedMenuIdx >= 0 && focusedMenuIdx < menuItems.length) {
          e.preventDefault();
          navigate(menuItems[focusedMenuIdx].path);
          setIsMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [menuItems, focusedMenuIdx, navigate]);

  // Global Ctrl + L / Cmd + L shortcut listener (works everywhere in app)
  useEffect(() => {
    const handleCtrlLShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        e.stopPropagation();
        setShowCtrlLLookup(prev => {
          const next = !prev;
          if (next) {
            setCtrlLStep('list');
            setCtrlLSearchQuery('');
            setCtrlLActiveIndex(0);
            setCtrlLStatementIndex(0);
            fetchCombinedLedgersList();
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleCtrlLShortcut, true);
    return () => window.removeEventListener('keydown', handleCtrlLShortcut, true);
  }, []);

  // Global Keydown Listener for showLedgerModal arrow navigation & Enter edit
  useEffect(() => {
    const handleLedgerModalKeyDown = (e) => {
      if (!showLedgerModal || ledgerSubTab !== 'details' || ledgerTransactions.length === 0) return;
      
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (['input', 'textarea', 'select'].includes(activeTag)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLedgerTxActiveIndex(prev => (prev + 1) % ledgerTransactions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLedgerTxActiveIndex(prev => (prev - 1 + ledgerTransactions.length) % ledgerTransactions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const tx = ledgerTransactions[ledgerTxActiveIndex];
        if (tx) {
          setShowLedgerModal(false);
          if (tx.refType === 'deal') {
            navigate('/deal-master', { state: { dealNo: tx.refId } });
          } else if (tx.refType === 'transaction') {
            navigate('/transaction', { state: { transactionNo: tx.refId } });
          }
        }
      }
    };

    window.addEventListener('keydown', handleLedgerModalKeyDown);
    return () => window.removeEventListener('keydown', handleLedgerModalKeyDown);
  }, [showLedgerModal, ledgerSubTab, ledgerTransactions, ledgerTxActiveIndex, navigate]);

  // Global Keydown Listener for showCtrlLLookup Marg ERP 4-screen navigation & Esc hierarchical back
  useEffect(() => {
    if (!showCtrlLLookup) return;

    const handleCtrlLNavigation = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      
      // Screen 3: Statement
      if (ctrlLStep === 'statement') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCtrlLStatementIndex(prev => (ctrlLStatement.length ? (prev + 1) % ctrlLStatement.length : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCtrlLStatementIndex(prev => (ctrlLStatement.length ? (prev - 1 + ctrlLStatement.length) % ctrlLStatement.length : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const row = ctrlLStatement[ctrlLStatementIndex];
          if (row) {
            handleAlterTransaction(row);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setCtrlLStep('datePrompt');
        }
      }
      // Screen 2: Date Prompt
      else if (ctrlLStep === 'datePrompt') {
        if (['input', 'textarea', 'select'].includes(activeTag) && (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape')) {
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setDatePromptActiveBtn(prev => (prev + 1) % 4);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setDatePromptActiveBtn(prev => (prev - 1 + 4) % 4);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (datePromptActiveBtn === 0 || datePromptActiveBtn === 1 || datePromptActiveBtn === 2) {
            fetchLedgerStatement(selectedLedgerItem, ctrlLFromDate, ctrlLToDate);
            setCtrlLStep('statement');
          } else if (datePromptActiveBtn === 3) {
            setCtrlLStep('list');
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setCtrlLStep('list');
        }
      }
      // Screen 1: List
      else if (ctrlLStep === 'list') {
        const q = ctrlLSearchQuery.trim().toLowerCase();
        const filteredList = allCombinedLedgers.filter(item => {
          if (!q) return true;
          return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.code && item.code.toLowerCase().includes(q)) ||
            (item.type && item.type.toLowerCase().includes(q)) ||
            (item.group && item.group.toLowerCase().includes(q)) ||
            (item.mobile && item.mobile.includes(q)) ||
            (item.area && item.area.toLowerCase().includes(q))
          );
        });

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCtrlLActiveIndex(prev => (filteredList.length ? (prev + 1) % filteredList.length : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCtrlLActiveIndex(prev => (filteredList.length ? (prev - 1 + filteredList.length) % filteredList.length : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const activeLedger = filteredList[ctrlLActiveIndex] || filteredList[0];
          if (activeLedger && activeLedger.id) {
            handleSelectCombinedLedger(activeLedger);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (ctrlLSearchQuery) {
            setCtrlLSearchQuery('');
            setCtrlLActiveIndex(0);
          } else {
            setShowCtrlLLookup(false);
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          if (document.activeElement !== ctrlLSearchInputRef.current) {
            ctrlLSearchInputRef.current?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleCtrlLNavigation, true);
    return () => window.removeEventListener('keydown', handleCtrlLNavigation, true);
  }, [showCtrlLLookup, ctrlLStep, ctrlLStatement, ctrlLStatementIndex, datePromptActiveBtn, selectedLedgerItem, ctrlLFromDate, ctrlLToDate, allCombinedLedgers, ctrlLSearchQuery, ctrlLActiveIndex]);

  // Format date nicely
  const formatDate = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-955 text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <Coins className="h-10 w-10 text-primary-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-450 tracking-wide">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="glass-panel sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800 shadow-md no-print">
        {/* Left Side: Brand info & Financial Period & Hamburger Toggle */}
        <div className="flex items-center space-x-3 md:space-x-6">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg focus:outline-none transition-all"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-2">
            <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary-500" />
            <span className="text-sm md:text-lg font-bold tracking-wide bg-gradient-to-r from-primary-400 to-amber-300 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-xs md:max-w-none">
              {companyDetails ? companyDetails.name : 'Girvi Management'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-amber-400">
            <span>Financial Period:</span>
            <span>
              {companyDetails?.financialYearStart && companyDetails?.financialYearEnd
                ? `${new Date(companyDetails.financialYearStart).getFullYear()} - ${String(new Date(companyDetails.financialYearEnd).getFullYear() % 100).padStart(2, '0')}`
                : '2026 - 27'}
            </span>
          </div>
        </div>

        {/* Right Side: Live Clock, Switcher, User Dropdown */}
        <div className="flex items-center space-x-6">
          {/* Live Clock */}
          <div className="hidden lg:flex flex-col items-end text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{formatDate(time)}</span>
            <span className="font-mono text-amber-500/80">{formatTime(time)}</span>
          </div>

          {/* Switch Company (Admin Only Dropdown) */}
          {companies.length > 1 && currentUser?.role === 'admin' && (
            <div className="flex items-center space-x-1.5 text-sm bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Building className="h-4 w-4 text-slate-400" />
              <select
                value={currentUser.companyId || ''}
                onChange={(e) => handleCompanySwitch(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-300 font-medium cursor-pointer"
              >
                {companies.map(c => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Logged in User */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-850 text-slate-200 text-sm font-semibold transition-all"
            >
              <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                {currentUser?.name?.slice(0, 2) || 'ST'}
              </div>
              <span className="hidden sm:inline">{currentUser?.name || 'Staff User'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 text-slate-200 animate-slide-in">
                <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
                  Logged in as <span className="font-semibold text-slate-300">{currentUser?.username}</span> ({currentUser?.role})
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Frame: Sidebar + Content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 top-[56px] z-40 bg-black/50 backdrop-blur-sm md:hidden transition-all duration-300"
          />
        )}

        {/* 2. SIDEBAR */}
        <aside className={`
          fixed top-[56px] bottom-0 left-0 z-50 bg-slate-900 md:bg-slate-900/60 border-r border-slate-850 p-3 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:translate-x-0 md:flex no-print shrink-0
          ${isSidebarCollapsed ? 'w-20' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="space-y-1.5">
            {/* Sidebar Desktop Collapse Toggle Header */}
            <div className="hidden md:flex items-center justify-between pb-2 mb-1 border-b border-slate-800/60">
              {!isSidebarCollapsed && (
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Navigation</span>
              )}
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all mx-auto md:ml-auto"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-5 w-5 text-primary-400" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
            </div>

            {/* Mobile Sidebar Close Header */}
            <div className="flex items-center justify-between md:hidden mb-4 pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-100 text-sm">Navigation</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              const isFocused = focusedMenuIdx === idx;

              if (item.hasSubmenu) {
                const isSubmenuActive = location.pathname.startsWith('/accounting-group');
                return (
                  <div key={item.name} className="space-y-1">
                    <div
                      onClick={() => setIsGroupsSubmenuOpen(!isGroupsSubmenuOpen)}
                      className={`flex items-center justify-between space-x-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        isSidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                      } ${
                        isSubmenuActive 
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30 font-bold' 
                          : isFocused
                          ? 'bg-slate-800 text-white ring-2 ring-primary-500 font-bold'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="shrink-0">{item.icon}</div>
                        {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 shrink-0 ${isGroupsSubmenuOpen ? 'rotate-180' : ''}`} />
                      )}
                    </div>

                    {!isSidebarCollapsed && isGroupsSubmenuOpen && (
                      <div className="pl-6 pr-1 space-y-1 text-xs font-mono max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setShowCreateSidebarGroupModal(true)}
                          className="w-full flex items-center space-x-2 py-1.5 px-2.5 rounded-lg text-slate-950 font-black hover:bg-slate-200 transition-all text-left border border-slate-300 bg-slate-100 shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-950 stroke-[3]" />
                          <span className="text-slate-950 font-black">Create New Group</span>
                        </button>

                        <Link
                          to="/accounting-group"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-1.5 px-2.5 rounded-lg transition-all font-bold ${
                            location.pathname === '/accounting-group' && !location.search
                              ? 'bg-primary-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          All Ledger Groups
                        </Link>

                        {sidebarGroups.map((g) => {
                          const isGroupSelected = location.search.includes(encodeURIComponent(g));
                          return (
                            <Link
                              key={g}
                              to={`/accounting-group?groupName=${encodeURIComponent(g)}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`block py-1.5 px-2.5 rounded-lg transition-all truncate ${
                                isGroupSelected
                                  ? 'bg-primary-600 text-white font-bold'
                                  : 'text-slate-300 hover:bg-slate-800/60'
                              }`}
                            >
                              {g}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={isSidebarCollapsed ? item.name : undefined}
                  onClick={() => { setFocusedMenuIdx(idx); setIsMobileMenuOpen(false); }}
                  className={`flex items-center space-x-3 rounded-xl text-sm font-medium transition-all ${
                    isSidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30 font-bold' 
                      : isFocused
                      ? 'bg-slate-800 text-white ring-2 ring-primary-500 font-bold'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="shrink-0">{item.icon}</div>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          <div className="mt-auto space-y-1.5 pt-4 border-t border-slate-850">
            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? 'Logout' : undefined}
              className={`w-full flex items-center space-x-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left ${
                isSidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
              }`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
            {!isSidebarCollapsed && (
              <div className="text-center pt-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                  {currentUser?.role === 'admin' ? 'Girvi Management' : 'Store Manager Panel'}
                </span>
                <span className="text-[9px] text-slate-600 font-mono mt-0.5 block">
                  v1.0.0 (Financial Apr26)
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* 3. CREATE NEW GROUP MODAL FROM SIDEBAR */}
        {showCreateSidebarGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans">
            <div className="w-full max-w-md bg-slate-950 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-emerald-400" />
                  <span>Create New Customer Group</span>
                </h3>
                <button 
                  onClick={() => setShowCreateSidebarGroupModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSidebarGroup} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                    Group / Area / Station Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newSidebarGroupName}
                    onChange={(e) => setNewSidebarGroupName(e.target.value)}
                    placeholder="e.g. Potiyakala, Funda, Durg, Dania..."
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/50 rounded-lg text-emerald-300 font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Customers assigned to this group/station will be organized under this section.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setShowCreateSidebarGroupModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg shadow-md"
                  >
                    Save Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. MAIN CONTENT VIEW */}
        <main className="flex-1 p-3 md:p-3.5 overflow-y-auto max-w-full print:p-0">
          {children}
        </main>
      </div>

      {/* 4. PERSISTENT FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 px-4 py-1.5 text-center text-[11px] text-slate-500 flex flex-col md:flex-row justify-between items-center no-print mt-auto">
        <div>
          <span className="font-semibold text-slate-400">
            {companyDetails ? companyDetails.name : 'Gold-Silver Loan System'}
          </span>
          {companyDetails?.address && ` — ${companyDetails.address}, ${companyDetails.city}`}
        </div>
        <div className="mt-0.5 md:mt-0 flex space-x-4">
          {companyDetails?.gstin && (
            <span>
              GSTIN: <span className="font-mono text-slate-400">{companyDetails.gstin}</span>
            </span>
          )}
          {companyDetails?.phone && (
            <span>
              Ph: <span className="text-slate-400">{companyDetails.phone}</span>
            </span>
          )}
        </div>
      </footer>

      {/* LEDGER OVERLAY MODAL (CTRL+L Shortcut) */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary-500" />
                <h2 className="text-xl font-bold text-white tracking-wide">General Ledger & Accounts</h2>
              </div>
              <button 
                onClick={() => setShowLedgerModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs Selector */}
            <div className="flex border-b border-slate-800 bg-slate-900/60 p-2">
              <button
                onClick={() => setLedgerSubTab('list')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  ledgerSubTab === 'list' ? 'bg-primary-600 text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Ledger Accounts List
              </button>
              <button
                onClick={() => setLedgerSubTab('details')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  ledgerSubTab === 'details' ? 'bg-primary-600 text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Detailed Statements & DDs
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
              {/* TAB 1: ACCOUNTS LIST VIEW */}
              {ledgerSubTab === 'list' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                    <h3 className="text-sm font-bold text-white">Registered Ledger Accounts</h3>
                    <button
                      onClick={() => {
                        setEditingAccId(null);
                        setShowCreateForm(!showCreateForm);
                      }}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                    >
                      {showCreateForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{showCreateForm ? 'Hide Form' : 'Create Account'}</span>
                    </button>
                  </div>

                  <div className={showCreateForm ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "block"}>
                    {/* Account Creation/Editing Form */}
                    {showCreateForm && (
                      <div className="lg:col-span-1 bg-slate-950/20 p-5 border border-slate-850 rounded-xl space-y-4 h-fit">
                        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                          {editingAccId ? 'Edit Ledger Account' : 'Create Custom Account'}
                        </h3>
                        {editingAccId ? (
                          <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs">
                            <div>
                              <label className="block text-slate-400 mb-1">Account Name</label>
                              <input
                                type="text"
                                required
                                value={editAccForm.name}
                                onChange={(e) => setEditAccForm({ ...editAccForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 mb-1">Accounting Group</label>
                              <select
                                value={editAccForm.group}
                                onChange={(e) => setEditAccForm({ ...editAccForm, group: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                              >
                                <option value="cash">Cash</option>
                                <option value="bank">Bank</option>
                                <option value="crediter">Creditor</option>
                                <option value="debiter">Debtor</option>
                                <option value="custom">Custom...</option>
                              </select>
                            </div>
                            {editAccForm.group === 'custom' && (
                              <div>
                                <label className="block text-slate-400 mb-1">Custom Group Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editAccForm.customGroup}
                                  onChange={(e) => setEditAccForm({ ...editAccForm, customGroup: e.target.value })}
                                  placeholder="e.g. expenses"
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-slate-400 mb-1">Opening Balance (₹)</label>
                              <input
                                type="number"
                                required
                                value={editAccForm.openingBalance}
                                onChange={(e) => setEditAccForm({ ...editAccForm, openingBalance: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                              />
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold">
                                Update
                              </button>
                              <button type="button" onClick={() => { setEditingAccId(null); setShowCreateForm(false); }} className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg">
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
                            <div>
                              <label className="block text-slate-400 mb-1">Account Name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. HDFC Current A/C"
                                value={newAccForm.name}
                                onChange={(e) => setNewAccForm({ ...newAccForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 mb-1">Accounting Group</label>
                              <select
                                value={newAccForm.group}
                                onChange={(e) => setNewAccForm({ ...newAccForm, group: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                              >
                                <option value="cash">Cash</option>
                                <option value="bank">Bank</option>
                                <option value="crediter">Creditor</option>
                                <option value="debiter">Debtor</option>
                                <option value="custom">Custom...</option>
                              </select>
                            </div>
                            {newAccForm.group === 'custom' && (
                              <div>
                                <label className="block text-slate-400 mb-1">Custom Group Name</label>
                                <input
                                  type="text"
                                  required
                                  value={newAccForm.customGroup}
                                  onChange={(e) => setNewAccForm({ ...newAccForm, customGroup: e.target.value })}
                                  placeholder="e.g. expenses"
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-slate-400 mb-1">Opening Balance (₹)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={newAccForm.openingBalance || ''}
                                onChange={(e) => setNewAccForm({ ...newAccForm, openingBalance: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                              />
                            </div>
                            <button type="submit" className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1">
                              <Plus className="h-4 w-4" />
                              <span>Add Account</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Accounts List Table */}
                    <div className={showCreateForm ? "lg:col-span-2" : "w-full"}>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-455 uppercase font-bold tracking-wider">
                              <th className="py-3 px-4">Account Name</th>
                              <th className="py-3 px-4">Group</th>
                              <th className="py-3 px-4 text-right">Opening Bal</th>
                              <th className="py-3 px-4 text-right">Additions (DD)</th>
                              <th className="py-3 px-4 text-right">Deductions</th>
                              <th className="py-3 px-4 text-right">Closing Bal</th>
                              <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-xs">
                            {ledgers.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-4 text-center text-slate-500 italic">No ledger accounts registered.</td>
                              </tr>
                            ) : (
                              ledgers.map(acc => (
                                <tr key={acc._id} className="hover:bg-slate-950/10">
                                  <td className="py-3 px-4 font-semibold text-slate-200">{acc.name}</td>
                                  <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-400">{acc.group}</td>
                                  <td className="py-3 px-4 text-right font-mono">₹{acc.openingBalance.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-right font-mono text-emerald-400">+₹{acc.totalAdd.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-right font-mono text-rose-455">-₹{acc.totalDeduct.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-500">₹{acc.closingBalance.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center space-x-2">
                                      <button
                                        onClick={() => {
                                          setEditingAccId(acc._id);
                                          setEditAccForm({
                                            name: acc.name,
                                            group: ['cash', 'bank', 'crediter', 'debiter'].includes(acc.group) ? acc.group : 'custom',
                                            customGroup: ['cash', 'bank', 'crediter', 'debiter'].includes(acc.group) ? '' : acc.group,
                                            openingBalance: acc.openingBalance
                                          });
                                          setShowCreateForm(true); // Open form for editing!
                                        }}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                                      >
                                        Edit
                                      </button>
                                      {acc.name !== 'Cash' && !acc.bankId && (
                                        <button
                                          onClick={() => handleDeleteAccount(acc._id)}
                                          className="p-1 text-rose-500 hover:text-rose-400"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILED STATEMENT VIEW */}
              {ledgerSubTab === 'details' && (
                <div className="space-y-6">
                  {/* Account Selector & Summary */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-400">Select Account:</span>
                      <select
                        value={selectedLedgerId}
                        onChange={(e) => setSelectedLedgerId(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      >
                        {ledgers.map(l => (
                          <option key={l._id} value={l._id}>{l.name} ({l.group.toUpperCase()})</option>
                        ))}
                      </select>
                    </div>

                    {/* Account Balance Summary cards */}
                    {(() => {
                      const acc = ledgers.find(l => l._id === selectedLedgerId);
                      if (!acc) return null;
                      return (
                        <div className="flex flex-wrap gap-4 text-xs font-mono">
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-455 block text-[10px] uppercase font-sans">Opening</span>
                            <span className="text-slate-200">₹{acc.openingBalance.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-emerald-500/80 block text-[10px] uppercase font-sans">Total Add (DD)</span>
                            <span className="text-emerald-400">+₹{acc.totalAdd.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-rose-500/80 block text-[10px] uppercase font-sans">Total Deduct</span>
                            <span className="text-rose-455">-₹{acc.totalDeduct.toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-amber-500 block text-[10px] uppercase font-sans">Closing Balance</span>
                            <span className="text-amber-400 font-bold">₹{acc.closingBalance.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={handlePrintLedger}
                            className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center space-x-1 font-sans font-semibold text-xs transition-colors"
                          >
                            <Printer className="h-4 w-4 text-primary-400" />
                            <span>Print Ledger</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                    <h3 className="text-sm font-bold text-white">Statement of Account</h3>
                    <button
                      onClick={() => setShowTxForm(!showTxForm)}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                    >
                      {showTxForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{showTxForm ? 'Hide Form' : 'Post Transaction'}</span>
                    </button>
                  </div>

                  <div className={showTxForm ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "block"}>
                    {/* Add manual entry form */}
                    {showTxForm && (
                      <div className="lg:col-span-1 bg-slate-950/20 p-5 border border-slate-850 rounded-xl space-y-4 h-fit">
                        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Add Manual Ledger Transaction</h3>
                        <form onSubmit={handleCreateTx} className="space-y-4 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-400 mb-1">Date</label>
                              <input
                                type="date"
                                required
                                value={newTxForm.date}
                                onChange={(e) => setNewTxForm({ ...newTxForm, date: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 mb-1">Type</label>
                              <select
                                value={newTxForm.type}
                                onChange={(e) => setNewTxForm({ ...newTxForm, type: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                              >
                                <option value="add">Deposit / DD (+)</option>
                                <option value="deduct">Payment / Deduct (-)</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Amount (₹) *</label>
                            <input
                              type="number"
                              required
                              placeholder="0.00"
                              value={newTxForm.amount}
                              onChange={(e) => setNewTxForm({ ...newTxForm, amount: Number(e.target.value) })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Remarks / Narrative</label>
                            <textarea
                              rows="2"
                              placeholder="Transaction notes"
                              value={newTxForm.remarks}
                              onChange={(e) => setNewTxForm({ ...newTxForm, remarks: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                            />
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1">
                            <Plus className="h-4 w-4" />
                            <span>Post Transaction</span>
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Transaction History log */}
                    <div className={showTxForm ? "lg:col-span-2 space-y-4" : "w-full space-y-4"}>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-455 G uppercase font-bold tracking-wider">
                              <th className="py-2.5 px-4">Date</th>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4">Source</th>
                              <th className="py-2.5 px-4">Remarks</th>
                              <th className="py-2.5 px-4 text-right">Amount</th>
                              <th className="py-2.5 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-xs font-mono">
                            {ledgerTransactions.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="py-4 text-center text-slate-500 italic font-sans">No transactions recorded.</td>
                              </tr>
                            ) : (
                              ledgerTransactions.map((t, idx) => {
                                const isActive = ledgerTxActiveIndex === idx;
                                return (
                                  <tr
                                    key={t._id}
                                    ref={(el) => {
                                      if (isActive && el) {
                                        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                      }
                                    }}
                                    onClick={() => {
                                      setShowLedgerModal(false);
                                      if (t.refType === 'deal') {
                                        navigate('/deal-master', { state: { dealNo: t.refId } });
                                      } else if (t.refType === 'transaction') {
                                        navigate('/transaction', { state: { transactionNo: t.refId } });
                                      }
                                    }}
                                    onMouseEnter={() => setLedgerTxActiveIndex(idx)}
                                    className={`cursor-pointer transition-all ${
                                      isActive
                                        ? 'bg-emerald-600 text-slate-955 font-extrabold shadow-md'
                                        : 'hover:bg-slate-955/20 text-slate-300'
                                    }`}
                                  >
                                    <td className="py-2 px-4">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className={`py-2 px-4 font-bold ${t.type === 'add' ? 'text-emerald-400' : 'text-rose-455'}`}>
                                      {t.type === 'add' ? 'ADD' : 'DEDUCT'}
                                    </td>
                                    <td className="py-2 px-4 text-[10px] text-slate-400">{t.refType.toUpperCase()}</td>
                                    <td className="py-2 px-4 text-slate-350 font-sans max-w-[200px] truncate" title={t.remarks}>{t.remarks}</td>
                                    <td className="py-2 px-4 text-right font-bold">₹{t.amount.toFixed(2)}</td>
                                    <td className="py-2 px-4 text-center">
                                      {t.refType === 'manual' ? (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTx(t._id); }} className="text-rose-500 hover:text-rose-400 p-0.5">
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : (
                                        <span className="text-[9px] text-slate-600 font-sans italic">Auto</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer hint */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-center text-[10px] text-slate-550 flex justify-between items-center">
              <span>Press <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold font-mono">Ctrl + L</kbd> at any time to toggle this ledger board.</span>
              <span>Jeweller Mortgage Ledger v1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* CTRL + L GLOBAL MARG ERP STYLE 4-SCREEN LEDGER SYSTEM */}
      {showCtrlLLookup && (() => {
        const q = ctrlLSearchQuery.trim().toLowerCase();
        const filteredList = allCombinedLedgers.filter(item => {
          if (!q) return true;
          return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.code && item.code.toLowerCase().includes(q)) ||
            (item.type && item.type.toLowerCase().includes(q)) ||
            (item.group && item.group.toLowerCase().includes(q)) ||
            (item.mobile && item.mobile.includes(q)) ||
            (item.area && item.area.toLowerCase().includes(q))
          );
        });

        const activeLedger = filteredList[ctrlLActiveIndex] || filteredList[0] || {};
        const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-1 md:p-3 no-print font-mono">
            <div className="bg-slate-950 border-2 border-emerald-600/70 rounded-2xl w-[98vw] max-w-[1750px] h-[95vh] shadow-2xl overflow-hidden text-slate-200 flex flex-col text-xs md:text-sm">
              
              {/* TOP MARG ERP GREEN BANNER */}
              <div className="bg-emerald-950/90 border-b border-emerald-600/60 px-5 py-3 flex justify-between items-center text-emerald-300 font-bold shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="bg-emerald-800 text-slate-950 px-2.5 py-1 rounded font-extrabold uppercase text-xs md:text-sm">
                    {ctrlLStep === 'list' ? 'LEDGER ACCOUNTS' : ctrlLStep === 'datePrompt' ? 'LEDGER DISPLAY' : 'STATEMENT OF ACCOUNT'}
                  </span>
                  <span className="text-emerald-100 text-base md:text-lg font-black tracking-wide">{companyName}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs md:text-sm text-emerald-400 font-bold">Upto : {todayStr}</span>
                  <button
                    type="button"
                    onClick={() => setShowCtrlLLookup(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* SCREEN 1: LEDGER ACCOUNTS TABLE VIEW */}
              {ctrlLStep === 'list' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Filter Search Input */}
                  <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-3 shrink-0">
                    <Search className="h-5 w-5 text-emerald-400 shrink-0" />
                    <input
                      ref={ctrlLSearchInputRef}
                      type="text"
                      autoFocus
                      value={ctrlLSearchQuery}
                      onChange={(e) => {
                        setCtrlLSearchQuery(e.target.value);
                        setCtrlLActiveIndex(0);
                      }}
                      placeholder="Type any alphabet / name / station / code (Use ↓ ↑ & Enter)..."
                      className="w-full bg-slate-955 border-2 border-emerald-500/50 rounded-xl px-4 py-2 text-sm text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                    <span className="text-xs text-slate-400 shrink-0 font-bold px-2">
                      {ctrlLLoading ? 'Loading...' : `${filteredList.length} Ledgers`}
                    </span>
                  </div>

                  {/* Split Table View */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                    {/* Left: Ledgers Table (8 Cols) */}
                    <div className="lg:col-span-8 border-r border-slate-800 flex flex-col overflow-hidden bg-slate-955">
                      <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 p-3 text-xs md:text-sm font-bold text-emerald-400 tracking-wider shrink-0">
                        <span className="col-span-5">LEDGER NAME</span>
                        <span className="col-span-3 text-center">STATION / AREA</span>
                        <span className="col-span-2 text-right">DEBIT (Dr)</span>
                        <span className="col-span-2 text-right">CREDIT (Cr)</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                        {filteredList.map((item, idx) => {
                          const isActive = ctrlLActiveIndex === idx;
                          return (
                            <div
                              key={`${item.type}-${item.id}-${idx}`}
                              ref={(el) => {
                                if (isActive && el) {
                                  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                }
                              }}
                              onClick={() => handleSelectCombinedLedger(item)}
                              onMouseEnter={() => setCtrlLActiveIndex(idx)}
                              className={`grid grid-cols-12 p-2.5 rounded-lg text-xs md:text-sm cursor-pointer items-center transition-all ${
                                isActive
                                  ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-md scale-[1.002]'
                                  : 'hover:bg-slate-900 text-slate-200 border-b border-slate-900/60'
                              }`}
                            >
                              <div className="col-span-5 truncate flex items-center space-x-2">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                                <span className="truncate uppercase font-bold">{item.name}</span>
                              </div>
                              <span className={`col-span-3 text-center truncate ${isActive ? 'text-slate-900' : 'text-rose-300 font-semibold'}`}>
                                {item.area || '-'}
                              </span>
                              <span className="col-span-2 text-right font-mono font-bold">
                                {item.debit > 0 ? item.debit.toFixed(2) : ''}
                              </span>
                              <span className="col-span-2 text-right font-mono font-bold">
                                {item.credit > 0 ? item.credit.toFixed(2) : ''}
                              </span>
                            </div>
                          );
                        })}

                        {!ctrlLLoading && filteredList.length === 0 && (
                          <div className="p-12 text-center text-slate-500 italic text-sm">No matching ledgers found.</div>
                        )}
                      </div>
                    </div>

                    {/* Right: Marg ERP Status Panel (4 Cols) */}
                    <div className="lg:col-span-4 bg-slate-900 p-5 flex flex-col justify-between overflow-y-auto space-y-4 text-xs md:text-sm border-l border-slate-800">
                      <div className="space-y-4">
                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Current Status</span>
                          <span className="text-base font-bold text-white uppercase block mt-1">{activeLedger.name || 'CASH'}</span>
                          <span className="text-xs text-slate-400 font-mono block">{activeLedger.type} • {activeLedger.code}</span>
                        </div>

                        <div className="space-y-2.5 font-mono text-xs md:text-sm">
                          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                            <span className="text-slate-400">Opening :</span>
                            <span className="text-slate-200 font-bold">{(activeLedger.opening || 0).toFixed(2)} Dr</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                            <span className="text-slate-400">Debit :</span>
                            <span className="text-emerald-400 font-bold">{(activeLedger.debit || 0).toFixed(2)} Dr</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                            <span className="text-slate-400">Credit :</span>
                            <span className="text-rose-400 font-bold">{(activeLedger.credit || 0).toFixed(2)} Cr</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                            <span className="text-slate-400">Balance :</span>
                            <span className="text-amber-400 font-extrabold font-mono">{(activeLedger.balance || 0).toFixed(2)} {activeLedger.balanceType || 'Dr'}</span>
                          </div>
                          <div className="flex justify-between pt-1 font-bold">
                            <span className="text-emerald-300">Net :</span>
                            <span className="text-emerald-300 font-mono font-extrabold text-base">{(activeLedger.balance || 0).toFixed(2)} {activeLedger.balanceType || 'Dr'}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-800 pt-3.5 space-y-2 text-xs">
                          <span className="text-[11px] text-slate-500 font-bold uppercase block">Master Details</span>
                          <div><span className="text-slate-500">Address:</span> <span className="text-slate-300 font-bold">{activeLedger.address || activeLedger.area || '-'}</span></div>
                          <div><span className="text-slate-500">Phone:</span> <span className="text-slate-300 font-bold">{activeLedger.mobile || '-'}</span></div>
                          <div><span className="text-slate-500">GSTN:</span> <span className="text-slate-300 font-bold">{activeLedger.gstin || '-'}</span></div>
                          <div><span className="text-slate-500">State:</span> <span className="text-slate-300 font-bold">{activeLedger.state || '22-CHHATTISGARH'}</span></div>
                        </div>
                      </div>

                      <div className="bg-slate-955 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono text-center">
                        Press <kbd className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Enter</kbd> to view statement
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: LEDGER DISPLAY DATE RANGE PROMPT MODAL */}
              {ctrlLStep === 'datePrompt' && (
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-955 relative">
                  <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150">
                    <div className="border-b border-emerald-600/50 pb-3 flex justify-between items-center">
                      <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider">LEDGER DISPLAY</h3>
                      <span className="text-sm font-bold text-white uppercase">{selectedLedgerItem?.name}</span>
                    </div>

                    <div className="bg-slate-955 p-5 rounded-2xl border border-slate-800 space-y-5">
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <span className="font-black text-slate-300 uppercase">FROM</span>
                        <input
                          type="date"
                          autoFocus
                          value={ctrlLFromDate}
                          onChange={(e) => setCtrlLFromDate(e.target.value)}
                          className="bg-slate-900 border-2 border-emerald-500 rounded-xl px-4 py-2 text-emerald-300 font-black focus:outline-none"
                        />
                        <span className="font-black text-slate-300 uppercase">TO</span>
                        <input
                          type="date"
                          value={ctrlLToDate}
                          onChange={(e) => setCtrlLToDate(e.target.value)}
                          className="bg-slate-900 border-2 border-emerald-500 rounded-xl px-4 py-2 text-emerald-300 font-black focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                        {[
                          { label: 'LEDGER', idx: 0 },
                          { label: 'MONTHLY', idx: 1 },
                          { label: 'DAILY', idx: 2 },
                          { label: 'CANCEL', idx: 3 }
                        ].map((btn) => {
                          const isActive = datePromptActiveBtn === btn.idx;
                          return (
                            <button
                              key={btn.label}
                              type="button"
                              onClick={() => {
                                setDatePromptActiveBtn(btn.idx);
                                if (btn.idx === 3) {
                                  setCtrlLStep('list');
                                } else {
                                  fetchLedgerStatement(selectedLedgerItem, ctrlLFromDate, ctrlLToDate);
                                  setCtrlLStep('statement');
                                }
                              }}
                              onMouseEnter={() => setDatePromptActiveBtn(btn.idx)}
                              className={`px-4 py-3 rounded-xl text-xs font-black shadow-lg uppercase transition-all flex items-center justify-center cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500 text-slate-955 ring-4 ring-emerald-400 scale-105 shadow-2xl font-black'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                              }`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-mono text-center">
                      Use <kbd className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">←</kbd> <kbd className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">→</kbd> Arrow keys &amp; <kbd className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">Enter</kbd> to Select Option
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: STATEMENT OF ACCOUNT TRANSACTIONS LIST */}
              {ctrlLStep === 'statement' && (
                <div className="flex flex-col flex-1 overflow-hidden bg-slate-955">
                  {/* Header info */}
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs md:text-sm shrink-0">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-300 uppercase font-bold">LEDGER STATEMENT: </span>
                      <span className="text-emerald-300 font-black text-sm md:text-base uppercase bg-slate-950 px-4 py-1.5 rounded-xl border border-emerald-500/60 tracking-wider shadow-md">
                        {selectedLedgerItem?.name}
                      </span>
                      <span className="text-emerald-400 font-mono text-xs md:text-sm font-bold">({selectedLedgerItem?.type})</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-emerald-400 font-mono font-bold text-xs md:text-sm">Period: {ctrlLFromDate} to {ctrlLToDate}</span>
                      <button
                        type="button"
                        onClick={() => setCtrlLStep('datePrompt')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Change Period
                      </button>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="flex-1 overflow-y-auto p-3">
                    <table className="w-full text-left text-xs md:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b-2 border-slate-800 text-xs md:text-sm font-black text-emerald-400 uppercase sticky top-0 z-10">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Narration / Particulars</th>
                          <th className="py-3 px-4 text-right">Receipt (Dr)</th>
                          <th className="py-3 px-4 text-right">Payment (Cr)</th>
                          <th className="py-3 px-4 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-mono">
                        {ctrlLStatementLoading ? (
                          <tr><td colSpan="6" className="p-12 text-center text-emerald-400 font-bold text-base">Loading statement...</td></tr>
                        ) : ctrlLStatement.map((row, idx) => {
                          const isActive = ctrlLStatementIndex === idx;
                          return (
                            <tr
                              key={idx}
                              ref={(el) => {
                                if (isActive && el) {
                                  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                }
                              }}
                              onClick={() => handleAlterTransaction(row)}
                              onMouseEnter={() => setCtrlLStatementIndex(idx)}
                              className={`cursor-pointer transition-all ${
                                isActive
                                  ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-md'
                                  : 'hover:bg-slate-900 text-slate-200'
                              }`}
                            >
                              <td className="py-2.5 px-4 font-bold whitespace-nowrap">{row.date}</td>
                              <td className="py-2.5 px-4 font-bold">{row.type}</td>
                              <td className="py-2.5 px-4 max-w-sm truncate" title={row.narration}>{row.narration}</td>
                              <td className="py-2.5 px-4 text-right font-bold">{row.receipt > 0 ? row.receipt.toFixed(2) : '-'}</td>
                              <td className="py-2.5 px-4 text-right font-bold">{row.payment > 0 ? row.payment.toFixed(2) : '-'}</td>
                              <td className="py-2.5 px-4 text-right font-bold whitespace-nowrap">
                                {Math.abs(row.balance).toFixed(2)} {row.balanceType}
                              </td>
                            </tr>
                          );
                        })}

                        {!ctrlLStatementLoading && ctrlLStatement.length === 0 && (
                          <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic text-sm">No bills or transactions in this period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer */}
                  <div className="p-4 bg-slate-900 border-t-2 border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs md:text-sm font-mono shrink-0">
                    <div className="bg-slate-955 p-3 rounded-xl border border-slate-800 shadow-sm">
                      <span className="text-xs text-slate-500 font-sans block uppercase font-bold">Opening</span>
                      <span className="text-slate-200 font-bold text-sm md:text-base mt-0.5 block">{ctrlLSummary.opening.toFixed(2)} Dr</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl border border-slate-800 shadow-sm">
                      <span className="text-xs text-emerald-400 font-sans block uppercase font-bold">Total Receipt</span>
                      <span className="text-emerald-400 font-bold text-sm md:text-base mt-0.5 block">{ctrlLSummary.totalReceipt.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl border border-slate-800 shadow-sm">
                      <span className="text-xs text-rose-400 font-sans block uppercase font-bold">Total Payment</span>
                      <span className="text-rose-400 font-bold text-sm md:text-base mt-0.5 block">{ctrlLSummary.totalPayment.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl border-2 border-emerald-500/60 shadow-sm">
                      <span className="text-xs text-emerald-400 font-sans block uppercase font-bold">Closing Balance</span>
                      <span className="text-emerald-300 font-black text-sm md:text-lg mt-0.5 block">{Math.abs(ctrlLSummary.closing).toFixed(2)} {ctrlLSummary.closing >= 0 ? 'Dr' : 'Cr'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER SHORTCUT HINT */}
              <div className="bg-slate-955 px-6 py-2.5 border-t border-slate-900 flex justify-between items-center text-xs text-slate-400 font-mono shrink-0">
                <span>Use <kbd className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">↑</kbd> <kbd className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">↓</kbd> Arrow keys &amp; <kbd className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">Enter</kbd> to Select / Edit Bill</span>
                <span>Press <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Esc</kbd> to Go Back / Close</span>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Layout;
