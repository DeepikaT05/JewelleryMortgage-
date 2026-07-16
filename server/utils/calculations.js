/**
 * Calculates interest based on Simple or Compound models.
 * Returns months, days, principal to be paid, compound/interest details.
 */
function calculateInterest({
  startDate,
  endDate,
  principalAmount,
  ratePercentPerMonth,
  interestType = 'simple',
  interestFrequency = 'monthly',
  compoundMonth = 1,
  minimumInterestPeriod = 'NA',
  lastCompoundBalance = 0 // if compound interest, tracks accumulated interest balance
}) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    return {
      noOfMonths: 0,
      noOfDays: 0,
      interestAmount: 0,
      compoundBalance: lastCompoundBalance
    };
  }

  // Calculate complete months and remaining days
  let yearsDiff = end.getFullYear() - start.getFullYear();
  let monthsDiff = end.getMonth() - start.getMonth();
  let totalMonths = yearsDiff * 12 + monthsDiff;

  let tempStart = new Date(start);
  tempStart.setMonth(tempStart.getMonth() + totalMonths);

  if (tempStart > end) {
    totalMonths--;
    tempStart = new Date(start);
    tempStart.setMonth(tempStart.getMonth() + totalMonths);
  }

  const diffTime = Math.max(0, end - tempStart);
  let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Minimum Interest Period Application
  let totalDaysInPeriod = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  let isBelowMin = false;
  let minMonths = 0;
  let minDays = 0;

  if (minimumInterestPeriod === '7D' && totalDaysInPeriod < 7) {
    isBelowMin = true;
    minDays = 7;
  } else if (minimumInterestPeriod === '15D' && totalDaysInPeriod < 15) {
    isBelowMin = true;
    minDays = 15;
  } else if (minimumInterestPeriod === '1M' && totalDaysInPeriod < 30 && totalMonths === 0) {
    isBelowMin = true;
    minMonths = 1;
  }

  let finalMonths = isBelowMin ? minMonths : totalMonths;
  let finalDays = isBelowMin ? minDays : totalDays;

  // Fractional months calculation
  // (ratePercentPerMonth is per month)
  // Let's adjust rate based on interestFrequency if frequency is daily or yearly:
  let ratePerMonth = ratePercentPerMonth;
  if (interestFrequency === 'yearly') {
    ratePerMonth = ratePercentPerMonth / 12;
  } else if (interestFrequency === 'daily') {
    ratePerMonth = ratePercentPerMonth * 30; // convert daily to monthly
  }

  let interestAmount = 0;
  let newCompoundBalance = lastCompoundBalance;

  if (interestType === 'simple') {
    const fraction = finalMonths + (finalDays / 30);
    interestAmount = parseFloat((principalAmount * (ratePerMonth / 100) * fraction).toFixed(2));
  } else {
    // Compound Interest Calculation
    // Compound interval is `compoundMonth` (default monthly = 1)
    // For compounding:
    // complete_compound_periods = Math.floor(finalMonths / compoundMonth)
    // compound_rate = ratePerMonth * compoundMonth
    // Principal compounded = Principal * (1 + compound_rate/100)^periods
    // Remaining months and days are calculated as simple interest on the new principal.
    
    const compoundingInterval = 12; // Compounding year-wise (every 12 months)
    const periods = Math.floor(finalMonths / compoundingInterval);
    const remainingMonths = finalMonths % compoundingInterval;
    
    // Principal compounded:
    const baseInterestRate = ratePerMonth / 100;
    const compoundRatePerPeriod = baseInterestRate * compoundingInterval;
    
    let compoundedPrincipal = principalAmount * Math.pow(1 + compoundRatePerPeriod, periods);
    
    // Simple interest on the compounded principal for the remainder of the year (months + days)
    const remainderFraction = remainingMonths + (finalDays / 30);
    let finalCompoundedAmount = compoundedPrincipal * (1 + baseInterestRate * remainderFraction);
    
    interestAmount = parseFloat((finalCompoundedAmount - principalAmount).toFixed(2));
    newCompoundBalance = interestAmount;
  }

  return {
    noOfMonths: totalMonths,
    noOfDays: totalDays,
    interestAmount,
    compoundBalance: newCompoundBalance
  };
}

module.exports = { calculateInterest };
