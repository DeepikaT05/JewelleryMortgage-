const mongoose = require('mongoose');

const SupplierTransactionSchema = new mongoose.Schema({
  transactionNo: { type: Number, unique: true },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierDeal', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  tranDate: { type: Date, default: Date.now },
  dealAmount: { type: Number, required: true },
  interestPerMonth: { type: Number, required: true },
  ratePercentPerMonth: { type: Number, required: true },
  noOfMonths: { type: Number, default: 0 },
  noOfDays: { type: Number, default: 0 },
  isSettlement: { type: Boolean, default: false },
  closingDate: Date,
  payMode: { type: String, enum: ['cash', 'bank'], default: 'cash' },
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
  chequeNo: String,
  submittedBy: String,
  remarks: String,
  principle: {
    toBePaid: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  },
  compound: {
    lastBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    toBePaid: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  },
  discount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['settled', 'partial'], default: 'partial' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('SupplierTransaction', SupplierTransactionSchema);
