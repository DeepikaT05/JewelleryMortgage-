const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const GirviSetup = require('../models/GirviSetup');
const SmsSetup = require('../models/SmsSetup');
const authMiddleware = require('../middleware/auth');

// Multer storage for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadLogo = multer({ storage: logoStorage });

// @route   GET /api/settings/girvi
// @desc    Get general setup
router.get('/girvi', authMiddleware, async (req, res) => {
  try {
    let setup = await GirviSetup.findOne({ companyId: req.user.companyId });
    if (!setup) {
      setup = new GirviSetup({ companyId: req.user.companyId });
      await setup.save();
    }
    res.json(setup);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving setup settings' });
  }
});

// @route   PUT /api/settings/girvi
// @desc    Update setup (supports logo upload)
router.put('/girvi', authMiddleware, uploadLogo.single('logo'), async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Format boolean fields properly
    if (updates.printCompanyNameAddress !== undefined) {
      updates.printCompanyNameAddress = updates.printCompanyNameAddress === 'true' || updates.printCompanyNameAddress === true;
    }
    if (updates.displayLogoInReceipt !== undefined) {
      updates.displayLogoInReceipt = updates.displayLogoInReceipt === 'true' || updates.displayLogoInReceipt === true;
    }
    if (updates.autoReminderUnsettledGirvi !== undefined) {
      updates.autoReminderUnsettledGirvi = updates.autoReminderUnsettledGirvi === 'true' || updates.autoReminderUnsettledGirvi === true;
    }
    if (updates.allowIssueMoreThanEstimatedAmount !== undefined) {
      updates.allowIssueMoreThanEstimatedAmount = updates.allowIssueMoreThanEstimatedAmount === 'true' || updates.allowIssueMoreThanEstimatedAmount === true;
    }

    if (updates.defaultRateOfInterest) updates.defaultRateOfInterest = Number(updates.defaultRateOfInterest);
    if (updates.openingBalance) updates.openingBalance = Number(updates.openingBalance);

    if (req.file) {
      updates.logoFileUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await GirviSetup.findOneAndUpdate(
      { companyId: req.user.companyId },
      updates,
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating setup settings' });
  }
});

// @route   GET /api/settings/sms
// @desc    Get SMS settings
router.get('/sms', authMiddleware, async (req, res) => {
  try {
    let sms = await SmsSetup.findOne({ companyId: req.user.companyId });
    if (!sms) {
      sms = new SmsSetup({ companyId: req.user.companyId });
      await sms.save();
    }
    res.json(sms);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving SMS settings' });
  }
});

// @route   PUT /api/settings/sms
// @desc    Update SMS settings
router.put('/sms', authMiddleware, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.isEnabled !== undefined) {
      updates.isEnabled = updates.isEnabled === 'true' || updates.isEnabled === true;
    }

    const updated = await SmsSetup.findOneAndUpdate(
      { companyId: req.user.companyId },
      updates,
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating SMS settings' });
  }
});

module.exports = router;
