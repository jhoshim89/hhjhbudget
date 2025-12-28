/**
 * Yahoo Finance API 프록시
 * 실시간 주가 데이터 조회 및 캐싱
 */

// 메모리 캐시
const cache = {
  quotes: new Map(),
  history: new Map(),
};

// 캐시 TTL (밀리초)
const CACHE_TTL = {
  quotes: 60 * 1000,      // 시세: 60초
  history: 5 * 60 * 1000, // 히스토리: 5분
};

// 데모 가격 (API 실패 시 폴백)
const DEMO_PRICES = {
  // 환율
  'KRW=X': { price: 1450.0, change: 5.2, changePercent: 0.36, currency: 'KRW' },
  // 크립토
  'BTC-USD': { price: 95000.0, change: 1250.0, changePercent: 1.33, currency: 'USD' },
  'ETH-USD': { price: 3350.0, change: 45.0, changePercent: 1.36, currency: 'USD' },
  // 빅테크
  AAPL: { price: 195.0, change: 2.5, changePercent: 1.3, currency: 'USD' },
  NVDA: { price: 140.5, change: -3.2, changePercent: -2.2, currency: 'USD' },
  TSLA: { price: 248.0, change: 5.8, changePercent: 2.4, currency: 'USD' },
  MSFT: { price: 415.0, change: 3.1, changePercent: 0.75, currency: 'USD' },
  GOOGL: { price: 175.0, change: -1.2, changePercent: -0.68, currency: 'USD' },
  GOOG: { price: 176.0, change: -1.0, changePercent: -0.56, currency: 'USD' },
  AMZN: { price: 185.0, change: 2.8, changePercent: 1.54, currency: 'USD' },
  META: { price: 520.0, change: 8.5, changePercent: 1.66, currency: 'USD' },
  AVGO: { price: 225.0, change: 4.5, changePercent: 2.04, currency: 'USD' },
  TSM: { price: 195.0, change: 3.2, changePercent: 1.67, currency: 'USD' },
  // ETF
  SPY: { price: 595.0, change: 3.5, changePercent: 0.59, currency: 'USD' },
  QQQ: { price: 480.0, change: 4.2, changePercent: 0.88, currency: 'USD' },
  SCHD: { price: 82.0, change: 0.3, changePercent: 0.37, currency: 'USD' },
  TQQQ: { price: 72.0, change: 1.8, changePercent: 2.56, currency: 'USD' },
  VOO: { price: 545.0, change: 3.2, changePercent: 0.59, currency: 'USD' },
  // 성장주
  PLTR: { price: 78.0, change: 4.2, changePercent: 5.69, currency: 'USD' },
  AMD: { price: 125.0, change: -2.1, changePercent: -1.65, currency: 'USD' },
  INTC: { price: 22.0, change: 0.3, changePercent: 1.38, currency: 'USD' },
  COIN: { price: 265.0, change: 8.5, changePercent: 3.31, currency: 'USD' },
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;

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

// 주가 데이터 파싱 (OHLC 포함)
function parseQuoteData(result) {
  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp || [];

  // 현재가 정보 (전일 종가 대비)
  const price = meta.regularMarketPrice || 0;
  const previousClose = meta.regularMarketPreviousClose || meta.previousClose || price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  const currency = meta.currency || 'USD';

  // 히스토리 데이터 (OHLC 캔들스틱용)
  const history = [];
  if (timestamps.length && quote?.close) {
    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close[i];

      if (close !== null && close !== undefined) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        history.push({
          date,
          time: timestamps[i], // Unix timestamp for lightweight-charts
          open: open !== null ? Number(open.toFixed(4)) : Number(close.toFixed(4)),
          high: high !== null ? Number(high.toFixed(4)) : Number(close.toFixed(4)),
          low: low !== null ? Number(low.toFixed(4)) : Number(close.toFixed(4)),
          close: Number(close.toFixed(4)),
        });
      }
    }
  }

  return {
    price: Number(price.toFixed(4)),
    change: Number(change.toFixed(4)),
    changePercent: Number(changePercent.toFixed(2)),
    currency,
    history,
    previousClose: Number(previousClose.toFixed(4)),
  };
}

// 데모 데이터 생성 (OHLC 히스토리 포함)
function generateDemoData(ticker) {
  const demo = DEMO_PRICES[ticker] || {
    price: 100.0,
    change: Math.random() * 10 - 5,
    changePercent: Math.random() * 5 - 2.5,
    currency: 'USD',
  };

  // 7일간 가상 OHLC 히스토리 생성
  const history = [];
  let currentClose = demo.price - demo.change;

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const timestamp = Math.floor(date.getTime() / 1000);

    // 랜덤 변동 (-2% ~ +2%)
    const dailyChange = currentClose * (Math.random() * 0.04 - 0.02);
    const close = i === 0 ? demo.price : currentClose + dailyChange;

    // OHLC 생성 (close 기준 ±1.5% 범위)
    const volatility = close * 0.015;
    const open = close + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    history.push({
      date: date.toISOString().split('T')[0],
      time: timestamp,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
    });

    currentClose = close;
  }

  return {
    ...demo,
    history,
    previousClose: Number((demo.price - demo.change).toFixed(4)),
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

    // 캐시 저장
    setCache('quotes', ticker, {
      price: parsed.price,
      change: parsed.change,
      changePercent: parsed.changePercent,
      currency: parsed.currency,
      previousClose: parsed.previousClose,
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

// Express 라우터 핸들러
async function yahooFinanceHandler(req, res) {
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

    console.log(`Fetching Yahoo Finance data for: ${tickerList.join(', ')}`);

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

module.exports = { yahooFinanceHandler };
