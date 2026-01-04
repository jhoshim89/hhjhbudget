/**
 * 네이버 부동산 API (Railway Proxy)
 *
 * @description
 * - Railway 백엔드로 프록시하여 IP 차단 우회
 * - Vercel Edge Cache + stale-while-revalidate
 */

const RAILWAY_API_URL = process.env.RAILWAY_API_URL || 'https://hhjhbudget-production.up.railway.app';

const CONFIG = {
  CACHE_TTL: 6 * 60 * 60,         // 6시간 (초)
  STALE_TTL: 24 * 60 * 60,        // 24시간 (stale-while-revalidate)
  REQUEST_TIMEOUT: 55000,          // 55초 (Vercel 60초 제한)
};

// 대상 단지 목록 (클라이언트용)
const TARGET_COMPLEXES = [
  {
    id: 'forena-songpa',
    name: '포레나송파',
    complexNo: '139917',
    region: '서울 송파구 거여동',
    areas: [80, 84],
    isMine: true,
    householdCount: 1282,
  },
  {
    id: 'the-beach-prugio-summit',
    name: '더비치푸르지오써밋',
    complexNo: '161501',
    region: '부산 남구 대연동',
    areas: [84],
    householdCount: 1384,
  },
  {
    id: 'daeyeon-lotte-castle',
    name: '대연롯데캐슬레전드',
    complexNo: '109359',
    region: '부산 남구 대연동',
    areas: [84],
    householdCount: 3149,
  },
  {
    id: 'the-sharp-namcheon',
    name: '더샵남천프레스티지',
    complexNo: '127133',
    region: '부산 수영구 남천동',
    areas: [84],
    householdCount: 975,
  },
  {
    id: 'daeyeon-hillstate-prugio',
    name: '대연힐스테이트푸르지오',
    complexNo: '105323',
    region: '부산 남구 대연동',
    areas: [84],
    householdCount: 2100,
  },
];

/**
 * Railway API로 프록시
 */
async function proxyToRailway(path) {
  const url = `${RAILWAY_API_URL}/api/naver-realestate${path}`;
  console.log(`[Proxy] Forwarding to: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Railway responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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
        // Railway로 프록시
        const queryParams = forceRefresh === 'true' ? '?type=all&forceRefresh=true' : '?type=all';
        result = await proxyToRailway(queryParams);
        break;

      case 'summary':
        if (!complexNo) {
          return res.status(400).json({
            success: false,
            error: 'complexNo is required'
          });
        }
        result = await proxyToRailway(`?type=summary&complexNo=${complexNo}&area=${area || 84}`);
        break;

      case 'complexes':
        // 단지 목록은 로컬에서 반환 (프록시 불필요)
        result = {
          success: true,
          data: TARGET_COMPLEXES,
        };
        break;

      case 'health':
        // 헬스체크
        result = {
          success: true,
          message: 'OK',
          railwayUrl: RAILWAY_API_URL,
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
        source: type === 'complexes' ? 'local' : 'railway',
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
