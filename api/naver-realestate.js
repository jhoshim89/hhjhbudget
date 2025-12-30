/**
 * 네이버 부동산 크롤러 (Browserless.io + Playwright)
 * SSR 페이지 DOM 스크래핑 방식
 *
 * @description
 * - 모바일 페이지에서 직접 DOM 데이터 추출
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

/**
 * 가격 문자열 파싱 ("12억 5,000" → 1250000000)
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const str = String(priceStr).replace(/,/g, '').trim();

  // "12억 5000" 형태
  const match = str.match(/(\d+)억\s*(\d*)/);
  if (match) {
    const eok = parseInt(match[1]) || 0;
    const man = parseInt(match[2]) || 0;
    return (eok * 100000000) + (man * 10000);
  }

  // 숫자만 있는 경우 (만원 단위)
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
// DOM 스크래핑
// ============================================

/**
 * 페이지에서 매물 데이터 추출
 */
async function extractArticlesFromPage(page, complexNo, tradeType) {
  const tradeTpCdMap = {
    'sale': 'A1',
    'jeonse': 'B1',
    'monthly': 'B2',
  };
  const tradeTpCd = tradeTpCdMap[tradeType] || 'A1';

  // 페이지 로드
  const pageUrl = `https://m.land.naver.com/complex/info/${complexNo}?tradTpCd=${tradeTpCd}&ptpNo=1`;
  console.log(`[Scrape] Loading: ${pageUrl}`);

  await page.goto(pageUrl, {
    waitUntil: 'domcontentloaded',
    timeout: CONFIG.PAGE_TIMEOUT,
  });

  // 컨텐츠 로드 대기
  await sleep(1500);

  // 스크롤하여 lazy load 트리거
  await page.evaluate(() => window.scrollTo(0, 500));
  await sleep(500);

  // DOM에서 데이터 추출
  const data = await page.evaluate((tradeType) => {
    const result = {
      count: 0,
      totalCount: 0,
      articles: [],
      priceRange: '',
      debug: {},
    };

    // 매물 수 추출 - 여러 셀렉터 시도
    const countSelectors = [
      '.complex_price .total em',
      '.article_count em',
      '.complex_summary em',
      '[class*="count"] em',
      '.tab_area .on em',
    ];

    for (const selector of countSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const match = el.textContent.match(/(\d+)/);
        if (match) {
          result.totalCount = parseInt(match[1]);
          result.debug.countSelector = selector;
          break;
        }
      }
    }

    // 가격 범위 추출
    const priceSelectors = [
      '.complex_price .price',
      '.price_info .price',
      '.article_price',
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        result.priceRange = el.textContent.trim();
        result.debug.priceSelector = selector;
        break;
      }
    }

    // 매물 목록 추출
    const articleSelectors = [
      '.article_lst li',
      '.complex_lst li',
      '.item_list li',
      '[class*="article"] li',
    ];

    for (const selector of articleSelectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        result.debug.articleSelector = selector;
        items.forEach((item, index) => {
          if (index >= 20) return;

          // 가격 추출
          const priceEl = item.querySelector('.price, .item_price, [class*="price"]');
          const priceText = priceEl?.textContent?.trim() || '';

          // 면적 추출
          const areaEl = item.querySelector('.area, .item_area, [class*="area"]');
          const areaText = areaEl?.textContent?.trim() || '';

          // 층/방향 추출
          const infoEl = item.querySelector('.info, .item_info, [class*="info"]');
          const infoText = infoEl?.textContent?.trim() || '';

          // 설명 추출
          const descEl = item.querySelector('.desc, .item_desc, [class*="desc"]');
          const descText = descEl?.textContent?.trim() || '';

          if (priceText) {
            result.articles.push({
              priceText,
              areaText,
              infoText,
              descText,
            });
          }
        });
        break;
      }
    }

    result.count = result.articles.length;

    // 페이지 전체 HTML 일부 (디버깅용)
    result.debug.bodyLength = document.body?.innerHTML?.length || 0;
    result.debug.title = document.title;

    return result;
  }, tradeType);

  return data;
}

/**
 * 매물 데이터 정규화
 */
function normalizeExtractedData(data, tradeType) {
  if (!data || !data.articles) {
    return {
      count: 0,
      totalCount: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      articles: [],
    };
  }

  const normalized = data.articles.map(article => {
    const price = parsePrice(article.priceText);

    // 월세 파싱 (보증금/월세)
    let deposit = 0;
    let monthlyRent = 0;

    if (tradeType === 'monthly' && article.priceText.includes('/')) {
      const parts = article.priceText.split('/');
      deposit = parsePrice(parts[0]);
      monthlyRent = parsePrice(parts[1]);
    }

    return {
      price: tradeType === 'monthly' ? deposit : price,
      deposit,
      monthlyRent,
      priceText: article.priceText,
      areaText: article.areaText,
      floor: article.infoText,
      description: article.descText,
    };
  });

  const prices = normalized.map(a => a.price).filter(p => p > 0);

  return {
    count: normalized.length,
    totalCount: data.totalCount || normalized.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    priceRange: data.priceRange,
    articles: normalized,
    debug: data.debug,
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
  };

  try {
    // 매매 데이터
    const saleData = await extractArticlesFromPage(page, complex.complexNo, 'sale');
    result.sale = normalizeExtractedData(saleData, 'sale');

    await sleep(400 + Math.random() * 300);

    // 전세 데이터
    const jeonseData = await extractArticlesFromPage(page, complex.complexNo, 'jeonse');
    result.jeonse = normalizeExtractedData(jeonseData, 'jeonse');

    await sleep(400 + Math.random() * 300);

    // 월세 데이터
    const monthlyData = await extractArticlesFromPage(page, complex.complexNo, 'monthly');
    result.monthly = normalizeExtractedData(monthlyData, 'monthly');

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

        await sleep(600 + Math.random() * 400);
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
