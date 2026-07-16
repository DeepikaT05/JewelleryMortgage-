const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Counter = require('../models/Counter');
const superadminAuth = require('../middleware/superadminAuth');

// ─── SUPERADMIN LOGIN ────────────────────────────────────────────────────────
// POST /api/superadmin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter username and password' });
  }
  try {
    const user = await User.findOne({ username, role: 'super admin' });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(400).json({ message: 'Account is deactivated' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = {
      id: user._id,
      userId: user.userId,
      username: user.username,
      role: user.role,
      companyId: null
    };
    const secret = process.env.JWT_SECRET || 'girvi_secret_key_2026_998811';
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user._id, name: user.name, username: user.username, role: user.role } });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ─── LIST ALL COMPANIES ──────────────────────────────────────────────────────
// GET /api/superadmin/companies
router.get('/companies', superadminAuth, async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching companies' });
  }
});

// ─── CREATE COMPANY ──────────────────────────────────────────────────────────
// POST /api/superadmin/companies
router.post('/companies', superadminAuth, async (req, res) => {
  const { name, address, city, area, pin, gstin, phone, email, financialYearStart, financialYearEnd } = req.body;
  if (!name) return res.status(400).json({ message: 'Company name is required' });

  try {
    const existing = await Company.findOne({ name });
    if (existing) return res.status(400).json({ message: 'A company with this name already exists' });

    const company = new Company({ name, address, city, area, pin, gstin, phone, email, financialYearStart, financialYearEnd });
    await company.save();
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ message: 'Error creating company' });
  }
});

// ─── UPDATE COMPANY ──────────────────────────────────────────────────────────
// PUT /api/superadmin/companies/:id
router.put('/companies/:id', superadminAuth, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: 'Error updating company' });
  }
});

// ─── DELETE COMPANY ──────────────────────────────────────────────────────────
// DELETE /api/superadmin/companies/:id
router.delete('/companies/:id', superadminAuth, async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    // Also delete admins associated to this company
    await User.deleteMany({ companyId: req.params.id });
    res.json({ message: 'Company and its admins deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting company' });
  }
});

// ─── LIST ALL ADMINS ─────────────────────────────────────────────────────────
// GET /api/superadmin/admins
router.get('/admins', superadminAuth, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).populate('companyId', 'name city').select('-passwordHash').sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admins' });
  }
});

// ─── CREATE ADMIN (with optional company creation) ───────────────────────────
// POST /api/superadmin/admins
router.post('/admins', superadminAuth, async (req, res) => {
  const { name, username, password, companyId, newCompanyName } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ message: 'Name, username, and password are required' });
  }
  if (!companyId && !newCompanyName) {
    return res.status(400).json({ message: 'Either select an existing company or provide a new company name' });
  }

  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already taken' });

    let assignedCompanyId = companyId;

    // Create company on the fly if name was given
    if (!assignedCompanyId && newCompanyName) {
      const newCompany = new Company({ name: newCompanyName, financialYearStart: '2026-04-01', financialYearEnd: '2027-03-31' });
      await newCompany.save();
      assignedCompanyId = newCompany._id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const counter = await Counter.findOneAndUpdate(
      { id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const admin = new User({
      userId: counter.seq,
      name,
      username,
      passwordHash,
      role: 'admin',
      companyId: assignedCompanyId,
      isActive: true
    });
    await admin.save();

    const populated = await User.findById(admin._id).populate('companyId', 'name city').select('-passwordHash');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating admin', error: err.message });
  }
});

// ─── UPDATE ADMIN ─────────────────────────────────────────────────────────────
// PUT /api/superadmin/admins/:id
router.put('/admins/:id', superadminAuth, async (req, res) => {
  const { name, password, companyId, isActive } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Admin not found' });

    if (name) user.name = name;
    if (companyId) user.companyId = companyId;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    const populated = await User.findById(user._id).populate('companyId', 'name city').select('-passwordHash');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating admin' });
  }
});

// ─── DELETE ADMIN ────────────────────────────────────────────────────────────
// DELETE /api/superadmin/admins/:id
router.delete('/admins/:id', superadminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting admin' });
  }
});

// ─── GLOBAL STATS ────────────────────────────────────────────────────────────
// GET /api/superadmin/stats
router.get('/stats', superadminAuth, async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalUsers = await User.countDocuments({ role: { $in: ['admin', 'operator', 'manager'] } });
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    res.json({ totalCompanies, totalAdmins, totalUsers, activeAdmins });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
// POST /api/superadmin/change-password
router.post('/change-password', superadminAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error changing password' });
  }
});

module.exports = router;

