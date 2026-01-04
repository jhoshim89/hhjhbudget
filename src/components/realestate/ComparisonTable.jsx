import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowUpDown, RefreshCw, Loader2, X, Plus, ChevronDown, ChevronRight, Home, Building2, Wallet, BarChart3 } from 'lucide-react';
import { formatPrice, formatPriceRange, fetchArticleDetails } from '../../services/naverRealestateApi';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ZAxis } from 'recharts';

// 프론트엔드 캐시 (세션 동안 유지)
const articleCache = new Map();

/**
 * 월 실질비용 계산 (보증금 기회비용 포함)
 * @param {number} deposit - 보증금 (만원)
 * @param {number} rent - 월세 (만원)
 * @param {number} rate - 기회비용률 (기본 5%)
 */
const calcMonthlyCost = (deposit, rent, rate = 0.04) => {
  return rent + (deposit * rate / 12);
};

/**
 * 전세 대출 월이자 계산
 * @param {number} deposit - 전세금 (만원)
 * @param {number} rate - 대출금리 (기본 4%)
 */
const calcJeonseMonthlyInterest = (deposit, rate = 0.04) => {
  return deposit * rate / 12;
};

/**
 * 가격 포맷 (만원 단위 -> 억/만 표시)
 */
const formatPriceMan = (man) => {
  if (!man) return '-';
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const rest = man % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${man.toLocaleString()}만`;
};

/**
 * 확장된 행 컴포넌트 - 매물 상세 표시
 */
function ExpandedRowContent({ complex, areaKey, colSpan }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('jeonse');

  useEffect(() => {
    loadArticles();
  }, [complex?.id, areaKey]);

  const loadArticles = async () => {
    if (!complex?.id) return;

    const cacheKey = `${complex.id}_${areaKey}`;
    const targetArea = parseFloat(areaKey) || 0;

    // 캐시 확인
    const cached = articleCache.get(cacheKey);
    if (cached) {
      setArticles(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchArticleDetails(complex.id, null, 1);
      const filtered = result.data.filter(article => {
        return Math.abs(article.area - targetArea) <= 3;
      });
      
      // 캐시 저장
      articleCache.set(cacheKey, filtered);
      setArticles(filtered);
    } catch (err) {
      console.error('[ExpandedRow] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'jeonse', label: '전세', icon: Building2, color: 'text-blue-500 dark:text-blue-400' },
    { id: 'monthly', label: '월세', icon: Wallet, color: 'text-amber-500 dark:text-amber-400' },
    { id: 'sale', label: '매매', icon: Home, color: 'text-zinc-800 dark:text-white' },
  ];

  const filteredArticles = articles.filter(article => {
    const typeMap = { sale: '매매', jeonse: '전세', monthly: '월세' };
    return article.tradeType === typeMap[activeTab];
  });

  // 동일 매물 그룹화
  const groupedArticles = useMemo(() => {
    const grouped = new Map();

    filteredArticles.forEach(article => {
      let key;
      if (activeTab === 'sale') {
        key = `${article.price}`;
      } else if (activeTab === 'jeonse') {
        key = `${article.deposit}`;
      } else {
        key = `${article.deposit}-${article.monthlyRent}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { ...article, count: 1 });
      } else {
        grouped.get(key).count++;
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        // 많은 순 → 가격 낮은 순
        if (b.count !== a.count) return b.count - a.count;
        const aPrice = a.price || a.deposit || 0;
        const bPrice = b.price || b.deposit || 0;
        return aPrice - bPrice;
      });
  }, [filteredArticles, activeTab]);

  const getTabCount = (tabId) => {
    const typeMap = { sale: '매매', jeonse: '전세', monthly: '월세' };
    return articles.filter(a => a.tradeType === typeMap[tabId]).length;
  };

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-700/50">
          {/* 탭 */}
          <div className="flex gap-2 p-3 border-b border-zinc-200 dark:border-zinc-700/50">
            {tabs.map(tab => {
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === tab.id
                        ? 'bg-teal-500/30 text-teal-700 dark:text-teal-300'
                        : 'bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 콘텐츠 */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-teal-400" size={20} />
                <span className="ml-2 text-sm text-zinc-400">매물 조회 중...</span>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-rose-400 text-sm mb-1">조회 실패</p>
                <p className="text-xs text-zinc-500">{error}</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-500">해당 매물이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 헤더 */}
                <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-500 uppercase tracking-wider px-2 pb-1 border-b border-zinc-200 dark:border-zinc-700">
                  {activeTab === 'sale' && (
                    <>
                      <span>매매가</span>
                      <span></span>
                      <span>층/면적</span>
                      <span>날짜</span>
                    </>
                  )}
                  {activeTab === 'jeonse' && (
                    <>
                      <span>전세금</span>
                      <span>월이자(4%)</span>
                      <span>층/면적</span>
                      <span>날짜</span>
                    </>
                  )}
                  {activeTab === 'monthly' && (
                    <>
                      <span>보증금/월세</span>
                      <span>월비용</span>
                      <span>층/면적</span>
                      <span>날짜</span>
                    </>
                  )}
                </div>

                {groupedArticles.map((article, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                      {activeTab === 'sale' && (
                        <>
                          <span className="font-bold text-zinc-800 dark:text-white text-sm">
                            {formatPriceMan(article.price)}
                            {article.count > 1 && (
                              <span className="ml-1 text-xs text-zinc-400 font-normal">({article.count}건)</span>
                            )}
                          </span>
                          <span></span>
                          <span className="text-xs text-zinc-500">{article.area}㎡</span>
                          <span className="text-xs text-zinc-400">{article.date}</span>
                        </>
                      )}
                      {activeTab === 'jeonse' && (
                        <>
                          <span className="font-bold text-blue-500 dark:text-blue-400 text-sm">
                            {formatPriceMan(article.deposit)}
                            {article.count > 1 && (
                              <span className="ml-1 text-xs text-zinc-400 font-normal">({article.count}건)</span>
                            )}
                          </span>
                          <span className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                            월 {calcJeonseMonthlyInterest(article.deposit).toFixed(1)}만
                          </span>
                          <span className="text-xs text-zinc-500">{article.area}㎡</span>
                          <span className="text-xs text-zinc-400">{article.date}</span>
                        </>
                      )}
                      {activeTab === 'monthly' && (
                        <>
                          <span className="font-bold text-amber-500 dark:text-amber-400 text-sm">
                            {formatPriceMan(article.deposit)} / {article.monthlyRent}만
                            {article.count > 1 && (
                              <span className="ml-1 text-xs text-zinc-400 font-normal">({article.count}건)</span>
                            )}
                          </span>
                          <span className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                            {calcMonthlyCost(article.deposit, article.monthlyRent).toFixed(1)}만/월
                          </span>
                          <span className="text-xs text-zinc-500">{article.area}㎡</span>
                          <span className="text-xs text-zinc-400">{article.date}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </td>
    </tr>
  );
}

/**
 * 단지별 비교 테이블
 */
export default function ComparisonTable({ data, loading, onRefresh, lastUpdated }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showChart, setShowChart] = useState(true);

  // 행 확장 토글
  const toggleExpand = (rowKey) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return next;
    });
  };

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
          aVal = aArea.sale?.avgPrice || aArea.sale?.minPrice || 0;
          bVal = bArea.sale?.avgPrice || bArea.sale?.minPrice || 0;
          break;
        case 'jeonse':
          aVal = aArea.jeonse?.avgPrice || aArea.jeonse?.minPrice || 0;
          bVal = bArea.jeonse?.avgPrice || bArea.jeonse?.minPrice || 0;
          break;
        case 'monthly':
          aVal = aArea.monthly?.count || 0;
          bVal = bArea.monthly?.count || 0;
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

  // 매물 상세 데이터 로드 상태
  const [articleDetails, setArticleDetails] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // 차트가 보일 때 모든 매물 데이터 로드
  useEffect(() => {
    if (!showChart || includedData.length === 0) return;
    
    const loadAllArticles = async () => {
      setLoadingArticles(true);
      const allPoints = [];
      
      for (let idx = 0; idx < includedData.length; idx++) {
        const complex = includedData[idx];
        // 84㎡ 기준 (없으면 80㎡)
        const targetArea = complex.areas?.[84] ? 84 : complex.areas?.[80] ? 80 : null;
        if (!targetArea) continue;
        
        const cacheKey = `${complex.id}_${targetArea}`;
        let articles = articleCache.get(cacheKey);
        
        if (!articles) {
          try {
            const result = await fetchArticleDetails(complex.id, null, 1);
            articles = result.data.filter(article => Math.abs(article.area - targetArea) <= 3);
            articleCache.set(cacheKey, articles);
          } catch (err) {
            console.error(`[Chart] Failed to load articles for ${complex.name}:`, err);
            continue;
          }
        }
        
        // 각 매물을 점으로 변환
        articles.forEach(article => {
          const shortName = complex.name.length > 8 
            ? complex.name.substring(0, 7) + '…' 
            : complex.name;
          
          if (article.tradeType === '전세' && article.deposit) {
            // 전세: 보증금의 월이자 (4%)
            const monthlyCost = calcJeonseMonthlyInterest(article.deposit);
            allPoints.push({
              x: idx,
              y: Math.round(monthlyCost * 10) / 10,
              type: 'jeonse',
              complexName: complex.name,
              shortName,
              deposit: article.deposit,
              isMine: complex.isMine,
            });
          } else if (article.tradeType === '월세' && article.deposit !== undefined) {
            // 월세: 월세 + 보증금 월이자 (4%)
            const monthlyCost = calcMonthlyCost(article.deposit, article.monthlyRent || 0);
            allPoints.push({
              x: idx,
              y: Math.round(monthlyCost * 10) / 10,
              type: 'monthly',
              complexName: complex.name,
              shortName,
              deposit: article.deposit,
              rent: article.monthlyRent,
              isMine: complex.isMine,
            });
          }
        });
      }
      
      setArticleDetails(allPoints);
      setLoadingArticles(false);
    };
    
    loadAllArticles();
  }, [showChart, includedData]);

  // 산점도용 데이터 분리 (전세/월세)
  const scatterData = useMemo(() => {
    const jeonsePoints = articleDetails.filter(p => p.type === 'jeonse');
    const monthlyPoints = articleDetails.filter(p => p.type === 'monthly');
    return { jeonse: jeonsePoints, monthly: monthlyPoints };
  }, [articleDetails]);

  // X축 라벨용 단지명 목록
  const complexNames = useMemo(() => {
    return includedData.map(c => c.name.length > 8 ? c.name.substring(0, 7) + '…' : c.name);
  }, [includedData]);

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
      className="flex items-center gap-1 hover:text-teal-400 transition-colors whitespace-nowrap"
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === sortKeyName ? 'text-teal-400' : 'text-zinc-600'} />
    </button>
  );

  // 컬럼 수 계산 (편집 모드에 따라)
  const colCount = editMode ? 7 : 6;

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base md:text-lg font-semibold text-zinc-800 dark:text-white whitespace-nowrap">단지 비교</h3>
          {lastUpdated && (
            <span className="text-[10px] md:text-xs text-zinc-500 whitespace-nowrap">
              {lastUpdated.toLocaleString('ko-KR')} 기준
            </span>
          )}
        </div>
<div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm whitespace-nowrap transition-colors ${
              showChart
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <BarChart3 size={14} />
            <span className="hidden sm:inline">차트</span>
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm whitespace-nowrap transition-colors ${
              editMode
                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            {editMode ? '완료' : '편집'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs md:text-sm whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* 공식 설명 */}
      <div className="text-[10px] text-zinc-500 px-1">
        💡 월비용 = 월세 + (보증금 × 4% ÷ 12) | 전세 월이자 = 전세금 × 4% ÷ 12
      </div>

      {/* 월비용 비교 산점도 */}
      {showChart && (
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              매물별 월비용 비교 (84㎡ 기준, 4% 이율)
            </h4>
            {loadingArticles && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Loader2 size={12} className="animate-spin" />
                매물 데이터 로딩...
              </div>
            )}
          </div>
          
          {articleDetails.length > 0 ? (
            <div className="h-96">
              {/* 아웃라이어 표시 (300만 초과) */}
              {(() => {
                const outliers = articleDetails.filter(d => d.y > 300);
                if (outliers.length === 0) return null;
                return (
                  <div className="text-xs text-zinc-500 mb-2 flex flex-wrap gap-2">
                    <span className="text-zinc-400">⚠️ 300만↑:</span>
                    {outliers.map((o, i) => (
                      <span key={i} className={o.type === 'jeonse' ? 'text-amber-400' : 'text-blue-400'}>
                        {o.shortName} {o.y.toFixed(0)}만
                      </span>
                    ))}
                  </div>
                );
              })()}
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 60, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    type="number"
                    dataKey="x"
                    domain={[-0.5, includedData.length - 0.5]}
                    ticks={includedData.map((_, i) => i)}
                    tickFormatter={(idx) => complexNames[idx] || ''}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis 
                    yAxisId="left"
                    type="number"
                    dataKey="y"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(v) => `${v}만`}
                    width={55}
                    domain={[50, 300]}
                    ticks={[50, 100, 150, 200, 250, 300]}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    type="number"
                    tick={{ fontSize: 10, fill: '#F59E0B' }}
                    tickFormatter={(v) => `${(v * 12 / 0.04 / 10000).toFixed(1)}억`}
                    width={50}
                    domain={[50, 300]}
                    ticks={[50, 100, 150, 200, 250, 300]}
                    label={{ value: '전세금', angle: 90, position: 'insideRight', fill: '#F59E0B', fontSize: 10 }}
                  />
                  <ZAxis range={[80, 80]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
                          <p className="font-bold text-white mb-2">{d.complexName}</p>
                          {d.type === 'jeonse' ? (
                            <p className="text-amber-400">
                              전세 월이자: {d.y}만원/월
                              <br />
                              <span className="text-zinc-400">전세금: {formatPriceMan(d.deposit)}</span>
                            </p>
                          ) : (
                            <p className="text-blue-400">
                              월세 월납입금: {d.y}만원/월
                              <br />
                              <span className="text-zinc-400">
                                보증금: {formatPriceMan(d.deposit)} / 월세: {d.rent}만
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  <Scatter 
                    name="전세 월이자" 
                    data={scatterData.jeonse.filter(d => d.y <= 300)} 
                    fill="#F59E0B"
                    yAxisId="left"
                  >
                    {scatterData.jeonse.filter(d => d.y <= 300).map((entry, index) => (
                      <Cell 
                        key={`jeonse-${index}`} 
                        fill={entry.isMine ? '#14B8A6' : '#F59E0B'} 
                      />
                    ))}
                  </Scatter>
                  <Scatter 
                    name="월세 월납입금" 
                    data={scatterData.monthly.filter(d => d.y <= 300)} 
                    fill="#3B82F6"
                    yAxisId="left"
                  >
                    {scatterData.monthly.filter(d => d.y <= 300).map((entry, index) => (
                      <Cell 
                        key={`monthly-${index}`} 
                        fill={entry.isMine ? '#14B8A6' : '#3B82F6'} 
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : !loadingArticles ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-sm">
              데이터가 없습니다
            </div>
          ) : null}
          
          {/* 통계 요약 */}
          {articleDetails.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700/50 text-xs text-zinc-500">
              <div className="flex gap-4">
                <span>
                  전세 매물: <span className="text-amber-400 font-medium">{scatterData.jeonse.length}건</span>
                </span>
                <span>
                  월세 매물: <span className="text-blue-400 font-medium">{scatterData.monthly.length}건</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
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
            {sortedData.map((complex, complexIdx) => {
              const areas = Object.keys(complex.areas || {}).sort((a, b) => Number(a) - Number(b));
              const complexTotalCount = areas.reduce((sum, areaKey) => {
                const areaData = complex.areas[areaKey];
                return sum + (areaData.sale?.count || 0) + (areaData.jeonse?.count || 0) + (areaData.monthly?.count || 0);
              }, 0);

              return (
                <React.Fragment key={complex.id}>
                  {/* 단지 헤더 행 */}
                  <tr className={`${complexIdx > 0 ? 'border-t-4 border-zinc-300 dark:border-zinc-700' : ''}`}>
                    <td colSpan={colCount} className={`py-4 px-4 ${complex.isMine ? 'bg-teal-500/10' : 'bg-zinc-100 dark:bg-zinc-800/60'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {editMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExclude(complex.id); }}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="비교에서 제외"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {complex.isMine && (
                            <span className="px-2 py-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-medium rounded-lg">
                              내 집
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-lg text-zinc-800 dark:text-white">{complex.name}</p>
                            <p className="text-sm text-zinc-500">
                              {complex.region}{complex.householdCount ? ` · ${complex.householdCount.toLocaleString()}세대` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${complexTotalCount > 10 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                            {complexTotalCount}건
                          </span>
                          <p className="text-xs text-zinc-500">총 매물</p>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* 평형별 행 */}
                  {areas.map((areaKey) => {
                    const areaData = complex.areas[areaKey];
                    const totalCount = (areaData.sale?.count || 0) + (areaData.jeonse?.count || 0) + (areaData.monthly?.count || 0);
                    const rowKey = `${complex.id}-${areaKey}`;
                    const isExpanded = expandedRows.has(rowKey);

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          onClick={() => toggleExpand(rowKey)}
                          className={`border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''
                          }`}
                        >
                          {/* 편집 모드 빈 셀 */}
                          {editMode && <td></td>}

                          {/* 단지명 빈 셀 */}
                          <td></td>

                          {/* 평형 + 확장 인디케이터 */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1">
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-teal-400" />
                              ) : (
                                <ChevronRight size={14} className="text-zinc-400" />
                              )}
                              <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded font-medium">
                                {areaKey}㎡
                              </span>
                            </div>
                          </td>

                          {/* 매매 */}
                          <td className="py-3 pr-4">
                            {areaData.sale?.count > 0 ? (
                              <div>
                                <p className="font-medium text-zinc-800 dark:text-white">
                                  {formatPriceRange(areaData.sale.minPrice, areaData.sale.maxPrice)}
                                </p>
                                <p className="text-xs text-zinc-500">{areaData.sale.count}건</p>
                              </div>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>

                          {/* 전세 */}
                          <td className="py-3 pr-4">
                            {areaData.jeonse?.count > 0 ? (
                              <div>
                                <p className="font-medium text-blue-500 dark:text-blue-400">
                                  {formatPriceRange(areaData.jeonse.minPrice, areaData.jeonse.maxPrice)}
                                </p>
                                <p className="text-xs text-zinc-500">{areaData.jeonse.count}건</p>
                              </div>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>

                          {/* 월세 */}
                          <td className="py-3 pr-4">
                            {areaData.monthly?.count > 0 ? (
                              <div>
                                <p className="font-medium text-amber-500 dark:text-amber-400">
                                  {areaData.monthly.count}건
                                </p>
                                <p className="text-xs text-zinc-500">클릭하여 상세</p>
                              </div>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>

                          {/* 총 매물 수 */}
                          <td className="py-3">
                            <span className={`font-medium ${totalCount > 10 ? 'text-emerald-500' : totalCount > 0 ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'}`}>
                              {totalCount > 0 ? `${totalCount}건` : '-'}
                            </span>
                          </td>
                        </tr>

                        {/* 확장된 행 */}
                        {isExpanded && (
                          <ExpandedRowContent
                            complex={complex}
                            areaKey={areaKey}
                            colSpan={colCount}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
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
        <div className="mt-6 p-4 bg-zinc-100 dark:bg-zinc-800/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <ChevronDown size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">비교에서 제외됨 ({excludedData.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {excludedData.map(complex => (
              <button
                key={complex.id}
                onClick={() => handleInclude(complex.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700/50 hover:bg-teal-500/20 text-zinc-600 dark:text-zinc-400 hover:text-teal-400 rounded-lg text-sm transition-colors"
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
