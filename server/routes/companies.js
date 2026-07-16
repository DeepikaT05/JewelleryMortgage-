const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/companies
// @desc    Get all companies (for login dropdown or admin management)
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving companies' });
  }
});

// @route   POST /api/companies
// @desc    Create a new company
router.post('/', async (req, res) => {
  const { name, address, city, area, pin, gstin, phone, email, financialYearStart, financialYearEnd } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  try {
    const newCompany = new Company({
      name, address, city, area, pin, gstin, phone, email, financialYearStart, financialYearEnd
    });
    await newCompany.save();
    res.status(201).json(newCompany);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating company' });
  }
});

// @route   PUT /api/companies/:id
// @desc    Update company details
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedCompany = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(updatedCompany);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating company' });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Delete a company
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
    return res.status(403).json({ message: 'Permission denied' });
  }

  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting company' });
  }
});

// @route   POST /api/companies/switch
// @desc    Switch active company for logged-in user
router.post('/switch', authMiddleware, async (req, res) => {
  const { companyId } = req.body;
  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required' });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Update user's default company
    await User.findByIdAndUpdate(req.user.id, { companyId });
    res.json({ message: 'Switched company successfully', company });
  } catch (err) {
    res.status(500).json({ message: 'Server error switching company' });
  }
});

module.exports = router;
