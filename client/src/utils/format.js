/**
 * Formats a number into Indian currency style (e.g. 1,47,47,199.60)
 */
export const formatIndianCurrency = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0.00';

  const n = Number(num);
  const isNeg = n < 0;
  const absVal = Math.abs(n).toFixed(2);
  const parts = absVal.split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  let lastThree = intPart.substring(intPart.length - 3);
  const otherParts = intPart.substring(0, intPart.length - 3);

  if (otherParts !== '') {
    lastThree = ',' + lastThree;
  }

  const formattedInt = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNeg ? '-' : ''}${formattedInt}.${decPart}`;
};
