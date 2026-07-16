const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  area: String,
  pin: String,
  gstin: String,
  phone: String,
  email: String,
  financialYearStart: String, // e.g. "2026-04-01" or year string
  financialYearEnd: String,   // e.g. "2027-03-31" or year string
  logoUrl: String,
  printCompanyNameAddress: { type: Boolean, default: true },
  displayLogoOnReceipt: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);
