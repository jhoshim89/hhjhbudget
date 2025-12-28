import React from 'react';
import { Home, TrendingUp, Building2, Calendar } from 'lucide-react';
import { formatPrice, formatPriceRange } from '../../services/naverRealestateApi';

/**
 * 단지별 요약 카드
 */
export default function PropertySummaryCard({ complex, onSelect }) {
  // 84㎡ 우선, 없으면 80㎡
  const primaryArea = complex.areas?.[84] || complex.areas?.[80];
  const hasMultipleAreas = Object.keys(complex.areas || {}).length > 1;

  if (!primaryArea) {
    return (
      <div className="bento-card p-4 opacity-50">
        <p className="text-zinc-500">데이터 없음</p>
      </div>
    );
  }

  const totalListings = (primaryArea.sale?.count || 0) + (primaryArea.jeonse?.count || 0) + (primaryArea.monthly?.count || 0);

  return (
    <div
      className={`bento-card p-4 cursor-pointer hover:border-teal-500/50 transition-all ${
        complex.isMine ? 'border-teal-500/30 bg-teal-500/5' : ''
      }`}
      onClick={() => onSelect?.(complex)}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {complex.isMine && (
            <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-[10px] rounded font-medium">
              내 집
            </span>
          )}
          <div>
            <h4 className="font-semibold text-white text-sm">{complex.name}</h4>
            <p className="text-[10px] text-zinc-500">{complex.region}</p>
          </div>
        </div>
        {hasMultipleAreas && (
          <div className="flex gap-1">
            {Object.keys(complex.areas).map(area => (
              <span
                key={area}
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  area === '84' || (!complex.areas['84'] && area === '80')
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {area}㎡
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 매매 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">매매</span>
          <div className="text-right">
            {primaryArea.sale?.count > 0 ? (
              <>
                <p className="text-sm font-medium text-white">
                  {formatPriceRange(primaryArea.sale.minPrice, primaryArea.sale.maxPrice)}
                </p>
                <p className="text-[10px] text-zinc-500">{primaryArea.sale.count}건</p>
              </>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
          </div>
        </div>

        {/* 전세 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">전세</span>
          <div className="text-right">
            {primaryArea.jeonse?.count > 0 ? (
              <>
                <p className="text-sm font-medium text-blue-400">
                  {formatPriceRange(primaryArea.jeonse.minPrice, primaryArea.jeonse.maxPrice)}
                </p>
                <p className="text-[10px] text-zinc-500">{primaryArea.jeonse.count}건</p>
              </>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
          </div>
        </div>

        {/* 월세 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">월세</span>
          <div className="text-right">
            {primaryArea.monthly?.count > 0 ? (
              <>
                <p className="text-sm font-medium text-amber-400">
                  {formatPrice(primaryArea.monthly.avgDeposit)} / {formatPrice(primaryArea.monthly.avgRent)}
                </p>
                <p className="text-[10px] text-zinc-500">{primaryArea.monthly.count}건</p>
              </>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
        <span className="text-xs text-zinc-500">총 매물</span>
        <span className={`text-sm font-semibold ${totalListings > 10 ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {totalListings}건
        </span>
      </div>
    </div>
  );
}
