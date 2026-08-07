const mongoose = require('mongoose');

const LedgerTransactionSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['add', 'deduct'], required: true }, // add = deposit / demand draft (DD), deduct = payment / withdrawal
  amount: { type: Number, required: true },
  refType: { type: String, enum: ['deal', 'transaction', 'manual'], default: 'manual' },
  refId: { type: mongoose.Schema.Types.ObjectId }, // reference to Deal or Transaction
  remarks: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LedgerTransaction', LedgerTransactionSchema);
