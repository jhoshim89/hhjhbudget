/**
 * 네이버 부동산 크롤러 (Browserless.io + Playwright)
 * PC 사이트 DOM 스크래핑 방식
 *
 * @description
 * - PC 버전 사이트에서 데이터 추출 (모바일보다 안정적)
 * - JavaScript 렌더링 대기
 * - Vercel Edge Cache + stale-while-revalidate 패턴
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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const page = await context.newPage();
  return page;
}

// ============================================
// PC 사이트 스크래핑
// ============================================

/**
 * PC 사이트에서 단지 매물 데이터 추출
 */
async function extractDataFromPC(page, complexNo, tradeType) {
  const tradeTypeMap = {
    'sale': 'A1',
    'jeonse': 'B1',
    'monthly': 'B2',
  };
  const tradeTpCd = tradeTypeMap[tradeType] || 'A1';

  // PC 사이트 URL
  const pageUrl = `https://new.land.naver.com/complexes/${complexNo}?ms=37.5,127,16&a=${tradeTpCd}&e=RETAIL`;
  console.log(`[Scrape] Loading PC: ${pageUrl}`);

  await page.goto(pageUrl, {
    waitUntil: 'networkidle',
    timeout: CONFIG.PAGE_TIMEOUT,
  });

  // JavaScript 렌더링 대기
  await sleep(2500);

  // 스크롤하여 더 많은 컨텐츠 로드
  await page.evaluate(() => {
    window.scrollTo(0, 500);
  });
  await sleep(1000);

  // DOM에서 데이터 추출
  const data = await page.evaluate((tradeType) => {
    const result = {
      count: 0,
      totalCount: 0,
      articles: [],
      priceRange: '',
      debug: {
        bodyLength: document.body?.innerHTML?.length || 0,
        title: document.title,
        url: window.location.href,
      },
    };

    // 매물 수 추출
    const countSelectors = [
      '.complex_summary .item_count em',
      '.article_count em',
      '.complex_tab .on em',
      '[class*="Count"] em',
      '.tabItem--selected em',
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

    // 가격 범위 추출 (시세 정보)
    const priceEl = document.querySelector('.complex_price .price, .complex_summary .price');
    if (priceEl) {
      result.priceRange = priceEl.textContent.trim();
    }

    // 매물 목록 추출
    const articleSelectors = [
      '.item_list .item',
      '.ComplexArticleItem',
      '[class*="ArticleItem"]',
      '.article_list .item',
    ];

    for (const selector of articleSelectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        result.debug.articleSelector = selector;
        result.debug.articleCount = items.length;

        items.forEach((item, index) => {
          if (index >= 20) return;

          // 가격
          const priceEl = item.querySelector('.price, .item_price, [class*="price"] span');
          const priceText = priceEl?.textContent?.trim()?.replace(/\s+/g, ' ') || '';

          // 면적
          const areaEl = item.querySelector('.area, .item_area, [class*="area"]');
          const areaText = areaEl?.textContent?.trim() || '';

          // 층
          const floorEl = item.querySelector('.floor, [class*="floor"]');
          const floorText = floorEl?.textContent?.trim() || '';

          // 설명
          const descEl = item.querySelector('.info, .item_info, [class*="desc"]');
          const descText = descEl?.textContent?.trim() || '';

          if (priceText) {
            result.articles.push({
              priceText,
              areaText,
              floorText,
              descText,
            });
          }
        });
        break;
      }
    }

    result.count = result.articles.length;

    return result;
  }, tradeType);

  return data;
}

/**
 * 매물 데이터 정규화
 */
function normalizeExtractedData(data, tradeType) {
  if (!data) {
    return {
      count: 0,
      totalCount: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      articles: [],
    };
  }

  const normalized = (data.articles || []).map(article => {
    const price = parsePrice(article.priceText);

    let deposit = 0;
    let monthlyRent = 0;

    // 월세 파싱 (보증금/월세)
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
      floor: article.floorText,
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
    const saleData = await extractDataFromPC(page, complex.complexNo, 'sale');
    result.sale = normalizeExtractedData(saleData, 'sale');

    await sleep(500 + Math.random() * 300);

    // 전세 데이터
    const jeonseData = await extractDataFromPC(page, complex.complexNo, 'jeonse');
    result.jeonse = normalizeExtractedData(jeonseData, 'jeonse');

    await sleep(500 + Math.random() * 300);

    // 월세 데이터
    const monthlyData = await extractDataFromPC(page, complex.complexNo, 'monthly');
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

        await sleep(700 + Math.random() * 500);
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
