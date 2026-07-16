const mongoose = require('mongoose');

const DealItemSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  itemName: { type: String, required: true },
  pcs: { type: Number, default: 1 },
  remarks: String,
  grossWeight: { type: Number, default: 0 },
  lessWeight: { type: Number, default: 0 },
  netWeight: { type: Number, default: 0 }, // grossWeight - lessWeight (auto computed)
  purityPercent: { type: Number, default: 100 },
  pureWeight: { type: Number, default: 0 },    // netWeight * purityPercent / 100 (auto computed)
  rate: { type: Number, default: 0 },
  estimatedValue: { type: Number, default: 0 }, // pureWeight * rate (auto computed)
  imageUrl: String
});

const GroupTotalSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  grossWeight: { type: Number, default: 0 },
  lessWeight: { type: Number, default: 0 },
  netWeight: { type: Number, default: 0 },
  pureWeight: { type: Number, default: 0 },
  estimatedValue: { type: Number, default: 0 }
});

const DealSchema = new mongoose.Schema({
  dealNo: { type: Number, unique: true },
  dealDate: { type: Date, default: Date.now },
  refNo: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  copiedFromDealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  items: [DealItemSchema],
  groupTotals: [GroupTotalSchema],
  dealAmount: { type: Number, required: true },
  paidPercent: { type: Number, default: 100 },
  paidAmount: { type: Number, required: true },
  totalValue: { type: Number, default: 0 }, // auto sum of estimatedValue of items
  interestRatePerMonth: { type: Number, default: 2.0 },
  interestAmountPerMonth: { type: Number, default: 0 }, // auto computed: dealAmount * interestRatePerMonth / 100
  returnPeriodMonths: { type: Number, default: 12 },
  payMode: { type: String, enum: ['cash', 'bank'], default: 'cash' },
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
  chequeNo: String,
  chequeDate: Date,
  location: String,
  remarks: String,
  stopDate: Date,
  status: { type: String, enum: ['active', 'settled', 'overdue'], default: 'active' },
  dealStartDate: { type: Date, default: Date.now },
  dealEndDate: Date, // dealStartDate + returnPeriodMonths
  lastPaidUpto: { type: Date }, // tracks up to when interest has been cleared
  paidUpto: { type: Date }, // same context
  createdBy: { type: Number }, // userId of the staff
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

// Pre-save hook to automate internal calculations
DealSchema.pre('save', function (next) {
  let sumValue = 0;
  
  // Calculate weights & values for each item
  this.items.forEach(item => {
    item.netWeight = parseFloat((item.grossWeight - item.lessWeight).toFixed(3));
    item.pureWeight = parseFloat((item.netWeight * (item.purityPercent / 100)).toFixed(3));
    item.estimatedValue = parseFloat((item.pureWeight * item.rate).toFixed(2));
    sumValue += item.estimatedValue;
  });

  this.totalValue = parseFloat(sumValue.toFixed(2));
  
  // Calculate group totals
  const rolls = {};
  this.items.forEach(item => {
    const gid = item.groupId.toString();
    if (!rolls[gid]) {
      rolls[gid] = { groupId: item.groupId, grossWeight: 0, lessWeight: 0, netWeight: 0, pureWeight: 0, estimatedValue: 0 };
    }
    rolls[gid].grossWeight += item.grossWeight;
    rolls[gid].lessWeight += item.lessWeight;
    rolls[gid].netWeight += item.netWeight;
    rolls[gid].pureWeight += item.pureWeight;
    rolls[gid].estimatedValue += item.estimatedValue;
  });

  this.groupTotals = Object.values(rolls).map(r => ({
    groupId: r.groupId,
    grossWeight: parseFloat(r.grossWeight.toFixed(3)),
    lessWeight: parseFloat(r.lessWeight.toFixed(3)),
    netWeight: parseFloat(r.netWeight.toFixed(3)),
    pureWeight: parseFloat(r.pureWeight.toFixed(3)),
    estimatedValue: parseFloat(r.estimatedValue.toFixed(2))
  }));

  // Interest Amount Per Month
  this.interestAmountPerMonth = parseFloat((this.dealAmount * (this.interestRatePerMonth / 100)).toFixed(2));

  // Dates
  if (!this.dealStartDate) {
    this.dealStartDate = this.dealDate || new Date();
  }
  
  if (this.dealStartDate && this.returnPeriodMonths) {
    const end = new Date(this.dealStartDate);
    end.setMonth(end.getMonth() + this.returnPeriodMonths);
    this.dealEndDate = end;
  }

  if (!this.lastPaidUpto) {
    this.lastPaidUpto = this.dealStartDate;
  }
  if (!this.paidUpto) {
    this.paidUpto = this.dealStartDate;
  }

  next();
});

module.exports = mongoose.model('Deal', DealSchema);
