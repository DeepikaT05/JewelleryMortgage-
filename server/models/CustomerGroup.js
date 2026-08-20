const mongoose = require('mongoose');

const CustomerGroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  groupCode: { type: String, default: '' },
  description: { type: String, default: '' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CustomerGroup', CustomerGroupSchema);
