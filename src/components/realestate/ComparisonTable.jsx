import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Home, TrendingUp, TrendingDown, RefreshCw, Loader2, X, Plus, ChevronDown } from 'lucide-react';
import { formatPrice, formatPriceRange } from '../../services/naverRealestateApi';

/**
 * 단지별 비교 테이블
 */
export default function ComparisonTable({ data, loading, onRefresh, lastUpdated }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [editMode, setEditMode] = useState(false);

  // 비교에서 제외
  const handleExclude = (id) => {
    setExcludedIds(prev => new Set([...prev, id]));
  };

  // 비교에 추가
  const handleInclude = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 포함/제외된 데이터 분리
  const includedData = data.filter(d => !excludedIds.has(d.id));
  const excludedData = data.filter(d => excludedIds.has(d.id));

  // 정렬 처리
  const sortedData = useMemo(() => {
    if (!sortKey) return includedData;

    return [...includedData].sort((a, b) => {
      let aVal, bVal;

      // 84㎡ 기준 (없으면 80㎡)
      const aArea = a.areas?.[84] || a.areas?.[80] || {};
      const bArea = b.areas?.[84] || b.areas?.[80] || {};

      switch (sortKey) {
        case 'sale':
          aVal = aArea.sale?.avgPrice || 0;
          bVal = bArea.sale?.avgPrice || 0;
          break;
        case 'jeonse':
          aVal = aArea.jeonse?.avgPrice || 0;
          bVal = bArea.jeonse?.avgPrice || 0;
          break;
        case 'monthly':
          aVal = aArea.monthly?.avgRent || 0;
          bVal = bArea.monthly?.avgRent || 0;
          break;
        case 'count':
          aVal = (aArea.sale?.count || 0) + (aArea.jeonse?.count || 0) + (aArea.monthly?.count || 0);
          bVal = (bArea.sale?.count || 0) + (bArea.jeonse?.count || 0) + (bArea.monthly?.count || 0);
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [includedData, sortKey, sortOrder]);

  // 정렬 토글
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortButton = ({ label, sortKeyName }) => (
    <button
      onClick={() => toggleSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-teal-400 transition-colors"
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === sortKeyName ? 'text-teal-400' : 'text-zinc-600'} />
    </button>
  );

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-teal-400" size={32} />
        <span className="ml-3 text-zinc-400">데이터 조회 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">단지 비교</h3>
          {lastUpdated && (
            <span className="text-xs text-zinc-500">
              {lastUpdated.toLocaleString('ko-KR')} 기준
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editMode
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {editMode ? '완료' : '편집'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              {editMode && <th className="pb-3 pr-4 w-8"></th>}
              <th className="pb-3 pr-4">단지명</th>
              <th className="pb-3 pr-4">평형</th>
              <th className="pb-3 pr-4">
                <SortButton label="매매" sortKeyName="sale" />
              </th>
              <th className="pb-3 pr-4">
                <SortButton label="전세" sortKeyName="jeonse" />
              </th>
              <th className="pb-3 pr-4">
                <SortButton label="월세" sortKeyName="monthly" />
              </th>
              <th className="pb-3">
                <SortButton label="매물" sortKeyName="count" />
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {sortedData.map((complex) => {
              // 각 평형별로 행 생성
              const areas = Object.keys(complex.areas || {}).sort((a, b) => Number(a) - Number(b));

              return areas.map((areaKey, idx) => {
                const areaData = complex.areas[areaKey];
                const isFirst = idx === 0;
                const totalCount = (areaData.sale?.count || 0) + (areaData.jeonse?.count || 0) + (areaData.monthly?.count || 0);

                return (
                  <tr
                    key={`${complex.id}-${areaKey}`}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                      complex.isMine ? 'bg-teal-500/5' : ''
                    }`}
                  >
                    {/* 제외 버튼 (편집 모드, 첫 행에만) */}
                    {editMode && isFirst && (
                      <td className="py-3 pr-2" rowSpan={areas.length}>
                        <button
                          onClick={() => handleExclude(complex.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="비교에서 제외"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    )}

                    {/* 단지명 (첫 행에만) */}
                    {isFirst && (
                      <td className="py-3 pr-4" rowSpan={areas.length}>
                        <div className="flex items-center gap-2">
                          {complex.isMine && (
                            <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-[10px] rounded">
                              내 집
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-white">{complex.name}</p>
                            <p className="text-xs text-zinc-500">{complex.region}</p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* 평형 */}
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded">
                        {areaKey}㎡
                      </span>
                    </td>

                    {/* 매매 */}
                    <td className="py-3 pr-4">
                      {areaData.sale?.count > 0 ? (
                        <div>
                          <p className="font-medium text-white">
                            {formatPriceRange(areaData.sale.minPrice, areaData.sale.maxPrice)}
                          </p>
                          <p className="text-xs text-zinc-500">{areaData.sale.count}건</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 전세 */}
                    <td className="py-3 pr-4">
                      {areaData.jeonse?.count > 0 ? (
                        <div>
                          <p className="font-medium text-blue-400">
                            {formatPriceRange(areaData.jeonse.minPrice, areaData.jeonse.maxPrice)}
                          </p>
                          <p className="text-xs text-zinc-500">{areaData.jeonse.count}건</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 월세 */}
                    <td className="py-3 pr-4">
                      {areaData.monthly?.count > 0 ? (
                        <div>
                          <p className="font-medium text-amber-400">
                            {formatPrice(areaData.monthly.avgDeposit)} / {formatPrice(areaData.monthly.avgRent)}
                          </p>
                          <p className="text-xs text-zinc-500">{areaData.monthly.count}건</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 총 매물 수 */}
                    <td className="py-3">
                      <span className={`font-medium ${totalCount > 10 ? 'text-emerald-400' : totalCount > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {totalCount > 0 ? `${totalCount}건` : '-'}
                      </span>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {includedData.length === 0 && !loading && (
        <div className="text-center py-8 text-zinc-500">
          데이터가 없습니다. 새로고침을 눌러 조회해주세요.
        </div>
      )}

      {/* 제외된 단지 목록 */}
      {excludedData.length > 0 && (
        <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <ChevronDown size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">비교에서 제외됨 ({excludedData.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {excludedData.map(complex => (
              <button
                key={complex.id}
                onClick={() => handleInclude(complex.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700/50 hover:bg-teal-500/20 text-zinc-400 hover:text-teal-400 rounded-lg text-sm transition-colors"
              >
                <Plus size={12} />
                {complex.name}
                {complex.isMine && <span className="text-[10px] text-teal-400">(내 집)</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
