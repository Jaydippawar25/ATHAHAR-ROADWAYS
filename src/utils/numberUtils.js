export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatNumber = (val) => {
  return (Number(val) || 0).toLocaleString('en-IN');
};

/**
 * Extracts the trailing or primary integer from document codes like INW-71, OUT-199, STOCK-OUT-24, OUT-03, 13941
 */
export const parseNumericCode = (str) => {
  if (!str) return 0;
  const matches = String(str).match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[matches.length - 1], 10);
};

/**
 * Natural comparator ensuring strict numeric descending order (highest ID first, e.g. INW-71 > INW-70 > INW-69, OUT-199 > OUT-179 > OUT-03)
 */
export const compareDescendingDocNo = (noA, noB, dateA, dateB, idA, idB) => {
  const numA = parseNumericCode(noA);
  const numB = parseNumericCode(noB);
  if (numA !== numB) {
    return numB - numA; // higher number first (descending)
  }

  // Secondary fallback: locale numeric comparison
  const strCompare = String(noB || '').localeCompare(String(noA || ''), undefined, { numeric: true, sensitivity: 'base' });
  if (strCompare !== 0) return strCompare;

  // Tertiary fallback: Date descending
  const timeA = dateA ? new Date(dateA).getTime() : 0;
  const timeB = dateB ? new Date(dateB).getTime() : 0;
  if (timeA !== timeB) return timeB - timeA;

  return String(idB || '').localeCompare(String(idA || ''));
};

