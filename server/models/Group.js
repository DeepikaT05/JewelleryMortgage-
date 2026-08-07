const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  groupId: { type: Number, unique: true },
  groupName: { type: String, required: true },
  defaultRate: { type: Number, default: 0 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
