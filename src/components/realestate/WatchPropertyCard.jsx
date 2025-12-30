import React from 'react';
import { Home, TrendingUp, TrendingDown, Trash2, Plus, MapPin } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * 관심 부동산 카드
 */
export default function WatchPropertyCard({ property, priceHistory = [], onRemove, onAddPrice, onClick }) {
  const latestPrice = priceHistory[priceHistory.length - 1];
  const latestDate = latestPrice?.date ? new Date(latestPrice.date).toDateString() : null;

  // 전일 대비: 최신 날짜와 다른 날짜 중 가장 최근 데이터 찾기
  const prevPrice = latestDate
    ? [...priceHistory].reverse().find(p => new Date(p.date).toDateString() !== latestDate)
    : null;

  // 가격 변동 계산 (전일 대비)
  const priceChange = latestPrice && prevPrice
    ? latestPrice.salePrice - prevPrice.salePrice
    : 0;
  const changePercent = prevPrice?.salePrice
    ? ((priceChange / prevPrice.salePrice) * 100).toFixed(1)
    : 0;
  const isUp = priceChange >= 0;

  // 차트 데이터
  const chartData = priceHistory.map(p => ({
    date: p.date,
    value: p.salePrice / 100000000, // 억 단위
  }));

  // 가격 포맷
  const formatPrice = (amount) => {
    if (!amount) return '-';
    if (amount >= 100000000) {
      const eok = (amount / 100000000).toFixed(1);
      return `${eok}억`;
    }
    return `${(amount / 10000).toFixed(0)}만`;
  };

  return (
    <div
      className="group bento-card-sm cursor-pointer hover:border-teal-500/30 transition-all"
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <Home size={16} className="text-teal-400" />
          </div>
          <div>
            <h4 className="font-semibold text-zinc-800 dark:text-white text-sm">{property.name}</h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{property.area}㎡</p>
          </div>
        </div>

        {/* 변동률 배지 */}
        {latestPrice && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {changePercent}%
          </div>
        )}
      </div>

      {/* 스파크라인 차트 */}
      {chartData.length > 1 && (
        <div className="h-12 mb-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${property.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isUp ? '#10B981' : '#EF4444'}
                strokeWidth={1.5}
                fill={`url(#gradient-${property.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 시세 정보 */}
      {latestPrice ? (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500">매매</span>
            <span className="text-sm font-bold text-zinc-800 dark:text-white">{formatPrice(latestPrice.salePrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500">전세</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{formatPrice(latestPrice.jeonsePrice)}</span>
          </div>
          {latestPrice.monthlyRent > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500">월세</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-300">
                {formatPrice(latestPrice.monthlyDeposit)}/{(latestPrice.monthlyRent / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          {latestPrice.listingCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500">매물</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{latestPrice.listingCount}건</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-zinc-500">
          <MapPin size={20} className="mb-1 opacity-50" />
          <p className="text-xs">시세 정보 없음</p>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
        <button
          onClick={(e) => { e.stopPropagation(); onAddPrice?.(property); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
        >
          <Plus size={12} />
          시세 입력
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(property.id); }}
          className="px-3 py-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
