import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSheetData, updateSheet, appendToSheet, parseSheetToAppData } from '../services/sheetsApi';

export function useSheetData(initialMonth = null) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
      const [rawDate, category, name, amount, detail] = rawData[i];
      if (!rawDate || !category) continue;

      // 날짜 형식 통일: 점(.)을 하이픈(-)으로 변환
      const date = rawDate.replace('.', '-');
      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      if (!monthlyData[date]) {
        monthlyData[date] = { month: date, income: 0, expense: 0, saving: 0, investment: 0 };
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
      // 저축 (행위-저축)
      else if (category === '행위-저축') {
        monthlyData[date].saving += value;
      }
      // 투자 (행위-투자)
      else if (category === '행위-투자') {
        monthlyData[date].investment += value;
      }
    }

    // 배열로 변환 후 정렬
    return Object.values(monthlyData)
      .filter(d => d.income > 0 || d.expense > 0)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [rawData]);

  // 월별 카드값 히스토리
  const cardHistory = useMemo(() => {
    if (!rawData.length) return [];

    const cardData = {};

    for (let i = 1; i < rawData.length; i++) {
      const [rawDate, category, name, amount] = rawData[i];
      if (!rawDate || category !== '지출-카드') continue;

      const date = rawDate.replace('.', '-');
      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      cardData[date] = value;
    }

    return Object.entries(cardData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [rawData]);

  // 월별 계좌 잔고 히스토리 (전달 잔고 계산용)
  // 잔고통합 = 재호잔고 + 향화잔고 (적금, 채권 제외!)
  const balanceHistory = useMemo(() => {
    if (!rawData.length) return {};

    const balanceData = {};

    for (let i = 1; i < rawData.length; i++) {
      const [rawDate, category, name, amount] = rawData[i];
      if (!rawDate) continue;

      const date = rawDate.replace('-', '.');
      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      if (!balanceData[date]) {
        balanceData[date] = { 재호잔고: 0, 향화잔고: 0 };
      }

      // 자산-잔고만 수집 (적금, 채권 제외)
      if (category === '자산-잔고') {
        if (name.includes('재호')) balanceData[date].재호잔고 = value;
        else if (name.includes('향화')) balanceData[date].향화잔고 = value;
      }
    }

    return balanceData;
  }, [rawData]);

  // 월별 총 자산 히스토리 (순자산 증감 계산용)
  const assetsHistory = useMemo(() => {
    if (!rawData.length) return {};

    const assetsData = {};

    for (let i = 1; i < rawData.length; i++) {
      const [rawDate, category, name, amount] = rawData[i];
      if (!rawDate) continue;

      const date = rawDate.replace('-', '.');
      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

      if (!assetsData[date]) {
        assetsData[date] = { cash: 0, savings: 0, bonds: 0, stocks: 0 };
      }

      // 현금 (재호잔고, 향화잔고)
      if (category === '자산-잔고') {
        assetsData[date].cash += value;
      }
      // 저축 (적금)
      else if (category === '자산-저축') {
        assetsData[date].savings += value;
      }
      // 채권
      else if (category === '자산-채권') {
        assetsData[date].bonds += value;
      }
      // 주식 (주식계좌 or 투자)
      else if (category === '자산-주식계좌') {
        assetsData[date].stocks += value;
      }
      else if (category === '자산-투자') {
        // 레거시: 재호해외주식, 향화해외주식
        if (name.includes('해외주식')) {
          assetsData[date].stocks += value;
        }
      }
    }

    return assetsData;
  }, [rawData]);

  // 연간 지출 카테고리별 합계 (TOP 5용)
  const expenseByCategory = useMemo(() => {
    if (!rawData.length) return [];

    const categoryTotals = {};

    for (let i = 1; i < rawData.length; i++) {
      const [date, category, name, amount, detail] = rawData[i];
      if (!category?.startsWith('지출')) continue;

      // 고정지출 중 unchecked인 항목 제외
      if ((category === '지출-고정' || category === '지출-고정월납') && detail === 'unchecked') {
        continue;
      }

      const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;
      const key = name || category;
      categoryTotals[key] = (categoryTotals[key] || 0) + value;
    }

    const sorted = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = sorted.reduce((sum, i) => sum + i.amount, 0);

    return sorted.slice(0, 5).map(i => ({
      n: i.name,
      v: Math.round(i.amount / 10000),
      p: total ? Math.round(i.amount / total * 100) : 0
    }));
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
    cardHistory,
    balanceHistory,
    assetsHistory,
    expenseByCategory,
    reload: loadData,
    update,
    append,
  };
}
