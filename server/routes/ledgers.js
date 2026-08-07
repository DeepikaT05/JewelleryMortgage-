const express = require('express');
const router = express.Router();
const LedgerAccount = require('../models/LedgerAccount');
const LedgerTransaction = require('../models/LedgerTransaction');
const authMiddleware = require('../middleware/auth');

// GET /api/ledgers
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 1. Ensure default Cash account exists
    let cashAcc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId: req.user.companyId });
    if (!cashAcc) {
      cashAcc = new LedgerAccount({
        name: 'Cash',
        group: 'cash',
        openingBalance: 0,
        companyId: req.user.companyId
      });
      await cashAcc.save();
    }

    // 3. Fetch all ledger accounts
    const accounts = await LedgerAccount.find({ companyId: req.user.companyId });
    
    // 4. Compute closing balance for each
    const results = await Promise.all(accounts.map(async (acc) => {
      // Calculate period-adjusted opening balance by summing all transactions before startDate
      let periodOpeningBalance = acc.openingBalance;
      if (req.query.startDate) {
        const preTxs = await LedgerTransaction.find({
          accountId: acc._id,
          companyId: req.user.companyId,
          date: { $lt: new Date(req.query.startDate) }
        });
        const preAdd = preTxs.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
        const preDeduct = preTxs.filter(t => t.type === 'deduct').reduce((sum, t) => sum + t.amount, 0);
        periodOpeningBalance += preAdd - preDeduct;
      }

      // Query transactions within the selected period range
      const rangeQuery = { accountId: acc._id, companyId: req.user.companyId };
      if (req.query.startDate || req.query.endDate) {
        rangeQuery.date = {};
        if (req.query.startDate) rangeQuery.date.$gte = new Date(req.query.startDate);
        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          end.setUTCHours(23, 59, 59, 999);
          rangeQuery.date.$lte = end;
        }
      }

      const txs = await LedgerTransaction.find(rangeQuery);
      const totalAdd = txs.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
      const totalDeduct = txs.filter(t => t.type === 'deduct').reduce((sum, t) => sum + t.amount, 0);
      const closingBalance = periodOpeningBalance + totalAdd - totalDeduct;

      return {
        ...acc.toObject(),
        openingBalance: periodOpeningBalance, // Period-adjusted opening balance
        totalAdd,
        totalDeduct,
        closingBalance
      };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving ledger accounts', error: err.message });
  }
});

// POST /api/ledgers
router.post('/', authMiddleware, async (req, res) => {
  const { name, group, openingBalance } = req.body;
  if (!name || !group) {
    return res.status(400).json({ message: 'Name and Group are required fields' });
  }
  try {
    const acc = new LedgerAccount({
      name,
      group,
      openingBalance: Number(openingBalance || 0),
      companyId: req.user.companyId
    });
    await acc.save();
    res.status(201).json(acc);
  } catch (err) {
    res.status(500).json({ message: 'Error creating ledger account', error: err.message });
  }
});

// PUT /api/ledgers/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, group, openingBalance } = req.body;
  try {
    const acc = await LedgerAccount.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { name, group, openingBalance: Number(openingBalance || 0) },
      { new: true }
    );
    if (!acc) return res.status(404).json({ message: 'Ledger account not found' });
    res.json(acc);
  } catch (err) {
    res.status(500).json({ message: 'Error updating ledger account', error: err.message });
  }
});

// DELETE /api/ledgers/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const acc = await LedgerAccount.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!acc) return res.status(404).json({ message: 'Ledger account not found' });
    // Cleanup ledger transactions
    await LedgerTransaction.deleteMany({ accountId: req.params.id, companyId: req.user.companyId });
    res.json({ message: 'Ledger account and related transactions deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting ledger account', error: err.message });
  }
});

// GET /api/ledgers/:id/transactions
router.get('/:id/transactions', authMiddleware, async (req, res) => {
  try {
    const txs = await LedgerTransaction.find({ accountId: req.params.id, companyId: req.user.companyId })
      .sort({ date: 1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ledger transactions', error: err.message });
  }
});

// POST /api/ledgers/:id/transactions
router.post('/:id/transactions', authMiddleware, async (req, res) => {
  const { date, type, amount, remarks } = req.body;
  if (!type || !amount) {
    return res.status(400).json({ message: 'Type and Amount are required' });
  }
  try {
    const tx = new LedgerTransaction({
      accountId: req.params.id,
      date: date || new Date(),
      type,
      amount: Number(amount),
      refType: 'manual',
      remarks,
      companyId: req.user.companyId
    });
    await tx.save();
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Error creating manual transaction', error: err.message });
  }
});

// DELETE /api/ledgers/transactions/:txId
router.delete('/transactions/:txId', authMiddleware, async (req, res) => {
  try {
    const tx = await LedgerTransaction.findOneAndDelete({ _id: req.params.txId, companyId: req.user.companyId });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting ledger transaction', error: err.message });
  }
});

module.exports = router;
