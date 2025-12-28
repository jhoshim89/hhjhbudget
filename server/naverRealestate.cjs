/**
 * 네이버 부동산 API (Puppeteer 없이 직접 호출)
 * 참고: https://inasie.github.io/프로그래밍/네이버-부동산-크롤링/
 */

const axios = require('axios');

// 캐시 (24시간 TTL - Rate limit 방지)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// 공통 헤더 (봇 탐지 우회)
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://m.land.naver.com/',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

// 대상 단지 목록 (complexNo - 네이버 부동산 URL에서 확인)
// URL 예시: https://new.land.naver.com/complexes/139917 → complexNo = 139917
const TARGET_COMPLEXES = [
  { id: 'forena-songpa', name: '포레나송파', complexNo: '139917', region: '서울 송파구 거여동', areas: [80, 84], isMine: true },
  { id: 'the-beach-prugio-summit', name: '더비치푸르지오써밋', complexNo: '161501', region: '부산 남구 대연동', areas: [84] },
  { id: 'daeyeon-lotte-castle', name: '대연롯데캐슬레전드', complexNo: '109359', region: '부산 남구 대연동', areas: [84] },
  { id: 'the-sharp-namcheon', name: '더샵남천프레스티지', complexNo: '127133', region: '부산 수영구 남천동', areas: [84] },
  { id: 'daeyeon-hillstate-prugio', name: '대연힐스테이트푸르지오', complexNo: '105323', region: '부산 남구 대연동', areas: [84] },
];

/**
 * 단지 기본 정보 조회
 */
async function fetchComplexInfo(complexNo) {
  const cacheKey = `info_${complexNo}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // PC 버전 API
    const url = `https://new.land.naver.com/api/complexes/${complexNo}`;

    const response = await axios.get(url, {
      headers: {
        ...HEADERS,
        'Referer': `https://new.land.naver.com/complexes/${complexNo}`,
      },
      timeout: 10000,
    });

    const data = response.data;
    const result = {
      complexNo,
      name: data.complexName || '',
      address: data.address || '',
      totalHouseholdCount: data.totalHouseholdCount || 0,
      useApproveYmd: data.useApproveYmd || '',
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[Naver] Error fetching complex info ${complexNo}:`, error.message);
    return null;
  }
}

/**
 * 매물 목록 조회 (PC API)
 * @param {string} complexNo - 단지 코드
 * @param {string} tradeType - A1:매매, B1:전세, B2:월세
 * @param {number} area - 전용면적
 */
async function fetchArticles(complexNo, tradeType = 'A1', area = 84) {
  const cacheKey = `articles_${complexNo}_${tradeType}_${area}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // 면적 범위 (±5㎡)
    const areaMin = area - 5;
    const areaMax = area + 5;

    // PC 버전 API (new.land.naver.com)
    const url = `https://new.land.naver.com/api/articles/complex/${complexNo}`;
    const params = {
      realEstateType: 'APT',
      tradeType: tradeType,
      areaMin: areaMin,
      areaMax: areaMax,
      page: 1,
      sameAddressGroup: false,
    };

    console.log(`[Naver] Fetching articles: complexNo=${complexNo}, tradeType=${tradeType}, area=${area}`);

    const response = await axios.get(url, {
      params,
      headers: {
        ...HEADERS,
        'Referer': `https://new.land.naver.com/complexes/${complexNo}?ms=${area}`,
      },
      timeout: 10000,
    });

    const articles = response.data.articleList || [];

    // 데이터 정규화
    const normalized = articles.map(article => ({
      articleNo: article.articleNo,
      articleName: article.articleName,
      tradeTypeName: article.tradeTypeName,
      dealOrWarrantPrc: article.dealOrWarrantPrc,  // 가격 (문자열, "12억 5,000" 형태)
      rentPrc: article.rentPrc || 0,
      area1: article.area1,  // 공급면적
      area2: article.area2,  // 전용면적
      floorInfo: article.floorInfo,
      direction: article.direction,
      articleConfirmYmd: article.articleConfirmYmd,
      realtorName: article.realtorName,
      tags: article.tagList || [],
    }));

    // 가격 파싱 및 통계
    const prices = normalized.map(a => parsePrice(a.dealOrWarrantPrc)).filter(p => p > 0);

    const result = {
      count: normalized.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      articles: normalized.slice(0, 10),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[Naver] Error fetching articles:`, error.message);
    return { count: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, articles: [] };
  }
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
 * 단지별 전체 요약 조회
 */
async function fetchComplexSummary(complexNo, aptName, area = 84) {
  const cacheKey = `summary_${complexNo}_${area}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log(`[Naver] Fetching summary for ${aptName} (${area}㎡)...`);

    // 매매/전세/월세 순차 조회 (병렬하면 차단될 수 있음)
    const sale = await fetchArticles(complexNo, 'A1', area);
    await sleep(300);

    const jeonse = await fetchArticles(complexNo, 'B1', area);
    await sleep(300);

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
    console.log('[Naver] Returning cached data for all complexes');
    return cached.data;
  }

  const results = [];

  for (const complex of TARGET_COMPLEXES) {
    // complexNo가 없으면 스킵
    if (!complex.complexNo) {
      console.log(`[Naver] Skipping ${complex.name} - complexNo not set`);
      results.push({
        success: false,
        error: 'complexNo not configured',
        id: complex.id,
        name: complex.name,
        region: complex.region,
        isMine: complex.isMine || false,
        areas: complex.areas.reduce((acc, area) => {
          acc[area] = { sale: null, jeonse: null, monthly: null };
          return acc;
        }, {}),
      });
      continue;
    }

    for (const area of complex.areas) {
      console.log(`[Naver] Processing ${complex.name} (${area}㎡)...`);

      const summary = await fetchComplexSummary(complex.complexNo, complex.name, area);

      results.push({
        ...summary,
        id: complex.id,
        isMine: complex.isMine || false,
        region: complex.region,
      });

      await sleep(1000); // 요청 간 대기 늘림 (차단 방지)
    }
  }

  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  return results;
}

/**
 * 단지 검색 (complexNo 찾기)
 */
async function searchComplex(keyword) {
  try {
    const url = 'https://m.land.naver.com/search/result/' + encodeURIComponent(keyword);

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
    });

    // HTML에서 complexNo 추출 시도
    const html = response.data;
    const match = html.match(/complexNo['":\s]+(\d+)/);

    if (match) {
      return { keyword, complexNo: match[1] };
    }

    return { keyword, complexNo: null, message: 'Not found' };
  } catch (error) {
    console.error(`[Naver] Error searching ${keyword}:`, error.message);
    return { keyword, complexNo: null, error: error.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Express 핸들러
 */
async function naverRealestateHandler(req, res) {
  const { type, name, area, complexNo, tradeType } = req.query;

  try {
    let data;

    switch (type) {
      case 'summary':
        if (!complexNo && !name) {
          return res.status(400).json({ success: false, error: 'complexNo or name required' });
        }
        // name으로 요청시 TARGET_COMPLEXES에서 찾기
        let targetComplexNo = complexNo;
        let targetName = name;
        if (!complexNo && name) {
          const found = TARGET_COMPLEXES.find(c => c.name.includes(name) || name.includes(c.name));
          if (found) {
            targetComplexNo = found.complexNo;
            targetName = found.name;
          } else {
            return res.status(404).json({ success: false, error: 'Complex not found in target list' });
          }
        }
        data = await fetchComplexSummary(targetComplexNo, targetName, parseInt(area) || 84);
        break;

      case 'articles':
        if (!complexNo) {
          return res.status(400).json({ success: false, error: 'complexNo required' });
        }
        data = await fetchArticles(complexNo, tradeType || 'A1', parseInt(area) || 84);
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
        data = await searchComplex(name);
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

module.exports = {
  fetchComplexInfo,
  fetchArticles,
  fetchComplexSummary,
  fetchAllComplexes,
  searchComplex,
  naverRealestateHandler,
  TARGET_COMPLEXES,
};
