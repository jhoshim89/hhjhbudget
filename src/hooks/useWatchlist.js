/**
 * @context budget-dashboard / hooks / useWatchlist.js
 * @purpose 관심종목 전용 훅 - 별도 시트에서 CRUD 관리
 * @role 조회, 추가, 삭제, 순서 변경 기능 제공
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Production: 환경변수 사용, Development: 상대경로 (vite proxy)
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export function useWatchlist() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 중복 요청 방지
  const fetchingRef = useRef(false);

  // 관심종목 조회
  const fetchWatchlist = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/watchlist`);
      const json = await response.json();

      if (json.success) {
        setStocks(json.data);
        setError(null);
      } else {
        throw new Error(json.error || 'Failed to fetch watchlist');
      }
    } catch (err) {
      console.error('Watchlist fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // 종목 추가
  const addStock = useCallback(async (ticker, name) => {
    try {
      const response = await fetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, name }),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to add stock');
      }

      // 로컬 상태 업데이트 (서버 재조회 대신)
      setStocks(prev => [...prev, { ticker, name, order: prev.length + 1 }]);
      return true;
    } catch (err) {
      console.error('Add stock error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // 종목 삭제
  const removeStock = useCallback(async (ticker) => {
    try {
      const response = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to remove stock');
      }

      // 로컬 상태 업데이트
      setStocks(prev => prev.filter(s => s.ticker !== ticker));
      return true;
    } catch (err) {
      console.error('Remove stock error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // 순서 변경
  const reorderStocks = useCallback(async (newOrder) => {
    // 즉시 UI 업데이트 (낙관적 업데이트)
    const previousStocks = [...stocks];
    setStocks(newOrder);

    try {
      const response = await fetch(`${API_BASE}/watchlist/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks: newOrder }),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to save order');
      }

      return true;
    } catch (err) {
      console.error('Reorder error:', err);
      setError(err.message);
      // 실패 시 롤백
      setStocks(previousStocks);
      return false;
    }
  }, [stocks]);

  // 새로고침
  const refetch = useCallback(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return {
    stocks,
    loading,
    error,
    addStock,
    removeStock,
    reorderStocks,
    refetch,
  };
}

export default useWatchlist;
