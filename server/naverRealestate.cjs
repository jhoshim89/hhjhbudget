/**
 * 네이버 부동산 크롤링 API
 * Puppeteer Stealth를 사용하여 봇 탐지 우회
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 캐시 (24시간 TTL)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// 단지 complexNo 캐시
const complexNoCache = new Map();

// 브라우저 인스턴스 (싱글톤)
let browser = null;
let browserPromise = null;

// 대상 단지 목록
const TARGET_COMPLEXES = [
  { id: 'forena-songpa', name: '포레나송파', region: '서울 송파구 거여동', areas: [80, 84], isMine: true },
  { id: 'the-beach-prugio-summit', name: '더비치푸르지오써밋', region: '부산 남구 대연동', areas: [84] },
  { id: 'daeyeon-lotte-castle', name: '대연롯데캐슬레전드', region: '부산 남구 대연동', areas: [84] },
  { id: 'the-sharp-namcheon', name: '더샵남천프레스티지', region: '부산 수영구 남천동', areas: [84] },
  { id: 'daeyeon-hillstate-prugio', name: '대연힐스테이트푸르지오', region: '부산 남구 대연동', areas: [84] },
];

/**
 * 브라우저 인스턴스 가져오기
 */
async function getBrowser() {
  if (browser && browser.isConnected()) {
    return browser;
  }

  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  browser = await browserPromise;
  browserPromise = null;

  browser.on('disconnected', () => {
    browser = null;
  });

  return browser;
}

/**
 * 브라우저 종료
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * 단지명으로 complexNo 검색
 */
async function searchComplexNo(aptName) {
  // 캐시 확인
  if (complexNoCache.has(aptName)) {
    return complexNoCache.get(aptName);
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // 네이버 부동산 검색
    const searchUrl = `https://new.land.naver.com/search?q=${encodeURIComponent(aptName)}`;
    console.log(`[Naver] Searching: ${aptName}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // 1. 먼저 현재 URL에서 complexNo 확인 (자동 리다이렉트된 경우)
    let currentUrl = page.url();
    let urlMatch = currentUrl.match(/complexes\/(\d+)/);
    if (urlMatch) {
      const foundComplexNo = urlMatch[1];
      console.log(`[Naver] Found complexNo from redirect for ${aptName}: ${foundComplexNo}`);
      complexNoCache.set(aptName, foundComplexNo);
      return foundComplexNo;
    }

    // 2. 검색 결과 페이지에서 첫 번째 결과 클릭
    const clicked = await page.evaluate(() => {
      // 검색 결과 목록에서 첫 번째 아파트 항목 찾기
      const selectors = [
        'a[href*="/complexes/"]',
        '[class*="item_title"] a',
        '[class*="search_item"] a',
        '.item_inner a',
      ];

      for (const selector of selectors) {
        const link = document.querySelector(selector);
        if (link && link.href && link.href.includes('/complexes/')) {
          link.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      await sleep(3000);
      currentUrl = page.url();
      urlMatch = currentUrl.match(/complexes\/(\d+)/);
      if (urlMatch) {
        const foundComplexNo = urlMatch[1];
        console.log(`[Naver] Found complexNo after click for ${aptName}: ${foundComplexNo}`);
        complexNoCache.set(aptName, foundComplexNo);
        return foundComplexNo;
      }
    }

    // 3. 페이지 내에서 complexNo 직접 추출 시도
    const complexNo = await page.evaluate(() => {
      const url = window.location.href;
      const match = url.match(/complexes\/(\d+)/);
      if (match) return match[1];

      // 스크립트 태그에서 complexNo 찾기
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        const complexMatch = content.match(/complexNo["']?\s*[:=]\s*["']?(\d+)/);
        if (complexMatch) return complexMatch[1];
      }
      return null;
    });

    if (complexNo) {
      console.log(`[Naver] Found complexNo for ${aptName}: ${complexNo}`);
      complexNoCache.set(aptName, complexNo);
      return complexNo;
    }

    console.warn(`[Naver] Could not find complexNo for ${aptName}`);
    return null;
  } catch (error) {
    console.error(`[Naver] Error searching ${aptName}:`, error.message);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * 매물 목록 조회 (API 직접 호출)
 */
async function fetchArticles(complexNo, tradeType = 'A1', area = 84) {
  const cacheKey = `articles_${complexNo}_${tradeType}_${area}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 먼저 단지 페이지 방문하여 쿠키 획득
    await page.goto(`https://new.land.naver.com/complexes/${complexNo}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(1500);

    // API 직접 호출
    const areaMin = area - 5;
    const areaMax = area + 5;

    const apiUrl = `https://new.land.naver.com/api/articles/complex/${complexNo}?realEstateType=APT&tradeType=${tradeType}&areaMin=${areaMin}&areaMax=${areaMax}&page=1&sameAddressGroup=false`;

    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://new.land.naver.com/',
        },
      });
      return res.json();
    }, apiUrl);

    const articles = response.articleList || [];

    // 데이터 정규화
    const normalized = articles.map(article => ({
      articleNo: article.articleNo,
      articleName: article.articleName,
      tradeTypeName: article.tradeTypeName,
      dealOrWarrantPrc: article.dealOrWarrantPrc,      // 가격 (만원)
      rentPrc: article.rentPrc || 0,                    // 월세 (만원)
      area1: article.area1,                             // 공급면적
      area2: article.area2,                             // 전용면적
      floorInfo: article.floorInfo,
      direction: article.direction,
      articleConfirmYmd: article.articleConfirmYmd,
      realtorName: article.realtorName,
      cpName: article.cpName,
      tags: article.tagList || [],
    }));

    // 통계 계산
    const prices = normalized.map(a => a.dealOrWarrantPrc).filter(p => p > 0);
    const result = {
      count: normalized.length,
      minPrice: prices.length > 0 ? Math.min(...prices) * 10000 : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) * 10000 : 0,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) * 10000 : 0,
      articles: normalized.slice(0, 10), // 최근 10개만
    };

    // 캐시 저장
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error(`[Naver] Error fetching articles:`, error.message);
    return { count: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, articles: [] };
  } finally {
    await page.close();
  }
}

/**
 * 단지 정보 조회
 */
async function fetchComplexInfo(complexNo) {
  const cacheKey = `info_${complexNo}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(`https://new.land.naver.com/complexes/${complexNo}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(1500);

    // 단지 정보 추출
    const info = await page.evaluate(() => {
      const getName = () => {
        const el = document.querySelector('[class*="complex_title"]');
        return el?.textContent?.trim() || '';
      };

      const getAddress = () => {
        const el = document.querySelector('[class*="address"]');
        return el?.textContent?.trim() || '';
      };

      const getHouseholds = () => {
        const el = document.querySelector('[class*="households"]');
        const text = el?.textContent || '';
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };

      return {
        name: getName(),
        address: getAddress(),
        households: getHouseholds(),
      };
    });

    cache.set(cacheKey, { data: info, timestamp: Date.now() });
    return info;
  } catch (error) {
    console.error(`[Naver] Error fetching complex info:`, error.message);
    return { name: '', address: '', households: 0 };
  } finally {
    await page.close();
  }
}

/**
 * 단지별 전체 요약 조회
 */
async function fetchComplexSummary(aptName, area = 84) {
  const cacheKey = `summary_${aptName}_${area}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // complexNo 조회
    const complexNo = await searchComplexNo(aptName);
    if (!complexNo) {
      return {
        success: false,
        error: 'complexNo not found',
        name: aptName,
        area,
      };
    }

    // 매매/전세/월세 데이터 조회 (순차 실행으로 부하 최소화)
    console.log(`[Naver] Fetching data for ${aptName} (${area}㎡)...`);

    const sale = await fetchArticles(complexNo, 'A1', area);
    await sleep(500);

    const jeonse = await fetchArticles(complexNo, 'B1', area);
    await sleep(500);

    const monthly = await fetchArticles(complexNo, 'B2', area);

    const result = {
      success: true,
      complexNo,
      name: aptName,
      area,
      updatedAt: new Date().toISOString(),
      sale,
      jeonse,
      monthly,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[Naver] Error fetching summary for ${aptName}:`, error.message);
    return {
      success: false,
      error: error.message,
      name: aptName,
      area,
    };
  }
}

/**
 * 모든 대상 단지 데이터 조회
 */
async function fetchAllComplexes() {
  const cacheKey = 'all_complexes';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const results = [];

  for (const complex of TARGET_COMPLEXES) {
    for (const area of complex.areas) {
      console.log(`[Naver] Processing ${complex.name} (${area}㎡)...`);
      const summary = await fetchComplexSummary(complex.name, area);
      results.push({
        ...summary,
        id: complex.id,
        isMine: complex.isMine || false,
        region: complex.region,
      });
      await sleep(1000); // 요청 간 1초 대기
    }
  }

  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Express 핸들러
 */
async function naverRealestateHandler(req, res) {
  const { type, name, area, complexNo } = req.query;

  try {
    let data;

    switch (type) {
      case 'summary':
        if (!name) {
          return res.status(400).json({ success: false, error: 'name required' });
        }
        data = await fetchComplexSummary(name, parseInt(area) || 84);
        break;

      case 'articles':
        if (!complexNo) {
          return res.status(400).json({ success: false, error: 'complexNo required' });
        }
        const tradeType = req.query.tradeType || 'A1';
        data = await fetchArticles(complexNo, tradeType, parseInt(area) || 84);
        break;

      case 'info':
        if (!complexNo) {
          return res.status(400).json({ success: false, error: 'complexNo required' });
        }
        data = await fetchComplexInfo(complexNo);
        break;

      case 'all':
        data = await fetchAllComplexes();
        break;

      case 'search':
        if (!name) {
          return res.status(400).json({ success: false, error: 'name required' });
        }
        const foundComplexNo = await searchComplexNo(name);
        data = { name, complexNo: foundComplexNo };
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid type. Use: summary, articles, info, all, search' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[Naver] Handler error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 프로세스 종료 시 브라우저 정리
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit();
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit();
});

module.exports = {
  searchComplexNo,
  fetchArticles,
  fetchComplexInfo,
  fetchComplexSummary,
  fetchAllComplexes,
  naverRealestateHandler,
  closeBrowser,
};
