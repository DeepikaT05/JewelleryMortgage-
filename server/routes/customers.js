const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `customer-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, png, webp) are allowed!'));
  }
});

// @route   GET /api/customers
// @desc    Get all customers with search, pagination, sorting
router.get('/', authMiddleware, async (req, res) => {
  const { search, page = 1, limit = 10, sortBy = 'customerCode', order = 'asc' } = req.query;
  const companyId = req.user.companyId;

  let query = { companyId };

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { name: searchRegex },
      { mobile: searchRegex },
      { area: searchRegex },
      { city: searchRegex }
    ];
    // Check if search is a number (customer code search)
    if (!isNaN(search)) {
      query.$or.push({ customerCode: Number(search) });
    }
  }

  try {
    const count = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      customers,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalCustomers: count
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving customers' });
  }
});

// @route   GET /api/customers/export
// @desc    Export customers to Excel
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find({ companyId: req.user.companyId }).select('-idProofImageUrl -companyId -createdAt -updatedAt -__v');
    
    // Format data for Excel
    const formatted = customers.map(cust => ({
      'Customer Code': cust.customerCode,
      'Name': cust.name,
      'Father/Husband Name': cust.fatherHusbandName || '',
      'Address': cust.address || '',
      'Area': cust.area || '',
      'City': cust.city || '',
      'State': cust.state || '',
      'Pin Code': cust.pin || '',
      'Mobile': cust.mobile,
      'Email': cust.email || '',
      'Interest Type': cust.interestType,
      'Interest Rate (%)': cust.interestRate,
      'Frequency': cust.interestFrequency,
      'ID Proof Name': cust.idProofName || '',
      'ID Proof Number': cust.idProofNumber || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(formatted);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.xlsx');
    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error exporting customers' });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching customer' });
  }
});

// @route   POST /api/customers
// @desc    Create a customer (includes single image upload)
router.post('/', authMiddleware, upload.single('idProofImage'), async (req, res) => {
  const {
    name, fatherHusbandName, address, state, country, city, area, pin,
    email, phone1, phone2, phone3, mobile,
    idProofName, idProofNumber,
    interestType, interestRate, interestFrequency,
    compoundMonthDefault, compoundMonth, compoundDate,
    minimumInterestPeriod
  } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and Mobile number are required fields' });
  }

  try {
    // Increment customer code
    const counter = await Counter.findOneAndUpdate(
      { id: 'customerCode' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const newCustomer = new Customer({
      customerCode: counter.seq,
      name,
      fatherHusbandName,
      address,
      state,
      country: country || 'India',
      city,
      area,
      pin,
      email,
      phone1,
      phone2,
      phone3,
      mobile,
      idProofName,
      idProofNumber,
      idProofImageUrl: imageUrl,
      interestType: interestType || 'simple',
      interestRate: interestRate ? Number(interestRate) : 2.0,
      interestFrequency: interestFrequency || 'monthly',
      compoundMonthDefault: compoundMonthDefault === 'true' || compoundMonthDefault === true,
      compoundMonth: compoundMonth ? Number(compoundMonth) : 1,
      compoundDate: compoundDate ? Number(compoundDate) : 1,
      minimumInterestPeriod: minimumInterestPeriod || 'NA',
      companyId: req.user.companyId
    });

    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating customer' });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update a customer
router.put('/:id', authMiddleware, upload.single('idProofImage'), async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Parse boolean and numeric values explicitly
    if (updates.interestRate) updates.interestRate = Number(updates.interestRate);
    if (updates.compoundMonth) updates.compoundMonth = Number(updates.compoundMonth);
    if (updates.compoundDate) updates.compoundDate = Number(updates.compoundDate);
    if (updates.compoundMonthDefault !== undefined) {
      updates.compoundMonthDefault = updates.compoundMonthDefault === 'true' || updates.compoundMonthDefault === true;
    }

    if (req.file) {
      updates.idProofImageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await Customer.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating customer' });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete a customer
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Permission denied: Only admin users can delete customers' });
  }

  try {
    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!deleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting customer' });
  }
});

// @route   POST /api/customers/import
// @desc    Import customers from uploaded Excel file
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    const customersToInsert = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const name = row['Name'] || row['name'];
      const mobile = row['Mobile'] || row['mobile'] || row['Phone'] || row['phone'];

      if (!name) {
        errors.push(`Row ${i + 2}: Name is missing`);
        continue;
      }
      if (!mobile) {
        errors.push(`Row ${i + 2}: Mobile number is missing`);
        continue;
      }

      // Generate a sequence code
      const counter = await Counter.findOneAndUpdate(
        { id: 'customerCode' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      customersToInsert.push({
        customerCode: counter.seq,
        name: String(name).trim(),
        fatherHusbandName: row['Father/Husband Name'] ? String(row['Father/Husband Name']).trim() : '',
        address: row['Address'] ? String(row['Address']).trim() : '',
        area: row['Area'] ? String(row['Area']).trim() : '',
        city: row['City'] ? String(row['City']).trim() : '',
        state: row['State'] ? String(row['State']).trim() : '',
        pin: row['Pin Code'] ? String(row['Pin Code']).trim() : '',
        mobile: String(mobile).trim(),
        email: row['Email'] ? String(row['Email']).trim() : '',
        interestType: (row['Interest Type'] || 'simple').toLowerCase() === 'compound' ? 'compound' : 'simple',
        interestRate: row['Interest Rate (%)'] ? Number(row['Interest Rate (%)']) : 2.0,
        interestFrequency: (row['Frequency'] || 'monthly').toLowerCase(),
        idProofName: row['ID Proof Name'] ? String(row['ID Proof Name']).trim() : '',
        idProofNumber: row['ID Proof Number'] ? String(row['ID Proof Number']).trim() : '',
        companyId: req.user.companyId
      });
    }

    if (errors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Validation errors found in file', errors });
    }

    if (customersToInsert.length > 0) {
      await Customer.insertMany(customersToInsert);
    }

    // Clean up file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: `Successfully imported ${customersToInsert.length} customers`,
      importedCount: customersToInsert.length
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error processing file import', error: err.message });
  }
});

module.exports = router;
