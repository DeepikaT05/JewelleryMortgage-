const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  customerCode: { type: Number, unique: true },
  name: { type: String, required: true },
  fatherHusbandName: String,
  address: String,
  state: String,
  country: { type: String, default: 'India' },
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
  interestRate: { type: Number, default: 2.0 }, // per month/year/day frequency
  interestFrequency: { type: String, enum: ['yearly', 'monthly', 'daily'], default: 'monthly' },
  compoundMonthDefault: { type: Boolean, default: true },
  compoundMonth: { type: Number, default: 1 }, // compounds every N months
  compoundDate: { type: String, default: '' },  // compound start date (calendar date string)
  minimumInterestPeriod: { type: String, enum: ['NA', '7D', '15D', '1M'], default: 'NA' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
