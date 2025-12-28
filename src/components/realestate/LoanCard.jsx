import React from 'react';
import { Landmark, Calendar, Percent, Trash2, TrendingDown } from 'lucide-react';

/**
 * 대출 카드
 */
export default function LoanCard({ loan, property, onUpdate, onRemove }) {
  const { amount, rate, startDate, term = 360, type = '원리금균등' } = loan;

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

  return (
    <div className="bento-card">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Landmark size={20} className="text-amber-400" />
          </div>
          <div>
            <h4 className="font-bold text-white">{type}</h4>
            {property && <p className="text-xs text-zinc-500">{property.name}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{formatPrice(amount)}</p>
          <p className="text-xs text-amber-400">금리 {rate}%</p>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-rose-400" />
            <span className="text-[10px] text-zinc-500">월 상환금</span>
          </div>
          <p className="text-sm font-semibold text-white">{formatPrice(monthlyPayment)}</p>
        </div>
        <div className="p-3 bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Percent size={12} className="text-amber-400" />
            <span className="text-[10px] text-zinc-500">월 이자</span>
          </div>
          <p className="text-sm font-semibold text-amber-400">{formatPrice(monthlyInterest)}</p>
        </div>
      </div>

      {/* 기간 정보 */}
      <div className="flex items-center gap-4 p-3 bg-zinc-800/30 rounded-xl mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-zinc-500" />
          <span className="text-xs text-zinc-400">시작일: {startDate}</span>
        </div>
        <div className="text-xs text-zinc-400">
          남은 기간: <span className="text-white font-medium">
            {yearsRemaining > 0 && `${yearsRemaining}년 `}{monthsRemainder}개월
          </span>
        </div>
      </div>

      {/* 총 이자 */}
      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-zinc-500">총 이자 (예상)</span>
        <span className="text-rose-400 font-medium">{formatPrice(totalInterest)}</span>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={() => onRemove?.(loan.id)}
        className="w-full py-2 text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        <Trash2 size={12} />
        삭제
      </button>
    </div>
  );
}
