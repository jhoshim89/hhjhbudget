import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis } from 'recharts';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';
import { fetchPriceHistory, fetchArticleDetails } from '../../services/naverRealestateApi';

/**
 * 시세 동향 그래프
 * 매매/전세/월세 시세 추이 표시
 */
export default function PriceTrendChart({ complexId, complexName, area = 84 }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [articleHistory, setArticleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30); // 조회 기간 (일)

  useEffect(() => {
    if (complexId) {
      loadData();
    }
  }, [complexId, area, period]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 시세 히스토리 (매매/전세 min/max)
      const priceResult = await fetchPriceHistory(complexId, area, period);
      setPriceHistory(priceResult.data || []);

      // 매물 상세 (월세 개별 데이터)
      const articleResult = await fetchArticleDetails(complexId, null, period);
      setArticleHistory(articleResult.data || []);
    } catch (err) {
      console.error('[PriceTrendChart] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 차트 데이터 변환
  const chartData = useMemo(() => {
    if (priceHistory.length === 0) return [];

    // 날짜별로 그룹화
    const dateMap = new Map();

    // 시세 데이터 추가
    priceHistory.forEach(record => {
      const date = record.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, name: formatDate(date) });
      }
      const entry = dateMap.get(date);

      // 억원 단위로 변환
      if (record.saleMin) entry.saleMin = record.saleMin / 100000000;
      if (record.saleMax) entry.saleMax = record.saleMax / 100000000;
      if (record.jeonseMin) entry.jeonseMin = record.jeonseMin / 100000000;
      if (record.jeonseMax) entry.jeonseMax = record.jeonseMax / 100000000;
    });

    // 월세 데이터에서 일별 평균 월비용 계산
    const monthlyByDate = new Map();
    articleHistory
      .filter(a => a.tradeType === '월세' && Math.abs(a.area - area) <= 3)
      .forEach(article => {
        const date = article.date;
        if (!monthlyByDate.has(date)) {
          monthlyByDate.set(date, []);
        }
        // 월 실질비용 = 월세 + (보증금 × 5% / 12)
        const monthlyCost = article.monthlyRent + (article.deposit * 0.05 / 12);
        monthlyByDate.get(date).push(monthlyCost);
      });

    // 월비용 평균 추가
    monthlyByDate.forEach((costs, date) => {
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, name: formatDate(date) });
      }
      const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
      dateMap.get(date).monthlyCost = avg;
    });

    // 날짜순 정렬
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [priceHistory, articleHistory, area]);

  // 산점도 데이터 (개별 매물)
  const scatterData = useMemo(() => {
    if (!articleHistory || articleHistory.length === 0) return { sale: [], jeonse: [], monthly: [] };

    const targetArea = parseFloat(area) || 84;
    const filtered = articleHistory.filter(a => Math.abs(a.area - targetArea) <= 5);

    const sale = filtered
      .filter(a => a.tradeType === '매매')
      .map(a => ({
        area: a.area,
        price: (a.price || 0) / 10000, // 억원
        floor: a.floor,
      }));

    const jeonse = filtered
      .filter(a => a.tradeType === '전세')
      .map(a => ({
        area: a.area,
        price: (a.deposit || 0) / 10000, // 억원
        floor: a.floor,
      }));

    const monthly = filtered
      .filter(a => a.tradeType === '월세')
      .map(a => ({
        area: a.area,
        price: (a.monthlyRent || 0) + ((a.deposit || 0) * 0.05 / 12), // 월비용 (만원)
        floor: a.floor,
        deposit: a.deposit,
        rent: a.monthlyRent,
      }));

    return { sale, jeonse, monthly };
  }, [articleHistory, area]);

  // 차트 타입 결정: 날짜가 1개면 산점도, 여러 개면 라인차트
  const useScatter = chartData.length <= 1;

  // 날짜 포맷
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  // 라인차트 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 text-sm">
        <p className="text-zinc-400 mb-2">{label}</p>
        {payload.map((entry, idx) => {
          let value = entry.value;
          let unit = '억';

          // 월비용은 만원 단위
          if (entry.dataKey === 'monthlyCost') {
            value = value.toFixed(1);
            unit = '만/월';
          } else {
            value = value.toFixed(2);
          }

          return (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-zinc-300">{entry.name}:</span>
              <span className="font-medium text-white">{value}{unit}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // 산점도 툴팁
  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    const type = payload[0].name;

    return (
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 text-sm">
        <p className="text-zinc-400 mb-1">{type}</p>
        <p className="text-white font-medium">
          {type === '월세'
            ? `${data.price?.toFixed(1)}만/월`
            : `${data.price?.toFixed(2)}억`
          }
        </p>
        <p className="text-xs text-zinc-500">{data.area}㎡ {data.floor && `· ${data.floor}`}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-teal-400" size={24} />
        <span className="ml-2 text-zinc-400">시세 데이터 조회 중...</span>
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

  // 데이터가 아예 없으면 표시 안함
  const hasScatterData = scatterData.sale.length > 0 || scatterData.jeonse.length > 0 || scatterData.monthly.length > 0;

  if (chartData.length === 0 && !hasScatterData) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-teal-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">
            {complexName} 시세 추이
          </h3>
          <span className="text-xs text-zinc-500">{area}㎡ 기준</span>
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

      {/* 차트 */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {useScatter || hasScatterData ? (
            /* 산점도: 오늘 데이터 개별 매물 표시 */
            <ScatterChart margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="area"
                name="면적"
                unit="㎡"
                type="number"
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                dataKey="price"
                name="가격"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#4b5563' }}
                tickFormatter={(v) => v > 100 ? `${(v/10000).toFixed(1)}억` : `${v.toFixed(0)}만`}
              />
              <Tooltip content={<ScatterTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-zinc-400">{value}</span>}
              />
              {scatterData.sale.length > 0 && (
                <Scatter name="매매" data={scatterData.sale} fill="#ef4444" />
              )}
              {scatterData.jeonse.length > 0 && (
                <Scatter name="전세" data={scatterData.jeonse} fill="#3b82f6" />
              )}
              {scatterData.monthly.length > 0 && (
                <Scatter name="월세" data={scatterData.monthly} fill="#f59e0b" />
              )}
            </ScatterChart>
          ) : (
            /* 라인차트: 여러 날 시세 추이 */
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#4b5563' }}
                tickFormatter={(v) => `${v}억`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-zinc-400">{value}</span>}
              />

              {/* 매매 (범위) */}
              <Line
                type="monotone"
                dataKey="saleMax"
                name="매매(상한)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="saleMin"
                name="매매(하한)"
                stroke="#f87171"
                strokeWidth={2}
                dot={{ r: 3 }}
              />

              {/* 전세 (범위) */}
              <Line
                type="monotone"
                dataKey="jeonseMax"
                name="전세(상한)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="jeonseMin"
                name="전세(하한)"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 3 }}
              />

              {/* 월세 월비용 평균 */}
              <Line
                type="monotone"
                dataKey="monthlyCost"
                name="월비용(평균)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 범례 설명 */}
      <div className="text-[10px] text-zinc-500 text-center">
        월비용 = 월세 + (보증금 × 5% ÷ 12) | 점선 = 상한가, 실선 = 하한가
      </div>
    </div>
  );
}
