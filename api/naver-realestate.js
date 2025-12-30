/**
 * 네이버 부동산 API (Browserless.io + Playwright)
 * Best Practice: 직접 API 호출 방식
 *
 * @description
 * - 네이버 내부 API를 직접 호출 (DOM 스크래핑 X)
 * - 브라우저 세션으로 쿠키/헤더 자동 처리
 * - Vercel Edge Cache + stale-while-revalidate 패턴
 * - 재시도 로직과 에러 핸들링
 */

import { chromium } from 'playwright-core';

// ============================================
// 설정
// ============================================
const CONFIG = {
  CACHE_TTL: 6 * 60 * 60,         // 6시간 (초)
  STALE_TTL: 24 * 60 * 60,        // 24시간 (stale-while-revalidate)
  PAGE_TIMEOUT: 20000,            // 페이지 로드 타임아웃
  API_TIMEOUT: 10000,             // API 호출 타임아웃
  RETRY_COUNT: 2,
  RETRY_DELAY: 1000,
};

// 네이버 부동산 API 엔드포인트
const NAVER_API = {
  // 매물 목록 (모바일)
  ARTICLES: (complexNo, tradeTpCd) =>
    `https://m.land.naver.com/cluster/ajax/articleList?itemId=${complexNo}&tradTpCd=${tradeTpCd}&ptpNo=1&mapKey=&lgeo=&showR0=&cortarNo=&page=1`,

  // 단지 정보 (PC)
  COMPLEX_INFO: (complexNo) =>
    `https://new.land.naver.com/api/complexes/${complexNo}`,

  // 시세 정보 (PC)
  PRICE_INFO: (complexNo, area) =>
    `https://new.land.naver.com/api/complexes/${complexNo}/prices?complexNo=${complexNo}&tradeType=A1&areaNo=${area}&year=5`,

  // 실거래가 (PC)
  REAL_PRICE: (complexNo) =>
    `https://new.land.naver.com/api/complexes/${complexNo}/real-prices`,
};

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

async function withRetry(fn, retries = CONFIG.RETRY_COUNT) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[Retry ${i + 1}/${retries + 1}] ${error.message}`);
      if (i < retries) {
        await sleep(CONFIG.RETRY_DELAY * (i + 1));
      }
    }
  }
  throw lastError;
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
// Browserless 연결
// ============================================

async function connectBrowser() {
  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) {
    throw new Error('BROWSERLESS_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const browser = await chromium.connect(
    `wss://production-sfo.browserless.io/chromium/playwright?token=${token}`,
    { timeout: 30000 }
  );

  return browser;
}

async function createPage(browser, mobile = true) {
  const context = await browser.newContext({
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    locale: 'ko-KR',
  });

  const page = await context.newPage();
  return page;
}

// ============================================
// 네이버 부동산 API 호출
// ============================================

/**
 * 브라우저 세션에서 API 직접 호출
 */
async function callNaverApi(page, url, referer) {
  const result = await page.evaluate(async ({ url, referer }) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Referer': referer,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();

      // JSON 파싱 시도
      try {
        return { success: true, data: JSON.parse(text) };
      } catch {
        // JSONP나 다른 형식일 수 있음
        return { success: true, data: text };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, { url, referer });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

/**
 * 매물 목록 조회 (모바일 API)
 */
async function fetchArticles(page, complexNo, tradeType = 'A1') {
  const referer = `https://m.land.naver.com/complex/info/${complexNo}?tradTpCd=${tradeType}`;
  const url = NAVER_API.ARTICLES(complexNo, tradeType);

  console.log(`[API] Fetching articles: ${complexNo} / ${tradeType}`);

  const data = await callNaverApi(page, url, referer);

  // 응답 구조 파싱
  const articles = data?.result?.list || data?.articleList || [];
  const totalCount = data?.result?.totAtclCnt || data?.totalCount || articles.length;

  return {
    articles: articles.map(article => normalizeArticle(article, tradeType)),
    totalCount,
    raw: data, // 디버깅용
  };
}

/**
 * 단지 정보 조회 (PC API)
 */
async function fetchComplexInfo(page, complexNo) {
  const referer = `https://new.land.naver.com/complexes/${complexNo}`;
  const url = NAVER_API.COMPLEX_INFO(complexNo);

  console.log(`[API] Fetching complex info: ${complexNo}`);

  try {
    const data = await callNaverApi(page, url, referer);
    return {
      success: true,
      data: {
        name: data?.complexName || data?.name,
        address: data?.address,
        totalHouseholdCount: data?.totalHouseholdCount,
        highFloor: data?.highFloor,
        lowFloor: data?.lowFloor,
        useApproveYmd: data?.useApproveYmd,
        dealCount: data?.dealCount,
      }
    };
  } catch (error) {
    console.warn(`[API] Complex info failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 매물 데이터 정규화
 */
function normalizeArticle(article, tradeType) {
  // 가격 처리
  let price = 0;
  let deposit = 0;
  let monthlyRent = 0;

  if (tradeType === 'B2') {
    // 월세: 보증금/월세
    deposit = parseInt(article.warrantPrc || article.prc || 0) * 10000;
    monthlyRent = parseInt(article.rentPrc || 0) * 10000;
    price = deposit;
  } else {
    // 매매/전세
    price = parseInt(article.prc || article.dealOrWarrantPrc || 0) * 10000;
  }

  return {
    articleNo: article.atclNo || '',
    price,
    deposit,
    monthlyRent,
    priceText: article.hanPrc || formatPrice(price),
    area: parseFloat(article.spc2 || article.excluUseAr || 0),
    areaText: article.spc2 ? `${article.spc2}㎡` : '',
    floor: article.flrInfo || '',
    direction: article.direction || '',
    description: article.atclFetrDesc || '',
    confirmDate: article.atclCfmYmd || '',
    realtorName: article.rltrNm || '',
    articleConfirmYmd: article.atclCfmYmd || '',
  };
}

/**
 * 매물 통계 계산
 */
function calculateStats(articles) {
  if (!articles || articles.length === 0) {
    return {
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      articles: [],
    };
  }

  const prices = articles.map(a => a.price).filter(p => p > 0);

  return {
    count: articles.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    articles: articles.slice(0, 20), // 최대 20개
  };
}

// ============================================
// 단지별 데이터 조회
// ============================================

/**
 * 단일 단지 전체 데이터 조회
 */
async function fetchComplexData(page, complex, area = 84) {
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
    complexInfo: null,
  };

  try {
    // 먼저 페이지 로드 (쿠키 획득)
    await page.goto(`https://m.land.naver.com/complex/info/${complex.complexNo}`, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    await sleep(500);

    // 매매 데이터
    const saleData = await fetchArticles(page, complex.complexNo, 'A1');
    result.sale = calculateStats(saleData.articles);
    result.sale.totalCount = saleData.totalCount;

    await sleep(300 + Math.random() * 200);

    // 전세 데이터
    const jeonseData = await fetchArticles(page, complex.complexNo, 'B1');
    result.jeonse = calculateStats(jeonseData.articles);
    result.jeonse.totalCount = jeonseData.totalCount;

    await sleep(300 + Math.random() * 200);

    // 월세 데이터
    const monthlyData = await fetchArticles(page, complex.complexNo, 'B2');
    result.monthly = calculateStats(monthlyData.articles);
    result.monthly.totalCount = monthlyData.totalCount;

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
  let browser = null;
  const results = [];
  const errors = [];
  const startTime = Date.now();

  try {
    browser = await connectBrowser();
    const page = await createPage(browser, true);

    for (const complex of TARGET_COMPLEXES) {
      // 타임아웃 체크 (50초 제한)
      if (Date.now() - startTime > 50000) {
        console.warn('[All] Timeout approaching, stopping early');
        break;
      }

      for (const area of complex.areas) {
        try {
          const data = await withRetry(() => fetchComplexData(page, complex, area));
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

        // 단지 간 딜레이
        await sleep(1000 + Math.random() * 500);
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

  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

/**
 * 단일 단지 조회
 */
async function fetchSingleComplex(complexNo, area = 84) {
  const complex = TARGET_COMPLEXES.find(c => c.complexNo === complexNo);
  if (!complex) {
    throw new Error(`Complex not found: ${complexNo}`);
  }

  let browser = null;

  try {
    browser = await connectBrowser();
    const page = await createPage(browser, true);

    const data = await withRetry(() => fetchComplexData(page, complex, area));
    return data;

  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
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
          hasApiKey: !!process.env.BROWSERLESS_API_KEY,
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
