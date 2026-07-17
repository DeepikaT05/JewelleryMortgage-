const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const Transaction = require('../models/Transaction');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');
const { calculateInterest } = require('../utils/calculations');

// Helper to calculate outstanding interest and principal for a Deal at a given Date
const computeDealOutstanding = async (dealId, tranDateStr) => {
  const deal = await Deal.findById(dealId).populate('customerId');
  if (!deal) throw new Error('Deal not found');

  const tranDate = new Date(tranDateStr);
  const startDate = deal.lastPaidUpto || deal.dealStartDate || deal.dealDate;

  // 1. Calculate active principal
  // Active Principal = original dealAmount - total principal paid in past transactions
  const pastTransactions = await Transaction.find({ dealId: deal._id });
  const totalPrincipalPaid = pastTransactions.reduce((sum, t) => sum + (t.principle.amountPaid || 0), 0);
  const remainingPrincipal = Math.max(0, deal.dealAmount - totalPrincipalPaid);

  // 2. Fetch outstanding interest (accumulated interest not yet paid)
  // Total Interest Accrued in past transactions minus interest paid
  const totalInterestPaid = pastTransactions.reduce((sum, t) => sum + (t.compound.amountPaid || 0), 0);
  
  // Calculate new interest accrued from lastPaidUpto to tranDate
  const cust = deal.customerId;
  const calc = calculateInterest({
    startDate,
    endDate: tranDate,
    principalAmount: remainingPrincipal,
    ratePercentPerMonth: deal.interestRatePerMonth,
    interestType: cust.interestType,
    interestFrequency: cust.interestFrequency,
    compoundMonth: cust.compoundMonth,
    minimumInterestPeriod: cust.minimumInterestPeriod,
    lastCompoundBalance: 0
  });

  // To be paid in this transaction:
  // Principle: remaining principal
  // Interest: new accrued interest + any past unpaid interest (if any, though lastPaidUpto advances when paid)
  // Let's check outstanding interest:
  // Since lastPaidUpto is advanced to the date of last payment, the new interest is just what accrued since lastPaidUpto.
  // Unpaid interest from past payments could exist if a partial interest payment was made.
  // Let's compute: Total interest accrued since start minus total interest paid.
  // For simple calculation, let's say the interest to be paid is the new interest + any outstanding interest balance from previous transaction.
  let outstandingInterestBalance = 0;
  if (pastTransactions.length > 0) {
    // Sort transactions by date to find the last one
    const sorted = [...pastTransactions].sort((a, b) => new Date(b.tranDate) - new Date(a.tranDate));
    outstandingInterestBalance = sorted[0].compound.balance || 0;
  }

  const interestToBePaid = parseFloat((calc.interestAmount + outstandingInterestBalance).toFixed(2));

  return {
    deal,
    remainingPrincipal,
    interestToBePaid,
    calcDetails: calc,
    startDate
  };
};

// @route   POST /api/transactions/calculate
// @desc    Calculate interest and principal due for a deal on a given transaction date
router.post('/calculate', authMiddleware, async (req, res) => {
  const { dealId, tranDate } = req.body;
  if (!dealId || !tranDate) {
    return res.status(400).json({ message: 'dealId and tranDate are required' });
  }

  try {
    const outstanding = await computeDealOutstanding(dealId, tranDate);
    const currentBalance = parseFloat(outstanding.calcDetails.interestAmount.toFixed(2));
    const lastBalance = parseFloat((outstanding.interestToBePaid - currentBalance).toFixed(2));
    res.json({
      dealAmount: outstanding.deal.dealAmount,
      remainingPrincipal: outstanding.remainingPrincipal,
      interestRatePerMonth: outstanding.deal.interestRatePerMonth,
      interestAmountPerMonth: outstanding.deal.interestAmountPerMonth,
      noOfMonths: outstanding.calcDetails.noOfMonths,
      noOfDays: outstanding.calcDetails.noOfDays,
      interestToBePaid: outstanding.interestToBePaid,
      startDate: outstanding.startDate,
      lastBalance,
      currentBalance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error during calculation' });
  }
});

// @route   GET /api/transactions/deal/:dealId
// @desc    Get transaction statement (history) for a deal
router.get('/deal/:dealId', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      dealId: req.params.dealId,
      companyId: req.user.companyId
    }).sort({ tranDate: 1 });
    
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving history' });
  }
});

// @route   GET /api/transactions
// @desc    Get all transactions
router.get('/', authMiddleware, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const count = await Transaction.countDocuments({ companyId: req.user.companyId });
    const transactions = await Transaction.find({ companyId: req.user.companyId })
      .populate('dealId')
      .populate('customerId')
      .sort({ tranDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalTransactions: count
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving transactions' });
  }
});

// @route   GET /api/transactions/:id/print
// @desc    Get payment receipt print details
router.get('/:id/print', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('customerId')
      .populate('dealId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const company = await Company.findById(req.user.companyId);

    res.json({
      transaction,
      company
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving receipt details' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('customerId')
      .populate('dealId');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching transaction' });
  }
});

// @route   POST /api/transactions
// @desc    Save new Transaction (collates balances and advances lastPaidUpto)
router.post('/', authMiddleware, async (req, res) => {
  const {
    dealId,
    customerId,
    tranDate,
    isSettlement,
    closingDate,
    payMode,
    bankId,
    chequeNo,
    remarks,
    principle, // { toBePaid, amountPaid }
    compound,  // { toBePaid, amountPaid }
    discount,
    settlementAmount
  } = req.body;

  if (!dealId || !customerId || !tranDate) {
    return res.status(400).json({ message: 'Deal ID, Customer ID, and Transaction Date are required' });
  }

  try {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Auto calculation
    const calc = await computeDealOutstanding(dealId, tranDate);
    
    // Calculate balances
    const pAmtPaid = Number(principle?.amountPaid || 0);
    const pBalance = Math.max(0, Number(principle?.toBePaid || calc.remainingPrincipal) - pAmtPaid);

    const cAmtPaid = Number(compound?.amountPaid || 0);
    const cBalance = Math.max(0, Number(compound?.toBePaid || calc.interestToBePaid) - cAmtPaid);

    const manualDiscount = Number(discount || 0);
    const totalPaid = pAmtPaid + cAmtPaid - manualDiscount;

    // Get sequence number
    let counter = await Counter.findOneAndUpdate(
      { id: 'transactionNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const status = (pBalance === 0 && cBalance === 0) ? 'settled' : 'partial';

    const transaction = new Transaction({
      transactionNo: counter.seq,
      dealId,
      customerId,
      tranDate,
      dealAmount: deal.dealAmount,
      interestPerMonth: deal.interestAmountPerMonth,
      ratePercentPerMonth: deal.interestRatePerMonth,
      noOfMonths: calc.calcDetails.noOfMonths,
      noOfDays: calc.calcDetails.noOfDays,
      isSettlement: (pBalance === 0 && cBalance === 0),
      closingDate: (pBalance === 0 && cBalance === 0) ? new Date().toISOString().split('T')[0] : undefined,
      payMode,
      bankId: bankId || undefined,
      chequeNo,
      submittedBy: req.user.username,
      remarks,
      principle: {
        toBePaid: Number(principle?.toBePaid || calc.remainingPrincipal),
        amountPaid: pAmtPaid,
        balance: pBalance
      },
      compound: {
        lastBalance: calc.calcDetails.compoundBalance,
        currentBalance: calc.calcDetails.compoundBalance,
        toBePaid: Number(compound?.toBePaid || calc.interestToBePaid),
        amountPaid: cAmtPaid,
        balance: cBalance
      },
      discount: manualDiscount,
      settlementAmount: Number(settlementAmount || 0),
      totalPaid,
      status,
      companyId: req.user.companyId
    });

    await transaction.save();

    // Post to ledger (addition/received)
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
          date: tranDate,
          type: 'add', // receiving money
          amount: Number(totalPaid),
          refType: 'transaction',
          refId: transaction._id,
          remarks: `Pledge payment received. Tx #${transaction.transactionNo}`,
          companyId: req.user.companyId
        });
      }
    } catch (e) {
      console.error('Ledger posting failed for transaction:', e);
    }

    // Update the Deal record with new milestones
    // 1. Advance lastPaidUpto to transaction date if interest was fully paid
    if (cBalance === 0) {
      deal.lastPaidUpto = new Date(tranDate);
    }
    
    // 2. Update Deal status - auto-settle if all balances are zero
    if (pBalance === 0 && cBalance === 0) {
      deal.status = 'settled';
      deal.stopDate = new Date();
    } else {
      // Check if deal is overdue (past end date and not settled)
      const now = new Date();
      if (deal.dealEndDate && now > deal.dealEndDate) {
        deal.status = 'overdue';
      } else {
        deal.status = 'active';
      }
    }

    await deal.save();

    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving transaction', error: err.message });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction (and rollback deal milestones)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Permission denied' });
  }

  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const deal = await Deal.findById(transaction.dealId);
    if (deal) {
      // Rollback lastPaidUpto to the transaction before this one, or back to dealStartDate
      const remainingTrans = await Transaction.find({
        dealId: deal._id,
        _id: { $ne: transaction._id }
      }).sort({ tranDate: -1 });

      if (remainingTrans.length > 0) {
        deal.lastPaidUpto = remainingTrans[0].tranDate;
        deal.status = remainingTrans[0].status === 'settled' ? 'settled' : 'active';
        if (deal.status !== 'settled') {
          deal.stopDate = undefined;
        }
      } else {
        deal.lastPaidUpto = deal.dealStartDate;
        deal.status = 'active';
        deal.stopDate = undefined;
      }
      await deal.save();
    }

    // Delete associated ledger transactions
    const { deleteRefTransactions } = require('../utils/ledgerHelper');
    await deleteRefTransactions(transaction._id);

    await Transaction.findByIdAndDelete(transaction._id);
    res.json({ message: 'Transaction deleted and deal status rolled back' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting transaction' });
  }
});

// @route   GET /api/transactions/export
// @desc    Export transactions to Excel
router.get('/export-xlsx', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ companyId: req.user.companyId })
      .populate('customerId')
      .populate('dealId');

    const formatted = transactions.map(t => ({
      'Transaction No': t.transactionNo,
      'Date': t.tranDate ? new Date(t.tranDate).toLocaleDateString() : '',
      'Deal No': t.dealId ? t.dealId.dealNo : '',
      'Customer Code': t.customerId ? t.customerId.customerCode : '',
      'Customer Name': t.customerId ? t.customerId.name : '',
      'Principal Paid': t.principle.amountPaid,
      'Interest Paid': t.compound.amountPaid,
      'Discount': t.discount,
      'Total Paid': t.totalPaid,
      'Payment Mode': t.payMode,
      'Settled': t.isSettlement ? 'Yes' : 'No'
    }));

    const worksheet = xlsx.utils.json_to_sheet(formatted);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.xlsx');
    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error exporting transactions' });
  }
});

module.exports = router;
