/**
 * @context budget-dashboard / hooks / useAutoSaveInvestment.js
 * @purpose 향화 영웅문 평가액을 매월 1일에 자동 저장
 * @role 앱 실행 시 1일이면 시트에 자동 저장 (중복 방지 포함)
 */

import { useEffect, useRef, useCallback } from 'react';
import { upsertRow } from '../services/sheetsApi';

/**
 * 향화 영웅문 평가액 자동 저장 훅
 *
 * @param {Object} params
 * @param {Array} params.rawData - 시트 원본 데이터 (중복 확인용)
 * @param {Array} params.holdings - 보유종목 배열
 * @param {Object} params.stockPrices - 현재가 객체 {ticker: price}
 * @param {number} params.exchangeRate - 환율 (USD → KRW)
 * @param {boolean} params.holdingsLoading - 보유종목 로딩 상태
 * @param {Function} params.onSuccess - 저장 성공 콜백
 * @param {Function} params.onError - 저장 실패 콜백
 * @param {Function} params.onReload - 시트 리로드 함수
 */
export function useAutoSaveInvestment({
  rawData,
  holdings,
  stockPrices,
  exchangeRate,
  holdingsLoading,
  onSuccess,
  onError,
  onReload,
}) {
  // 세션 내 중복 실행 방지
  const hasSavedRef = useRef(false);

  // 향화 영웅문 평가액 계산
  const calculateHyangYounghwamun = useCallback(() => {
    if (!holdings || !stockPrices || !exchangeRate) return 0;

    return holdings
      .filter(h => h.account === '향화영웅문')
      .reduce((sum, h) => {
        const price = stockPrices[h.ticker] || 0;
        return sum + (h.qty * price * exchangeRate);
      }, 0);
  }, [holdings, stockPrices, exchangeRate]);

  // 현재 월에 이미 저장되어 있는지 확인
  const isAlreadySaved = useCallback((currentMonth) => {
    if (!rawData || rawData.length <= 1) return false;

    // rawData에서 현재 월 + 자산-투자 + 향화 해외주식 찾기
    for (let i = 1; i < rawData.length; i++) {
      const [date, category, name] = rawData[i];
      if (
        date === currentMonth &&
        category === '자산-투자' &&
        (name === '향화 해외주식' || name === '향화해외주식')
      ) {
        return true;
      }
    }
    return false;
  }, [rawData]);

  // 자동 저장 실행
  useEffect(() => {
    // 이미 저장했으면 스킵
    if (hasSavedRef.current) return;

    // 오늘이 1일인지 확인
    const today = new Date();
    if (today.getDate() !== 1) return;

    // 데이터 로딩 완료 확인
    if (holdingsLoading) return;
    if (!holdings || holdings.length === 0) return;
    if (!stockPrices || Object.keys(stockPrices).length === 0) return;
    if (!rawData || rawData.length <= 1) return;

    // 현재 월 문자열 생성 (YYYY.MM 형식)
    const currentMonth = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`;

    // 이미 저장된 데이터 있는지 확인
    if (isAlreadySaved(currentMonth)) {
      console.log('[AutoSave] 이미 저장됨:', currentMonth);
      hasSavedRef.current = true;
      return;
    }

    // 향화 영웅문 평가액 계산
    const hyangYounghwamun = calculateHyangYounghwamun();

    // 0원이면 저장 스킵
    if (hyangYounghwamun <= 0) {
      console.log('[AutoSave] 평가액 0원, 스킵');
      return;
    }

    // 저장 실행
    const saveToSheet = async () => {
      try {
        console.log('[AutoSave] 저장 시작:', currentMonth, Math.round(hyangYounghwamun));

        await upsertRow(currentMonth, '자산-투자', '향화 해외주식', [
          currentMonth,
          '자산-투자',
          '향화 해외주식',
          Math.round(hyangYounghwamun),
          ''
        ]);

        hasSavedRef.current = true;

        // 시트 리로드
        if (onReload) {
          onReload();
        }

        // 성공 콜백
        const formattedValue = new Intl.NumberFormat('ko-KR').format(Math.round(hyangYounghwamun));
        onSuccess?.(`향화 영웅문 ${formattedValue}원 자동 저장됨`);

        console.log('[AutoSave] 저장 완료');
      } catch (error) {
        console.error('[AutoSave] 저장 실패:', error);
        onError?.('향화 영웅문 자동 저장 실패');
      }
    };

    saveToSheet();
  }, [
    rawData,
    holdings,
    stockPrices,
    exchangeRate,
    holdingsLoading,
    isAlreadySaved,
    calculateHyangYounghwamun,
    onSuccess,
    onError,
    onReload,
  ]);

  // 수동 저장 함수 (테스트용)
  const manualSave = useCallback(async () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`;
    const hyangYounghwamun = calculateHyangYounghwamun();

    if (hyangYounghwamun <= 0) {
      onError?.('저장할 평가액이 없습니다');
      return false;
    }

    try {
      await upsertRow(currentMonth, '자산-투자', '향화 해외주식', [
        currentMonth,
        '자산-투자',
        '향화 해외주식',
        Math.round(hyangYounghwamun),
        ''
      ]);

      if (onReload) onReload();

      const formattedValue = new Intl.NumberFormat('ko-KR').format(Math.round(hyangYounghwamun));
      onSuccess?.(`향화 영웅문 ${formattedValue}원 저장됨`);
      return true;
    } catch (error) {
      console.error('[ManualSave] 저장 실패:', error);
      onError?.('저장 실패');
      return false;
    }
  }, [calculateHyangYounghwamun, onSuccess, onError, onReload]);

  return { manualSave };
}

export default useAutoSaveInvestment;
