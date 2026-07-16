const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierDeal = require('../models/SupplierDeal');
const SupplierTransaction = require('../models/SupplierTransaction');
const Deal = require('../models/Deal');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');
const { calculateInterest } = require('../utils/calculations');

// ==========================================
// 1. SUPPLIER CRUD
// ==========================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ companyId: req.user.companyId });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving suppliers' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, mobile } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and Mobile number are required fields' });
  }

  try {
    const counter = await Counter.findOneAndUpdate(
      { id: 'supplierCode' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const supplier = new Supplier({
      ...req.body,
      supplierCode: counter.seq,
      companyId: req.user.companyId
    });

    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating supplier' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await Supplier.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Supplier not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating supplier' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
    return res.status(403).json({ message: 'Permission denied' });
  }
  try {
    const deleted = await Supplier.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting supplier' });
  }
});

// ==========================================
// 2. THIRD-PARTY TRANSFER FLOW
// ==========================================
router.post('/transfer', authMiddleware, async (req, res) => {
  const { customerDealId, itemIds, supplierId, dealAmount, interestRatePerMonth, returnPeriodMonths } = req.body;

  if (!customerDealId || !itemIds || !Array.isArray(itemIds) || !supplierId || !dealAmount) {
    return res.status(400).json({ message: 'customerDealId, itemIds, supplierId, and dealAmount are required' });
  }

  try {
    // 1. Fetch customer deal
    const custDeal = await Deal.findById(customerDealId);
    if (!custDeal) return res.status(404).json({ message: 'Customer Deal not found' });

    // 2. Select matching items to transfer
    const itemsToTransfer = custDeal.items.filter(item => itemIds.includes(item._id.toString()));
    if (itemsToTransfer.length === 0) {
      return res.status(400).json({ message: 'No matching items found to transfer' });
    }

    // 3. Generate Supplier Deal Number
    const currentYear = new Date().getFullYear();
    const currentYearShort = String(currentYear).slice(-2);
    const nextYearShort = String(currentYear + 1).slice(-2);
    const fyPrefix = Number(`${currentYearShort}${nextYearShort}`) * 1000000;

    const counter = await Counter.findOneAndUpdate(
      { id: `supDealNo_${currentYearShort}${nextYearShort}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const dealNo = fyPrefix + counter.seq;

    // 4. Map items
    const supplierItems = itemsToTransfer.map(item => ({
      groupId: item.groupId,
      itemName: item.itemName,
      pcs: item.pcs,
      remarks: item.remarks,
      grossWeight: item.grossWeight,
      lessWeight: item.lessWeight,
      netWeight: item.netWeight,
      purityPercent: item.purityPercent,
      pureWeight: item.pureWeight,
      rate: item.rate,
      estimatedValue: item.estimatedValue,
      imageUrl: item.imageUrl,
      customerDealId: custDeal._id,
      customerItemId: item._id.toString()
    }));

    // 5. Create Supplier Deal
    const supDeal = new SupplierDeal({
      dealNo,
      dealDate: new Date(),
      supplierId,
      items: supplierItems,
      dealAmount,
      paidPercent: 100,
      paidAmount: dealAmount, // shop receives this full amount from supplier
      interestRatePerMonth: interestRatePerMonth || 2.0,
      returnPeriodMonths: returnPeriodMonths || 12,
      payMode: 'cash',
      createdBy: req.user.userId,
      companyId: req.user.companyId
    });

    await supDeal.save();

    // 6. Optional: Add a comment in original Customer Deal items
    custDeal.items.forEach(item => {
      if (itemIds.includes(item._id.toString())) {
        item.remarks = `${item.remarks || ''} [Re-pledged to Supplier Deal #${dealNo}]`.trim();
      }
    });
    await custDeal.save();

    res.status(201).json({ message: 'Items re-pledged successfully', supplierDeal: supDeal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error processing transfer', error: err.message });
  }
});

// ==========================================
// 3. SUPPLIER DEALS CRUD
// ==========================================

router.get('/deals', authMiddleware, async (req, res) => {
  try {
    const deals = await SupplierDeal.find({ companyId: req.user.companyId })
      .populate('supplierId')
      .populate('items.groupId');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving supplier deals' });
  }
});

router.post('/deals', authMiddleware, async (req, res) => {
  try {
    // Generate Deal number if not provided
    const currentYear = new Date().getFullYear();
    const currentYearShort = String(currentYear).slice(-2);
    const nextYearShort = String(currentYear + 1).slice(-2);
    const fyPrefix = Number(`${currentYearShort}${nextYearShort}`) * 1000000;

    const counter = await Counter.findOneAndUpdate(
      { id: `supDealNo_${currentYearShort}${nextYearShort}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const dealNo = fyPrefix + counter.seq;
    const newDeal = new SupplierDeal({
      ...req.body,
      dealNo,
      companyId: req.user.companyId,
      createdBy: req.user.userId
    });

    await newDeal.save();
    res.status(201).json(newDeal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating supplier deal' });
  }
});

router.put('/deals/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await SupplierDeal.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!deal) return res.status(404).json({ message: 'Supplier deal not found' });
    
    Object.assign(deal, req.body);
    await deal.save();
    res.json(deal);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating supplier deal' });
  }
});

router.delete('/deals/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const deleted = await SupplierDeal.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) return res.status(404).json({ message: 'Supplier deal not found' });
    res.json({ message: 'Supplier deal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting supplier deal' });
  }
});

// ==========================================
// 4. SUPPLIER TRANSACTIONS CRUD
// ==========================================

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const trans = await SupplierTransaction.find({ companyId: req.user.companyId })
      .populate('supplierId')
      .populate('dealId');
    res.json(trans);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving transactions' });
  }
});

// Helper calculation endpoint for Supplier transaction
router.post('/transactions/calculate', authMiddleware, async (req, res) => {
  const { dealId, tranDate } = req.body;
  if (!dealId || !tranDate) {
    return res.status(400).json({ message: 'dealId and tranDate are required' });
  }

  try {
    const deal = await SupplierDeal.findById(dealId).populate('supplierId');
    if (!deal) return res.status(404).json({ message: 'Supplier deal not found' });

    const startDate = deal.lastPaidUpto || deal.dealStartDate;
    
    const pastTrans = await SupplierTransaction.find({ dealId: deal._id });
    const principalPaid = pastTrans.reduce((sum, t) => sum + t.principle.amountPaid, 0);
    const remainingPrincipal = Math.max(0, deal.dealAmount - principalPaid);

    let outstandingInterestBalance = 0;
    if (pastTrans.length > 0) {
      const sorted = [...pastTrans].sort((a, b) => new Date(b.tranDate) - new Date(a.tranDate));
      outstandingInterestBalance = sorted[0].compound.balance || 0;
    }

    const calc = calculateInterest({
      startDate,
      endDate: new Date(tranDate),
      principalAmount: remainingPrincipal,
      ratePercentPerMonth: deal.interestRatePerMonth,
      interestType: deal.supplierId.interestType,
      interestFrequency: deal.supplierId.interestFrequency,
      compoundMonth: deal.supplierId.compoundMonth,
      minimumInterestPeriod: deal.supplierId.minimumInterestPeriod,
      lastCompoundBalance: 0
    });

    res.json({
      dealAmount: deal.dealAmount,
      remainingPrincipal,
      interestRatePerMonth: deal.interestRatePerMonth,
      noOfMonths: calc.noOfMonths,
      noOfDays: calc.noOfDays,
      interestToBePaid: calc.interestAmount + outstandingInterestBalance,
      startDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error in calculations' });
  }
});

router.post('/transactions', authMiddleware, async (req, res) => {
  const {
    dealId,
    supplierId,
    tranDate,
    isSettlement,
    closingDate,
    payMode,
    bankId,
    chequeNo,
    remarks,
    principle,
    compound,
    discount
  } = req.body;

  try {
    const deal = await SupplierDeal.findById(dealId);
    if (!deal) return res.status(404).json({ message: 'Supplier deal not found' });

    let counter = await Counter.findOneAndUpdate(
      { id: 'supTransactionNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const pAmtPaid = Number(principle?.amountPaid || 0);
    const pBalance = Math.max(0, Number(principle?.toBePaid) - pAmtPaid);

    const cAmtPaid = Number(compound?.amountPaid || 0);
    const cBalance = Math.max(0, Number(compound?.toBePaid) - cAmtPaid);

    const manualDiscount = Number(discount || 0);
    const totalPaid = pAmtPaid + cAmtPaid - manualDiscount;

    const status = (pBalance === 0 && cBalance === 0) ? 'settled' : 'partial';

    const transaction = new SupplierTransaction({
      transactionNo: counter.seq,
      dealId,
      supplierId,
      tranDate,
      dealAmount: deal.dealAmount,
      interestPerMonth: deal.interestAmountPerMonth,
      ratePercentPerMonth: deal.interestRatePerMonth,
      noOfMonths: Number(req.body.noOfMonths || 0),
      noOfDays: Number(req.body.noOfDays || 0),
      isSettlement,
      closingDate,
      payMode,
      bankId: bankId || undefined,
      chequeNo,
      submittedBy: req.user.username,
      remarks,
      principle: {
        toBePaid: Number(principle?.toBePaid),
        amountPaid: pAmtPaid,
        balance: pBalance
      },
      compound: {
        lastBalance: Number(compound?.lastBalance || 0),
        currentBalance: Number(compound?.currentBalance || 0),
        toBePaid: Number(compound?.toBePaid),
        amountPaid: cAmtPaid,
        balance: cBalance
      },
      discount: manualDiscount,
      totalPaid,
      status,
      companyId: req.user.companyId
    });

    await transaction.save();

    // Update Deal
    if (cBalance === 0) {
      deal.lastPaidUpto = new Date(tranDate);
    }
    if (isSettlement && pBalance === 0 && cBalance === 0) {
      deal.status = 'settled';
      deal.stopDate = new Date(tranDate);
    }

    await deal.save();
    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving supplier transaction' });
  }
});

// ==========================================
// 5. SUPPLIER REPORTS
// ==========================================

// Report A: Supplier Girvi Report (Unsettled Overdue Deals)
router.get('/reports/supplier-girvi', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const deals = await SupplierDeal.find({
      companyId,
      status: { $ne: 'settled' },
      dealEndDate: { $lte: new Date() }
    }).populate('supplierId');
    
    res.json(deals);
  } catch (err) {
    res.status(500).json({ message: 'Server error generating supplier report' });
  }
});

// Report B: Supplier Balance Sheet (Running balances owed to each supplier)
router.get('/reports/supplier-balance-sheet', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const suppliers = await Supplier.find({ companyId });
    const balanceSheet = [];

    for (const sup of suppliers) {
      const deals = await SupplierDeal.find({ supplierId: sup._id, companyId });
      const dealAmtTotal = deals.reduce((sum, d) => sum + d.dealAmount, 0);
      
      const transactions = await SupplierTransaction.find({ supplierId: sup._id, companyId });
      const principalPaid = transactions.reduce((sum, t) => sum + t.principle.amountPaid, 0);
      const interestPaid = transactions.reduce((sum, t) => sum + t.compound.amountPaid, 0);

      balanceSheet.push({
        supplierId: sup._id,
        name: sup.name,
        mobile: sup.mobile,
        dealsCount: deals.length,
        totalBorrowing: dealAmtTotal,
        principalRepaid: principalPaid,
        interestRepaid: interestPaid,
        principalOwed: Math.max(0, dealAmtTotal - principalPaid)
      });
    }

    res.json(balanceSheet);
  } catch (err) {
    res.status(500).json({ message: 'Server error generating balance sheet' });
  }
});

// Report C: Supplier Profit/Loss (Margin Report between Customer Rate and Supplier Rate)
router.get('/reports/supplier-profit-loss', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;

  try {
    // Find all supplier deal items that reference customer deals
    const supDeals = await SupplierDeal.find({
      companyId,
      'items.customerDealId': { $exists: true }
    }).populate('supplierId');

    const margins = [];

    for (const sDeal of supDeals) {
      for (const sItem of sDeal.items) {
        if (!sItem.customerDealId) continue;
        
        // Fetch customer deal
        const custDeal = await Deal.findById(sItem.customerDealId).populate('customerId');
        if (!custDeal) continue;

        // Fetch interest rate difference
        const customerRate = custDeal.interestRatePerMonth;
        const supplierRate = sDeal.interestRatePerMonth;
        const rateMargin = customerRate - supplierRate;

        // Value of items transferred
        // Calculate item estimated value relative to deal amount
        // Or simply compare rates directly
        margins.push({
          supplierDealNo: sDeal.dealNo,
          supplierName: sDeal.supplierId.name,
          customerDealNo: custDeal.dealNo,
          customerName: custDeal.customerId ? custDeal.customerId.name : 'Unknown',
          itemName: sItem.itemName,
          dealAmount: sDeal.dealAmount,
          customerRatePercent: customerRate,
          supplierRatePercent: supplierRate,
          monthlyMarginPercent: rateMargin,
          estimatedMonthlyMarginValue: parseFloat((sDeal.dealAmount * (rateMargin / 100)).toFixed(2))
        });
      }
    }

    res.json(margins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating margin report' });
  }
});

module.exports = router;
