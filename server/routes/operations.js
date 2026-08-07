const express = require('express');
const router = express.Router();
const Operation = require('../models/Operation');
const LedgerAccount = require('../models/LedgerAccount');
const LedgerTransaction = require('../models/LedgerTransaction');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');

// Helper to ensure default Cash and Bank accounts exist
const ensureAccounts = async (companyId) => {
  let cashAcc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId });
  if (!cashAcc) {
    cashAcc = new LedgerAccount({ name: 'Cash', group: 'cash', openingBalance: 1500000, companyId });
    await cashAcc.save();
  }

  let bankAcc = await LedgerAccount.findOne({ name: 'Main Bank Account', group: 'bank', companyId });
  if (!bankAcc) {
    bankAcc = new LedgerAccount({ name: 'Main Bank Account', group: 'bank', openingBalance: 0, companyId });
    await bankAcc.save();
  }
};

// @route   GET /api/operations/accounts
// @desc    Get all available accounts for the active company
router.get('/accounts', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  try {
    await ensureAccounts(companyId);
    const accounts = await LedgerAccount.find({ companyId }).sort({ name: 1 });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving accounts' });
  }
});

// @route   POST /api/operations/custom-account
// @desc    Create a new custom ledger account / category
router.post('/custom-account', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { name, group, openingBalance } = req.body;

  if (!name || !group) {
    return res.status(400).json({ message: 'Account Name and Group/Type are required' });
  }

  try {
    let existing = await LedgerAccount.findOne({ name: new RegExp(`^${name.trim()}$`, 'i'), companyId });
    if (existing) {
      return res.json(existing);
    }

    const acc = new LedgerAccount({
      name: name.trim(),
      group: group.trim(),
      openingBalance: Number(openingBalance || 0),
      companyId
    });
    await acc.save();

    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating custom account' });
  }
});

// @route   GET /api/operations/vouchers
// @desc    Fetch vouchers with filters (voucherType, startDate, endDate, search)
router.get('/vouchers', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { voucherType, startDate, endDate, search } = req.query;

  try {
    let query = { companyId };
    if (voucherType) {
      query.voucherType = voucherType;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setUTCHours(0, 0, 0, 0);
        query.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setUTCHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    let vouchers = await Operation.find(query).sort({ date: -1, createdAt: -1 });

    if (search) {
      const q = search.toLowerCase().trim();
      vouchers = vouchers.filter(v => 
        (v.voucherNo || '').toLowerCase().includes(q) ||
        (v.partyName || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q) ||
        (v.fromAccountName || '').toLowerCase().includes(q) ||
        (v.toAccountName || '').toLowerCase().includes(q) ||
        (v.remarks || '').toLowerCase().includes(q) ||
        (v.refNo || '').toLowerCase().includes(q)
      );
    }

    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving vouchers' });
  }
});

// @route   POST /api/operations/contra
// @desc    Create Contra transfer voucher (C to B, B to C, B to B, Custom)
router.post('/contra', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { subType, date, fromAccountId, toAccountId, amount, payMode, customPayMode, refNo, remarks } = req.body;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ message: 'From Account, To Account, and Amount are required' });
  }

  if (fromAccountId.toString() === toAccountId.toString()) {
    return res.status(400).json({ message: 'Source and Destination accounts cannot be the same' });
  }

  try {
    const fromAcc = await LedgerAccount.findById(fromAccountId);
    const toAcc = await LedgerAccount.findById(toAccountId);
    if (!fromAcc || !toAcc) {
      return res.status(404).json({ message: 'Selected account not found' });
    }

    let counter = await Counter.findOneAndUpdate(
      { id: 'contraVoucherNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const voucherNo = `CN-${counter.seq}`;

    const voucherDate = date ? new Date(date) : new Date();

    const op = new Operation({
      voucherNo,
      voucherType: 'contra',
      subType: subType || 'custom',
      date: voucherDate,
      fromAccountId: fromAcc._id,
      toAccountId: toAcc._id,
      fromAccountName: fromAcc.name,
      toAccountName: toAcc.name,
      amount: Number(amount),
      payMode: payMode || 'cash',
      customPayMode,
      refNo,
      remarks,
      companyId
    });
    await op.save();

    // 1. Deduct from source account
    const txFrom = new LedgerTransaction({
      accountId: fromAcc._id,
      date: voucherDate,
      type: 'deduct',
      amount: Number(amount),
      refType: 'manual',
      refId: op._id,
      remarks: `Contra Transfer to ${toAcc.name} (${voucherNo})`,
      companyId
    });
    await txFrom.save();

    // 2. Add to destination account
    const txTo = new LedgerTransaction({
      accountId: toAcc._id,
      date: voucherDate,
      type: 'add',
      amount: Number(amount),
      refType: 'manual',
      refId: op._id,
      remarks: `Contra Transfer from ${fromAcc.name} (${voucherNo})`,
      companyId
    });
    await txTo.save();

    res.json({ message: 'Contra transfer saved successfully', operation: op });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving contra transfer' });
  }
});

// @route   POST /api/operations/receipt
// @desc    Create Receipt (Credit / Money In) entry
router.post('/receipt', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { date, category, depositToAccountId, amount, payMode, customPayMode, refNo, partyName, remarks } = req.body;

  if (!depositToAccountId || !amount) {
    return res.status(400).json({ message: 'Deposit Account and Amount are required' });
  }

  try {
    const depositAcc = await LedgerAccount.findById(depositToAccountId);
    if (!depositAcc) {
      return res.status(404).json({ message: 'Deposit account not found' });
    }

    let counter = await Counter.findOneAndUpdate(
      { id: 'receiptVoucherNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const voucherNo = `RCT-${counter.seq}`;

    const voucherDate = date ? new Date(date) : new Date();

    const op = new Operation({
      voucherNo,
      voucherType: 'receipt',
      category: category || 'Capital / Receipt',
      date: voucherDate,
      toAccountId: depositAcc._id,
      toAccountName: depositAcc.name,
      amount: Number(amount),
      payMode: payMode || 'cash',
      customPayMode,
      refNo,
      partyName,
      remarks,
      companyId
    });
    await op.save();

    // Add credit transaction to target Cash/Bank account
    const tx = new LedgerTransaction({
      accountId: depositAcc._id,
      date: voucherDate,
      type: 'add',
      amount: Number(amount),
      refType: 'manual',
      refId: op._id,
      remarks: `Receipt (${category || 'Credit'}): ${partyName ? partyName + ' - ' : ''}${remarks || voucherNo}`,
      companyId
    });
    await tx.save();

    res.json({ message: 'Receipt entry saved successfully', operation: op });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving receipt' });
  }
});

// @route   POST /api/operations/payment
// @desc    Create Payment (Expense / Money Out) entry
router.post('/payment', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const { date, category, paidFromAccountId, amount, payMode, customPayMode, refNo, partyName, remarks } = req.body;

  if (!paidFromAccountId || !amount) {
    return res.status(400).json({ message: 'Paid From Account and Amount are required' });
  }

  try {
    const paidFromAcc = await LedgerAccount.findById(paidFromAccountId);
    if (!paidFromAcc) {
      return res.status(404).json({ message: 'Payment account not found' });
    }

    let counter = await Counter.findOneAndUpdate(
      { id: 'paymentVoucherNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const voucherNo = `PMT-${counter.seq}`;

    const voucherDate = date ? new Date(date) : new Date();

    const op = new Operation({
      voucherNo,
      voucherType: 'payment',
      category: category || 'General Expense',
      date: voucherDate,
      fromAccountId: paidFromAcc._id,
      fromAccountName: paidFromAcc.name,
      amount: Number(amount),
      payMode: payMode || 'cash',
      customPayMode,
      refNo,
      partyName,
      remarks,
      companyId
    });
    await op.save();

    // Add debit transaction to source Cash/Bank account
    const tx = new LedgerTransaction({
      accountId: paidFromAcc._id,
      date: voucherDate,
      type: 'deduct',
      amount: Number(amount),
      refType: 'manual',
      refId: op._id,
      remarks: `Payment (${category || 'Expense'}): ${partyName ? partyName + ' - ' : ''}${remarks || voucherNo}`,
      companyId
    });
    await tx.save();

    res.json({ message: 'Payment entry saved successfully', operation: op });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving payment' });
  }
});

// @route   DELETE /api/operations/voucher/:id
// @desc    Delete a voucher and remove its ledger entries
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const op = await Operation.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!op) return res.status(404).json({ message: 'Voucher not found' });
    res.json(op);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching voucher' });
  }
});

router.delete('/voucher/:id', authMiddleware, async (req, res) => {
  try {
    const op = await Operation.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!op) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    // Delete corresponding ledger transactions
    await LedgerTransaction.deleteMany({ refId: op._id });

    res.json({ message: 'Voucher and associated entries deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting voucher' });
  }
});

module.exports = router;
