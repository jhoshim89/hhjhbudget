import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchRealEstateData,
  addWatchProperty as apiAddWatch,
  addMyProperty as apiAddMy,
  addLoan as apiAddLoan,
  addPriceRecord as apiAddPrice,
  updateRealEstate as apiUpdate,
  deleteRealEstate as apiDelete,
} from '../services/realEstateApi';

export function useRealEstate() {
  const [data, setData] = useState({
    watchProperties: [],
    myProperties: [],
    loans: [],
    priceHistory: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchRealEstateData();
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load real estate data:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // === 관심 부동산 ===
  const addWatch = useCallback(async ({ name, area, regionCode, address }) => {
    try {
      const result = await apiAddWatch({ name, area, regionCode, address });
      setData(prev => ({
        ...prev,
        watchProperties: [...prev.watchProperties, result],
      }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeWatch = useCallback(async (id) => {
    try {
      await apiDelete(id);
      setData(prev => ({
        ...prev,
        watchProperties: prev.watchProperties.filter(p => p.id !== id),
        priceHistory: { ...prev.priceHistory, [id]: undefined },
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // === 내 부동산 ===
  const addProperty = useCallback(async ({ name, area, purchasePrice, purchaseDate, currentValue }) => {
    try {
      const result = await apiAddMy({ name, area, purchasePrice, purchaseDate, currentValue });
      setData(prev => ({
        ...prev,
        myProperties: [...prev.myProperties, result],
      }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateProperty = useCallback(async (id, updates) => {
    try {
      const result = await apiUpdate(id, updates);
      setData(prev => ({
        ...prev,
        myProperties: prev.myProperties.map(p => p.id === id ? { ...p, ...updates } : p),
      }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeProperty = useCallback(async (id) => {
    try {
      // 연결된 대출도 함께 삭제
      const linkedLoans = data.loans.filter(l => l.propertyId === id);
      for (const loan of linkedLoans) {
        await apiDelete(loan.id);
      }
      await apiDelete(id);

      setData(prev => ({
        ...prev,
        myProperties: prev.myProperties.filter(p => p.id !== id),
        loans: prev.loans.filter(l => l.propertyId !== id),
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [data.loans]);

  // === 대출 ===
  const addLoan = useCallback(async ({ propertyId, amount, rate, startDate, term, type }) => {
    try {
      const result = await apiAddLoan({ propertyId, amount, rate, startDate, term, type });
      setData(prev => ({
        ...prev,
        loans: [...prev.loans, { ...result, propertyId }],
      }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateLoan = useCallback(async (id, updates) => {
    try {
      const result = await apiUpdate(id, updates);
      setData(prev => ({
        ...prev,
        loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l),
      }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeLoan = useCallback(async (id) => {
    try {
      await apiDelete(id);
      setData(prev => ({
        ...prev,
        loans: prev.loans.filter(l => l.id !== id),
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // === 시세 기록 ===
  const addPrice = useCallback(async ({ propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount }) => {
    try {
      const result = await apiAddPrice({ propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount });
      setData(prev => {
        const history = prev.priceHistory[propertyId] || [];
        return {
          ...prev,
          priceHistory: {
            ...prev.priceHistory,
            [propertyId]: [...history, result].sort((a, b) => new Date(a.date) - new Date(b.date)),
          },
        };
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // === 집계 데이터 ===
  const totalAssets = useMemo(() => {
    return data.myProperties.reduce((sum, p) => sum + (p.currentValue || p.purchasePrice || 0), 0);
  }, [data.myProperties]);

  const totalDebt = useMemo(() => {
    return data.loans.reduce((sum, l) => sum + (l.amount || 0), 0);
  }, [data.loans]);

  const netWorth = useMemo(() => {
    return totalAssets - totalDebt;
  }, [totalAssets, totalDebt]);

  const monthlyInterest = useMemo(() => {
    return data.loans.reduce((sum, l) => {
      const monthlyRate = (l.rate || 0) / 100 / 12;
      return sum + (l.amount || 0) * monthlyRate;
    }, 0);
  }, [data.loans]);

  // 대출 상환 스케줄 계산 (원리금균등)
  const loanSchedule = useMemo(() => {
    return data.loans.map(loan => {
      const { amount, rate, term = 360, startDate, type = '원리금균등' } = loan;
      const monthlyRate = rate / 100 / 12;

      if (type === '원리금균등') {
        // 월 상환금 = P * r * (1+r)^n / ((1+r)^n - 1)
        const monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, term)
          / (Math.pow(1 + monthlyRate, term) - 1);

        return {
          ...loan,
          monthlyPayment: Math.round(monthlyPayment),
          totalPayment: Math.round(monthlyPayment * term),
          totalInterest: Math.round(monthlyPayment * term - amount),
        };
      } else {
        // 원금균등: 월 원금 = P / n, 이자는 매달 감소
        const monthlyPrincipal = amount / term;
        const firstMonthInterest = amount * monthlyRate;

        return {
          ...loan,
          monthlyPrincipal: Math.round(monthlyPrincipal),
          firstMonthPayment: Math.round(monthlyPrincipal + firstMonthInterest),
          totalInterest: Math.round(amount * monthlyRate * (term + 1) / 2),
        };
      }
    });
  }, [data.loans]);

  return {
    // 데이터
    data,
    loading,
    error,

    // 관심 부동산
    watchProperties: data.watchProperties,
    addWatch,
    removeWatch,

    // 내 부동산
    myProperties: data.myProperties,
    addProperty,
    updateProperty,
    removeProperty,

    // 대출
    loans: data.loans,
    addLoan,
    updateLoan,
    removeLoan,
    loanSchedule,

    // 시세 기록
    priceHistory: data.priceHistory,
    addPrice,

    // 집계
    totalAssets,
    totalDebt,
    netWorth,
    monthlyInterest,

    // 유틸리티
    reload: loadData,
  };
}

export default useRealEstate;
