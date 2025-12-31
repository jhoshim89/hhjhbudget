/**
 * 네이버 부동산 API 클라이언트
 *
 * @description
 * Vercel Serverless API를 통해 네이버 부동산 데이터 조회
 * - stale-while-revalidate 캐싱 전략 활용
 * - 에러 핸들링 및 재시도 로직
 */

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

// ============================================
// API 호출 함수
// ============================================

/**
 * 모든 대상 단지 데이터 조회
 * @param {boolean} forceRefresh - 캐시 무시하고 새로 조회
 * @returns {Promise<{data: Array, isStale: boolean, cachedAt: string}>}
 */
export async function fetchAllComplexes(forceRefresh = false) {
  const params = new URLSearchParams({ type: 'all' });

  if (forceRefresh) {
    params.append('forceRefresh', 'true');
  }

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  if (!json.success && !json.data) {
    throw new Error(json.error || 'Failed to fetch data');
  }

  return {
    data: json.data || [],
    success: json.success,
    crawledAt: json.crawledAt || json._meta?.timestamp,
    duration: json.duration || json._meta?.duration,
    totalComplexes: json.totalComplexes,
    successCount: json.successCount,
    errors: json.errors,
  };
}

/**
 * 단일 단지 데이터 조회
 * @param {string} complexNo - 단지 코드
 * @param {number} area - 전용면적 (㎡)
 */
export async function fetchComplexSummary(complexNo, area = 84) {
  const params = new URLSearchParams({
    type: 'summary',
    complexNo,
    area: String(area),
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch complex data');
  }

  return json;
}

/**
 * 대상 단지 목록 조회 (크롤링 없음)
 */
export async function fetchComplexList() {
  const params = new URLSearchParams({ type: 'complexes' });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch complexes');
  }

  return json.data;
}

/**
 * API 헬스체크
 */
export async function checkApiHealth() {
  const params = new URLSearchParams({ type: 'health' });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  return json;
}

/**
 * 매물 상세 히스토리 조회
 * @param {string} complexId - 단지 ID (예: 'forena-songpa')
 * @param {string} tradeType - 거래 유형 ('매매', '전세', '월세') - null이면 전체
 * @param {number} days - 조회 기간 (일)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchArticleDetails(complexId, tradeType = null, days = 1) {
  const params = new URLSearchParams({
    type: 'article-history',
    complexId,
    days: String(days),
  });

  if (tradeType) {
    params.append('tradeType', tradeType);
  }

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch article details');
  }

  return {
    data: json.data || [],
    success: json.success,
  };
}

/**
 * 시세 히스토리 조회 (동향 그래프용)
 * @param {string} complexId - 단지 ID
 * @param {number} area - 전용면적 (㎡)
 * @param {number} days - 조회 기간 (일)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchPriceHistory(complexId, area = 84, days = 30) {
  const params = new URLSearchParams({
    type: 'price-history',
    complexId,
    area: String(area),
    days: String(days),
  });

  const res = await fetch(`${API_BASE}/naver-realestate?${params}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch price history');
  }

  return {
    data: json.data || [],
    success: json.success,
  };
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 금액 포맷팅 (억/만원 단위)
 * @param {number} amount - 금액 (원)
 */
export function formatPrice(amount) {
  if (!amount) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만`;
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

/**
 * 월세 포맷팅
 * @param {number} deposit - 보증금 (원)
 * @param {number} monthlyRent - 월세 (원)
 */
export function formatMonthlyRent(deposit, monthlyRent) {
  if (!deposit && !monthlyRent) return '-';

  const depositText = formatPrice(deposit);
  const rentText = formatPrice(monthlyRent);

  return `${depositText} / ${rentText}`;
}

/**
 * 상대적 시간 포맷팅
 * @param {string} isoString - ISO 날짜 문자열
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR');
}

/**
 * 거래 유형 텍스트
 */
export function getTradeTypeText(type) {
  const types = {
    'A1': '매매',
    'B1': '전세',
    'B2': '월세',
    'sale': '매매',
    'jeonse': '전세',
    'monthly': '월세',
  };
  return types[type] || type;
}

// ============================================
// Legacy 호환 함수 (기존 코드 호환용)
// ============================================

/**
 * @deprecated Use fetchComplexSummary instead
 */
export async function fetchArticles(complexNo, tradeType = 'A1', area = 84) {
  console.warn('fetchArticles is deprecated. Use fetchComplexSummary instead.');
  const summary = await fetchComplexSummary(complexNo, area);

  const tradeTypeMap = {
    'A1': 'sale',
    'B1': 'jeonse',
    'B2': 'monthly',
  };

  const key = tradeTypeMap[tradeType] || 'sale';
  return summary[key]?.articles || [];
}

/**
 * @deprecated Use fetchComplexSummary instead
 */
export async function fetchComplexInfo(complexNo) {
  console.warn('fetchComplexInfo is deprecated. Use fetchComplexSummary instead.');
  return fetchComplexSummary(complexNo);
}

/**
 * @deprecated Use fetchComplexList instead
 */
export async function searchComplexNo(name) {
  console.warn('searchComplexNo is deprecated. Use fetchComplexList instead.');
  const complexes = await fetchComplexList();
  return complexes.find(c => c.name.includes(name));
}

/**
 * @deprecated Not needed with new caching strategy
 */
export async function fetchCacheStatus() {
  console.warn('fetchCacheStatus is deprecated.');
  return { status: 'ok' };
}

// ============================================
// Default Export
// ============================================

export default {
  fetchAllComplexes,
  fetchComplexSummary,
  fetchComplexList,
  checkApiHealth,
  fetchArticleDetails,
  fetchPriceHistory,
  formatPrice,
  formatPriceRange,
  formatMonthlyRent,
  formatRelativeTime,
  getTradeTypeText,
  // Legacy
  fetchArticles,
  fetchComplexInfo,
  searchComplexNo,
  fetchCacheStatus,
};
