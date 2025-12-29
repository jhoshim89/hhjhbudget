/**
 * @context budget-dashboard / utils / investmentCalculator.js
 * @purpose 변경이력 기반 투자액 계산 유틸리티
 */

/**
 * 변경이력 항목에서 투자액 변동 파싱
 * @param {Object} item - 변경이력 항목
 * @param {number} exchangeRate - 환율 (기본 1380)
 * @returns {Object} { amount, type, ticker, date }
 */
export function parseInvestmentChange(item, exchangeRate = 1380) {
  const { timestamp, ticker, changeType, field, beforeValue, afterValue } = item;

  // 날짜 파싱 - 여러 형식 지원
  let date = new Date();
  let monthKey = '';

  if (timestamp) {
    // 형식 1: "2024. 12. 29. 14:30:00" (한국어 로케일)
    const match1 = timestamp.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    // 형식 2: "2024-12-29T14:30:00" (ISO)
    const match2 = timestamp.match(/(\d{4})-(\d{2})-(\d{2})/);
    // 형식 3: "2024/12/29"
    const match3 = timestamp.match(/(\d{4})\/(\d{2})\/(\d{2})/);

    if (match1) {
      const [, year, month, day] = match1;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      monthKey = `${year}.${month.padStart(2, '0')}`;
    } else if (match2) {
      const [, year, month, day] = match2;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      monthKey = `${year}.${month}`;
    } else if (match3) {
      const [, year, month, day] = match3;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      monthKey = `${year}.${month}`;
    }
  }

  // monthKey가 비어있으면 현재 날짜 사용
  if (!monthKey || monthKey.includes('NaN')) {
    const now = new Date();
    monthKey = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    date = now;
  }

  let amount = 0;
  let type = 'unknown';

  if (changeType === '추가') {
    // 형식: "NVDA 10주 @135.5" 또는 "애플 10주 @135.5"
    const match = afterValue?.match(/(\d+)주\s*@\s*([\d.]+)/);
    if (match) {
      const qty = parseInt(match[1], 10);
      const avgPrice = parseFloat(match[2]);
      amount = qty * avgPrice * exchangeRate;
      type = 'buy';
    }
  } else if (changeType === '수정') {
    if (field === 'qty') {
      // 수량 변경: 증가 = 추가 매수, 감소 = 매도
      const oldQty = parseInt(beforeValue, 10) || 0;
      const newQty = parseInt(afterValue, 10) || 0;
      const qtyDiff = newQty - oldQty;
      // 평단가는 알 수 없으므로 일단 수량 변화만 기록
      type = qtyDiff > 0 ? 'buy' : 'sell';
      // amount는 평단가 * 수량차이 * 환율이어야 하지만, 평단가를 모르므로 0으로 둠
      // 실제로는 현재 보유종목에서 avgPrice를 가져와야 함
    } else if (field === 'avgPrice') {
      // 평단가 변경: 원금 조정 (분할 매수 등)
      type = 'adjust';
      // 평단가 변경은 투자액 변동으로 계산하기 어려움
    }
  } else if (changeType === '삭제') {
    // 종목 삭제 = 전량 매도
    const match = beforeValue?.match(/(\d+)주\s*@\s*([\d.]+)/);
    if (match) {
      const qty = parseInt(match[1], 10);
      const avgPrice = parseFloat(match[2]);
      amount = -(qty * avgPrice * exchangeRate);
      type = 'sell';
    }
  }

  return {
    amount,
    type,
    ticker,
    date,
    monthKey,
    changeType,
    field,
    raw: item,
  };
}

/**
 * 월별 투자액 집계
 * @param {Array} history - 변경이력 배열
 * @param {number} exchangeRate - 환율
 * @returns {Array} [{ month, invested, sold, net }]
 */
export function aggregateByMonth(history, exchangeRate = 1380) {
  // 빈 배열이면 빈 배열 반환
  if (!history || !Array.isArray(history) || history.length === 0) {
    return [];
  }

  const monthlyMap = new Map();

  history.forEach(item => {
    // 유효하지 않은 아이템 스킵
    if (!item || !item.changeType) return;

    const parsed = parseInvestmentChange(item, exchangeRate);

    // 유효하지 않은 monthKey 스킵
    if (!parsed.monthKey || parsed.monthKey.includes('NaN') || parsed.monthKey.includes('undefined')) {
      return;
    }

    if (!monthlyMap.has(parsed.monthKey)) {
      monthlyMap.set(parsed.monthKey, { month: parsed.monthKey, invested: 0, sold: 0, adjustments: 0 });
    }

    const monthData = monthlyMap.get(parsed.monthKey);
    if (parsed.type === 'buy' && parsed.amount > 0) {
      monthData.invested += parsed.amount;
    } else if (parsed.type === 'sell' && parsed.amount < 0) {
      monthData.sold += Math.abs(parsed.amount);
    }
  });

  // 월 순서로 정렬, 유효한 데이터만 반환
  return Array.from(monthlyMap.values())
    .filter(m => m.month && !m.month.includes('NaN') && (m.invested > 0 || m.sold > 0))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      net: m.invested - m.sold,
    }));
}

/**
 * 연간 투자액 집계
 * @param {Array} history - 변경이력 배열
 * @param {number} exchangeRate - 환율
 * @returns {Array} [{ year, invested, sold, net }]
 */
export function aggregateByYear(history, exchangeRate = 1380) {
  const monthlyData = aggregateByMonth(history, exchangeRate);
  const yearlyMap = new Map();

  monthlyData.forEach(m => {
    const year = m.month.split('.')[0];
    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, { year, invested: 0, sold: 0 });
    }
    const yearData = yearlyMap.get(year);
    yearData.invested += m.invested;
    yearData.sold += m.sold;
  });

  return Array.from(yearlyMap.values())
    .sort((a, b) => a.year.localeCompare(b.year))
    .map(y => ({
      ...y,
      net: y.invested - y.sold,
    }));
}

/**
 * 누적 투자 원금 계산 (변경이력 기반)
 * @param {Array} history - 변경이력 배열
 * @param {number} exchangeRate - 환율
 * @returns {number} 총 투자 원금
 */
export function calculateTotalInvested(history, exchangeRate = 1380) {
  let total = 0;

  history.forEach(item => {
    const parsed = parseInvestmentChange(item, exchangeRate);
    total += parsed.amount;
  });

  return total;
}

/**
 * 날짜 포맷팅 (테이블 표시용)
 * @param {string} timestamp - 타임스탬프 문자열
 * @returns {string} 포맷된 날짜
 */
export function formatHistoryDate(timestamp) {
  if (!timestamp) return '-';

  // "2024. 12. 29. 14:30:00" → "12/29 14:30"
  const match = timestamp.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const [, , month, day, hour, min] = match;
    return `${month}/${day} ${hour}:${min}`;
  }

  return timestamp;
}
