/**
 * Format number to Korean Won style (억, 만)
 * @param {number} value 
 * @param {boolean} compact 
 */
export const formatKRW = (value, compact = false) => {
  if (value === 0) return '0원';
  
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  if (compact) {
    if (absValue >= 100000000) {
      const eok = Math.floor(absValue / 100000000);
      const man = Math.round((absValue % 100000000) / 10000);
      return `${isNegative ? '-' : ''}${eok.toLocaleString()}억${man > 0 ? ` ${man.toLocaleString()}만` : ''}`;
    }
    if (absValue >= 10000) {
      return `${isNegative ? '-' : ''}${Math.round(absValue / 10000).toLocaleString()}만`;
    }
    return `${isNegative ? '-' : ''}${absValue.toLocaleString()}원`;
  }
  
  return `${isNegative ? '-' : ''}${absValue.toLocaleString()}원`;
};

/**
 * Format number to USD
 * @param {number} value 
 */
export const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format percent
 * @param {number} value 
 */
export const formatPercent = (value) => {
  const isPositive = value > 0;
  return `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
};

/**
 * Convert number to Korean text (Hangul)
 * @param {string|number} value 
 */
export const numberToHangul = (value) => {
  if (!value) return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';

  const units = ['', '만', '억', '조', '경'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const subUnits = ['', '십', '백', '천'];

  let result = '';
  let unitIndex = 0;
  let tempNum = num;

  while (tempNum > 0) {
    const part = tempNum % 10000;
    if (part > 0) {
      let partStr = '';
      let partTemp = part;
      for (let i = 0; i < 4; i++) {
        const digit = partTemp % 10;
        if (digit > 0) {
          partStr = digits[digit] + subUnits[i] + partStr;
        }
        partTemp = Math.floor(partTemp / 10);
      }
      result = partStr + units[unitIndex] + result;
    }
    tempNum = Math.floor(tempNum / 10000);
    unitIndex++;
  }

  return result + '원';
};
