const mongoose = require('mongoose');

const LedgerAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  group: { type: String, required: true }, // 'cash', 'bank', 'crediter', 'debiter', or custom group name
  openingBalance: { type: Number, default: 0 },
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LedgerAccount', LedgerAccountSchema);
