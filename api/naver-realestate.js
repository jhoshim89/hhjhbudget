/**
 * 네이버 부동산 크롤러 (Browserless.io + Playwright)
 * Vercel Serverless Function
 */

import { chromium } from 'playwright-core';

// 캐시 (메모리 - Vercel은 함수 인스턴스 간 공유 안됨, 외부 캐시 필요시 Redis 등 사용)
// 여기서는 KV 스토어 대신 간단히 헤더로 캐시 제어
const CACHE_TTL = 24 * 60 * 60; // 24시간 (초)

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

/**
 * Browserless에 연결
 */
async function connectBrowser() {
  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) {
    throw new Error('BROWSERLESS_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const browser = await chromium.connectOverCDP(
    `wss://chrome.browserless.io?token=${token}`
  );

  return browser;
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

/**
 * 단지 매물 정보 크롤링
 * @param {object} page - Playwright page
 * @param {string} complexNo - 단지 코드
 * @param {string} tradeType - 매매/전세/월세
 */
async function crawlArticles(page, complexNo, tradeType = 'trade') {
  const tradeTypeMap = {
    'trade': 'A1',    // 매매
    'lease': 'B1',    // 전세
    'rent': 'B2',     // 월세
  };

  const tradeTpCd = tradeTypeMap[tradeType] || 'A1';
  const url = `https://m.land.naver.com/complex/info/${complexNo}?tradTpCd=${tradeTpCd}&ptpNo=1`;

  console.log(`[Crawler] Navigating to: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // 페이지 로드 대기
  await page.waitForTimeout(2000);

  // 매물 정보 추출
  const data = await page.evaluate((tradeTpCd) => {
    const result = {
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      articles: [],
    };

    // 매물 수 추출
    const countEl = document.querySelector('.complex_summary .item_num');
    if (countEl) {
      const countMatch = countEl.textContent.match(/(\d+)/);
      if (countMatch) {
        result.count = parseInt(countMatch[1]);
      }
    }

    // 시세 정보 추출 (호가)
    const priceItems = document.querySelectorAll('.complex_price .item');
    priceItems.forEach(item => {
      const label = item.querySelector('.label')?.textContent?.trim();
      const value = item.querySelector('.value')?.textContent?.trim();

      if (label && value) {
        // 매매/전세/월세에 따라 다르게 처리
        if (label.includes('매매') || label.includes('전세')) {
          // "8억 ~ 12억" 형태 파싱
          const priceMatch = value.match(/([\d억,\s]+)/g);
          if (priceMatch) {
            result.priceRange = value;
          }
        }
      }
    });

    // 매물 목록 추출 (있는 경우)
    const articleItems = document.querySelectorAll('.article_list .item, .complex_article .item');
    articleItems.forEach((item, index) => {
      if (index >= 10) return; // 최대 10개

      const article = {
        articleNo: item.dataset?.atclNo || '',
        price: item.querySelector('.price')?.textContent?.trim() || '',
        area: item.querySelector('.area')?.textContent?.trim() || '',
        floor: item.querySelector('.floor')?.textContent?.trim() || '',
        direction: item.querySelector('.direction')?.textContent?.trim() || '',
        description: item.querySelector('.desc')?.textContent?.trim() || '',
      };

      if (article.price) {
        result.articles.push(article);
      }
    });

    // 월세인 경우 보증금/월세 분리
    if (tradeTpCd === 'B2') {
      const rentInfo = document.querySelector('.complex_price .rent_price');
      if (rentInfo) {
        result.rentInfo = rentInfo.textContent?.trim();
      }
    }

    return result;
  }, tradeTpCd);

  // 가격 파싱
  if (data.articles.length > 0) {
    const prices = data.articles.map(a => parsePrice(a.price)).filter(p => p > 0);
    if (prices.length > 0) {
      data.minPrice = Math.min(...prices);
      data.maxPrice = Math.max(...prices);
      data.avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    }
  }

  return data;
}

/**
 * 단지별 전체 요약 조회
 */
async function crawlComplexSummary(page, complex, area = 84) {
  console.log(`[Crawler] Processing ${complex.name} (${area}㎡)...`);

  try {
    // 매매 정보
    const sale = await crawlArticles(page, complex.complexNo, 'trade');
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 전세 정보
    const jeonse = await crawlArticles(page, complex.complexNo, 'lease');
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 월세 정보
    const monthly = await crawlArticles(page, complex.complexNo, 'rent');

    return {
      success: true,
      complexNo: complex.complexNo,
      name: complex.name,
      area,
      updatedAt: new Date().toISOString(),
      sale,
      jeonse,
      monthly,
    };
  } catch (error) {
    console.error(`[Crawler] Error for ${complex.name}:`, error.message);
    return {
      success: false,
      error: error.message,
      name: complex.name,
      area,
    };
  }
}

/**
 * 모든 단지 크롤링
 */
async function crawlAllComplexes() {
  let browser = null;

  try {
    browser = await connectBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      locale: 'ko-KR',
    });

    const page = await context.newPage();
    const results = [];

    for (const complex of TARGET_COMPLEXES) {
      for (const area of complex.areas) {
        const summary = await crawlComplexSummary(page, complex, area);
        results.push({
          ...summary,
          id: complex.id,
          isMine: complex.isMine || false,
          region: complex.region,
        });

        // 단지 간 대기 (차단 방지)
        await page.waitForTimeout(2000 + Math.random() * 1000);
      }
    }

    await browser.close();

    return {
      success: true,
      data: results,
      crawledAt: new Date().toISOString(),
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * 단일 단지 크롤링
 */
async function crawlSingleComplex(complexNo, area = 84) {
  const complex = TARGET_COMPLEXES.find(c => c.complexNo === complexNo);
  if (!complex) {
    throw new Error('Complex not found in target list');
  }

  let browser = null;

  try {
    browser = await connectBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      locale: 'ko-KR',
    });

    const page = await context.newPage();
    const summary = await crawlComplexSummary(page, complex, area);

    await browser.close();

    return {
      ...summary,
      id: complex.id,
      isMine: complex.isMine || false,
      region: complex.region,
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Vercel Serverless Function Handler
 */
export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', `s-maxage=${CACHE_TTL}, stale-while-revalidate`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { type, complexNo, area } = req.query;

  try {
    let result;

    switch (type) {
      case 'all':
        result = await crawlAllComplexes();
        break;

      case 'summary':
        if (!complexNo) {
          return res.status(400).json({ success: false, error: 'complexNo required' });
        }
        result = await crawlSingleComplex(complexNo, parseInt(area) || 84);
        break;

      case 'complexes':
        // 대상 단지 목록만 반환 (크롤링 없음)
        result = {
          success: true,
          data: TARGET_COMPLEXES,
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Use: all, summary, complexes'
        });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Naver Realestate] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
