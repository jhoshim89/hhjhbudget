/**
 * @context budget-dashboard / components / watchlist / WatchlistCard.jsx
 * @purpose 개별 관심종목 카드 - 스파크라인 차트와 가격 정보 표시
 * @role 종목의 현재가, 변동률, 가격 추이를 시각적으로 표현
 * @dependencies React, Recharts (AreaChart), lucide-react, formatters
 */

import React, { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { formatUSD } from '../../utils/formatters';

export default function WatchlistCard({
  ticker,
  name,
  price,
  change,
  changePercent,
  history,
  onRemove,
  animationDelay = 0
}) {
  const [isHovered, setIsHovered] = useState(false);

  // 변동이 양수인지 확인
  const isPositive = changePercent >= 0;

  // 스파크라인 데이터 준비 (history는 { date, close } 형태)
  const sparklineData = history && history.length > 0
    ? history.map((h, idx) => ({
        idx,
        value: h.close || h.price || h.value || 0
      }))
    : [
        { idx: 0, value: price * 0.98 },
        { idx: 1, value: price * 0.99 },
        { idx: 2, value: price * 1.01 },
        { idx: 3, value: price * 0.995 },
        { idx: 4, value: price }
      ];

  // 그라데이션 색상 설정
  const gradientId = `gradient-${ticker}`;
  const strokeColor = isPositive ? '#22C55E' : '#EF4444';
  const fillColorStart = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const fillColorEnd = isPositive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)';

  return (
    <div
      className={`bento-card border-amber-500/20 bg-amber-500/5 relative group cursor-pointer transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 animate-enter`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 삭제 버튼 - 호버 시 표시 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove && onRemove();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition-all duration-200 z-10"
        title="관심종목에서 삭제"
      >
        <X size={14} />
      </button>

      {/* 헤더: 티커 및 변동률 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-amber-400 font-mono tracking-wide">
          {ticker}
        </span>
        <div className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${isPositive ? 'text-green-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
        </div>
      </div>

      {/* 종목명 (한글) */}
      <p className="text-[11px] text-amber-300/70 mb-3 truncate">
        {name}
      </p>

      {/* 스파크라인 차트 */}
      <div className="h-[50px] mb-3 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColorStart} />
                <stop offset="100%" stopColor={fillColorEnd} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 현재가 */}
      <div className="flex items-end justify-between">
        <span className="text-lg font-bold font-mono text-foreground">
          {formatUSD(price)}
        </span>
        {change !== 0 && (
          <span className={`text-[10px] font-mono ${isPositive ? 'text-green-400/70' : 'text-rose-400/70'}`}>
            {isPositive ? '+' : ''}{formatUSD(Math.abs(change))}
          </span>
        )}
      </div>
    </div>
  );
}
