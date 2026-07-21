require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');

// Models (for Seeding)
const User = require('./models/User');
const Company = require('./models/Company');
const GirviSetup = require('./models/GirviSetup');
const TermsAndConditions = require('./models/TermsAndConditions');

const app = express();

// Initialize Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Connect to Database
connectDB();

// Database Seeding Logic
const seedDatabase = async () => {
  try {
    // 1. Seed Company
    let company = await Company.findOne();
    if (!company) {
      company = new Company({
        name: 'Demo Jewellery & Pawnbrokers',
        address: '123, Gold Bazaar Street, Jewel City',
        city: 'Mumbai',
        area: 'Zaveri Bazaar',
        pin: '400002',
        gstin: '27AAAAA1111A1Z1',
        phone: '022-23456789',
        email: 'info@demojewellers.com',
        financialYearStart: '2026-04-01',
        financialYearEnd: '2027-03-31',
        printCompanyNameAddress: true,
        displayLogoOnReceipt: true
      });
      await company.save();
      console.log('Seeded default company successfully.');
    }

    // 2. Seed Super Admin User
    let superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('superadmin123', salt);

      superAdmin = new User({
        userId: 1000,
        name: 'Super Administrator',
        username: 'superadmin',
        passwordHash,
        role: 'super admin',
        companyId: null,
        isActive: true
      });
      await superAdmin.save();
      console.log('Seeded default super admin user (superadmin/superadmin123).');
    }

    // 3. Seed Admin User
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin', salt);

      admin = new User({
        userId: 1001,
        name: 'System Administrator',
        username: 'admin',
        passwordHash,
        role: 'admin',
        companyId: company._id,
        isActive: true
      });
      await admin.save();
      console.log('Seeded default admin user successfully (admin/admin).');
    }

    // 3. Seed Operator User
    let operator = await User.findOne({ username: 'operator' });
    if (!operator) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('operator', salt);

      operator = new User({
        userId: 1002,
        name: 'System Operator',
        username: 'operator',
        passwordHash,
        role: 'operator',
        companyId: company._id,
        isActive: true
      });
      await operator.save();
      console.log('Seeded default operator user successfully (operator/operator).');
    }

    // 4. Seed Girvi Setup
    let setup = await GirviSetup.findOne({ companyId: company._id });
    if (!setup) {
      setup = new GirviSetup({
        printCompanyNameAddress: true,
        displayLogoInReceipt: true,
        autoReminderUnsettledGirvi: true,
        allowIssueMoreThanEstimatedAmount: false,
        defaultRateOfInterest: 2.0,
        customerNoticeSubject: 'Pending Loan Warning Notice',
        openingBalance: 1500000, // 15 Lakhs Opening Balance
        dealPrintHeading: 'GIRVI MORTGAGE LOAN BILL/RECEIPT',
        companyId: company._id
      });
      await setup.save();
      console.log('Seeded default Girvi setup settings successfully.');
    }

    // 5. Seed Terms and Conditions
    let terms = await TermsAndConditions.findOne({ companyId: company._id });
    if (!terms) {
      terms = new TermsAndConditions({
        termsText: '1. The borrower must pay monthly interest on or before the due date.\n2. In case of default for more than 12 months, the lender reserves the absolute right to auction the pledged gold/silver items.\n3. The item weight and estimated values mentioned here are final and verified by the customer.',
        companyId: company._id
      });
      await terms.save();
      console.log('Seeded default Terms and Conditions successfully.');
    }
  } catch (err) {
    console.error('Error during database seeding:', err.message);
  }
};

// Execute seeding after connection is open
const mongoose = require('mongoose');
mongoose.connection.once('open', seedDatabase);

// Import Route Handlers
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const { groupsRouter, itemsRouter, termsRouter } = require('./routes/masters');
const customerRoutes = require('./routes/customers');
const dealRoutes = require('./routes/deals');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');
const supplierRoutes = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const ledgerRoutes = require('./routes/ledgers');
const superadminRoutes = require('./routes/superadmin');

// Mount API Routers
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/groups', groupsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/terms', termsRouter);
app.use('/api/customers', customerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/superadmin', superadminRoutes);

// Banks API Route (maps bank ledger accounts)
app.get('/api/banks', require('./middleware/auth'), async (req, res) => {
  try {
    const LedgerAccount = require('./models/LedgerAccount');
    const bankAccounts = await LedgerAccount.find({
      group: 'bank',
      companyId: req.user.companyId
    });
    const formatted = bankAccounts.map(acc => ({
      _id: acc._id,
      bankName: acc.name
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving banks', error: err.message });
  }
});

// Counters API Route (returns next sequence number)
app.get('/api/counters/:id', require('./middleware/auth'), async (req, res) => {
  try {
    const Counter = require('./models/Counter');
    const cnt = await Counter.findOne({ id: req.params.id });
    res.json({ nextSeq: (cnt ? cnt.seq : 0) + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', date: new Date() });
});

// Boot Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
