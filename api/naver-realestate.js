/**
 * 네이버 부동산 API (Direct API 호출)
 * Railway 서버와 동일한 방식
 *
 * @description
 * - m.land.naver.com Mobile API 직접 호출
 * - 브라우저 자동화 없이 axios로 요청
 * - Vercel Edge Cache + stale-while-revalidate
 */

// ============================================
// 설정
// ============================================
const CONFIG = {
  CACHE_TTL: 6 * 60 * 60,         // 6시간 (초)
  STALE_TTL: 24 * 60 * 60,        // 24시간 (stale-while-revalidate)
  REQUEST_TIMEOUT: 15000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000,
};

// User-Agent 리스트
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
];

// 대상 단지 목록
const TARGET_COMPLEXES = [
  {
    id: 'forena-songpa',
    name: '포레나송파',
    complexNo: '139917',
    region: '서울 송파구 거여동',
    areas: [80, 84],
    isMine: true
  },
  {
    id: 'the-beach-prugio-summit',
    name: '더비치푸르지오써밋',
    complexNo: '161501',
    region: '부산 남구 대연동',
    areas: [84]
  },
  {
    id: 'daeyeon-lotte-castle',
    name: '대연롯데캐슬레전드',
    complexNo: '109359',
    region: '부산 남구 대연동',
    areas: [84]
  },
  {
    id: 'the-sharp-namcheon',
    name: '더샵남천',
    complexNo: '127133',
    region: '부산 수영구 남천동',
    areas: [84]
  },
  {
    id: 'daeyeon-hillstate-prugio',
    name: '대연힐스테이트푸르지오',
    complexNo: '105323',
    region: '부산 남구 대연동',
    areas: [84]
  },
];

// ============================================
// 유틸리티 함수
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders(complexNo) {
  return {
    'User-Agent': getRandomUserAgent(),
    'Referer': `https://m.land.naver.com/complex/${complexNo}`,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Chromium";v="120", "Not(A:Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

/**
 * 가격 문자열 파싱 ("12억 5,000" → 1250000000)
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const str = String(priceStr).replace(/,/g, '').trim();

  const match = str.match(/(\d+)억\s*(\d*)/);
  if (match) {
    const eok = parseInt(match[1]) || 0;
    const man = parseInt(match[2]) || 0;
    return (eok * 100000000) + (man * 10000);
  }

  const numOnly = parseInt(str);
  if (!isNaN(numOnly)) {
    return numOnly * 10000;
  }

  return 0;
}

function formatPrice(amount) {
  if (!amount) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만`;
  }
  return `${amount.toLocaleString()}원`;
}

// ============================================
// 네이버 API 호출
// ============================================

/**
 * 재시도 로직이 포함된 fetch
 */
async function fetchWithRetry(url, options = {}, maxRetries = CONFIG.RETRY_COUNT) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[Naver] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = CONFIG.RETRY_DELAY * attempt + Math.random() * 1000;
      await sleep(delay);
    }
  }
}

/**
 * Mobile API로 매물 목록 조회
 */
async function fetchArticlesByMobileApi(complexNo, tradeType = 'A1') {
  const url = new URL('https://m.land.naver.com/complex/getComplexArticleList');
  url.searchParams.set('hscpNo', complexNo);
  url.searchParams.set('tradTpCd', tradeType);
  url.searchParams.set('order', 'prc');
  url.searchParams.set('showR0', 'N');
  url.searchParams.set('page', '1');

  console.log(`[Naver] Fetching: ${complexNo} (${tradeType})`);

  const data = await fetchWithRetry(url.toString(), {
    method: 'GET',
    headers: getHeaders(complexNo),
  });

  const articles = data?.result?.list || [];
  const totalCount = data?.result?.totAtclCnt || 0;

  // 데이터 정규화
  const normalized = articles.map(article => {
    let price = 0;
    let deposit = 0;
    let monthlyRent = 0;

    if (tradeType === 'B2') {
      // 월세
      deposit = parseInt(article.prc || 0) * 10000;
      monthlyRent = parseInt(article.rentPrc || 0) * 10000;
      price = deposit;
    } else {
      // 매매/전세
      price = parsePrice(article.prcInfo || article.hanPrc);
    }

    return {
      articleNo: article.atclNo,
      articleName: article.atclNm,
      price,
      deposit,
      monthlyRent,
      priceText: article.prcInfo || article.hanPrc || formatPrice(price),
      area1: article.spc1,
      area2: article.spc2,
      floor: article.flrInfo,
      direction: article.direction,
      confirmDate: article.cfmYmd,
      realtorName: article.rltrNm,
      tags: article.tagList || [],
    };
  });

  const prices = normalized.map(a => a.price).filter(p => p > 0);

  return {
    count: normalized.length,
    totalCount,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    articles: normalized.slice(0, 10),
  };
}

// ============================================
// 단지별 데이터 조회
// ============================================

/**
 * 단일 단지 전체 데이터 조회
 */
async function fetchComplexData(complex, area = 84) {
  console.log(`[Fetch] ${complex.name} (${area}㎡)...`);

  const result = {
    success: true,
    complexNo: complex.complexNo,
    name: complex.name,
    id: complex.id,
    region: complex.region,
    area,
    isMine: complex.isMine || false,
    updatedAt: new Date().toISOString(),
    sale: null,
    jeonse: null,
    monthly: null,
  };

  try {
    // 매매 데이터
    result.sale = await fetchArticlesByMobileApi(complex.complexNo, 'A1');
    await sleep(2000 + Math.random() * 1000);

    // 전세 데이터
    result.jeonse = await fetchArticlesByMobileApi(complex.complexNo, 'B1');
    await sleep(2000 + Math.random() * 1000);

    // 월세 데이터
    result.monthly = await fetchArticlesByMobileApi(complex.complexNo, 'B2');

  } catch (error) {
    console.error(`[Fetch] Error for ${complex.name}:`, error.message);
    result.success = false;
    result.error = error.message;
  }

  return result;
}

/**
 * 모든 대상 단지 조회
 */
async function fetchAllComplexes() {
  const results = [];
  const errors = [];
  const startTime = Date.now();

  for (const complex of TARGET_COMPLEXES) {
    // 타임아웃 체크 (55초 제한)
    if (Date.now() - startTime > 55000) {
      console.warn('[All] Timeout approaching, stopping early');
      break;
    }

    for (const area of complex.areas) {
      try {
        const data = await fetchComplexData(complex, area);
        results.push(data);
      } catch (error) {
        console.error(`[All] Failed: ${complex.name}`, error.message);
        errors.push({
          complexNo: complex.complexNo,
          name: complex.name,
          error: error.message,
        });
        results.push({
          success: false,
          complexNo: complex.complexNo,
          name: complex.name,
          id: complex.id,
          region: complex.region,
          area,
          isMine: complex.isMine || false,
          error: error.message,
        });
      }

      // 단지 간 대기 (Rate limit 방지)
      await sleep(2000 + Math.random() * 1000);
    }
  }

  return {
    success: errors.length === 0,
    data: results,
    errors: errors.length > 0 ? errors : undefined,
    crawledAt: new Date().toISOString(),
    totalComplexes: TARGET_COMPLEXES.length,
    successCount: results.filter(r => r.success).length,
    duration: Date.now() - startTime,
  };
}

/**
 * 단일 단지 조회
 */
async function fetchSingleComplex(complexNo, area = 84) {
  const complex = TARGET_COMPLEXES.find(c => c.complexNo === complexNo);
  if (!complex) {
    throw new Error(`Complex not found: ${complexNo}`);
  }

  return await fetchComplexData(complex, area);
}

// ============================================
// Vercel Serverless Handler
// ============================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { type, complexNo, area, forceRefresh } = req.query;

  // 캐시 헤더 설정
  if (forceRefresh !== 'true') {
    res.setHeader(
      'Cache-Control',
      `s-maxage=${CONFIG.CACHE_TTL}, stale-while-revalidate=${CONFIG.STALE_TTL}`
    );
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }

  const startTime = Date.now();

  try {
    let result;

    switch (type) {
      case 'all':
        result = await fetchAllComplexes();
        break;

      case 'summary':
        if (!complexNo) {
          return res.status(400).json({
            success: false,
            error: 'complexNo is required'
          });
        }
        result = await fetchSingleComplex(complexNo, parseInt(area) || 84);
        break;

      case 'complexes':
        result = {
          success: true,
          data: TARGET_COMPLEXES,
        };
        break;

      case 'health':
        result = {
          success: true,
          message: 'OK',
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Available: all, summary, complexes, health',
        });
    }

    const duration = Date.now() - startTime;
    console.log(`[Handler] ${type} completed in ${duration}ms`);

    res.json({
      ...result,
      _meta: {
        duration,
        type,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Handler] Error after ${duration}ms:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      _meta: {
        duration,
        type,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
