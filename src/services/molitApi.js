/**
 * 국토교통부 실거래가 API 클라이언트
 */

const API_BASE = '/api';

/**
 * 아파트 매매 실거래가 조회
 * @param {string} regionCode - 지역코드 (예: 11680)
 * @param {string} yearMonth - 년월 (예: 202501)
 * @param {string} aptName - 아파트명 필터 (선택)
 */
export async function fetchAptTrades(regionCode, yearMonth, aptName = null) {
  const params = new URLSearchParams({
    type: 'trade',
    regionCode,
    yearMonth,
  });
  if (aptName) params.append('aptName', aptName);

  const res = await fetch(`${API_BASE}/molit?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 아파트 전월세 실거래가 조회
 * @param {string} regionCode - 지역코드 (예: 11680)
 * @param {string} yearMonth - 년월 (예: 202501)
 * @param {string} aptName - 아파트명 필터 (선택)
 */
export async function fetchAptRents(regionCode, yearMonth, aptName = null) {
  const params = new URLSearchParams({
    type: 'rent',
    regionCode,
    yearMonth,
  });
  if (aptName) params.append('aptName', aptName);

  const res = await fetch(`${API_BASE}/molit?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 아파트 실거래가 통계 조회
 * @param {string} regionCode - 지역코드 (예: 11680)
 * @param {string} aptName - 아파트명
 * @param {string} area - 전용면적 (예: 84)
 * @param {number} months - 조회 개월 수 (기본 12)
 */
export async function fetchAptStats(regionCode, aptName, area, months = 12) {
  const params = new URLSearchParams({
    type: 'stats',
    regionCode,
    aptName,
    area,
    months: String(months),
  });

  const res = await fetch(`${API_BASE}/molit?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 금액 포맷팅 (억/만원 단위)
 */
export function formatPrice(amount) {
  if (!amount) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

/**
 * 현재 년월 가져오기 (YYYYMM 형식)
 */
export function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 이전 N개월 년월 목록 생성
 */
export function getRecentMonths(count = 12) {
  const months = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
    });
  }

  return months;
}
