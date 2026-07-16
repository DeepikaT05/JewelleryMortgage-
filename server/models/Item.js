const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemId: { type: Number, unique: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  itemName: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
