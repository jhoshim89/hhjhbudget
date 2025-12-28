/**
 * 국토교통부 실거래가 API 연동
 * 공공데이터포털: https://www.data.go.kr/data/15126469/openapi.do
 */

const MOLIT_API_KEY = process.env.MOLIT_API_KEY;

// API 엔드포인트
const API_ENDPOINTS = {
  // 아파트 매매 실거래가
  aptTrade: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  // 아파트 전월세
  aptRent: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
};

// 캐시 (5분)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 아파트 매매 실거래가 조회
 * @param {string} regionCode - 법정동코드 앞 5자리 (예: 11680 = 강남구)
 * @param {string} yearMonth - 거래년월 6자리 (예: 202501)
 * @param {string} aptName - 아파트명 필터 (선택)
 */
async function fetchAptTradeHistory(regionCode, yearMonth, aptName = null) {
  const cacheKey = `trade_${regionCode}_${yearMonth}`;

  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const data = cached.data;
    return aptName ? filterByAptName(data, aptName) : data;
  }

  try {
    const url = new URL(API_ENDPOINTS.aptTrade);
    url.searchParams.append('serviceKey', MOLIT_API_KEY);
    url.searchParams.append('LAWD_CD', regionCode);
    url.searchParams.append('DEAL_YMD', yearMonth);
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('numOfRows', '1000');

    console.log(`[MOLIT API] Fetching apt trade: ${regionCode} / ${yearMonth}`);

    const response = await fetch(url.toString());
    const text = await response.text();

    // XML 파싱
    const items = parseXMLResponse(text);

    // 데이터 정규화
    const normalized = items.map(item => ({
      aptName: item.aptNm || item.아파트,
      area: parseFloat(item.excluUseAr || item.전용면적) || 0,
      floor: parseInt(item.floor || item.층) || 0,
      dealAmount: parseAmount(item.dealAmount || item.거래금액),
      dealYear: item.dealYear || item.년,
      dealMonth: item.dealMonth || item.월,
      dealDay: item.dealDay || item.일,
      buildYear: item.buildYear || item.건축년도,
      jibun: item.jibun || item.지번,
      dong: item.umdNm || item.법정동,
      dealType: item.dealType || '매매',
    }));

    // 캐시 저장
    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });

    return aptName ? filterByAptName(normalized, aptName) : normalized;
  } catch (error) {
    console.error('[MOLIT API] Error fetching apt trade:', error.message);
    throw error;
  }
}

/**
 * 아파트 전월세 실거래가 조회
 * @param {string} regionCode - 법정동코드 앞 5자리
 * @param {string} yearMonth - 거래년월 6자리
 * @param {string} aptName - 아파트명 필터 (선택)
 */
async function fetchAptRentHistory(regionCode, yearMonth, aptName = null) {
  const cacheKey = `rent_${regionCode}_${yearMonth}`;

  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const data = cached.data;
    return aptName ? filterByAptName(data, aptName) : data;
  }

  try {
    const url = new URL(API_ENDPOINTS.aptRent);
    url.searchParams.append('serviceKey', MOLIT_API_KEY);
    url.searchParams.append('LAWD_CD', regionCode);
    url.searchParams.append('DEAL_YMD', yearMonth);
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('numOfRows', '1000');

    console.log(`[MOLIT API] Fetching apt rent: ${regionCode} / ${yearMonth}`);

    const response = await fetch(url.toString());
    const text = await response.text();

    // XML 파싱
    const items = parseXMLResponse(text);

    // 데이터 정규화
    const normalized = items.map(item => ({
      aptName: item.aptNm || item.아파트,
      area: parseFloat(item.excluUseAr || item.전용면적) || 0,
      floor: parseInt(item.floor || item.층) || 0,
      deposit: parseAmount(item.deposit || item.보증금액),
      monthlyRent: parseAmount(item.monthlyRent || item.월세금액),
      dealYear: item.dealYear || item.년,
      dealMonth: item.dealMonth || item.월,
      dealDay: item.dealDay || item.일,
      buildYear: item.buildYear || item.건축년도,
      dong: item.umdNm || item.법정동,
      contractType: item.contractType || (item.monthlyRent > 0 ? '월세' : '전세'),
    }));

    // 캐시 저장
    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });

    return aptName ? filterByAptName(normalized, aptName) : normalized;
  } catch (error) {
    console.error('[MOLIT API] Error fetching apt rent:', error.message);
    throw error;
  }
}

/**
 * 특정 아파트의 실거래가 통계
 * @param {string} regionCode - 지역코드
 * @param {string} aptName - 아파트명
 * @param {string} area - 전용면적 (예: "84")
 * @param {number} months - 조회할 개월 수 (기본 12개월)
 */
async function getAptPriceStats(regionCode, aptName, area, months = 12) {
  const trades = [];
  const rents = [];

  // 최근 N개월 데이터 수집
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    try {
      const tradeData = await fetchAptTradeHistory(regionCode, yearMonth, aptName);
      const rentData = await fetchAptRentHistory(regionCode, yearMonth, aptName);

      // 면적 필터링
      const areaNum = parseFloat(area);
      const areaMin = areaNum - 5;
      const areaMax = areaNum + 5;

      trades.push(...tradeData.filter(t => t.area >= areaMin && t.area <= areaMax));
      rents.push(...rentData.filter(r => r.area >= areaMin && r.area <= areaMax));
    } catch (err) {
      console.warn(`[MOLIT API] Failed to fetch ${yearMonth}:`, err.message);
    }
  }

  // 통계 계산
  const tradeAmounts = trades.map(t => t.dealAmount).filter(a => a > 0);
  const jeonseAmounts = rents.filter(r => r.monthlyRent === 0).map(r => r.deposit).filter(a => a > 0);
  const monthlyRents = rents.filter(r => r.monthlyRent > 0);

  return {
    aptName,
    area,
    regionCode,
    period: `${months}개월`,
    trade: {
      count: tradeAmounts.length,
      avg: tradeAmounts.length > 0 ? Math.round(average(tradeAmounts)) : 0,
      min: tradeAmounts.length > 0 ? Math.min(...tradeAmounts) : 0,
      max: tradeAmounts.length > 0 ? Math.max(...tradeAmounts) : 0,
      recent: trades.slice(0, 5),
    },
    jeonse: {
      count: jeonseAmounts.length,
      avg: jeonseAmounts.length > 0 ? Math.round(average(jeonseAmounts)) : 0,
      min: jeonseAmounts.length > 0 ? Math.min(...jeonseAmounts) : 0,
      max: jeonseAmounts.length > 0 ? Math.max(...jeonseAmounts) : 0,
    },
    monthly: {
      count: monthlyRents.length,
      avgDeposit: monthlyRents.length > 0 ? Math.round(average(monthlyRents.map(r => r.deposit))) : 0,
      avgRent: monthlyRents.length > 0 ? Math.round(average(monthlyRents.map(r => r.monthlyRent))) : 0,
    },
  };
}

// === 유틸리티 함수 ===

function parseXMLResponse(xmlText) {
  const items = [];

  // 간단한 XML 파싱 (item 태그 추출)
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return items;

  for (const itemXml of itemMatches) {
    const item = {};
    // 각 태그 추출
    const tagMatches = itemXml.match(/<([^>]+)>([^<]*)<\/\1>/g);
    if (tagMatches) {
      for (const tagMatch of tagMatches) {
        const [, tagName, value] = tagMatch.match(/<([^>]+)>([^<]*)<\/\1>/) || [];
        if (tagName && value) {
          item[tagName] = value.trim();
        }
      }
    }
    items.push(item);
  }

  return items;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // "12,500" 또는 "125000" 형태 처리
  const cleaned = String(amountStr).replace(/,/g, '').trim();
  const num = parseInt(cleaned) || 0;
  // 만원 단위인 경우 원 단위로 변환
  return num < 1000000 ? num * 10000 : num;
}

function filterByAptName(data, aptName) {
  const searchName = aptName.toLowerCase().replace(/\s/g, '');
  return data.filter(item => {
    const itemName = (item.aptName || '').toLowerCase().replace(/\s/g, '');
    return itemName.includes(searchName) || searchName.includes(itemName);
  });
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Express 핸들러
async function molitApiHandler(req, res) {
  const { type, regionCode, yearMonth, aptName, area, months } = req.query;

  if (!MOLIT_API_KEY) {
    return res.status(500).json({ success: false, error: 'MOLIT_API_KEY not configured' });
  }

  try {
    let data;

    switch (type) {
      case 'trade':
        if (!regionCode || !yearMonth) {
          return res.status(400).json({ success: false, error: 'regionCode and yearMonth required' });
        }
        data = await fetchAptTradeHistory(regionCode, yearMonth, aptName);
        break;

      case 'rent':
        if (!regionCode || !yearMonth) {
          return res.status(400).json({ success: false, error: 'regionCode and yearMonth required' });
        }
        data = await fetchAptRentHistory(regionCode, yearMonth, aptName);
        break;

      case 'stats':
        if (!regionCode || !aptName || !area) {
          return res.status(400).json({ success: false, error: 'regionCode, aptName, and area required' });
        }
        data = await getAptPriceStats(regionCode, aptName, area, parseInt(months) || 12);
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid type. Use: trade, rent, stats' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[MOLIT API] Handler error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  fetchAptTradeHistory,
  fetchAptRentHistory,
  getAptPriceStats,
  molitApiHandler,
};
