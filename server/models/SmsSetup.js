const mongoose = require('mongoose');

const SmsSetupSchema = new mongoose.Schema({
  smsApiProvider: { type: String, default: 'mock' },
  apiKey: String,
  senderId: String,
  autoReminderTemplate: { type: String, default: 'Dear {customerName}, your deal {dealNo} has a pending balance of {balanceAmount}. Please clear it soon.' },
  isEnabled: { type: Boolean, default: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('SmsSetup', SmsSetupSchema);
