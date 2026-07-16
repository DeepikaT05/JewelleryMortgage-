const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Transaction = require('../models/Transaction');
const LedgerAccount = require('../models/LedgerAccount');
const LedgerTransaction = require('../models/LedgerTransaction');
const authMiddleware = require('../middleware/auth');

// Helper to compute ledger balance up to a cutoff date
const getAccountBalance = async (accountId, companyId, cutoffDate) => {
  const acc = await LedgerAccount.findById(accountId);
  if (!acc) return 0;

  const txs = await LedgerTransaction.find({
    accountId,
    companyId,
    date: { $lte: cutoffDate }
  });

  const totalAdd = txs.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
  const totalDeduct = txs.filter(t => t.type === 'deduct').reduce((sum, t) => sum + t.amount, 0);

  return acc.openingBalance + totalAdd - totalDeduct;
};

// @route   GET /api/dashboard
// @desc    Retrieve date-scoped metrics for Dashboard
router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const activeDate = new Date(dateStr);
    
    // Set start & end of active day
    const startOfDay = new Date(activeDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(activeDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Start & end of previous day
    const prevDate = new Date(activeDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const startOfPrevDay = new Date(prevDate);
    startOfPrevDay.setUTCHours(0, 0, 0, 0);
    const endOfPrevDay = new Date(prevDate);
    endOfPrevDay.setUTCHours(23, 59, 59, 999);

    // Ensure default ledgers exist
    let cashAcc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId });
    if (!cashAcc) {
      cashAcc = new LedgerAccount({ name: 'Cash', group: 'cash', openingBalance: 0, companyId });
      await cashAcc.save();
    }

    const accounts = await LedgerAccount.find({ companyId, group: { $in: ['cash', 'bank'] } });

    // 1. Calculate Previous Day Closing (which is today's base opening)
    let baseOpeningBalance = 0;
    let prevCash = 0;
    let prevBank = 0;

    for (const acc of accounts) {
      const bal = await getAccountBalance(acc._id, companyId, endOfPrevDay);
      baseOpeningBalance += bal;
      if (acc.group === 'cash') prevCash += bal;
      if (acc.group === 'bank') prevBank += bal;
    }

    // 2. Fetch today's manual adjustments for opening balance
    const adjustments = await LedgerTransaction.find({
      companyId,
      remarks: 'Opening Balance Adjustment',
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    const todayAdjustments = adjustments.reduce((sum, t) => sum + t.amount, 0);

    const openingBalance = baseOpeningBalance + todayAdjustments;

    // 3. Calculate Today's closing positions
    let closingBalance = 0;
    let cashInHand = 0;
    let bankBalance = 0;

    for (const acc of accounts) {
      const bal = await getAccountBalance(acc._id, companyId, endOfDay);
      closingBalance += bal;
      if (acc.group === 'cash') cashInHand += bal;
      if (acc.group === 'bank') bankBalance += bal;
    }

    // 4. Calculate Customer Lending and Interest Details for the date D
    const dealsToday = await Deal.find({
      companyId,
      dealDate: { $gte: startOfDay, $lte: endOfDay }
    });
    const totalPay = dealsToday.reduce((sum, d) => sum + d.dealAmount, 0);

    const txsToday = await Transaction.find({
      companyId,
      tranDate: { $gte: startOfDay, $lte: endOfDay }
    });
    const totalInterest = txsToday.reduce((sum, t) => sum + (t.compound?.amountPaid || 0), 0);
    const totalReceive = txsToday.reduce((sum, t) => sum + (t.totalPaid || 0), 0);

    // 5. Total Receivable Principal Remaining
    const allDealsUpToToday = await Deal.find({
      companyId,
      dealDate: { $lte: endOfDay }
    });
    let totalReceivable = 0;
    for (const d of allDealsUpToToday) {
      const pTxs = await Transaction.find({
        dealId: d._id,
        companyId,
        tranDate: { $lte: endOfDay }
      });
      const principalPaid = pTxs.reduce((sum, t) => sum + (t.principle?.amountPaid || 0), 0);
      const outstanding = d.dealAmount - principalPaid;
      if (outstanding > 0 && d.status !== 'settled') {
        totalReceivable += outstanding;
      }
    }

    // 6. Interest collected from closed/settled deals today
    const closedTxsToday = txsToday.filter(t => t.isSettlement || t.status === 'settled');
    const totalInterestAfterClose = closedTxsToday.reduce((sum, t) => sum + (t.compound?.amountPaid || 0), 0);

    // Total Customers Count
    const totalCustomers = await Customer.countDocuments({ companyId });

    res.json({
      date: dateStr,
      totalCustomers,
      cashInHand,
      bankBalance,
      closingBalance,
      openingBalance,
      todayAdjustments,
      previousDay: {
        cash: prevCash,
        bank: prevBank,
        total: baseOpeningBalance
      },
      totalPay,
      totalInterest,
      totalReceive,
      totalReceivable,
      totalInterestAfterClose
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error compiling dashboard metrics' });
  }
});

// @route   POST /api/dashboard/opening-balance
// @desc    Initialize or adjust opening balance for a day
router.post('/opening-balance', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { date, amount } = req.body;

  if (!date || amount === undefined) {
    return res.status(400).json({ message: 'Date and amount are required' });
  }

  try {
    let cashAcc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId });
    if (!cashAcc) {
      cashAcc = new LedgerAccount({ name: 'Cash', group: 'cash', openingBalance: 0, companyId });
      await cashAcc.save();
    }

    const dateVal = new Date(date);
    const startOfTargetDay = new Date(dateVal);
    startOfTargetDay.setUTCHours(0, 0, 0, 0);
    const endOfTargetDay = new Date(dateVal);
    endOfTargetDay.setUTCHours(23, 59, 59, 999);

    let tx = await LedgerTransaction.findOne({
      accountId: cashAcc._id,
      companyId,
      remarks: 'Opening Balance Adjustment',
      date: { $gte: startOfTargetDay, $lte: endOfTargetDay }
    });

    if (tx) {
      tx.amount = Number(amount);
      await tx.save();
    } else {
      tx = new LedgerTransaction({
        accountId: cashAcc._id,
        date: startOfTargetDay,
        type: 'add',
        amount: Number(amount),
        refType: 'manual',
        remarks: 'Opening Balance Adjustment',
        companyId
      });
      await tx.save();
    }

    res.json({ message: 'Opening balance adjustment recorded', transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving opening balance' });
  }
});

module.exports = router;
