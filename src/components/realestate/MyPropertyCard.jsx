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
    <div className="bento-card">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Building2 size={20} className="text-violet-400" />
          </div>
          <div>
            <h4 className="font-bold text-white">{name}</h4>
            <p className="text-xs text-zinc-500">{area}㎡ · {purchaseDate}</p>
          </div>
        </div>

        {/* 수익률 배지 */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isProfit ? '+' : ''}{profitPercent}%
        </div>
      </div>

      {/* 가격 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">매입가</p>
          <p className="text-lg font-bold text-zinc-300">{formatPrice(purchasePrice)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">현재가</p>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-violet-500"
                autoFocus
              />
              <button onClick={handleSave} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded">
                <Check size={14} />
              </button>
              <button onClick={handleCancel} className="p-1 text-zinc-500 hover:bg-zinc-700 rounded">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{formatPrice(currentValue || purchasePrice)}</p>
              <button onClick={handleEdit} className="p-1 text-zinc-500 hover:text-violet-400 transition-colors">
                <Edit3 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 손익 & 순자산 */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-800/50 rounded-xl mb-4">
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">평가 손익</p>
          <p className={`text-sm font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}{formatPrice(profit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">순자산 (자산-대출)</p>
          <p className="text-sm font-semibold text-white">{formatPrice(equity)}</p>
        </div>
      </div>

      {/* 대출 정보 */}
      {loans.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">연결된 대출</p>
          {loans.map(loan => (
            <div key={loan.id} className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">{loan.type || '대출'} ({loan.rate}%)</span>
              <span className="text-zinc-300">{formatPrice(loan.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 버튼 */}
      <button
        onClick={() => onRemove?.(property.id)}
        className="w-full py-2 text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        <Trash2 size={12} />
        삭제
      </button>
    </div>
  );
}
