/**
 * 미국 주식 시장 휴장일 및 시장 상태 유틸리티
 */

// 미국 주식시장 휴장일 (NYSE/NASDAQ)
// 형식: 'YYYY-MM-DD': '휴장 사유'
const US_MARKET_HOLIDAYS = {
  // 2024년
  '2024-01-01': '새해',
  '2024-01-15': '마틴 루터 킹 주니어 데이',
  '2024-02-19': '대통령의 날',
  '2024-03-29': '성금요일',
  '2024-05-27': '현충일',
  '2024-06-19': '준틴스 데이',
  '2024-07-04': '독립기념일',
  '2024-09-02': '노동절',
  '2024-11-28': '추수감사절',
  '2024-12-25': '크리스마스',

  // 2025년
  '2025-01-01': '새해',
  '2025-01-20': '마틴 루터 킹 주니어 데이',
  '2025-02-17': '대통령의 날',
  '2025-04-18': '성금요일',
  '2025-05-26': '현충일',
  '2025-06-19': '준틴스 데이',
  '2025-07-04': '독립기념일',
  '2025-09-01': '노동절',
  '2025-11-27': '추수감사절',
  '2025-12-25': '크리스마스',

  // 2026년
  '2026-01-01': '새해',
  '2026-01-19': '마틴 루터 킹 주니어 데이',
  '2026-02-16': '대통령의 날',
  '2026-04-03': '성금요일',
  '2026-05-25': '현충일',
  '2026-06-19': '준틴스 데이',
  '2026-07-03': '독립기념일 (대체)',
  '2026-09-07': '노동절',
  '2026-11-26': '추수감사절',
  '2026-12-25': '크리스마스',
};

// 조기 폐장일 (1:00 PM ET 마감)
const US_EARLY_CLOSE = {
  '2024-07-03': '독립기념일 전날',
  '2024-11-29': '추수감사절 다음날',
  '2024-12-24': '크리스마스 이브',
  '2025-07-03': '독립기념일 전날',
  '2025-11-28': '추수감사절 다음날',
  '2025-12-24': '크리스마스 이브',
  '2026-11-27': '추수감사절 다음날',
  '2026-12-24': '크리스마스 이브',
};

/**
 * 미국 동부 시간 기준 현재 날짜 가져오기
 */
function getUSDate() {
  const now = new Date();
  const usTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return usTime;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 휴장일인지 확인
 * @returns {string|null} 휴장 사유 또는 null
 */
export function getHolidayReason(dateStr = null) {
  const targetDate = dateStr || formatDate(getUSDate());
  return US_MARKET_HOLIDAYS[targetDate] || null;
}

/**
 * 조기 폐장일인지 확인
 * @returns {string|null} 조기 폐장 사유 또는 null
 */
export function getEarlyCloseReason(dateStr = null) {
  const targetDate = dateStr || formatDate(getUSDate());
  return US_EARLY_CLOSE[targetDate] || null;
}

/**
 * 주말인지 확인
 */
export function isWeekend(date = null) {
  const targetDate = date || getUSDate();
  const day = targetDate.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

/**
 * 미국 시장 상태 정보 반환
 * @returns {Object} { isOpen, status, reason, isPreMarket, isAfterHours, nextOpen }
 */
export function getUSMarketStatus() {
  const usNow = getUSDate();
  const todayStr = formatDate(usNow);
  const hour = usNow.getHours();
  const minute = usNow.getMinutes();
  const currentTime = hour * 60 + minute; // 분 단위

  const dayOfWeek = usNow.getDay();
  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

  // 시간대 (분 단위)
  const PRE_MARKET_START = 4 * 60;      // 04:00 AM ET
  const MARKET_OPEN = 9 * 60 + 30;       // 09:30 AM ET
  const MARKET_CLOSE = 16 * 60;          // 04:00 PM ET
  const EARLY_CLOSE = 13 * 60;           // 01:00 PM ET
  const AFTER_HOURS_END = 20 * 60;       // 08:00 PM ET

  // 휴장일 체크
  const holidayReason = getHolidayReason(todayStr);
  if (holidayReason) {
    return {
      isOpen: false,
      status: 'HOLIDAY',
      reason: holidayReason,
      isPreMarket: false,
      isAfterHours: false,
      displayText: `휴장 (${holidayReason})`,
      nextSession: '내일 PRE 18:00',
    };
  }

  // 주말 체크
  if (isWeekendDay) {
    return {
      isOpen: false,
      status: 'WEEKEND',
      reason: dayOfWeek === 0 ? '일요일' : '토요일',
      isPreMarket: false,
      isAfterHours: false,
      displayText: '주말 휴장',
      nextSession: '월 PRE 18:00',
    };
  }

  // 조기 폐장일 체크
  const earlyCloseReason = getEarlyCloseReason(todayStr);
  const effectiveClose = earlyCloseReason ? EARLY_CLOSE : MARKET_CLOSE;

  // 한국 시간 변환 (ET + 14시간, 겨울 기준)
  // 서머타임(3월~11월)은 +13시간이지만 간단히 +14로 통일
  const toKST = (etHour, etMin = 0) => {
    let kstHour = etHour + 14;
    let nextDay = '';
    if (kstHour >= 24) {
      kstHour -= 24;
      nextDay = '';
    }
    return `${String(kstHour).padStart(2, '0')}:${String(etMin).padStart(2, '0')}`;
  };

  // 프리마켓 (04:00 - 09:30 ET = 18:00 - 23:30 KST)
  if (currentTime >= PRE_MARKET_START && currentTime < MARKET_OPEN) {
    return {
      isOpen: false,
      status: 'PRE_MARKET',
      reason: null,
      isPreMarket: true,
      isAfterHours: false,
      displayText: '프리마켓',
      nextSession: `정규장 ${toKST(9, 30)}`,
    };
  }

  // 정규장 (09:30 - 16:00 ET = 23:30 - 06:00 KST)
  if (currentTime >= MARKET_OPEN && currentTime < effectiveClose) {
    const closeHour = Math.floor(effectiveClose / 60);
    const closeMin = effectiveClose % 60;
    return {
      isOpen: true,
      status: 'REGULAR',
      reason: earlyCloseReason ? `오늘 ${toKST(closeHour)} 조기 마감` : null,
      isPreMarket: false,
      isAfterHours: false,
      displayText: earlyCloseReason ? '장중 (조기마감)' : '장중',
      nextSession: `POST ${toKST(closeHour, closeMin)}`,
    };
  }

  // 애프터마켓 (16:00 - 20:00 ET = 06:00 - 10:00 KST)
  if (currentTime >= effectiveClose && currentTime < AFTER_HOURS_END) {
    return {
      isOpen: false,
      status: 'AFTER_HOURS',
      reason: null,
      isPreMarket: false,
      isAfterHours: true,
      displayText: '애프터마켓',
      nextSession: `마감 ${toKST(20)}`,
    };
  }

  // 장 마감 (20:00 - 04:00 ET = 10:00 - 18:00 KST)
  return {
    isOpen: false,
    status: 'CLOSED',
    reason: null,
    isPreMarket: false,
    isAfterHours: false,
    displayText: '장 마감',
    nextSession: `PRE ${toKST(4)}`,
  };
}

/**
 * 짧은 상태 라벨 (UI용)
 */
export function getMarketStatusLabel(marketState, ticker) {
  // 암호화폐는 24시간
  if (ticker === 'BTC-USD' || ticker === 'ETH-USD') {
    return { label: '24H', className: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
  }

  // 환율도 거의 24시간
  if (ticker === 'KRW=X') {
    return { label: '24H', className: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
  }

  const status = getUSMarketStatus();

  switch (status.status) {
    case 'REGULAR':
      return { label: 'OPEN', className: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
    case 'PRE_MARKET':
      return { label: 'PRE', className: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' };
    case 'AFTER_HOURS':
      return { label: 'POST', className: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
    case 'HOLIDAY':
      return { label: '휴장', className: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', reason: status.reason };
    case 'WEEKEND':
      return { label: '주말', className: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' };
    default:
      return { label: 'CLOSED', className: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' };
  }
}
