/**
 * @context budget-dashboard / hooks / useHoldings.js
 * @purpose 보유종목 전용 훅 - 별도 시트에서 CRUD 관리
 * @role 조회, 추가, 수정, 삭제, 순서 변경 기능 제공
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Production: 환경변수 사용, Development: 상대경로 (vite proxy)
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export function useHoldings() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 변경이력 상태
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 중복 요청 방지
  const fetchingRef = useRef(false);
  const historyFetchingRef = useRef(false);

  // 보유종목 조회
  const fetchHoldings = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/holdings`);
      const json = await response.json();

      if (json.success) {
        setStocks(json.data);
        setError(null);
      } else {
        throw new Error(json.error || 'Failed to fetch holdings');
      }
    } catch (err) {
      console.error('Holdings fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // 종목 추가
  const addStock = useCallback(async (ticker, name, qty = 0, avgPrice = 0, account = '') => {
    try {
      const response = await fetch(`${API_BASE}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, name, qty, avgPrice, account }),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to add stock');
      }

      // 로컬 상태 업데이트
      setStocks(prev => [...prev, json.data]);
      return true;
    } catch (err) {
      console.error('Add holding error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // 종목 업데이트
  const updateStock = useCallback(async (ticker, updates) => {
    try {
      const response = await fetch(`${API_BASE}/holdings/${encodeURIComponent(ticker)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to update stock');
      }

      // 로컬 상태 업데이트
      setStocks(prev => prev.map(s => s.ticker === ticker ? { ...s, ...updates } : s));
      return true;
    } catch (err) {
      console.error('Update holding error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // 종목 삭제
  const removeStock = useCallback(async (ticker) => {
    try {
      const response = await fetch(`${API_BASE}/holdings/${encodeURIComponent(ticker)}`, {
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
      console.error('Remove holding error:', err);
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
      const response = await fetch(`${API_BASE}/holdings/order`, {
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
    fetchHoldings();
  }, [fetchHoldings]);

  // 변경이력 조회
  const fetchHistory = useCallback(async (limit = 100) => {
    if (historyFetchingRef.current) return;
    historyFetchingRef.current = true;

    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/history?limit=${limit}`);
      const json = await response.json();

      if (json.success) {
        setHistory(json.data || []);
      } else {
        console.error('History fetch failed:', json.error);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
      historyFetchingRef.current = false;
    }
  }, []);

  // 변경이력 새로고침
  const refetchHistory = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 변경이력 전체 초기화
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/history`, {
        method: 'DELETE',
      });
      const json = await response.json();

      if (json.success) {
        setHistory([]);
        return { success: true, deleted: json.deleted };
      } else {
        throw new Error(json.error || 'Failed to clear history');
      }
    } catch (err) {
      console.error('Clear history error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // 변경이력 개별 삭제
  const deleteHistoryItem = useCallback(async (rowIndex) => {
    try {
      const response = await fetch(`${API_BASE}/history/${rowIndex}`, {
        method: 'DELETE',
      });
      const json = await response.json();

      if (json.success) {
        // 로컬 상태에서도 제거
        setHistory(prev => prev.filter(item => item.rowIndex !== rowIndex));
        return { success: true };
      } else {
        throw new Error(json.error || 'Failed to delete history item');
      }
    } catch (err) {
      console.error('Delete history item error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    stocks,
    loading,
    error,
    addStock,
    updateStock,
    removeStock,
    reorderStocks,
    refetch,
    // 변경이력
    history,
    historyLoading,
    fetchHistory,
    refetchHistory,
    clearHistory,
    deleteHistoryItem,
  };
}

export default useHoldings;
