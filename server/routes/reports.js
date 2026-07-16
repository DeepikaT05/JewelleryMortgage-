const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth');
const { calculateInterest } = require('../utils/calculations');

// ==========================================
// REPORT 1: Unsettled Completed Period Reminder
// ==========================================
router.get('/unsettled-reminder', authMiddleware, async (req, res) => {
  const { upToDate, search } = req.query;
  const companyId = req.user.companyId;
  const targetDate = upToDate ? new Date(upToDate) : new Date();

  try {
    let query = {
      companyId,
      status: { $ne: 'settled' },
      dealEndDate: { $lte: targetDate }
    };

    if (search) {
      const customers = await Customer.find({
        companyId,
        $or: [
          { name: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') }
        ]
      });
      const custIds = customers.map(c => c._id);
      
      if (!isNaN(search)) {
        query.$or = [
          { dealNo: Number(search) },
          { customerId: { $in: custIds } }
        ];
      } else {
        query.customerId = { $in: custIds };
      }
    }

    const deals = await Deal.find(query).populate('customerId');

    // Compile reports with principal balance
    const reportData = [];
    for (const d of deals) {
      const pastTrans = await Transaction.find({ dealId: d._id });
      const principalPaid = pastTrans.reduce((sum, t) => sum + (t.principle.amountPaid || 0), 0);
      const interestPaid = pastTrans.reduce((sum, t) => sum + (t.compound.amountPaid || 0), 0);
      
      const balanceAmount = Math.max(0, d.dealAmount - principalPaid);
      
      reportData.push({
        dealId: d._id,
        dealNo: d.dealNo,
        dealDate: d.dealDate,
        customerName: d.customerId ? d.customerId.name : 'Unknown',
        area: d.customerId ? d.customerId.area : '',
        mobile: d.customerId ? d.customerId.mobile : '',
        returnPeriodMonths: d.returnPeriodMonths,
        dealEndDate: d.dealEndDate,
        dealAmount: d.dealAmount,
        paidAmount: principalPaid + interestPaid,
        balanceAmount // Principal Balance remaining
      });
    }

    res.json(reportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating unsettled report' });
  }
});

// Mock endpoint to trigger bulk SMS alerts
router.post('/unsettled-reminder/send-sms', authMiddleware, async (req, res) => {
  const { dealIds } = req.body;
  if (!dealIds || !Array.isArray(dealIds)) {
    return res.status(400).json({ message: 'Array of dealIds is required' });
  }
  try {
    // In a real application, you would invoke SMS API provider. Here we log/mock it.
    console.log(`Sending SMS Alerts for Deals: ${dealIds.join(', ')}`);
    res.json({ message: `Successfully sent reminders to ${dealIds.length} customer contacts` });
  } catch (err) {
    res.status(500).json({ message: 'Server error triggering alerts' });
  }
});

// ==========================================
// REPORT 2: Customer Ledger
// ==========================================
router.get('/customer-ledger/:customerId', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  const companyId = req.user.companyId;

  try {
    const customer = await Customer.findOne({ _id: customerId, companyId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const deals = await Deal.find({ customerId, companyId }).sort({ dealDate: 1 });
    const transactions = await Transaction.find({ customerId, companyId }).sort({ tranDate: 1 });

    const ledger = [];
    
    // Merge deals and transactions chronologically
    deals.forEach(d => {
      ledger.push({
        type: 'Deal',
        date: d.dealDate,
        no: d.dealNo,
        amount: d.dealAmount,
        particulars: `Pledged collateral. Monthly Interest Rate: ${d.interestRatePerMonth}%`,
        principalImpact: d.dealAmount, // Positive balance owed
        interestImpact: 0,
        discount: 0,
        totalPaid: 0
      });
    });

    transactions.forEach(t => {
      ledger.push({
        type: 'Receipt',
        date: t.tranDate,
        no: t.transactionNo,
        amount: t.totalPaid,
        particulars: `Payment received. Mode: ${t.payMode}. Principal Paid: ${t.principle.amountPaid}, Interest Paid: ${t.compound.amountPaid}`,
        principalImpact: -t.principle.amountPaid, // Red Owed
        interestImpact: -t.compound.amountPaid,
        discount: t.discount,
        totalPaid: t.totalPaid
      });
    });

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balances
    let runningPrincipalOwed = 0;
    const ledgerWithBalances = ledger.map(item => {
      runningPrincipalOwed += item.principalImpact;
      return {
        ...item,
        runningPrincipalOwed: parseFloat(runningPrincipalOwed.toFixed(2))
      };
    });

    res.json({
      customer,
      ledger: ledgerWithBalances
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error compiling customer ledger' });
  }
});

// ==========================================
// REPORT 3: Stock Summary (Collaterals)
// ==========================================
router.get('/stock-summary', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;

  try {
    // Find all active (unsettled) deals
    const activeDeals = await Deal.find({ companyId, status: { $ne: 'settled' } })
      .populate('items.groupId');

    const stock = {};

    activeDeals.forEach(deal => {
      deal.items.forEach(item => {
        const group = item.groupId;
        if (!group) return;

        const gid = group._id.toString();
        if (!stock[gid]) {
          stock[gid] = {
            groupName: group.groupName,
            pcs: 0,
            grossWeight: 0,
            lessWeight: 0,
            netWeight: 0,
            pureWeight: 0,
            estimatedValue: 0
          };
        }

        stock[gid].pcs += item.pcs || 1;
        stock[gid].grossWeight += item.grossWeight || 0;
        stock[gid].lessWeight += item.lessWeight || 0;
        stock[gid].netWeight += item.netWeight || 0;
        stock[gid].pureWeight += item.pureWeight || 0;
        stock[gid].estimatedValue += item.estimatedValue || 0;
      });
    });

    // Format weights
    const formatted = Object.values(stock).map(s => ({
      groupName: s.groupName,
      pcs: s.pcs,
      grossWeight: parseFloat(s.grossWeight.toFixed(3)),
      lessWeight: parseFloat(s.lessWeight.toFixed(3)),
      netWeight: parseFloat(s.netWeight.toFixed(3)),
      pureWeight: parseFloat(s.pureWeight.toFixed(3)),
      estimatedValue: parseFloat(s.estimatedValue.toFixed(2))
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating stock summary' });
  }
});

// ==========================================
// REPORT 4: Profit & Loss
// ==========================================
router.get('/profit-loss', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const companyId = req.user.companyId;

  let query = { companyId };
  if (startDate || endDate) {
    query.tranDate = {};
    if (startDate) query.tranDate.$gte = new Date(startDate);
    if (endDate) query.tranDate.$lte = new Date(endDate);
  }

  try {
    const transactions = await Transaction.find(query);
    
    const totalInterestEarned = transactions.reduce((sum, t) => sum + (t.compound.amountPaid || 0), 0);
    const totalDiscountsGiven = transactions.reduce((sum, t) => sum + (t.discount || 0), 0);
    const netProfit = totalInterestEarned - totalDiscountsGiven;

    res.json({
      totalInterestEarned: parseFloat(totalInterestEarned.toFixed(2)),
      totalDiscountsGiven: parseFloat(totalDiscountsGiven.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      transactionCount: transactions.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error calculating profit & loss details' });
  }
});

// ==========================================
// REPORT 5: Outstanding Balance Report
// ==========================================
router.get('/outstanding', authMiddleware, async (req, res) => {
  const companyId = req.user.companyId;
  const today = new Date();

  try {
    // Find all active deals
    const activeDeals = await Deal.find({ companyId, status: { $ne: 'settled' } }).populate('customerId');
    const report = [];

    for (const deal of activeDeals) {
      const pastTrans = await Transaction.find({ dealId: deal._id });
      
      const principalPaid = pastTrans.reduce((sum, t) => sum + (t.principle.amountPaid || 0), 0);
      const remainingPrincipal = Math.max(0, deal.dealAmount - principalPaid);

      // Compute accrued interest up to now
      const cust = deal.customerId;
      let interestToBePaid = 0;

      if (cust) {
        const calc = calculateInterest({
          startDate: deal.lastPaidUpto || deal.dealStartDate,
          endDate: today,
          principalAmount: remainingPrincipal,
          ratePercentPerMonth: deal.interestRatePerMonth,
          interestType: cust.interestType,
          interestFrequency: cust.interestFrequency,
          compoundMonth: cust.compoundMonth,
          minimumInterestPeriod: cust.minimumInterestPeriod,
          lastCompoundBalance: 0
        });

        // Add outstanding balance from previous transaction if any
        let outstandingInterestBalance = 0;
        if (pastTrans.length > 0) {
          const sorted = [...pastTrans].sort((a, b) => new Date(b.tranDate) - new Date(a.tranDate));
          outstandingInterestBalance = sorted[0].compound.balance || 0;
        }

        interestToBePaid = calc.interestAmount + outstandingInterestBalance;
      }

      const totalOutstanding = remainingPrincipal + interestToBePaid;

      report.push({
        dealNo: deal.dealNo,
        dealDate: deal.dealDate,
        customerName: deal.customerId ? deal.customerId.name : 'Unknown',
        mobile: deal.customerId ? deal.customerId.mobile : '',
        dealAmount: deal.dealAmount,
        principalOwed: parseFloat(remainingPrincipal.toFixed(2)),
        interestOwed: parseFloat(interestToBePaid.toFixed(2)),
        totalOutstanding: parseFloat(totalOutstanding.toFixed(2))
      });
    }

    // Sort by outstanding descending
    report.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating outstanding report' });
  }
});

module.exports = router;
