const mongoose = require('mongoose');

const GirviSetupSchema = new mongoose.Schema({
  printCompanyNameAddress: { type: Boolean, default: true },
  displayLogoInReceipt: { type: Boolean, default: true },
  autoReminderUnsettledGirvi: { type: Boolean, default: false },
  allowIssueMoreThanEstimatedAmount: { type: Boolean, default: false },
  defaultRateOfInterest: { type: Number, default: 2.0 },
  customerNoticeSubject: { type: String, default: 'Outstanding Pledge Loan Reminder' },
  openingBalance: { type: Number, default: 0 },
  dealPrintHeading: { type: String, default: 'Girvi Mortgage Loan Receipt' },
  logoFileUrl: String,
  defaultArea: { type: String, default: '' },
  defaultCity: { type: String, default: 'Mumbai' },
  defaultState: { type: String, default: 'Maharashtra' },
  defaultCountry: { type: String, default: 'India' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('GirviSetup', GirviSetupSchema);
