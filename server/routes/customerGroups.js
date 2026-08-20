const express = require('express');
const router = express.Router();
const CustomerGroup = require('../models/CustomerGroup');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/customer-groups
// @desc    Get all customer groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await CustomerGroup.find({ companyId: req.user.companyId }).sort({ groupName: 1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving customer groups' });
  }
});

// @route   GET /api/customer-groups/:id/members
// @desc    Get all customers assigned to a specific group
router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find({
      customerGroupId: req.params.id,
      companyId: req.user.companyId
    }).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving group members' });
  }
});

// @route   POST /api/customer-groups
// @desc    Create a new customer group
router.post('/', authMiddleware, async (req, res) => {
  const { groupName, groupCode, description } = req.body;
  if (!groupName) {
    return res.status(400).json({ message: 'Group name is required' });
  }
  try {
    const existing = await CustomerGroup.findOne({
      groupName: groupName.trim(),
      companyId: req.user.companyId
    });
    if (existing) {
      return res.status(400).json({ message: 'A group with this name already exists' });
    }

    const newGroup = new CustomerGroup({
      groupName: groupName.trim(),
      groupCode: groupCode ? groupCode.trim() : '',
      description: description ? description.trim() : '',
      companyId: req.user.companyId
    });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating customer group' });
  }
});

// @route   PUT /api/customer-groups/:id
// @desc    Update a customer group
router.put('/:id', authMiddleware, async (req, res) => {
  const { groupName, groupCode, description } = req.body;
  try {
    const group = await CustomerGroup.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!group) {
      return res.status(404).json({ message: 'Customer group not found' });
    }
    if (groupName) group.groupName = groupName.trim();
    if (groupCode !== undefined) group.groupCode = groupCode.trim();
    if (description !== undefined) group.description = description.trim();
    await group.save();

    // Sync updated group name to customers assigned to this group
    if (groupName) {
      await Customer.updateMany(
        { customerGroupId: group._id },
        { customerGroup: group.groupName }
      );
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating customer group' });
  }
});

// @route   DELETE /api/customer-groups/:id
// @desc    Delete a customer group
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await CustomerGroup.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!group) {
      return res.status(404).json({ message: 'Customer group not found' });
    }

    // Reset assigned customers to 'General'
    await Customer.updateMany(
      { customerGroupId: req.params.id },
      { customerGroup: 'General', customerGroupId: null }
    );

    res.json({ message: 'Customer group deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting customer group' });
  }
});

module.exports = router;
