/**
 * Calculates interest based on Simple or Compound models.
 * Returns months, days, principal to be paid, compound/interest details.
 */
function getLocalDate(d) {
  if (!d) return new Date();
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return new Date();
  const isoStr = dateObj.toISOString();
  const [y, m, day] = isoStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day);
}

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
  const start = getLocalDate(startDate);
  const end = getLocalDate(endDate);
  
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

  // If there are extra days beyond full months, count them as 1 full additional month of interest
  const effectiveMonths = finalMonths + (finalDays > 0 ? 1 : 0);

  const isCompound = interestType === 'compound' || effectiveMonths > 12;

  if (!isCompound) {
    interestAmount = parseFloat((principalAmount * (ratePerMonth / 100) * effectiveMonths).toFixed(2));
  } else {
    // Compound Interest Calculation
    const compoundingInterval = 12; // Compounding year-wise (every 12 months)
    const periods = Math.floor(effectiveMonths / compoundingInterval);
    const remainingMonths = effectiveMonths % compoundingInterval;
    
    // Principal compounded:
    const baseInterestRate = ratePerMonth / 100;
    const compoundRatePerPeriod = baseInterestRate * compoundingInterval;
    
    let compoundedPrincipal = principalAmount * Math.pow(1 + compoundRatePerPeriod, periods);
    
    // Simple interest on the compounded principal for the remainder of the year
    let finalCompoundedAmount = compoundedPrincipal * (1 + baseInterestRate * remainingMonths);
    
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

/**
 * For a deal older than one year, build a year-by-year value breakdown
 * (Year 1, Year 2, ... plus "Current") showing accrued interest and total
 * value (principal + interest) at each anniversary and as of `asOf`.
 * Returns an empty array for deals younger than a year.
 */
function getDealYearlyBreakdown(deal, customer, asOf = new Date()) {
  if (!deal) return [];
  const originalStartDate = deal.dealStartDate || deal.dealDate;
  const endDate = new Date(asOf);

  const commonArgs = {
    principalAmount: deal.dealAmount,
    ratePercentPerMonth: deal.interestRatePerMonth,
    interestType: customer ? customer.interestType : 'simple',
    interestFrequency: customer ? customer.interestFrequency : 'monthly',
    compoundMonth: customer ? customer.compoundMonth : 1,
    minimumInterestPeriod: customer ? customer.minimumInterestPeriod : 'NA',
    lastCompoundBalance: 0
  };

  const overallCalc = calculateInterest({ startDate: originalStartDate, endDate, ...commonArgs });
  const completedYears = Math.floor(overallCalc.noOfMonths / 12);

  const breakdown = [];
  for (let year = 1; year <= completedYears; year += 1) {
    const anniversaryDate = new Date(originalStartDate);
    anniversaryDate.setFullYear(anniversaryDate.getFullYear() + year);
    const yearCalc = calculateInterest({ startDate: originalStartDate, endDate: anniversaryDate, ...commonArgs });
    breakdown.push({
      label: `Year ${year}`,
      asOf: anniversaryDate,
      interestAmount: yearCalc.interestAmount,
      totalAmount: parseFloat((deal.dealAmount + yearCalc.interestAmount).toFixed(2))
    });
  }

  if (completedYears >= 1) {
    breakdown.push({
      label: 'Current',
      asOf: endDate,
      interestAmount: overallCalc.interestAmount,
      totalAmount: parseFloat((deal.dealAmount + overallCalc.interestAmount).toFixed(2))
    });
  }

  return breakdown;
}

module.exports = { calculateInterest, getDealYearlyBreakdown };
