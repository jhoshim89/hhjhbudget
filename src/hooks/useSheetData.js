import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSheetData, updateSheet, appendToSheet, parseSheetToAppData } from '../services/sheetsApi';

export function useSheetData(initialMonth = null) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || new Date().toISOString().slice(0, 7)
  );

  // 전체 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchSheetData();
      setRawData(rows);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load sheet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 선택된 월의 파싱된 데이터
  const data = useMemo(() => {
    if (!rawData.length) return null;
    return parseSheetToAppData(rawData, selectedMonth);
  }, [rawData, selectedMonth]);

  // 사용 가능한 월 목록
  const availableMonths = useMemo(() => {
    const months = new Set();
    rawData.slice(1).forEach(row => {
      if (row[0]) months.add(row[0]);
    });
    return Array.from(months).sort().reverse();
  }, [rawData]);

  // 월별 투자 히스토리 (벤치마크 비교용)
  const investmentHistory = useMemo(() => {
    if (!rawData.length) return [];

    const monthlyData = {};

    // 모든 행을 순회하며 월별 투자 데이터 수집
    for (let i = 1; i < rawData.length; i++) {
      const [date, category, name, amount] = rawData[i];
      if (!date || !category) continue;

      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      if (!monthlyData[date]) {
        monthlyData[date] = { month: date, 재호: 0, 향화: 0, 원금: 0, total: 0 };
      }

      // 자산-투자 카테고리 처리
      if (category === '자산-투자') {
        if (name.includes('재호') && name.includes('해외주식')) {
          monthlyData[date].재호 = value;
        } else if (name.includes('향화') && name.includes('해외주식')) {
          monthlyData[date].향화 = value;
        } else if (name.includes('투자') && name.includes('원금')) {
          monthlyData[date].원금 = value;
        }
      }
    }

    // total 계산 및 배열로 변환
    return Object.values(monthlyData)
      .map(d => ({ ...d, total: d.재호 + d.향화 }))
      .filter(d => d.total > 0)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [rawData]);

  // 월별 수입/지출 히스토리 (총괄 차트용)
  const monthlyHistory = useMemo(() => {
    if (!rawData.length) return [];

    const monthlyData = {};

    // 모든 행을 순회하며 월별 수입/지출 데이터 수집
    for (let i = 1; i < rawData.length; i++) {
      const [date, category, name, amount, detail] = rawData[i];
      if (!date || !category) continue;

      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      if (!monthlyData[date]) {
        monthlyData[date] = { month: date, income: 0, expense: 0 };
      }

      // 수입 카테고리 (새 형식 + 레거시)
      // 새: 수입-고정, 수입-변동 / 레거시: 수입 (고정수입, 변동수입)
      if (category === '수입-고정' || category === '수입-변동' || category === '수입') {
        monthlyData[date].income += value;
      }
      // 지출 - 카드 (지출-카드만 사용, "지출" 카테고리의 카드값은 중복이므로 무시)
      else if (category === '지출-카드') {
        monthlyData[date].expense += value;
      }
      // 지출 - 변동 (새: 지출-변동 / 레거시: 지출-변동생활)
      else if (category === '지출-변동' || category === '지출-변동생활') {
        monthlyData[date].expense += value;
      }
      // 지출 - 고정/월납/연납 (새: 지출-고정 / 레거시: 지출-고정월납, 지출-연납)
      else if (category === '지출-고정' || category === '지출-고정월납' || category === '지출-연납') {
        if (detail !== 'unchecked') {
          monthlyData[date].expense += value;
        }
      }
    }

    // 배열로 변환 후 정렬
    return Object.values(monthlyData)
      .filter(d => d.income > 0 || d.expense > 0)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [rawData]);

  // 데이터 업데이트
  const update = useCallback(async (range, values) => {
    try {
      await updateSheet(range, values);
      await loadData();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update sheet:', err);
      return false;
    }
  }, [loadData]);

  // 데이터 추가
  const append = useCallback(async (values) => {
    try {
      await appendToSheet('A:E', values);
      await loadData();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Failed to append sheet:', err);
      return false;
    }
  }, [loadData]);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    rawData,
    data,
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    investmentHistory,
    monthlyHistory,
    reload: loadData,
    update,
    append,
  };
}
