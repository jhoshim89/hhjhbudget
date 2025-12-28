import React from 'react';
import { Landmark, Calendar, Percent, Trash2, TrendingDown } from 'lucide-react';

/**
 * 대출 카드
 */
export default function LoanCard({ loan, property, onUpdate, onRemove }) {
  const {
    amount, rate, startDate, term = 360, type = '원리금균등',
    bank, balance, monthlyPayment: savedMonthlyPayment,
    lastPaymentDate, lastPrincipal, lastInterest
  } = loan;

  // 월 이자 계산
  const monthlyRate = rate / 100 / 12;
  const monthlyInterest = Math.round(amount * monthlyRate);

  // 원리금균등 월 상환금
  const monthlyPayment = type === '원리금균등'
    ? Math.round(amount * monthlyRate * Math.pow(1 + monthlyRate, term) / (Math.pow(1 + monthlyRate, term) - 1))
    : Math.round(amount / term + amount * monthlyRate);

  // 남은 기간 계산
  const startDateObj = new Date(startDate);
  const monthsPassed = Math.floor((Date.now() - startDateObj) / (30 * 24 * 60 * 60 * 1000));
  const monthsRemaining = Math.max(0, term - monthsPassed);
  const yearsRemaining = Math.floor(monthsRemaining / 12);
  const monthsRemainder = monthsRemaining % 12;

  // 총 이자
  const totalInterest = type === '원리금균등'
    ? monthlyPayment * term - amount
    : Math.round(amount * monthlyRate * (term + 1) / 2);

  // 가격 포맷
  const formatPrice = (value) => {
    if (!value) return '-';
    if (value >= 100000000) {
      const eok = (value / 100000000).toFixed(1);
      return `${eok}억`;
    }
    if (value >= 10000) {
      return `${Math.round(value / 10000)}만`;
    }
    return `${value.toLocaleString()}원`;
  };

  // 실제 잔액 (저장된 잔액 또는 원금)
  const currentBalance = balance || amount;

  return (
    <div className="bento-card p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Landmark size={28} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold text-white">{bank || type}</h4>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{rate}%</span>
            </div>
            {property && <p className="text-sm text-zinc-400 mt-1">{property.name}</p>}
            <p className="text-xs text-zinc-500">{type} · {term/12}년 만기</p>
          </div>
        </div>
      </div>

      {/* 대출 잔액 */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl mb-6">
        <p className="text-xs text-zinc-400 mb-1">대출 잔액</p>
        <p className="text-3xl font-bold text-white">{formatPrice(currentBalance)}</p>
        <p className="text-xs text-zinc-500 mt-1">최초 대출금 {formatPrice(amount)}</p>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-rose-400" />
            <span className="text-xs text-zinc-400">월 상환금</span>
          </div>
          <p className="text-lg font-bold text-white">{formatPrice(savedMonthlyPayment || monthlyPayment)}</p>
        </div>
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-amber-400" />
            <span className="text-xs text-zinc-400">예상 월 이자</span>
          </div>
          <p className="text-lg font-bold text-amber-400">{formatPrice(monthlyInterest)}</p>
        </div>
      </div>

      {/* 마지막 납부 내역 */}
      {lastPaymentDate && (
        <div className="p-4 bg-zinc-800/30 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-300">최근 납부 내역</span>
            <span className="text-xs text-zinc-500">{lastPaymentDate}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">원금</p>
              <p className="text-sm font-semibold text-emerald-400">{formatPrice(lastPrincipal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">이자</p>
              <p className="text-sm font-semibold text-rose-400">{formatPrice(lastInterest)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 기간 정보 */}
      <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-zinc-500" />
          <span className="text-sm text-zinc-400">시작일: {startDate}</span>
        </div>
        <div className="text-sm">
          <span className="text-zinc-400">남은 기간: </span>
          <span className="text-white font-semibold">
            {yearsRemaining > 0 && `${yearsRemaining}년 `}{monthsRemainder}개월
          </span>
        </div>
      </div>

      {/* 총 이자 */}
      <div className="flex justify-between items-center p-4 bg-rose-500/10 rounded-xl mb-4">
        <span className="text-sm text-zinc-400">총 이자 (예상)</span>
        <span className="text-lg font-bold text-rose-400">{formatPrice(totalInterest)}</span>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={() => onRemove?.(loan.id)}
        className="w-full py-3 text-sm text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Trash2 size={14} />
        삭제
      </button>
    </div>
  );
}
