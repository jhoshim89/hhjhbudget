/**
 * 네이버 부동산 API (Browserless.io + Playwright)
 * Best Practice: 네트워크 인터셉트 방식
 *
 * @description
 * - 페이지 로드 시 발생하는 API 호출을 인터셉트
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
  PAGE_TIMEOUT: 25000,            // 페이지 로드 타임아웃
  RETRY_COUNT: 2,
  RETRY_DELAY: 1000,
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

async function createPage(browser) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
  });

  const page = await context.newPage();
  return page;
}

// ============================================
// 네이버 부동산 데이터 수집
// ============================================

/**
 * 페이지에서 API 응답을 인터셉트하여 데이터 수집
 */
async function fetchComplexDataWithIntercept(page, complexNo, tradeType) {
  const tradeTpCdMap = {
    'sale': 'A1',
    'jeonse': 'B1',
    'monthly': 'B2',
  };
  const tradeTpCd = tradeTpCdMap[tradeType] || 'A1';

  let interceptedData = null;

  // Response 인터셉트 설정
  const responseHandler = async (response) => {
    const url = response.url();

    // 매물 목록 API 응답 캡처
    if (url.includes('/cluster/ajax/articleList') || url.includes('/api/articles')) {
      try {
        const data = await response.json();
        console.log(`[Intercept] Captured API response for ${tradeType}`);
        interceptedData = data;
      } catch (e) {
        console.warn(`[Intercept] Failed to parse: ${e.message}`);
      }
    }
  };

  page.on('response', responseHandler);

  try {
    // 페이지 로드 (API 호출 트리거)
    const pageUrl = `https://m.land.naver.com/complex/info/${complexNo}?tradTpCd=${tradeTpCd}&ptpNo=1`;
    console.log(`[Fetch] Loading: ${pageUrl}`);

    await page.goto(pageUrl, {
      waitUntil: 'networkidle',
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    // 추가 대기 (API 응답 수신 보장)
    await sleep(2000);

    // 매물 목록 버튼 클릭 시도 (더 많은 API 호출 유도)
    try {
      const articleBtn = await page.$('a[href*="article"], .complex_item a');
      if (articleBtn) {
        await articleBtn.click();
        await sleep(1500);
      }
    } catch (e) {
      // 무시
    }

  } finally {
    page.off('response', responseHandler);
  }

  return interceptedData;
}

/**
 * DOM에서 직접 데이터 추출 (폴백)
 */
async function extractDataFromDOM(page, tradeType) {
  return await page.evaluate((tradeType) => {
    const result = {
      count: 0,
      articles: [],
      priceRange: null,
    };

    // 매물 수 추출
    const countEl = document.querySelector('.item_num, .complex_summary .count, [class*="count"]');
    if (countEl) {
      const match = countEl.textContent.match(/(\d+)/);
      if (match) result.count = parseInt(match[1]);
    }

    // 가격 범위 추출
    const priceEl = document.querySelector('.complex_price .price, .price_area, [class*="price"]');
    if (priceEl) {
      result.priceRange = priceEl.textContent.trim();
    }

    // 매물 목록 추출
    const items = document.querySelectorAll('.article_box, .item_inner, [class*="article"]');
    items.forEach((item, index) => {
      if (index >= 20) return;

      const priceText = item.querySelector('.price, [class*="price"]')?.textContent?.trim() || '';
      const areaText = item.querySelector('.info, .area, [class*="area"]')?.textContent?.trim() || '';
      const floorText = item.querySelector('.floor, [class*="floor"]')?.textContent?.trim() || '';

      if (priceText) {
        result.articles.push({
          priceText,
          areaText,
          floorText,
        });
      }
    });

    return result;
  }, tradeType);
}

/**
 * 매물 데이터 정규화
 */
function normalizeArticles(data, tradeType) {
  if (!data) {
    return {
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      totalCount: 0,
      articles: [],
    };
  }

  // API 응답 구조
  const articles = data?.result?.list || data?.articleList || data?.articles || [];
  const totalCount = data?.result?.totAtclCnt || data?.totalCount || articles.length;

  const normalized = articles.slice(0, 20).map(article => {
    let price = 0;
    let deposit = 0;
    let monthlyRent = 0;

    if (tradeType === 'monthly') {
      deposit = parseInt(article.warrantPrc || article.prc || 0) * 10000;
      monthlyRent = parseInt(article.rentPrc || 0) * 10000;
      price = deposit;
    } else {
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
    };
  });

  const prices = normalized.map(a => a.price).filter(p => p > 0);

  return {
    count: normalized.length,
    totalCount,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    articles: normalized,
  };
}

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
  };

  try {
    // 매매 데이터
    const saleData = await fetchComplexDataWithIntercept(page, complex.complexNo, 'sale');
    result.sale = normalizeArticles(saleData, 'sale');

    // DOM에서 추가 데이터 추출 (폴백)
    if (result.sale.count === 0) {
      const domData = await extractDataFromDOM(page, 'sale');
      if (domData.count > 0) {
        result.sale.count = domData.count;
        result.sale.totalCount = domData.count;
      }
    }

    await sleep(500 + Math.random() * 300);

    // 전세 데이터
    const jeonseData = await fetchComplexDataWithIntercept(page, complex.complexNo, 'jeonse');
    result.jeonse = normalizeArticles(jeonseData, 'jeonse');

    if (result.jeonse.count === 0) {
      const domData = await extractDataFromDOM(page, 'jeonse');
      if (domData.count > 0) {
        result.jeonse.count = domData.count;
        result.jeonse.totalCount = domData.count;
      }
    }

    await sleep(500 + Math.random() * 300);

    // 월세 데이터
    const monthlyData = await fetchComplexDataWithIntercept(page, complex.complexNo, 'monthly');
    result.monthly = normalizeArticles(monthlyData, 'monthly');

    if (result.monthly.count === 0) {
      const domData = await extractDataFromDOM(page, 'monthly');
      if (domData.count > 0) {
        result.monthly.count = domData.count;
        result.monthly.totalCount = domData.count;
      }
    }

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
    const page = await createPage(browser);

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

        await sleep(800 + Math.random() * 500);
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
    const page = await createPage(browser);

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
