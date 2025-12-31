/**
 * @context budget-dashboard / components / tabs / WatchlistTab.jsx
 * @purpose 관심종목 탭 - 좌우 분할 레이아웃 (종목 리스트 + 상세 차트)
 * @role 드래그앤드롭 정렬, 선택된 종목 상세 차트 표시
 * @dependencies React, @dnd-kit, Recharts, lucide-react
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Eye, TrendingUp, TrendingDown, Sparkles, RefreshCw, GripVertical, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import AddWatchlistModal, { DEFAULT_WATCHLIST } from '../watchlist/AddWatchlistModal';
import { formatUSD } from '../../utils/formatters';
import { getMarketStatusLabel, getUSMarketStatus } from '../../utils/marketHolidays';

// 가격 포맷터 - 티커에 따라 다르게 표시
function formatPrice(price, ticker, exchangeRate = 1450) {
  if (ticker === 'KRW=X') {
    // 환율은 소수점 2자리
    return `₩${price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (ticker === 'BTC-USD' || ticker === 'ETH-USD') {
    // 암호화폐는 USD + KRW 병기
    const krw = price * exchangeRate;
    return (
      <>
        <span>{formatUSD(price)}</span>
        <span className="text-zinc-400 text-sm ml-2">(₩{Math.round(krw).toLocaleString('ko-KR')})</span>
      </>
    );
  }
  return formatUSD(price);
}

// 정렬 가능한 종목 아이템
function SortableStockItem({ stock, stockData, isSelected, onSelect, onRemove, exchangeRate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stock.ticker });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const price = stockData?.price || 0;
  const changePercent = stockData?.changePercent || 0;
  const isPositive = changePercent >= 0;
  const isCrypto = stock.ticker === 'BTC-USD' || stock.ticker === 'ETH-USD';
  const isExchange = stock.ticker === 'KRW=X';
  
  // 프리/애프터마켓 데이터
  const marketState = stockData?.marketState;
  const preMarketPrice = stockData?.preMarketPrice;
  const preMarketChangePercent = stockData?.preMarketChangePercent;
  const postMarketPrice = stockData?.postMarketPrice;
  const postMarketChangePercent = stockData?.postMarketChangePercent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isDragging ? 'opacity-50 bg-amber-500/20' : ''
      } ${
        isSelected
          ? 'bg-amber-500/20 border border-amber-500/40'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
      onClick={() => onSelect(stock.ticker)}
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* 종목 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-400 font-mono">{stock.ticker}</span>
          <span className="text-[10px] text-zinc-500 truncate">{stock.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-semibold text-foreground font-mono">
            {isExchange ? `₩${price.toFixed(2)}` : formatUSD(price)}
          </span>
          {isCrypto && exchangeRate && (
            <span className="text-[10px] text-zinc-500">
              ₩{Math.round(price * exchangeRate).toLocaleString()}
            </span>
          )}
        </div>
        {/* 시장 상태 + 프리/애프터 가격 (항상 표시) */}
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] flex-wrap">
          {/* 시장 상태 라벨 - 휴장일 정보 포함 */}
          {(() => {
            const statusInfo = getMarketStatusLabel(marketState, stock.ticker);
            return (
              <span className={`font-bold text-[9px] px-1 rounded-[2px] ${statusInfo.className}`}>
                {statusInfo.label}
                {statusInfo.reason && <span className="ml-1 font-normal">({statusInfo.reason})</span>}
              </span>
            );
          })()}
          {/* 프리마켓 가격 */}
          {preMarketPrice && (
            <>
              <span className="text-amber-500 text-[9px] font-semibold">PRE</span>
              <span className="text-zinc-500 font-mono">{formatUSD(preMarketPrice)}</span>
              <span className={preMarketChangePercent >= 0 ? 'text-green-500' : 'text-rose-500'}>
                {preMarketChangePercent >= 0 ? '+' : ''}{preMarketChangePercent?.toFixed(2)}%
              </span>
            </>
          )}
          {/* 애프터마켓 가격 */}
          {postMarketPrice && (
            <>
              <span className="text-purple-500 text-[9px] font-semibold ml-1">POST</span>
              <span className="text-zinc-500 font-mono">{formatUSD(postMarketPrice)}</span>
              <span className={postMarketChangePercent >= 0 ? 'text-green-500' : 'text-rose-500'}>
                {postMarketChangePercent >= 0 ? '+' : ''}{postMarketChangePercent?.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* 변동률 */}
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-rose-400'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(stock.ticker);
        }}
        className="p-1 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// 기간 옵션 매핑
const PERIOD_OPTIONS = [
  { label: '1W', value: '7d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '1Y', value: '1y' },
];

// 캔들스틱 차트 컴포넌트 (lightweight-charts)
// 기간별 일 수 매핑
const RANGE_DAYS = {
  '7d': 7,
  '1mo': 30,
  '3mo': 90,
  '1y': 365,
};

function CandlestickChart({ history, ticker, isPositive, chartRange = '3mo', avgPrice }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !history?.length) return;

    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(251, 191, 36, 0.3)', width: 1, style: 2 },
        horzLine: { color: 'rgba(251, 191, 36, 0.3)', width: 1, style: 2 },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈 추가
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    // 데이터 설정 (time, open, high, low, close)
    const candleData = history.map(h => ({
      time: h.time || Math.floor(new Date(h.date).getTime() / 1000),
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
    }));

    candlestickSeries.setData(candleData);

    // 평단가 가로선 표시
    if (avgPrice && avgPrice > 0) {
      candlestickSeries.createPriceLine({
        price: avgPrice,
        color: '#3B82F6',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: '평단가',
      });
    }

    // chartRange에 맞는 visible range 설정
    const days = RANGE_DAYS[chartRange] || 90;
    const totalBars = candleData.length;
    const visibleBars = Math.min(days, totalBars);

    // 최근 데이터부터 보여주기 (오른쪽 끝에서 시작)
    chart.timeScale().setVisibleLogicalRange({
      from: totalBars - visibleBars,
      to: totalBars,
    });

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    // 마우스휠 핸들러: 일반 휠 = 줌, Shift+휠 = 좌우 이동
    const handleWheel = (event) => {
      event.preventDefault();

      const currentRange = chart.timeScale().getVisibleLogicalRange();
      if (!currentRange) return;

      const bars = currentRange.to - currentRange.from;

      if (event.shiftKey) {
        // Shift + 휠: 좌우 이동
        const scrollAmount = event.deltaY > 0 ? bars * 0.1 : -bars * 0.1;
        chart.timeScale().setVisibleLogicalRange({
          from: currentRange.from + scrollAmount,
          to: currentRange.to + scrollAmount,
        });
      } else {
        // 일반 휠: 줌인/줌아웃 (줌아웃 시 제한 없음)
        const zoomFactor = event.deltaY > 0 ? 1.2 : 0.8;
        const newBars = Math.max(5, bars * zoomFactor);
        const center = (currentRange.from + currentRange.to) / 2;
        chart.timeScale().setVisibleLogicalRange({
          from: center - newBars / 2,
          to: center + newBars / 2,
        });
      }
    };

    const container = chartContainerRef.current;
    window.addEventListener('resize', handleResize);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', handleWheel);
      chart.remove();
    };
  }, [history, ticker, chartRange, avgPrice]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}

// 상세 차트 컴포넌트
function DetailChart({ stock, stockData, exchangeRate, chartRange, onChartRangeChange }) {
  const price = stockData?.price || 0;
  const change = stockData?.change || 0;
  const changePercent = stockData?.changePercent || 0;
  const history = stockData?.history || [];
  const isPositive = changePercent >= 0;

  const isCrypto = stock?.ticker === 'BTC-USD' || stock?.ticker === 'ETH-USD';
  const isExchange = stock?.ticker === 'KRW=X';

  if (!stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <Eye size={48} className="mb-4 opacity-30" />
        <p className="text-sm">종목을 선택하세요</p>
      </div>
    );
  }

  // 가격 표시 포맷
  const displayPrice = isExchange
    ? `₩${price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : formatUSD(price);

  const displayChange = isExchange
    ? `₩${Math.abs(change).toFixed(2)}`
    : formatUSD(Math.abs(change));

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      {/* 종목 헤더 */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0 flex-shrink">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg md:text-2xl font-bold text-amber-400 font-mono">{stock.ticker}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs md:text-sm font-semibold ${
              isPositive ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 truncate">{stock.name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl md:text-3xl font-bold font-mono text-foreground">{displayPrice}</p>
          {isCrypto && exchangeRate && (
            <p className="text-sm text-zinc-400 font-mono">
              ₩{Math.round(price * exchangeRate).toLocaleString('ko-KR')}
            </p>
          )}
          <p className={`text-sm font-mono ${isPositive ? 'text-green-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : '-'}{displayChange}
          </p>
        </div>
      </div>

      {/* 캔들스틱 차트 */}
      <div className="flex-1 min-h-[250px]">
        {history.length > 0 ? (
          <CandlestickChart history={history} ticker={stock.ticker} isPositive={isPositive} chartRange={chartRange} avgPrice={parseFloat(stock.avgPrice) || 0} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <RefreshCw size={24} className="animate-spin" />
          </div>
        )}
      </div>

      {/* 기간 선택 */}
      <div className="flex gap-2 mt-4 justify-center">
        {PERIOD_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChartRangeChange?.(value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              chartRange === value
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// 빈 상태 컴포넌트
const EmptyState = ({ onAdd, onInitDefaults, isInitializing }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
    <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
      <Eye size={36} className="text-amber-400/50" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">관심종목이 없습니다</h3>
    <p className="text-sm text-foreground-muted text-center mb-6 max-w-sm">
      관심있는 종목을 추가하여 실시간으로 가격 변동을 확인하세요
    </p>
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onInitDefaults}
        disabled={isInitializing}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/30 to-orange-500/30 hover:from-amber-500/40 hover:to-orange-500/40 text-amber-300 font-semibold transition-all border border-amber-500/40 disabled:opacity-50"
      >
        {isInitializing ? (
          <RefreshCw size={18} className="animate-spin" />
        ) : (
          <Sparkles size={18} />
        )}
        {isInitializing ? '추가 중...' : '기본 종목 추가'}
      </button>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold transition-all border border-amber-500/30"
      >
        <Plus size={18} />
        직접 추가하기
      </button>
    </div>
  </div>
);

export default function WatchlistTab({ stocks, prices, loading, onAddStock, onRemoveStock, onReorderStocks, chartRange = '7d', onChartRangeChange }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(null);

  // 드래그앤드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 첫 번째 종목 자동 선택
  const effectiveSelectedTicker = selectedTicker || stocks?.[0]?.ticker;
  const selectedStock = stocks?.find(s => s.ticker === effectiveSelectedTicker);
  const selectedStockData = prices?.[effectiveSelectedTicker];

  // 환율 (KRW=X) 가져오기 - BTC/ETH의 원화 가격 계산용
  const exchangeRate = prices?.['KRW=X']?.price || 1450;

  // 관심종목 추가 핸들러
  const handleAddStock = (ticker, name) => {
    if (onAddStock) {
      onAddStock(ticker, name);
    }
    setIsAddModalOpen(false);
  };

  // 관심종목 삭제 핸들러
  const handleRemoveStock = (ticker) => {
    if (onRemoveStock) {
      onRemoveStock(ticker);
    }
    // 삭제된 종목이 선택된 종목이면 선택 해제
    if (selectedTicker === ticker) {
      setSelectedTicker(null);
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stocks.findIndex(s => s.ticker === active.id);
    const newIndex = stocks.findIndex(s => s.ticker === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && onReorderStocks) {
      const newOrder = arrayMove(stocks, oldIndex, newIndex);
      onReorderStocks(newOrder);
    }
  };

  // 기본 종목 일괄 추가 핸들러
  const handleInitDefaults = async () => {
    if (!onAddStock) return;
    setIsInitializing(true);
    try {
      for (const stock of DEFAULT_WATCHLIST) {
        await onAddStock(stock.ticker, stock.name);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error('Failed to init defaults:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // 이미 추가된 종목 티커 목록
  const existingTickers = stocks?.map(s => s.ticker) || [];

  return (
    <>
      {/* 종목 추가 모달 */}
      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStock}
        existingStocks={existingTickers}
      />

      <div className="flex flex-col h-full p-3 md:p-4 pb-mobile-nav">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <TrendingUp size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">관심종목</h2>
              <p className="text-xs text-foreground-muted">
                {stocks?.length || 0}개 종목 모니터링 중
              </p>
            </div>
            {/* 시장 상태 배지 */}
            {(() => {
              const status = getUSMarketStatus();
              const bgColor = status.status === 'REGULAR' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                status.status === 'PRE_MARKET' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                status.status === 'AFTER_HOURS' ? 'bg-purple-500/10 border-purple-500/30 text-purple-500' :
                status.status === 'HOLIDAY' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' :
                'bg-zinc-500/10 border-zinc-500/30 text-zinc-500';
              return (
                <div className={`ml-2 px-2 py-1 rounded-lg border text-xs font-medium ${bgColor}`}>
                  <span>{status.displayText}</span>
                  {status.nextSession && (
                    <span className="ml-1.5 opacity-70 text-[10px]">→ {status.nextSession} (ET)</span>
                  )}
                </div>
              );
            })()}
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold text-sm transition-all border border-amber-500/30"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">종목 추가</span>
          </button>
        </div>

        {/* 메인 컨텐츠 - 좌우 분할 */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={32} className="text-amber-400 animate-spin" />
          </div>
        ) : stocks && stocks.length > 0 ? (
          <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-y-auto md:overflow-visible">
            {/* 왼쪽: 종목 리스트 */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col min-h-0 max-h-[280px] md:max-h-none">
              <div className="text-xs text-zinc-500 mb-2 px-1">드래그하여 순서 변경</div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={stocks.map(s => s.ticker)}
                    strategy={verticalListSortingStrategy}
                  >
                    {stocks.map((stock) => (
                      <SortableStockItem
                        key={stock.ticker}
                        stock={stock}
                        stockData={prices?.[stock.ticker]}
                        isSelected={effectiveSelectedTicker === stock.ticker}
                        onSelect={setSelectedTicker}
                        onRemove={handleRemoveStock}
                        exchangeRate={exchangeRate}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>

            {/* 오른쪽: 상세 차트 */}
            <div className="flex-1 bento-card border-amber-500/20 bg-amber-500/5 flex flex-col min-h-[300px] md:min-h-0">
              <DetailChart
                stock={selectedStock}
                stockData={selectedStockData}
                exchangeRate={exchangeRate}
                chartRange={chartRange}
                onChartRangeChange={onChartRangeChange}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            onAdd={() => setIsAddModalOpen(true)}
            onInitDefaults={handleInitDefaults}
            isInitializing={isInitializing}
          />
        )}
      </div>
    </>
  );
}
