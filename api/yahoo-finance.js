// Yahoo Finance 프록시 API
// 실시간 주가 데이터 조회 및 캐싱

// 메모리 캐시 (서버리스 함수 인스턴스 간 공유되지 않음)
const cache = {
  quotes: new Map(),  // ticker -> { data, timestamp }
  history: new Map(), // ticker -> { data, timestamp }
};

// 캐시 TTL (밀리초)
const CACHE_TTL = {
  quotes: 60 * 1000,      // 시세: 60초
  history: 5 * 60 * 1000, // 히스토리: 5분
};

// 데모 가격 (API 실패 시 폴백)
const DEMO_PRICES = {
  AAPL: { price: 195.0, change: 2.5, changePercent: 1.3, currency: 'USD' },
  NVDA: { price: 140.5, change: -3.2, changePercent: -2.2, currency: 'USD' },
  TSLA: { price: 248.0, change: 5.8, changePercent: 2.4, currency: 'USD' },
  MSFT: { price: 415.0, change: 3.1, changePercent: 0.75, currency: 'USD' },
  GOOGL: { price: 175.0, change: -1.2, changePercent: -0.68, currency: 'USD' },
  AMZN: { price: 185.0, change: 2.8, changePercent: 1.54, currency: 'USD' },
  META: { price: 520.0, change: 8.5, changePercent: 1.66, currency: 'USD' },
  AMD: { price: 125.0, change: -2.1, changePercent: -1.65, currency: 'USD' },
  INTC: { price: 22.0, change: 0.3, changePercent: 1.38, currency: 'USD' },
  PLTR: { price: 78.0, change: 4.2, changePercent: 5.69, currency: 'USD' },
  IONQ: { price: 42.0, change: 3.5, changePercent: 9.09, currency: 'USD' },
  RGTI: { price: 12.5, change: 1.2, changePercent: 10.62, currency: 'USD' },
  QBTS: { price: 8.5, change: 0.8, changePercent: 10.39, currency: 'USD' },
  QUBT: { price: 15.0, change: 2.1, changePercent: 16.28, currency: 'USD' },
  SOUN: { price: 22.0, change: 1.5, changePercent: 7.32, currency: 'USD' },
  RKLB: { price: 28.0, change: 2.3, changePercent: 8.95, currency: 'USD' },
  ACHR: { price: 9.5, change: 0.7, changePercent: 7.95, currency: 'USD' },
  MSTR: { price: 380.0, change: 15.0, changePercent: 4.11, currency: 'USD' },
};

// 캐시에서 데이터 조회
function getCached(type, key) {
  const cacheMap = type === 'quotes' ? cache.quotes : cache.history;
  const cached = cacheMap.get(key);

  if (!cached) return null;

  const now = Date.now();
  const ttl = CACHE_TTL[type];

  if (now - cached.timestamp > ttl) {
    cacheMap.delete(key);
    return null;
  }

  return cached.data;
}

// 캐시에 데이터 저장
function setCache(type, key, data) {
  const cacheMap = type === 'quotes' ? cache.quotes : cache.history;
  cacheMap.set(key, { data, timestamp: Date.now() });
}

// Yahoo Finance Chart API에서 데이터 조회
async function fetchYahooFinance(ticker, range = '7d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const json = await response.json();

  if (json.chart.error) {
    throw new Error(json.chart.error.description || 'Unknown Yahoo Finance error');
  }

  return json.chart.result[0];
}

// 주가 데이터 파싱
function parseQuoteData(result) {
  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp || [];

  // 현재가 정보
  const price = meta.regularMarketPrice || 0;
  const previousClose = meta.chartPreviousClose || meta.previousClose || price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  const currency = meta.currency || 'USD';

  // 히스토리 데이터 (스파크라인용)
  const history = [];
  if (timestamps.length && quote?.close) {
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close[i];
      if (close !== null && close !== undefined) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        history.push({ date, close: Number(close.toFixed(2)) });
      }
    }
  }

  // 프리마켓/애프터마켓 데이터 추출
  const preMarketPrice = meta.preMarketPrice || null;
  const preMarketChange = meta.preMarketChange || null;
  const preMarketChangePercent = meta.preMarketChangePercent || null;

  const postMarketPrice = meta.postMarketPrice || null;
  const postMarketChange = meta.postMarketChange || null;
  const postMarketChangePercent = meta.postMarketChangePercent || null;

  // 마켓 상태 결정
  const marketState = meta.marketState || 'CLOSED';

  return {
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    currency,
    history,
    previousClose: Number(previousClose.toFixed(2)),
    // 프리마켓 데이터
    preMarketPrice: preMarketPrice !== null ? Number(preMarketPrice.toFixed(2)) : null,
    preMarketChange: preMarketChange !== null ? Number(preMarketChange.toFixed(2)) : null,
    preMarketChangePercent: preMarketChangePercent !== null ? Number(preMarketChangePercent.toFixed(2)) : null,
    // 애프터마켓 데이터
    postMarketPrice: postMarketPrice !== null ? Number(postMarketPrice.toFixed(2)) : null,
    postMarketChange: postMarketChange !== null ? Number(postMarketChange.toFixed(2)) : null,
    postMarketChangePercent: postMarketChangePercent !== null ? Number(postMarketChangePercent.toFixed(2)) : null,
    // 마켓 상태: PRE, REGULAR, POST, CLOSED
    marketState,
  };
}

// 데모 데이터 생성 (히스토리 포함)
function generateDemoData(ticker) {
  const demo = DEMO_PRICES[ticker] || {
    price: 100.0,
    change: Math.random() * 10 - 5,
    changePercent: Math.random() * 5 - 2.5,
    currency: 'USD',
  };

  // 7일간 가상 히스토리 생성
  const history = [];
  let currentPrice = demo.price - demo.change;

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // 랜덤 변동 (-2% ~ +2%)
    const dailyChange = currentPrice * (Math.random() * 0.04 - 0.02);
    currentPrice = i === 0 ? demo.price : currentPrice + dailyChange;

    history.push({
      date: date.toISOString().split('T')[0],
      close: Number(currentPrice.toFixed(2)),
    });
  }

  return {
    ...demo,
    history,
    previousClose: Number((demo.price - demo.change).toFixed(2)),
    isDemo: true,
  };
}

// 단일 티커 데이터 조회
async function getTickerData(ticker, range) {
  // 1. 캐시 확인
  const cachedQuote = getCached('quotes', ticker);
  const cachedHistory = getCached('history', `${ticker}_${range}`);

  if (cachedQuote && cachedHistory) {
    return { ...cachedQuote, history: cachedHistory };
  }

  // 2. Yahoo Finance API 호출
  try {
    const result = await fetchYahooFinance(ticker, range);
    const parsed = parseQuoteData(result);

    // 캐시 저장 (프리/애프터마켓 데이터 포함)
    setCache('quotes', ticker, {
      price: parsed.price,
      change: parsed.change,
      changePercent: parsed.changePercent,
      currency: parsed.currency,
      previousClose: parsed.previousClose,
      preMarketPrice: parsed.preMarketPrice,
      preMarketChange: parsed.preMarketChange,
      preMarketChangePercent: parsed.preMarketChangePercent,
      postMarketPrice: parsed.postMarketPrice,
      postMarketChange: parsed.postMarketChange,
      postMarketChangePercent: parsed.postMarketChangePercent,
      marketState: parsed.marketState,
    });
    setCache('history', `${ticker}_${range}`, parsed.history);

    return parsed;
  } catch (error) {
    console.error(`Failed to fetch ${ticker}:`, error.message);

    // 3. 캐시된 데이터가 있으면 만료되었어도 반환
    if (cachedQuote) {
      return {
        ...cachedQuote,
        history: cachedHistory || [],
        stale: true,
      };
    }

    // 4. 데모 데이터 반환
    return generateDemoData(ticker);
  }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tickers, range = '7d' } = req.query;

    if (!tickers) {
      return res.status(400).json({
        success: false,
        error: 'tickers parameter required (comma-separated)',
      });
    }

    // 티커 파싱 및 정규화
    const tickerList = tickers
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0)
      .slice(0, 20); // 최대 20개 티커

    if (tickerList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid tickers provided',
      });
    }

    // 병렬로 모든 티커 데이터 조회
    const results = await Promise.allSettled(
      tickerList.map(ticker => getTickerData(ticker, range))
    );

    // 결과 조합
    const data = {};
    tickerList.forEach((ticker, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        data[ticker] = result.value;
      } else {
        // 실패 시 데모 데이터
        data[ticker] = generateDemoData(ticker);
      }
    });

    return res.json({
      success: true,
      data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
