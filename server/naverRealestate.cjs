/**
 * 네이버 부동산 API (Cluster API 기반)
 * 2024년 12월 기준 동작하는 API 사용
 *
 * 변경 이력:
 * - PC API(new.land.naver.com) → Cluster API(m.land.naver.com/cluster) 전환
 * - 좌표 기반 조회로 변경
 * - 헤더 강화 및 User-Agent 랜덤화
 * - 재시도 로직 추가 (exponential backoff)
 * - Fallback 캐시 전략 구현
 */

const axios = require('axios');
const {
  getTodayPriceData,
  savePriceHistory,
  getPriceHistory,
  saveArticleDetails,
  getArticleDetailHistory,
} = require('./sheets.cjs');

// 캐시 (24시간 TTL - Rate limit 방지)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// User-Agent 리스트 (랜덤 선택)
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 강화된 헤더
function getHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Referer': 'https://m.land.naver.com/',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
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

// 대상 단지 목록 (좌표 정보 포함)
// 좌표는 네이버 부동산/위키백과에서 확인 (lat: 위도, lon: 경도)
const TARGET_COMPLEXES = [
  {
    id: 'forena-songpa',
    name: '포레나송파',
    complexNo: '139917',
    region: '서울 송파구 거여동',
    lat: 37.4833,   // 위례송파로 123 (위례신도시)
    lon: 127.1453,
    areas: [80, 84],
    householdCount: 1282,
    isMine: true
  },
  {
    id: 'the-beach-prugio-summit',
    name: '더비치푸르지오써밋',
    complexNo: '161501',
    region: '부산 남구 대연동',
    lat: 35.1347,   // 황령대로 504, 대연동 1808
    lon: 129.0878,
    areas: [84],
    householdCount: 1384
  },
  {
    id: 'daeyeon-lotte-castle',
    name: '대연롯데캐슬레전드',  // 정확한 이름 (3,149세대 대단지)
    complexNo: '109359',
    region: '부산 남구 대연동',
    lat: 35.136369,   // 네이버 부동산 좌표 (수영로 135, 대연동 1872)
    lon: 129.081142,
    areas: [84],
    householdCount: 3149
  },
  {
    id: 'the-sharp-namcheon',
    name: '더샵남천프레스티지',
    complexNo: '127133',
    region: '부산 수영구 남천동',
    lat: 35.1355,   // 수영로 389, 남천동 599
    lon: 129.1095,
    areas: [84],
    householdCount: 975
  },
  {
    id: 'daeyeon-hillstate-prugio',
    name: '대연힐스테이트푸르지오',
    complexNo: '105323',
    region: '부산 남구 대연동',
    lat: 35.1408222,  // 위키백과 좌표 (수영로 345, 대연동 1858)
    lon: 129.1005639,
    areas: [84],
    householdCount: 2100
  },
];

/**
 * 재시도 로직이 포함된 fetch 함수
 * @param {string} url - 요청 URL
 * @param {object} options - axios 옵션
 * @param {number} maxRetries - 최대 재시도 횟수
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        ...options,
        headers: getHeaders(),
        timeout: 15000,
      });
      return response;
    } catch (error) {
      const isRateLimit = error.response?.status === 429 ||
                          error.response?.data?.code === 'TOO_MANY_REQUESTS';

      console.log(`[Naver] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 2초, 4초, 8초... + 랜덤 지연
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`[Naver] Retrying in ${Math.round(delay/1000)}s...`);
      await sleep(delay);
    }
  }
}

/**
 * m.land.naver.com Mobile API로 매물 목록 조회
 * complexNo(hscpNo)를 사용하여 정확한 단지 매물 조회
 * @param {object} complex - 단지 정보
 * @param {string} tradeType - A1:매매, B1:전세, B2:월세
 * @param {number} targetArea - 목표 평형 (㎡), 필터링용
 */
async function fetchArticlesByMobileApi(complex, tradeType = 'A1', targetArea = null) {
  const cacheKey = `mobile_${complex.complexNo}_${tradeType}_${targetArea || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Naver] Cache hit (mobile): ${complex.name} (${tradeType}, ${targetArea}㎡)`);
    return { ...cached.data, fromCache: true };
  }

  try {
    const url = `https://m.land.naver.com/complex/getComplexArticleList`;
    const params = {
      hscpNo: complex.complexNo,
      tradTpCd: tradeType,
      order: 'prc',
      showR0: 'N',
      page: 1,
    };

    console.log(`[Naver] Fetching (mobile): ${complex.name} (${tradeType})`);

    const response = await fetchWithRetry(url, {
      params,
      headers: {
        ...getHeaders(),
        'Referer': `https://m.land.naver.com/complex/${complex.complexNo}`,
      },
    });

    const articles = response.data?.result?.list || [];
    const totalCount = response.data?.result?.totAtclCnt || 0;

    const normalized = articles.map(article => ({
      articleNo: article.atclNo,
      articleName: article.atclNm || complex.name,
      tradeTypeName: article.tradTpNm || (tradeType === 'A1' ? '매매' : tradeType === 'B1' ? '전세' : '월세'),
      dealOrWarrantPrc: article.prcInfo,  // "8억 5,000" 형태
      rentPrc: article.rentPrc || 0,
      area1: article.spc1,  // 공급면적
      area2: article.spc2,  // 전용면적
      floorInfo: article.flrInfo,
      direction: article.direction,
      articleConfirmYmd: article.cfmYmd,
      realtorName: article.rltrNm,
      tags: article.tagList || [],
      bildNm: article.bildNm,
    }));

    // 평형 필터링 적용
    const filtered = targetArea ? filterByArea(normalized, targetArea) : normalized;
    console.log(`[Naver] Filtered ${normalized.length} → ${filtered.length} articles for ${targetArea}㎡`);

    // 가격 파싱 (필터링된 데이터 기준)
    const prices = filtered.map(a => parsePrice(a.dealOrWarrantPrc)).filter(p => p > 0);

    const result = {
      count: filtered.length,  // 필터링된 매물 수
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      articles: filtered.slice(0, 10),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[Naver] Mobile API error for ${complex.name}:`, error.message);

    // Fallback: 캐시된 데이터가 있으면 반환
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return { ...staleCache.data, fromCache: true, isStale: true };
    }

    return null;
  }
}

/**
 * Cluster API로 매물 목록 조회
 * @param {object} complex - 단지 정보 (좌표 포함)
 * @param {string} tradeType - A1:매매, B1:전세, B2:월세
 */
async function fetchArticlesByCluster(complex, tradeType = 'A1') {
  const cacheKey = `cluster_${complex.id}_${tradeType}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Naver] Cache hit: ${complex.name} (${tradeType})`);
    return { ...cached.data, fromCache: true };
  }

  try {
    // 좌표 기반 경계 계산 (약 1km 범위로 확대)
    const delta = 0.01;
    const params = {
      rletTpCd: 'APT',
      tradTpCd: tradeType,
      z: 16,
      lat: complex.lat,
      lon: complex.lon,
      btm: complex.lat - delta,
      lft: complex.lon - delta,
      top: complex.lat + delta,
      rgt: complex.lon + delta,
      page: 1,
    };

    // cortarNo가 있으면 추가 (선택적)
    if (complex.cortarNo) {
      params.cortarNo = complex.cortarNo;
    }

    const url = 'https://m.land.naver.com/cluster/ajax/articleList';
    console.log(`[Naver] Fetching: ${complex.name} (${tradeType})`);

    const response = await fetchWithRetry(url, { params });
    const body = response.data.body || [];

    // 해당 단지 매물만 필터링 (여러 방식 시도)
    // 1. 단지명 부분 일치
    // 2. complexNo가 매물에 포함된 경우
    const namePrefix = complex.name.substring(0, 3); // 첫 3글자
    const complexArticles = body.filter(article => {
      if (!article.atclNm) return false;
      // 단지명 매칭 (예: "포레나" → "포레나송파" 또는 "더비치" → "더비치푸르지오써밋")
      return article.atclNm.includes(namePrefix) ||
             complex.name.includes(article.atclNm.substring(0, 4));
    });

    // 필터링된 결과가 없으면 전체 결과 사용 (단지명 필터 실패 시 fallback)
    const articlesToUse = complexArticles.length > 0 ? complexArticles : body.slice(0, 20);

    console.log(`[Naver] Found ${body.length} articles, filtered to ${articlesToUse.length} for ${complex.name}`);

    // 데이터 정규화
    const normalized = articlesToUse.map(article => ({
      articleNo: article.atclNo,
      articleName: article.atclNm,
      tradeTypeName: article.tradTpNm,
      dealOrWarrantPrc: article.hanPrc,  // "8억" 형태
      rentPrc: article.rentPrc || 0,
      area1: article.spc1,  // 공급면적
      area2: article.spc2,  // 전용면적
      floorInfo: article.flrInfo,
      direction: article.direction,
      articleConfirmYmd: article.atclCfmYmd,
      realtorName: article.rltrNm,
      tags: article.tagList || [],
      lat: article.lat,
      lng: article.lng,
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
    console.error(`[Naver] Error fetching articles for ${complex.name}:`, error.message);

    // Fallback: 캐시된 데이터가 있으면 반환 (만료되어도)
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      console.log(`[Naver] Returning stale cache for ${complex.name}`);
      return { ...staleCache.data, fromCache: true, isStale: true };
    }

    return { count: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, articles: [], error: error.message };
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
 * 매물 조회 (Mobile API 우선, Cluster API fallback)
 * @param {object} complex - 단지 정보
 * @param {string} tradeType - A1:매매, B1:전세, B2:월세
 * @param {number} targetArea - 목표 평형 (㎡)
 */
async function fetchArticles(complex, tradeType, targetArea = null) {
  // 1. Mobile API 먼저 시도 (hscpNo/complexNo 기반으로 정확한 데이터)
  const mobileResult = await fetchArticlesByMobileApi(complex, tradeType, targetArea);
  if (mobileResult) {
    return mobileResult;
  }

  // 2. Cluster API fallback (좌표 기반) - 여기서도 필터링 적용
  if (complex.lat && complex.lon) {
    const clusterResult = await fetchArticlesByCluster(complex, tradeType);
    if (clusterResult && targetArea) {
      const filtered = filterByArea(clusterResult.articles, targetArea);
      const prices = filtered.map(a => parsePrice(a.dealOrWarrantPrc)).filter(p => p > 0);
      return {
        ...clusterResult,
        count: filtered.length,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        articles: filtered.slice(0, 10),
      };
    }
    return clusterResult;
  }

  return { count: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, articles: [] };
}

/**
 * 단지별 전체 요약 조회
 */
async function fetchComplexSummary(complex, area = 84) {
  const cacheKey = `summary_${complex.id}_${area}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Naver] Cache hit: ${complex.name} summary`);
    return { ...cached.data, fromCache: true, cachedAt: cached.timestamp };
  }

  try {
    console.log(`[Naver] Fetching summary for ${complex.name} (${area}㎡)...`);

    // 매매/전세/월세 순차 조회 (병렬하면 차단될 수 있음) - 평형 필터링 적용
    const sale = await fetchArticles(complex, 'A1', area);
    await sleep(3000 + Math.random() * 2000); // 3~5초 대기 (Rate limit 방지)

    const jeonse = await fetchArticles(complex, 'B1', area);
    await sleep(3000 + Math.random() * 2000);

    const monthly = await fetchArticles(complex, 'B2', area);

    const result = {
      success: true,
      complexNo: complex.complexNo,
      name: complex.name,
      area,
      updatedAt: new Date().toISOString(),
      sale,
      jeonse,
      monthly,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return { ...result, cachedAt: Date.now() };
  } catch (error) {
    console.error(`[Naver] Error fetching summary for ${complex.name}:`, error.message);

    // Fallback: 캐시된 데이터가 있으면 반환
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      console.log(`[Naver] Returning stale summary cache for ${complex.name}`);
      return {
        ...staleCache.data,
        fromCache: true,
        isStale: true,
        cachedAt: staleCache.timestamp,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error.message,
      name: complex.name,
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
    return {
      data: cached.data,
      fromCache: true,
      cachedAt: cached.timestamp,
      isStale: false
    };
  }

  const results = [];
  let hasError = false;

  for (const complex of TARGET_COMPLEXES) {
    for (const area of complex.areas) {
      console.log(`[Naver] Processing ${complex.name} (${area}㎡)...`);

      try {
        const summary = await fetchComplexSummary(complex, area);

        results.push({
          ...summary,
          id: complex.id,
          isMine: complex.isMine || false,
          region: complex.region,
          lat: complex.lat,
          lon: complex.lon,
          householdCount: complex.householdCount,
        });
      } catch (error) {
        console.error(`[Naver] Failed to process ${complex.name}:`, error.message);
        hasError = true;

        results.push({
          success: false,
          error: error.message,
          id: complex.id,
          name: complex.name,
          region: complex.region,
          isMine: complex.isMine || false,
          lat: complex.lat,
          lon: complex.lon,
          householdCount: complex.householdCount,
          area,
        });
      }

      // 단지 간 대기 (차단 방지) - 2~3초
      await sleep(2000 + Math.random() * 1000);
    }
  }

  // 전체 결과 캐시
  cache.set(cacheKey, { data: results, timestamp: Date.now() });

  return {
    data: results,
    cachedAt: Date.now(),
    isStale: false,
    hasError,
  };
}

/**
 * 시트 캐시를 사용하는 모든 단지 데이터 조회
 * - 오늘 시트에 데이터가 있으면 시트에서 반환
 * - 없으면 네이버 API 호출 후 시트에 저장
 */
async function fetchAllComplexesWithSheetCache() {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  console.log(`[Naver] Checking sheet cache for ${today}...`);

  try {
    // 1. 오늘 시트 데이터 확인
    const cachedData = await getTodayPriceData(today);
    if (cachedData && cachedData.length > 0) {
      console.log(`[Naver] Sheet cache hit! ${cachedData.length} records found`);

      // 시트 데이터를 API 응답 형식으로 변환
      const data = cachedData.map(record => {
        const complexInfo = TARGET_COMPLEXES.find(c => c.id === record.complexId);
        return {
          id: record.complexId,
          name: record.complexName,
          area: record.area,
          isMine: complexInfo?.isMine || false,
          region: complexInfo?.region || '',
          lat: complexInfo?.lat,
          lon: complexInfo?.lon,
          sale: {
            count: record.saleCount,
            minPrice: record.saleMin,
            maxPrice: record.saleMax,
          },
          jeonse: {
            count: record.jeonseCount,
            minPrice: record.jeonseMin,
            maxPrice: record.jeonseMax,
          },
          monthly: {
            count: record.monthlyCount,
          },
          updatedAt: record.updatedAt,
          fromCache: true,
        };
      });

      return {
        data,
        fromCache: true,
        cachedAt: today,
        isStale: false,
      };
    }

    console.log('[Naver] No sheet cache, fetching from API...');

    // 2. 네이버 API 호출
    const apiResult = await fetchAllComplexes();

    // 3. 시트에 저장 (요약 + 매물상세)
    if (apiResult.data && apiResult.data.length > 0) {
      // 3-1. 요약 데이터 저장
      const records = apiResult.data.map(item => ({
        date: today,
        complexId: item.id,
        complexName: item.name,
        area: item.area,
        saleCount: item.sale?.count || 0,
        saleMin: item.sale?.minPrice || 0,
        saleMax: item.sale?.maxPrice || 0,
        jeonseCount: item.jeonse?.count || 0,
        jeonseMin: item.jeonse?.minPrice || 0,
        jeonseMax: item.jeonse?.maxPrice || 0,
        monthlyCount: item.monthly?.count || 0,
        updatedAt: new Date().toISOString(),
      }));

      try {
        await savePriceHistory(records);
        console.log(`[Naver] Saved ${records.length} summary records to sheet`);
      } catch (saveError) {
        console.error('[Naver] Failed to save summary to sheet:', saveError.message);
      }

      // 3-2. 매물 상세 저장
      const articleDetails = [];
      for (const item of apiResult.data) {
        const complexId = item.id;
        const complexName = item.name;

        // 매매 매물
        if (item.sale?.articles) {
          for (const article of item.sale.articles) {
            articleDetails.push({
              date: today,
              complexId,
              complexName,
              area: parseFloat(article.area2) || item.area,
              tradeType: '매매',
              price: Math.round(parsePrice(article.dealOrWarrantPrc) / 10000), // 만원 단위
              deposit: '',
              monthlyRent: '',
              floor: article.floorInfo || '',
              articleNo: article.articleNo,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 전세 매물
        if (item.jeonse?.articles) {
          for (const article of item.jeonse.articles) {
            articleDetails.push({
              date: today,
              complexId,
              complexName,
              area: parseFloat(article.area2) || item.area,
              tradeType: '전세',
              price: '',
              deposit: Math.round(parsePrice(article.dealOrWarrantPrc) / 10000), // 만원 단위
              monthlyRent: '',
              floor: article.floorInfo || '',
              articleNo: article.articleNo,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 월세 매물
        if (item.monthly?.articles) {
          for (const article of item.monthly.articles) {
            // "2억/300" 형태 파싱
            const priceStr = article.dealOrWarrantPrc || '';
            let deposit = 0;
            let monthlyRent = 0;

            const monthlyMatch = priceStr.match(/(.+?)\/(\d+)/);
            if (monthlyMatch) {
              deposit = Math.round(parsePrice(monthlyMatch[1]) / 10000); // 만원 단위
              monthlyRent = parseInt(monthlyMatch[2]) || 0; // 이미 만원 단위
            } else {
              deposit = Math.round(parsePrice(priceStr) / 10000);
            }

            articleDetails.push({
              date: today,
              complexId,
              complexName,
              area: parseFloat(article.area2) || item.area,
              tradeType: '월세',
              price: '',
              deposit,
              monthlyRent,
              floor: article.floorInfo || '',
              articleNo: article.articleNo,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      if (articleDetails.length > 0) {
        try {
          await saveArticleDetails(articleDetails);
          console.log(`[Naver] Saved ${articleDetails.length} article details to sheet`);
        } catch (saveError) {
          console.error('[Naver] Failed to save article details:', saveError.message);
        }
      }
    }

    return {
      ...apiResult,
      cachedAt: today,
    };
  } catch (error) {
    console.error('[Naver] Sheet cache error:', error.message);

    // 에러 시 기존 메모리 캐시 또는 API 호출 시도
    const staleData = getCachedData('all_complexes');
    if (staleData) {
      return {
        data: staleData.data,
        fromCache: true,
        isStale: true,
        error: error.message,
      };
    }

    // 마지막 수단: API 직접 호출
    return await fetchAllComplexes();
  }
}

/**
 * 캐시된 데이터 조회 (만료 여부 무관)
 */
function getCachedData(cacheKey) {
  const cached = cache.get(cacheKey);
  if (!cached) return null;

  const isStale = Date.now() - cached.timestamp > CACHE_TTL;
  return {
    data: cached.data,
    isStale,
    cachedAt: cached.timestamp,
    age: Date.now() - cached.timestamp,
  };
}

/**
 * 단지 검색 (complexNo 찾기)
 */
async function searchComplex(keyword) {
  try {
    const url = 'https://m.land.naver.com/search/result/' + encodeURIComponent(keyword);

    const response = await fetchWithRetry(url);

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
 * 평형 필터링 (±3㎡ 오차 허용)
 * @param {Array} articles - 매물 목록
 * @param {number} targetArea - 목표 평형 (㎡)
 */
function filterByArea(articles, targetArea) {
  if (!targetArea || !Array.isArray(articles)) return articles;

  return articles.filter(article => {
    const area2 = parseFloat(article.area2) || 0;
    return Math.abs(area2 - targetArea) <= 3;
  });
}

/**
 * Express 핸들러
 */
async function naverRealestateHandler(req, res) {
  const { type, name, area, complexNo, tradeType, forceRefresh } = req.query;

  try {
    let result;

    switch (type) {
      case 'summary':
        if (!complexNo && !name) {
          return res.status(400).json({ success: false, error: 'complexNo or name required' });
        }
        // name으로 요청시 TARGET_COMPLEXES에서 찾기
        let targetComplex = null;
        if (!complexNo && name) {
          targetComplex = TARGET_COMPLEXES.find(c =>
            c.name.includes(name) || name.includes(c.name)
          );
          if (!targetComplex) {
            return res.status(404).json({ success: false, error: 'Complex not found in target list' });
          }
        } else {
          targetComplex = TARGET_COMPLEXES.find(c => c.complexNo === complexNo);
        }

        if (!targetComplex) {
          return res.status(404).json({ success: false, error: 'Complex not found' });
        }

        result = await fetchComplexSummary(targetComplex, parseInt(area) || 84);
        break;

      case 'articles':
        if (!complexNo) {
          return res.status(400).json({ success: false, error: 'complexNo required' });
        }
        const articleComplex = TARGET_COMPLEXES.find(c => c.complexNo === complexNo);
        if (!articleComplex) {
          return res.status(404).json({ success: false, error: 'Complex not found in target list' });
        }
        result = await fetchArticlesByCluster(articleComplex, tradeType || 'A1');
        break;

      case 'all':
        // forceRefresh가 true이면 캐시 무시하고 새로 조회
        if (forceRefresh === 'true') {
          cache.delete('all_complexes');
          console.log('[Naver] Force refresh - memory cache cleared');
          result = await fetchAllComplexes();
          // 시트에도 저장 (요약 + 매물상세)
          const today = new Date().toISOString().slice(0, 10);
          if (result.data && result.data.length > 0) {
            // 요약 저장
            const records = result.data.map(item => ({
              date: today,
              complexId: item.id,
              complexName: item.name,
              area: item.area,
              saleCount: item.sale?.count || 0,
              saleMin: item.sale?.minPrice || 0,
              saleMax: item.sale?.maxPrice || 0,
              jeonseCount: item.jeonse?.count || 0,
              jeonseMin: item.jeonse?.minPrice || 0,
              jeonseMax: item.jeonse?.maxPrice || 0,
              monthlyCount: item.monthly?.count || 0,
              updatedAt: new Date().toISOString(),
            }));
            try {
              await savePriceHistory(records);
            } catch (e) {
              console.error('[Naver] Failed to save summary after force refresh:', e.message);
            }

            // 매물상세 저장
            const articleDetails = [];
            for (const item of result.data) {
              // 매매
              if (item.sale?.articles) {
                for (const article of item.sale.articles) {
                  articleDetails.push({
                    date: today, complexId: item.id, complexName: item.name,
                    area: parseFloat(article.area2) || item.area, tradeType: '매매',
                    price: Math.round(parsePrice(article.dealOrWarrantPrc) / 10000),
                    deposit: '', monthlyRent: '', floor: article.floorInfo || '',
                    articleNo: article.articleNo, updatedAt: new Date().toISOString(),
                  });
                }
              }
              // 전세
              if (item.jeonse?.articles) {
                for (const article of item.jeonse.articles) {
                  articleDetails.push({
                    date: today, complexId: item.id, complexName: item.name,
                    area: parseFloat(article.area2) || item.area, tradeType: '전세',
                    price: '', deposit: Math.round(parsePrice(article.dealOrWarrantPrc) / 10000),
                    monthlyRent: '', floor: article.floorInfo || '',
                    articleNo: article.articleNo, updatedAt: new Date().toISOString(),
                  });
                }
              }
              // 월세
              if (item.monthly?.articles) {
                for (const article of item.monthly.articles) {
                  const priceStr = article.dealOrWarrantPrc || '';
                  let dep = 0, rent = 0;
                  const m = priceStr.match(/(.+?)\/(\d+)/);
                  if (m) { dep = Math.round(parsePrice(m[1]) / 10000); rent = parseInt(m[2]) || 0; }
                  else { dep = Math.round(parsePrice(priceStr) / 10000); }
                  articleDetails.push({
                    date: today, complexId: item.id, complexName: item.name,
                    area: parseFloat(article.area2) || item.area, tradeType: '월세',
                    price: '', deposit: dep, monthlyRent: rent, floor: article.floorInfo || '',
                    articleNo: article.articleNo, updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
            if (articleDetails.length > 0) {
              try {
                await saveArticleDetails(articleDetails);
                console.log(`[Naver] Force refresh saved ${articleDetails.length} article details`);
              } catch (e) {
                console.error('[Naver] Failed to save article details after force refresh:', e.message);
              }
            }
          }
        } else {
          // 일반 조회는 시트 캐시 사용
          result = await fetchAllComplexesWithSheetCache();
        }
        break;

      case 'history':
        // 시세 히스토리 조회 (요약)
        const { complexId, days } = req.query;
        const historyArea = parseInt(area) || null;
        const historyDays = parseInt(days) || 30;
        result = {
          success: true,
          data: await getPriceHistory(complexId, historyArea, historyDays),
        };
        break;

      case 'price-history':
        // 시세 히스토리 조회 (동향 그래프용)
        const { complexId: priceComplexId, area: priceArea, days: priceDays } = req.query;
        if (!priceComplexId) {
          return res.status(400).json({ success: false, error: 'complexId required' });
        }
        result = {
          success: true,
          data: await getPriceHistory(priceComplexId, parseInt(priceArea) || 84, parseInt(priceDays) || 30),
        };
        break;

      case 'article-history':
        // 매물상세 히스토리 조회
        const { complexId: artComplexId, tradeType: artTradeType, days: artDays } = req.query;
        result = {
          success: true,
          data: await getArticleDetailHistory(artComplexId, artTradeType, parseInt(artDays) || 30),
        };
        break;

      case 'search':
        if (!name) {
          return res.status(400).json({ success: false, error: 'name required' });
        }
        result = await searchComplex(name);
        break;

      case 'cache-status':
        // 캐시 상태 확인
        const cacheStatus = {};
        for (const [key, value] of cache.entries()) {
          cacheStatus[key] = {
            cachedAt: new Date(value.timestamp).toISOString(),
            age: Math.round((Date.now() - value.timestamp) / 1000 / 60) + '분',
            isStale: Date.now() - value.timestamp > CACHE_TTL,
          };
        }
        return res.json({ success: true, data: cacheStatus });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Use: summary, articles, all, search, history, article-history, cache-status'
        });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Naver] Handler error:', error);

    // 에러 발생 시에도 캐시된 데이터가 있으면 반환
    if (type === 'all') {
      const staleData = getCachedData('all_complexes');
      if (staleData) {
        console.log('[Naver] Returning stale cache due to error');
        return res.json({
          success: true,
          data: staleData.data,
          fromCache: true,
          isStale: staleData.isStale,
          cachedAt: staleData.cachedAt,
          error: error.message,
        });
      }
    }

    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  fetchArticles,
  fetchArticlesByMobileApi,
  fetchArticlesByCluster,
  fetchComplexSummary,
  fetchAllComplexes,
  fetchAllComplexesWithSheetCache,
  searchComplex,
  naverRealestateHandler,
  TARGET_COMPLEXES,
  getCachedData,
  filterByArea,
};
