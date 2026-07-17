const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const TermsAndConditions = require('../models/TermsAndConditions');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');

// Multer storage for item images
const itemStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `item-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadItem = multer({ storage: itemStorage });

// Helper to generate Deal Number matching financial year format e.g. 2627000001
const generateDealNo = async () => {
  const currentYear = new Date().getFullYear();
  const nextYearShort = String(currentYear + 1).slice(-2);
  const currentYearShort = String(currentYear).slice(-2);
  const fyPrefix = Number(`${currentYearShort}${nextYearShort}`) * 1000000; // e.g. 2627000000
  
  const counter = await Counter.findOneAndUpdate(
    { id: `dealNo_${currentYearShort}${nextYearShort}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  return fyPrefix + counter.seq;
};

// @route   POST /api/deals/upload-item-image
// @desc    Upload item photo
router.post('/upload-item-image', authMiddleware, uploadItem.single('itemImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded' });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// @route   GET /api/deals
// @desc    Get all deals with filters (customer, status, pagination)
router.get('/', authMiddleware, async (req, res) => {
  const { customerId, status, search, page = 1, limit = 10 } = req.query;
  let query = { companyId: req.user.companyId };

  if (customerId) {
    query.customerId = customerId;
  }
  if (status) {
    query.status = status;
  }

  try {
    let matchedCustomerIds = [];
    if (search) {
      // If searching by customer name/mobile
      const customers = await Customer.find({
        companyId: req.user.companyId,
        $or: [
          { name: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') }
        ]
      });
      matchedCustomerIds = customers.map(c => c._id);
      
      // Also allow direct numeric search for dealNo
      if (!isNaN(search)) {
        query.$or = [
          { dealNo: Number(search) },
          { customerId: { $in: matchedCustomerIds } }
        ];
      } else {
        query.customerId = { $in: matchedCustomerIds };
      }
    }

    const count = await Deal.countDocuments(query);
    const deals = await Deal.find(query)
      .populate('customerId')
      .populate('items.groupId')
      .populate('groupTotals.groupId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      deals,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalDeals: count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving deals' });
  }
});

// @route   GET /api/deals/copy/:id
// @desc    Retrieve deal details stripped of IDs for copying
router.get('/copy/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    // Remove identifier fields
    delete deal._id;
    delete deal.dealNo;
    delete deal.createdAt;
    delete deal.updatedAt;
    
    // Remove IDs from items as well
    if (deal.items) {
      deal.items = deal.items.map(item => {
        delete item._id;
        return item;
      });
    }

    res.json(deal);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching copy profile' });
  }
});

// @route   GET /api/deals/:id/print
// @desc    Get complete print details (Company, Customer, Terms & Conditions, Deal)
router.get('/:id/print', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('customerId')
      .populate('items.groupId')
      .populate('groupTotals.groupId');

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const company = await Company.findById(req.user.companyId);
    const terms = await TermsAndConditions.findOne({ companyId: req.user.companyId });

    res.json({
      deal,
      company,
      terms: terms ? terms.termsText : ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving print profile' });
  }
});

// @route   GET /api/deals/:id
// @desc    Get single deal
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('customerId')
      .populate('items.groupId')
      .populate('groupTotals.groupId');

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching deal' });
  }
});

// @route   POST /api/deals
// @desc    Create new Deal (includes auto calculations)
router.post('/', authMiddleware, async (req, res) => {
  const {
    customerId,
    dealDate,
    refNo,
    items,
    dealAmount,
    paidPercent,
    paidAmount,
    interestRatePerMonth,
    returnPeriodMonths,
    payMode,
    bankId,
    chequeNo,
    chequeDate,
    location,
    remarks,
    stopDate
  } = req.body;

  if (!customerId || !dealAmount || !paidAmount) {
    return res.status(400).json({ message: 'Customer, Deal Amount, and Paid Amount are required fields' });
  }

  try {
    const dealNo = await generateDealNo();

    const newDeal = new Deal({
      dealNo,
      dealDate,
      refNo,
      customerId,
      items,
      dealAmount,
      paidPercent,
      paidAmount,
      interestRatePerMonth,
      returnPeriodMonths,
      payMode,
      bankId: bankId || undefined,
      chequeNo,
      chequeDate: chequeDate || undefined,
      location,
      remarks,
      stopDate: stopDate || undefined,
      createdBy: req.user.userId,
      companyId: req.user.companyId
    });

    await newDeal.save();

    // Post to ledger (deduction of loan payout)
    try {
      const { postToLedger } = require('../utils/ledgerHelper');
      let accountId = null;
      if (payMode === 'cash') {
        const LedgerAccount = require('../models/LedgerAccount');
        const acc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId: req.user.companyId });
        if (acc) accountId = acc._id;
      } else if (payMode === 'bank' && bankId) {
        const LedgerAccount = require('../models/LedgerAccount');
        const acc = await LedgerAccount.findOne({ bankId, companyId: req.user.companyId });
        if (acc) accountId = acc._id;
      }

      if (accountId) {
        await postToLedger({
          accountId,
          date: dealDate,
          type: 'deduct', // paying out loan amount
          amount: Number(paidAmount),
          refType: 'deal',
          refId: newDeal._id,
          remarks: `Pledge loan issued. Deal #${newDeal.dealNo}`,
          companyId: req.user.companyId
        });
      }
    } catch (e) {
      console.error('Ledger posting failed for deal:', e);
    }

    res.status(201).json(newDeal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating deal', error: err.message });
  }
});

// @route   PUT /api/deals/:id
// @desc    Update a deal
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Re-trigger pre-save hooks on edit by fetching first
    const deal = await Deal.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    Object.assign(deal, req.body);
    await deal.save();

    // Sync ledger transactions
    try {
      const { deleteRefTransactions, postToLedger } = require('../utils/ledgerHelper');
      await deleteRefTransactions(deal._id);

      let accountId = null;
      if (deal.payMode === 'cash') {
        const LedgerAccount = require('../models/LedgerAccount');
        const acc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId: req.user.companyId });
        if (acc) accountId = acc._id;
      } else if (deal.payMode === 'bank' && deal.bankId) {
        const LedgerAccount = require('../models/LedgerAccount');
        const acc = await LedgerAccount.findOneAndUpdate(
          { bankId: deal.bankId, companyId: req.user.companyId },
          {},
          { upsert: true, new: true } // failsafe
        );
        if (acc) accountId = acc._id;
      }

      if (accountId) {
        await postToLedger({
          accountId,
          date: deal.dealDate,
          type: 'deduct',
          amount: Number(deal.paidAmount),
          refType: 'deal',
          refId: deal._id,
          remarks: `Pledge loan issued. Deal #${deal.dealNo}`,
          companyId: req.user.companyId
        });
      }
    } catch (e) {
      console.error('Ledger sync failed for deal:', e);
    }

    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating deal' });
  }
});

// @route   DELETE /api/deals/:id
// @desc    Delete a deal
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Permission denied: Admin role required' });
  }

  try {
    const deleted = await Deal.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Delete associated ledger transactions
    const { deleteRefTransactions } = require('../utils/ledgerHelper');
    await deleteRefTransactions(deleted._id);

    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting deal' });
  }
});

// @route   GET /api/deals/export
// @desc    Export deals to Excel
router.get('/export-xlsx', authMiddleware, async (req, res) => {
  try {
    const deals = await Deal.find({ companyId: req.user.companyId }).populate('customerId');
    const formatted = deals.map(d => ({
      'Deal No': d.dealNo,
      'Deal Date': d.dealDate ? new Date(d.dealDate).toLocaleDateString() : '',
      'Customer Code': d.customerId ? d.customerId.customerCode : '',
      'Customer Name': d.customerId ? d.customerId.name : '',
      'Ref No': d.refNo || '',
      'Deal Amount': d.dealAmount,
      'Paid Amount': d.paidAmount,
      'Status': d.status,
      'Interest Rate/Month (%)': d.interestRatePerMonth,
      'Interest/Month': d.interestAmountPerMonth
    }));

    const worksheet = xlsx.utils.json_to_sheet(formatted);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Deals');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=deals_export.xlsx');
    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error exporting deals' });
  }
});

module.exports = router;
