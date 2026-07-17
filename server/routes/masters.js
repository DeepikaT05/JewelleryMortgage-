const express = require('express');
const Group = require('../models/Group');
const Item = require('../models/Item');
const TermsAndConditions = require('../models/TermsAndConditions');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');

const groupsRouter = express.Router();
const itemsRouter = express.Router();
const termsRouter = express.Router();

// ==========================================
// 1. GROUP MASTER CRUD
// ==========================================

groupsRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ companyId: req.user.companyId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

groupsRouter.post('/', authMiddleware, async (req, res) => {
  const { groupName, defaultRate } = req.body;
  if (!groupName) {
    return res.status(400).json({ message: 'Group Name is required' });
  }
  try {
    let counter = await Counter.findOneAndUpdate(
      { id: 'groupId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newGroup = new Group({
      groupId: counter.seq,
      groupName,
      defaultRate: defaultRate || 0,
      companyId: req.user.companyId
    });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating group' });
  }
});

groupsRouter.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { _id, groupId, companyId, __v, ...updates } = req.body;
    const updated = await Group.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updates,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Group not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating group' });
  }
});

groupsRouter.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required to delete master data' });
  }
  try {
    const deleted = await Group.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) return res.status(404).json({ message: 'Group not found' });
    
    // Also delete items in this group
    await Item.deleteMany({ groupId: req.params.id, companyId: req.user.companyId });
    
    res.json({ message: 'Group and related items deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting group' });
  }
});

// ==========================================
// 2. ITEM MASTER CRUD
// ==========================================

itemsRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await Item.find({ companyId: req.user.companyId }).populate('groupId');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching items' });
  }
});

itemsRouter.post('/', authMiddleware, async (req, res) => {
  const { itemName, groupId } = req.body;
  if (!itemName || !groupId) {
    return res.status(400).json({ message: 'Item Name and Metal Group are required' });
  }
  try {
    let counter = await Counter.findOneAndUpdate(
      { id: 'itemId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newItem = new Item({
      itemId: counter.seq,
      itemName,
      groupId,
      companyId: req.user.companyId
    });
    await newItem.save();
    
    const populated = await newItem.populate('groupId');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating item' });
  }
});

itemsRouter.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { _id, itemId, companyId, __v, ...updates } = req.body;
    const updated = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updates,
      { new: true }
    ).populate('groupId');
    if (!updated) return res.status(404).json({ message: 'Item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating item' });
  }
});

itemsRouter.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required to delete master data' });
  }
  try {
    const deleted = await Item.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting item' });
  }
});

// ==========================================
// 3. TERMS & CONDITIONS MASTER
// ==========================================

termsRouter.get('/', authMiddleware, async (req, res) => {
  try {
    let terms = await TermsAndConditions.findOne({ companyId: req.user.companyId });
    if (!terms) {
      // Seed default terms if empty
      terms = new TermsAndConditions({
        termsText: '1. The borrower must pay monthly interest on time.\n2. In case of default for more than 12 months, the lender reserves the right to auction the gold/silver collateral.\n3. The weights mentioned here are final and accepted by the customer.',
        companyId: req.user.companyId
      });
      await terms.save();
    }
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching terms' });
  }
});

termsRouter.put('/', authMiddleware, async (req, res) => {
  const { termsText } = req.body;
  if (!termsText) {
    return res.status(400).json({ message: 'Terms text is required' });
  }
  try {
    let terms = await TermsAndConditions.findOneAndUpdate(
      { companyId: req.user.companyId },
      { termsText },
      { new: true, upsert: true }
    );
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating terms' });
  }
});

module.exports = {
  groupsRouter,
  itemsRouter,
  termsRouter
};
