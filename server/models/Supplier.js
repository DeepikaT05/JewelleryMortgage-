const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  supplierCode: { type: Number, unique: true },
  name: { type: String, required: true },
  fatherHusbandName: String,
  address: String,
  state: String,
  city: String,
  area: String,
  pin: String,
  email: String,
  phone1: String,
  phone2: String,
  phone3: String,
  mobile: { type: String, required: true },
  idProofName: String,
  idProofNumber: String,
  idProofImageUrl: String,
  interestType: { type: String, enum: ['simple', 'compound'], default: 'simple' },
  interestRate: { type: Number, default: 2.0 },
  interestFrequency: { type: String, enum: ['yearly', 'monthly', 'daily'], default: 'monthly' },
  compoundMonthDefault: { type: Boolean, default: true },
  compoundMonth: { type: Number, default: 1 },
  compoundDate: { type: String, default: '' },
  minimumInterestPeriod: { type: String, enum: ['NA', '7D', '15D', '1M'], default: 'NA' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
