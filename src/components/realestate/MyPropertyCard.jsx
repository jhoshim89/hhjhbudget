import React, { useState } from 'react';
import { Building2, TrendingUp, TrendingDown, Edit3, Trash2, Check, X } from 'lucide-react';

/**
 * 내 부동산 카드
 */
export default function MyPropertyCard({ property, loans = [], onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const { name, area, purchasePrice, purchaseDate, currentValue } = property;

  // 수익/손실 계산
  const profit = (currentValue || purchasePrice) - purchasePrice;
  const profitPercent = ((profit / purchasePrice) * 100).toFixed(1);
  const isProfit = profit >= 0;

  // 연결된 대출 총액
  const totalLoan = loans.reduce((sum, l) => sum + l.amount, 0);
  const equity = (currentValue || purchasePrice) - totalLoan;

  // 가격 포맷
  const formatPrice = (amount) => {
    if (!amount) return '-';
    if (amount >= 100000000) {
      const eok = (amount / 100000000).toFixed(1);
      return `${eok}억`;
    }
    return `${(amount / 10000).toFixed(0)}만`;
  };

  // 현재가 수정
  const handleEdit = () => {
    setEditValue(String(currentValue || purchasePrice));
    setIsEditing(true);
  };

  const handleSave = () => {
    const newValue = parseInt(editValue.replace(/,/g, '')) || 0;
    if (newValue > 0) {
      onUpdate?.(property.id, { currentValue: newValue });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  return (
    <div className="bento-card p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <Building2 size={28} className="text-violet-400" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">{name}</h4>
            <p className="text-sm text-zinc-400">{area}㎡ · {purchaseDate} 매입</p>
          </div>
        </div>

        {/* 수익률 배지 */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
          isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {isProfit ? '+' : ''}{profitPercent}%
        </div>
      </div>

      {/* 현재가 큰 표시 */}
      <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 mb-1">현재 평가액</p>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg text-white focus:outline-none focus:border-violet-500"
                  autoFocus
                />
                <button onClick={handleSave} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg">
                  <Check size={18} />
                </button>
                <button onClick={handleCancel} className="p-2 text-zinc-500 hover:bg-zinc-700 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-white">{formatPrice(currentValue || purchasePrice)}</p>
                <button onClick={handleEdit} className="p-2 text-zinc-500 hover:text-violet-400 hover:bg-violet-500/20 rounded-lg transition-colors">
                  <Edit3 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">매입가</p>
            <p className="text-lg font-semibold text-zinc-400">{formatPrice(purchasePrice)}</p>
          </div>
        </div>
      </div>

      {/* 손익 & 순자산 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <p className="text-xs text-zinc-400 mb-2">평가 손익</p>
          <p className={`text-xl font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}{formatPrice(profit)}
          </p>
        </div>
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          <p className="text-xs text-zinc-400 mb-2">순자산</p>
          <p className="text-xl font-bold text-white">{formatPrice(equity)}</p>
          <p className="text-[10px] text-zinc-500">자산 - 대출</p>
        </div>
      </div>

      {/* 대출 정보 */}
      {loans.length > 0 && (
        <div className="p-4 bg-zinc-800/30 rounded-xl mb-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">연결된 대출</p>
          {loans.map(loan => (
            <div key={loan.id} className="flex justify-between items-center py-2 border-b border-zinc-700/50 last:border-0">
              <div>
                <span className="text-sm text-zinc-300">{loan.bank || loan.type || '대출'}</span>
                <span className="text-xs text-amber-400 ml-2">({loan.rate}%)</span>
              </div>
              <span className="text-sm font-semibold text-zinc-200">{formatPrice(loan.balance || loan.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 버튼 */}
      <button
        onClick={() => onRemove?.(property.id)}
        className="w-full py-3 text-sm text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Trash2 size={14} />
        삭제
      </button>
    </div>
  );
}
