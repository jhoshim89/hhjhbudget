import { useState, useEffect, useCallback, useRef } from 'react';

// API 기본 경로
const API_BASE = '/api';

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
  // 반도체
  AMD: { price: 125.0, change: -2.1, changePercent: -1.65, currency: 'USD' },
  INTC: { price: 22.0, change: 0.3, changePercent: 1.38, currency: 'USD' },
  // ETF
  SPY: { price: 595.0, change: 3.5, changePercent: 0.59, currency: 'USD' },
  QQQ: { price: 480.0, change: 4.2, changePercent: 0.88, currency: 'USD' },
  SCHD: { price: 82.0, change: 0.3, changePercent: 0.37, currency: 'USD' },
  TQQQ: { price: 72.0, change: 1.8, changePercent: 2.56, currency: 'USD' },
  VOO: { price: 545.0, change: 3.2, changePercent: 0.59, currency: 'USD' },
  // 성장주
  PLTR: { price: 78.0, change: 4.2, changePercent: 5.69, currency: 'USD' },
  IONQ: { price: 42.0, change: 3.5, changePercent: 9.09, currency: 'USD' },
  RGTI: { price: 12.5, change: 1.2, changePercent: 10.62, currency: 'USD' },
  QBTS: { price: 8.5, change: 0.8, changePercent: 10.39, currency: 'USD' },
  QUBT: { price: 15.0, change: 2.1, changePercent: 16.28, currency: 'USD' },
  SOUN: { price: 22.0, change: 1.5, changePercent: 7.32, currency: 'USD' },
  RKLB: { price: 28.0, change: 2.3, changePercent: 8.95, currency: 'USD' },
  ACHR: { price: 9.5, change: 0.7, changePercent: 7.95, currency: 'USD' },
  MSTR: { price: 380.0, change: 15.0, changePercent: 4.11, currency: 'USD' },
  COIN: { price: 265.0, change: 8.5, changePercent: 3.31, currency: 'USD' },
};

// 데모 히스토리 생성
function generateDemoHistory(basePrice, days = 7) {
  const history = [];
  let currentPrice = basePrice * 0.95; // 시작가는 현재가의 95%

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // 랜덤 변동 (-2% ~ +3%)
    const dailyChange = currentPrice * (Math.random() * 0.05 - 0.02);
    currentPrice = i === 0 ? basePrice : currentPrice + dailyChange;

    history.push({
      date: date.toISOString().split('T')[0],
      close: Number(currentPrice.toFixed(2)),
    });
  }

  return history;
}

// 데모 데이터 생성
function getDemoData(ticker) {
  const demo = DEMO_PRICES[ticker] || {
    price: 100.0,
    change: Math.random() * 10 - 5,
    changePercent: Math.random() * 5 - 2.5,
    currency: 'USD',
  };

  return {
    ...demo,
    history: generateDemoHistory(demo.price),
    isDemo: true,
  };
}

/**
 * Yahoo Finance 데이터 조회 커스텀 훅
 * @param {string[]} tickers - 조회할 티커 배열 (예: ['AAPL', 'NVDA'])
 * @param {Object} options - 옵션
 * @param {number} options.refreshInterval - 자동 새로고침 간격 (밀리초, 기본값: 60000)
 * @param {string} options.range - 히스토리 범위 (기본값: '7d')
 * @param {boolean} options.enabled - 데이터 조회 활성화 여부 (기본값: true)
 * @returns {Object} { data, loading, error, lastUpdated, refetch }
 */
export function useYahooFinance(tickers = [], options = {}) {
  const {
    refreshInterval = 60000, // 기본 60초
    range = '7d',
    enabled = true,
  } = options;

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 이전 티커 목록 및 range 추적 (불필요한 재요청 방지)
  const prevTickersRef = useRef([]);
  const prevRangeRef = useRef(range);
  const intervalRef = useRef(null);

  // 데이터 조회 함수
  const fetchData = useCallback(async (tickerList) => {
    if (!tickerList || tickerList.length === 0) {
      setData({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tickersParam = tickerList.join(',');
      const url = `${API_BASE}/yahoo-finance?tickers=${encodeURIComponent(tickersParam)}&range=${range}`;

      const response = await fetch(url);
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch stock data');
      }

      setData(json.data);
      setLastUpdated(new Date(json.lastUpdated));
    } catch (err) {
      console.error('Yahoo Finance fetch error:', err);
      setError(err.message);

      // 에러 시 데모 데이터로 폴백
      const demoData = {};
      tickerList.forEach(ticker => {
        demoData[ticker] = getDemoData(ticker);
      });
      setData(demoData);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [range]);

  // 수동 새로고침
  const refetch = useCallback(() => {
    if (tickers.length > 0) {
      fetchData(tickers);
    }
  }, [tickers, fetchData]);

  // 티커 또는 range 변경 시 데이터 조회
  useEffect(() => {
    if (!enabled) return;

    // 티커 목록이 변경되었는지 확인
    const tickersChanged =
      tickers.length !== prevTickersRef.current.length ||
      tickers.some((t, i) => t !== prevTickersRef.current[i]);

    // range가 변경되었는지 확인
    const rangeChanged = range !== prevRangeRef.current;

    if ((tickersChanged || rangeChanged) && tickers.length > 0) {
      prevTickersRef.current = [...tickers];
      prevRangeRef.current = range;
      fetchData(tickers);
    }
  }, [tickers, range, enabled, fetchData]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || tickers.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchData(tickers);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tickers, refreshInterval, enabled, fetchData]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}

/**
 * 단일 티커 조회 헬퍼 함수
 * @param {string} ticker - 조회할 티커
 * @param {Object} options - 옵션
 * @returns {Object} { data, loading, error, lastUpdated, refetch }
 */
export function useSingleStock(ticker, options = {}) {
  const tickers = ticker ? [ticker] : [];
  const result = useYahooFinance(tickers, options);

  return {
    ...result,
    data: ticker ? result.data[ticker] : null,
  };
}

export default useYahooFinance;
