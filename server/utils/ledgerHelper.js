const LedgerAccount = require('../models/LedgerAccount');
const LedgerTransaction = require('../models/LedgerTransaction');

const ensureDefaultLedgers = async (companyId) => {
  // Ensure "Cash" account exists
  let cashAcc = await LedgerAccount.findOne({ name: 'Cash', group: 'cash', companyId });
  if (!cashAcc) {
    cashAcc = new LedgerAccount({
      name: 'Cash',
      group: 'cash',
      openingBalance: 0,
      companyId
    });
    await cashAcc.save();
  }
};

const postToLedger = async ({ accountId, name, group, date, type, amount, refType, refId, remarks, companyId }) => {
  await ensureDefaultLedgers(companyId);

  let targetAccountId = accountId;
  
  if (!targetAccountId) {
    // Look up matching ledger account
    let acc = await LedgerAccount.findOne({ name, group, companyId });
    if (!acc) {
      acc = new LedgerAccount({ name, group, companyId });
      await acc.save();
    }
    targetAccountId = acc._id;
  }
  
  // Create ledger transaction
  const tx = new LedgerTransaction({
    accountId: targetAccountId,
    date: date || new Date(),
    type,
    amount,
    refType,
    refId,
    remarks,
    companyId
  });
  await tx.save();
  return tx;
};

const deleteRefTransactions = async (refId) => {
  await LedgerTransaction.deleteMany({ refId });
};

module.exports = { ensureDefaultLedgers, postToLedger, deleteRefTransactions };
