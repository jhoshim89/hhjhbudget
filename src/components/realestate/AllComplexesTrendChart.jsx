import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis, Cell } from 'recharts';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';
import { fetchArticleDetails } from '../../services/naverRealestateApi';

// 단지별 색상
const COMPLEX_COLORS = {
  'forena-songpa': '#14B8A6',           // teal (내집)
  'the-beach-prugio-summit': '#3B82F6', // blue
  'daeyeon-lotte-castle': '#8B5CF6',    // violet
  'the-sharp-namcheon': '#EC4899',      // pink
  'daeyeon-hillstate-prugio': '#F97316', // orange
  'daeyeon-diel': '#6B7280',            // gray (미입주)
  'doosan-weave-zenith-ocean': '#9CA3AF', // gray (미입주)
};

// 기본 색상 (위에 없는 경우)
const DEFAULT_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

/**
 * 월이자 계산 (전세)
 */
const calcJeonseMonthlyInterest = (deposit, rate = 0.04) => {
  return deposit * rate / 12;
};

/**
 * 월비용 계산 (월세)
 */
const calcMonthlyCost = (deposit, rent, rate = 0.04) => {
  return rent + (deposit * rate / 12);
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
 * 모든 단지 시세 추이 차트
 * 모든 단지의 전세/월세 데이터를 한 차트에 표시
 */
export default function AllComplexesTrendChart({ complexes = [], area = 84 }) {
  const [articleData, setArticleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  // complexNo가 있는 단지만 필터링
  const validComplexes = useMemo(() => {
    return complexes.filter(c => c.id && c.name);
  }, [complexes]);

  useEffect(() => {
    if (validComplexes.length > 0) {
      loadAllData();
    } else {
      // 데이터가 없으면 로딩 해제
      setLoading(false);
    }
  }, [validComplexes, area, period]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const allPoints = [];
      
      for (let idx = 0; idx < validComplexes.length; idx++) {
        const complex = validComplexes[idx];
        
        try {
          const result = await fetchArticleDetails(complex.id, null, period);
          const articles = result.data || [];
          
          // 면적 필터링
          const filtered = articles.filter(a => Math.abs(a.area - area) <= 5);
          
          // 각 매물을 점으로 변환
          filtered.forEach(article => {
            if (article.tradeType === '전세' && article.deposit) {
              const monthlyCost = calcJeonseMonthlyInterest(article.deposit);
              allPoints.push({
                dateNum: new Date(article.date).getTime(),
                date: article.date,
                y: Math.round(monthlyCost * 10) / 10,
                type: 'jeonse',
                complexId: complex.id,
                complexName: complex.name,
                deposit: article.deposit,
                isMine: complex.isMine,
                area: article.area,
              });
            } else if (article.tradeType === '월세' && article.deposit !== undefined) {
              const monthlyCost = calcMonthlyCost(article.deposit, article.monthlyRent || 0);
              allPoints.push({
                dateNum: new Date(article.date).getTime(),
                date: article.date,
                y: Math.round(monthlyCost * 10) / 10,
                type: 'monthly',
                complexId: complex.id,
                complexName: complex.name,
                deposit: article.deposit,
                rent: article.monthlyRent,
                isMine: complex.isMine,
                area: article.area,
              });
            }
          });
        } catch (err) {
          console.warn(`[AllComplexesTrendChart] Failed to load ${complex.name}:`, err.message);
        }
      }
      
      setArticleData(allPoints);
    } catch (err) {
      console.error('[AllComplexesTrendChart] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 단지별로 데이터 그룹화
  const groupedData = useMemo(() => {
    const groups = {};
    
    articleData.forEach(point => {
      const key = `${point.complexId}-${point.type}`;
      if (!groups[key]) {
        groups[key] = {
          complexId: point.complexId,
          complexName: point.complexName,
          type: point.type,
          isMine: point.isMine,
          data: [],
        };
      }
      groups[key].data.push(point);
    });
    
    return Object.values(groups);
  }, [articleData]);

  // 색상 가져오기
  const getColor = (complexId, type, idx) => {
    const baseColor = COMPLEX_COLORS[complexId] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    // 월세는 약간 더 밝게
    return type === 'monthly' ? baseColor : baseColor;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="font-bold text-white mb-1">{d.complexName}</p>
        <p className="text-zinc-400 mb-2">{d.date}</p>
        {d.type === 'jeonse' ? (
          <p className="text-amber-400">
            전세 월이자: {d.y.toFixed(1)}만/월
            <br />
            <span className="text-zinc-400">전세금: {formatPriceMan(d.deposit)}</span>
          </p>
        ) : (
          <p className="text-blue-400">
            월세 월납입금: {d.y.toFixed(1)}만/월
            <br />
            <span className="text-zinc-400">
              보증금: {formatPriceMan(d.deposit)} / 월세: {d.rent}만
            </span>
          </p>
        )}
        <p className="text-zinc-500 mt-1">{d.area}㎡</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-teal-400" size={24} />
        <span className="ml-2 text-zinc-400">모든 단지 시세 조회 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-rose-400">조회 실패: {error}</p>
      </div>
    );
  }

  if (articleData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-500">시세 데이터가 없습니다</p>
        <p className="text-xs text-zinc-600 mt-1">데이터 수집 후 그래프가 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-teal-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">
            전체 단지 시세 추이
          </h3>
          <span className="text-xs text-zinc-500">{area}㎡ 기준 · {articleData.length}건</span>
        </div>

        {/* 기간 선택 */}
        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-zinc-500" />
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === days
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {days}일
            </button>
          ))}
        </div>
      </div>

      {/* 공식 설명 */}
      <div className="text-[10px] text-zinc-500 px-1">
        전세 월이자 = 전세금 × 4% ÷ 12 | 월세 월납입금 = 월세 + (보증금 × 4% ÷ 12)
      </div>

      {/* 차트 */}
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="dateNum"
              name="날짜"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              tickFormatter={(ts) => {
                const d = new Date(ts);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              dataKey="y"
              name="월납입금"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              tickFormatter={(v) => `${v.toFixed(0)}만`}
              domain={[100, 350]}
              ticks={[100, 150, 200, 250, 300, 350]}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              formatter={(value) => <span className="text-zinc-400">{value}</span>}
            />
            
            {/* 각 단지+거래유형별 Scatter */}
            {groupedData.map((group, idx) => {
              const color = getColor(group.complexId, group.type, idx);
              const name = `${group.complexName} (${group.type === 'jeonse' ? '전세' : '월세'})`;
              
              return (
                <Scatter
                  key={`${group.complexId}-${group.type}`}
                  name={name}
                  data={group.data}
                  fill={color}
                >
                  {group.data.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={color}
                      stroke={entry.isMine ? '#14B8A6' : 'none'}
                      strokeWidth={entry.isMine ? 2 : 0}
                    />
                  ))}
                </Scatter>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 단지별 색상 범례 */}
      <div className="flex flex-wrap justify-center gap-3 text-[10px] pt-2 border-t border-zinc-200 dark:border-zinc-700">
        {validComplexes.map((c, idx) => {
          const color = COMPLEX_COLORS[c.id] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          return (
            <div key={c.id} className="flex items-center gap-1">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-zinc-500">
                {c.name}{c.isMine ? ' (내집)' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
