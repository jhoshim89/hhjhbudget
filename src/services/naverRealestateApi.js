/**
 * 네이버 부동산 API 클라이언트
 */

const API_BASE = '/api';

/**
 * 단지별 요약 데이터 조회
 * @param {string} name - 단지명
 * @param {number} area - 전용면적 (㎡)
 */
export async function fetchComplexSummary(name, area = 84) {
  const params = new URLSearchParams({
    type: 'summary',
    name,
    area: String(area),
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 매물 목록 조회
 * @param {string} complexNo - 단지 코드
 * @param {string} tradeType - 거래 유형 (A1: 매매, B1: 전세, B2: 월세)
 * @param {number} area - 전용면적
 */
export async function fetchArticles(complexNo, tradeType = 'A1', area = 84) {
  const params = new URLSearchParams({
    type: 'articles',
    complexNo,
    tradeType,
    area: String(area),
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 단지 정보 조회
 * @param {string} complexNo - 단지 코드
 */
export async function fetchComplexInfo(complexNo) {
  const params = new URLSearchParams({
    type: 'info',
    complexNo,
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 단지명으로 complexNo 검색
 * @param {string} name - 단지명
 */
export async function searchComplexNo(name) {
  const params = new URLSearchParams({
    type: 'search',
    name,
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 모든 대상 단지 데이터 조회
 */
export async function fetchAllComplexes() {
  const params = new URLSearchParams({
    type: 'all',
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
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
    return man > 0 ? `${eok}억 ${man}만` : `${eok}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000)}만`;
  }
  return `${amount.toLocaleString()}원`;
}

/**
 * 가격 범위 포맷팅
 */
export function formatPriceRange(min, max) {
  if (!min && !max) return '-';
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} ~ ${formatPrice(max)}`;
}

export default {
  fetchComplexSummary,
  fetchArticles,
  fetchComplexInfo,
  searchComplexNo,
  fetchAllComplexes,
  formatPrice,
  formatPriceRange,
};
