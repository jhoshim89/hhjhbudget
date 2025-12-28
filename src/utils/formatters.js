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

// === 계산기 유틸 ===

/**
 * 수식 계산 (500+100 → 600, 1000*2 → 2000)
 * 지원: +, -, *, 괄호 (/ 는 더하기로 처리)
 * @param {string} expression
 * @returns {number|null}
 */
export function evaluateExpression(expression, options = {}) {
  const { autoConvertUnit = false } = options;

  if (!expression) return null;

  // 콤마 제거 (천 단위 구분자), /를 +로 변환, 공백 제거
  const cleaned = String(expression).replace(/,/g, '').replace(/\//g, '+').replace(/\s/g, '');

  // 숫자만 있으면 바로 반환
  if (/^\d+$/.test(cleaned)) {
    let value = parseInt(cleaned, 10);
    // 입력 탭에서만: 100만 미만이면 천원 단위로 인식 (3900 → 3,900,000)
    // 100만 이상이면 이미 원 단위로 입력된 것으로 간주
    if (autoConvertUnit && value > 0 && value < 1000000) {
      value = value * 1000;
    }
    return value;
  }

  // 허용된 문자만 포함하는지 확인 (숫자, +, -, *, /, 괄호, 소수점)
  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    return null;
  }

  try {
    // eval 대신 Function 사용 (약간 더 안전)
    const result = new Function(`return (${cleaned})`)();
    if (typeof result === 'number' && isFinite(result)) {
      let value = Math.round(result);
      // 입력 탭에서만: 100만 미만이면 천원 단위로 인식
      if (autoConvertUnit && value > 0 && value < 1000000) {
        value = value * 1000;
      }
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

// === 월 포맷 변환 유틸 ===

/**
 * "2025-12" → { year: 2025, month: 12 }
 */
export function parseMonthString(monthStr) {
  if (!monthStr) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
}

/**
 * { year: 2025, month: 12 } → "2025-12"
 */
export function toMonthString(monthObj) {
  return `${monthObj.year}-${String(monthObj.month).padStart(2, '0')}`;
}

/**
 * 월 변경 (delta: +1 또는 -1)
 */
export function changeMonthObj(monthObj, delta) {
  let newMonth = monthObj.month + delta;
  let newYear = monthObj.year;
  if (newMonth > 12) { newMonth = 1; newYear++; }
  else if (newMonth < 1) { newMonth = 12; newYear--; }
  return { year: newYear, month: newMonth };
}
