const mongoose = require('mongoose');

const OperationSchema = new mongoose.Schema({
  voucherNo: { type: String, required: true },
  voucherType: { type: String, enum: ['contra', 'receipt', 'payment'], required: true },
  subType: { type: String }, // 'c_to_b', 'b_to_c', 'b_to_b', 'custom'
  date: { type: Date, default: Date.now },
  fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount' },
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount' },
  fromAccountName: { type: String },
  toAccountName: { type: String },
  amount: { type: Number, required: true },
  payMode: { type: String, default: 'cash' }, // cash, bank, upi, card, cheque, custom
  customPayMode: { type: String },
  refNo: { type: String },
  partyName: { type: String }, // Received From / Paid To
  category: { type: String }, // Expense / Income / Capital category name
  remarks: { type: String },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Operation', OperationSchema);
