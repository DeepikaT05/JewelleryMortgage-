const mongoose = require('mongoose');

const TermsAndConditionsSchema = new mongoose.Schema({
  termsText: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('TermsAndConditions', TermsAndConditionsSchema);
