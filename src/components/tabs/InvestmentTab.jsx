import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { formatKRW, formatUSD, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, X, History, TrendingUp } from 'lucide-react';
import AddStockModal from '../investment/AddStockModal';
import { formatHistoryDate, aggregateByMonth } from '../../utils/investmentCalculator';

// Portfolio Bar Item - 그라데이션 바 리스트 스타일
const PortfolioBarItem = ({ ticker, value, percent, profit, isLast }) => {
  const isPositive = profit >= 0;

  return (
    <div className={`p-3 ${!isLast ? 'border-b border-white/[0.06]' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-foreground">{ticker}</span>
          <span className="text-sm text-foreground-muted font-mono">{formatKRW(value, true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">{percent.toFixed(1)}%</span>
          <span className={`text-sm font-bold font-mono ${isPositive ? 'text-teal-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{profit.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-white/[0.06] dark:bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isPositive
              ? 'bg-gradient-to-r from-teal-500 to-cyan-400'
              : 'bg-gradient-to-r from-rose-500 to-pink-400'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Inline Edit Cell Component
const EditableCell = ({ value, onSave, type = 'number', className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newValue = type === 'number' ? parseFloat(editValue) || 0 : editValue;
    onSave(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  // 동일한 크기 유지를 위해 같은 width 사용
  const boxStyle = "w-20 px-2 py-0.5 text-right font-mono text-sm";

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={`${boxStyle} bg-zinc-800 border border-violet-500/60 rounded text-white focus:outline-none focus:border-violet-400 box-border`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`${boxStyle} inline-block cursor-pointer hover:bg-violet-500/20 rounded transition-colors box-border ${className}`}
      title="클릭하여 수정"
    >
      {value}
    </span>
  );
};

export default function InvestmentTab({ data, handlers, selectedMonth, onMonthChange, changeHistory = [], onClearHistory, onDeleteHistoryItem, onRefreshHistory }) {
  const { exchangeRate, stocks, bonds, benchmarks, benchmarkHistory } = data;
  const { onAddStock, onDeleteStock, onUpdateStock } = handlers || {};
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState(['SPY', 'QQQ', 'TQQQ']);

  const today = new Date();
  const isCurrentMonth = selectedMonth?.year === today.getFullYear() && selectedMonth?.month === today.getMonth() + 1;

  const pieData = data.hasIndividualStocks
    ? stocks.list.map(s => ({ name: s.ticker, value: s.qty * (data.stockPrices[s.ticker] || 0) }))
    : [
        { name: '재호 영웅문', value: data.investmentTotals?.재호영웅문 || data.investmentTotals?.재호 || 0 },
        { name: '향화 카카오', value: data.investmentTotals?.향화카카오 || 0 },
        { name: '향화 영웅문', value: data.investmentTotals?.향화영웅문 || 0 },
      ].filter(item => item.value > 0);

  // 3개 계좌별 평가액
  const accountValues = useMemo(() => ({
    향화영웅문: data.manual?.younghwa || 0,
    향화카카오: data.manual?.kakao || 0,
    재호영웅문: data.manual?.jaeho || 0,
  }), [data.manual]);

  // 예상 연 배당 (향화영웅문만) - Yahoo Finance API에서 실시간 배당률 조회
  const { estimatedAnnualDividend, dividendDetails } = useMemo(() => {
    const details = [];

    // 향화영웅문: 종목별 배당률 적용
    if (data.hasIndividualStocks) {
      stocks.list.filter(s => s.account === '향화영웅문').forEach(s => {
        const price = data.stockPrices[s.ticker] || 0;
        const value = s.qty * price * exchangeRate;
        // yahooData에서 배당률 가져오기 (0.0135 = 1.35%)
        const yahooStock = data.yahooData?.[s.ticker];
        const yieldRate = (yahooStock?.dividendYield || 0) * 100;
        const isStale = yahooStock?.dividendStale || false;
        const dividend = value * yieldRate / 100;
        if (dividend > 0 || yieldRate > 0) {
          details.push({ name: s.ticker, value, yieldRate, dividend, stale: isStale });
        }
      });
    }

    const total = details.reduce((sum, d) => sum + d.dividend, 0);
    return { estimatedAnnualDividend: total, dividendDetails: details };
  }, [data.hasIndividualStocks, stocks.list, data.stockPrices, data.yahooData, exchangeRate]);

  const portfolioValue = data.totalStockKRW;

  // 향화영웅문 계좌만 필터링 (원금이 잡혀있는 계좌)
  const younghwaStocks = useMemo(() => {
    if (!data.hasIndividualStocks) return [];
    return stocks.list.filter(s => s.account === '향화영웅문');
  }, [data.hasIndividualStocks, stocks.list]);

  // 향화영웅문 종목별 상세 (원금, 평가액, 손익)
  const stockDetails = useMemo(() => {
    return younghwaStocks.map(s => {
      const price = data.stockPrices[s.ticker] || 0;
      const avgPrice = parseFloat(s.avgPrice) || 0;
      const principal = s.qty * avgPrice * exchangeRate;
      const currentValue = s.qty * price * exchangeRate;
      const profit = currentValue - principal;
      const profitPct = principal > 0 ? ((currentValue / principal) - 1) * 100 : 0;
      return { ticker: s.ticker, name: s.name, principal, currentValue, profit, profitPct };
    }).sort((a, b) => b.currentValue - a.currentValue);
  }, [younghwaStocks, data.stockPrices, exchangeRate]);

  // 향화영웅문 합계
  const younghwaTotals = useMemo(() => {
    const principal = stockDetails.reduce((sum, s) => sum + s.principal, 0);
    const currentValue = stockDetails.reduce((sum, s) => sum + s.currentValue, 0);
    const profit = currentValue - principal;
    const profitPct = principal > 0 ? ((currentValue / principal) - 1) * 100 : 0;
    return { principal, currentValue, profit, profitPct };
  }, [stockDetails]);

  // 투자 원금 & 손익 (향화영웅문만)
  const investedPrincipal = younghwaTotals.principal;
  const profitAmount = younghwaTotals.profit;
  const profitPercent = younghwaTotals.profitPct;

  const spyPrice = data.stockPrices['SPY'] || 595;
  const qqqPrice = data.stockPrices['QQQ'] || 520;
  const tqqqPrice = data.stockPrices['TQQQ'] || 75;

  // 벤치마크 히스토리에서 수익률 계산
  const getBenchmarkReturn = (history) => {
    if (!history || history.length < 2) return 0;
    const startPrice = history[0]?.close;
    const endPrice = history[history.length - 1]?.close;
    if (!startPrice || !endPrice) return 0;
    return (endPrice - startPrice) / startPrice;
  };

  // 특정 날짜의 벤치마크 가격 찾기
  const findPriceAtDate = (history, dateStr) => {
    if (!history || history.length === 0) return null;
    // dateStr: "2024.09" -> "2024-09"
    const targetMonth = dateStr.replace('.', '-');

    // 해당 월의 첫 번째 데이터 찾기 (가장 근접한 날짜)
    const found = history.find(h => h.date?.startsWith(targetMonth));
    if (found) return found.close;

    // 못 찾으면 가장 가까운 날짜 찾기
    const target = new Date(targetMonth + '-01');
    let closest = null;
    let minDiff = Infinity;

    for (const h of history) {
      const hDate = new Date(h.date);
      const diff = Math.abs(hDate - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = h;
      }
    }
    return closest?.close || null;
  };

  // 실제 벤치마크 수익률 계산 (히스토리 기반)
  const benchmarkReturns = useMemo(() => {
    return {
      spy: getBenchmarkReturn(benchmarkHistory?.SPY),
      qqq: getBenchmarkReturn(benchmarkHistory?.QQQ),
      tqqq: getBenchmarkReturn(benchmarkHistory?.TQQQ),
    };
  }, [benchmarkHistory]);

  // 투자금액 vs 현재금액 비교 데이터
  const comparisonData = useMemo(() => {
    if (!data.hasIndividualStocks || !stocks?.list) return [];

    const items = stocks.list.map(s => {
      const currentPrice = data.stockPrices?.[s.ticker] || parseFloat(s.avgPrice) || 0;
      const avgPrice = parseFloat(s.avgPrice) || currentPrice;
      const invested = s.qty * avgPrice * exchangeRate;
      const current = s.qty * currentPrice * exchangeRate;
      return {
        name: s.ticker,
        invested: Math.round(invested),
        current: Math.round(current),
        profit: current - invested,
        profitPercent: invested > 0 ? ((current / invested) - 1) * 100 : 0
      };
    }).filter(item => item.invested > 0 || item.current > 0)
      .sort((a, b) => b.current - a.current);

    // 토탈 추가
    const totalInvested = items.reduce((sum, i) => sum + i.invested, 0);
    const totalCurrent = items.reduce((sum, i) => sum + i.current, 0);
    items.push({
      name: 'Total',
      invested: totalInvested,
      current: totalCurrent,
      profit: totalCurrent - totalInvested,
      profitPercent: totalInvested > 0 ? ((totalCurrent / totalInvested) - 1) * 100 : 0,
      isTotal: true
    });

    return items;
  }, [stocks, data.stockPrices, exchangeRate, data.hasIndividualStocks]);

  const historyData = data.history || [];
  const currentMonthStr = `${selectedMonth?.year}.${String(selectedMonth?.month).padStart(2, '0')}`;
  const lastHistoryMonth = historyData.length > 0 ? historyData[historyData.length - 1].month : null;
  const isCurrentInHistory = lastHistoryMonth === currentMonthStr;

  const benchmarkComparisonData = useMemo(() => {
    if (historyData.length === 0) {
      // 히스토리 없을 때: 실제 벤치마크 수익률로 계산
      return [
        { date: '시작', portfolio: investedPrincipal, spy: investedPrincipal, qqq: investedPrincipal, tqqq: investedPrincipal, isProjected: false },
        { date: '현재', portfolio: portfolioValue, spy: investedPrincipal * (1 + benchmarkReturns.spy), qqq: investedPrincipal * (1 + benchmarkReturns.qqq), tqqq: investedPrincipal * (1 + benchmarkReturns.tqqq), isProjected: true },
      ];
    }

    const firstMonth = historyData[0];
    const baseValue = firstMonth.원금 || firstMonth.total;

    // 첫 번째 월의 벤치마크 가격 찾기
    const spyStartPrice = findPriceAtDate(benchmarkHistory?.SPY, firstMonth.month);
    const qqqStartPrice = findPriceAtDate(benchmarkHistory?.QQQ, firstMonth.month);
    const tqqqStartPrice = findPriceAtDate(benchmarkHistory?.TQQQ, firstMonth.month);

    const chartData = historyData.map((h) => {
      // 각 월의 벤치마크 가격 찾기
      const spyMonthPrice = findPriceAtDate(benchmarkHistory?.SPY, h.month);
      const qqqMonthPrice = findPriceAtDate(benchmarkHistory?.QQQ, h.month);
      const tqqqMonthPrice = findPriceAtDate(benchmarkHistory?.TQQQ, h.month);

      // 실제 가격 비율로 계산 (가격을 찾지 못하면 baseValue 유지)
      const spyValue = (spyStartPrice && spyMonthPrice)
        ? baseValue * (spyMonthPrice / spyStartPrice)
        : baseValue;
      const qqqValue = (qqqStartPrice && qqqMonthPrice)
        ? baseValue * (qqqMonthPrice / qqqStartPrice)
        : baseValue;
      const tqqqValue = (tqqqStartPrice && tqqqMonthPrice)
        ? baseValue * (tqqqMonthPrice / tqqqStartPrice)
        : baseValue;

      return {
        date: h.month.slice(2).replace('.', '/'),
        portfolio: h.total,
        spy: spyValue,
        qqq: qqqValue,
        tqqq: tqqqValue,
        isProjected: false,
      };
    });

    // 현재 데이터 추가 (히스토리에 없을 경우)
    if (!isCurrentInHistory && portfolioValue > 0) {
      // 현재 벤치마크 가격으로 계산
      const spyCurrentPrice = data.stockPrices['SPY'];
      const qqqCurrentPrice = data.stockPrices['QQQ'];
      const tqqqCurrentPrice = data.stockPrices['TQQQ'];

      const spyValue = (spyStartPrice && spyCurrentPrice)
        ? baseValue * (spyCurrentPrice / spyStartPrice)
        : baseValue * (1 + benchmarkReturns.spy);
      const qqqValue = (qqqStartPrice && qqqCurrentPrice)
        ? baseValue * (qqqCurrentPrice / qqqStartPrice)
        : baseValue * (1 + benchmarkReturns.qqq);
      const tqqqValue = (tqqqStartPrice && tqqqCurrentPrice)
        ? baseValue * (tqqqCurrentPrice / tqqqStartPrice)
        : baseValue * (1 + benchmarkReturns.tqqq);

      chartData.push({
        date: '현재',
        portfolio: portfolioValue,
        spy: spyValue,
        qqq: qqqValue,
        tqqq: tqqqValue,
        isProjected: true,
      });
    }

    return chartData;
  }, [historyData, investedPrincipal, portfolioValue, benchmarkReturns, benchmarkHistory, isCurrentInHistory, data.stockPrices]);

  const toggleBenchmark = (benchmark) => {
    setSelectedBenchmarks(prev =>
      prev.includes(benchmark)
        ? prev.filter(b => b !== benchmark)
        : [...prev, benchmark]
    );
  };

  // 월별 투자 현황 계산
  const monthlyInvestmentData = useMemo(() => {
    if (!changeHistory || changeHistory.length === 0) return [];
    return aggregateByMonth(changeHistory, exchangeRate);
  }, [changeHistory, exchangeRate]);

  return (
    <>
    <AddStockModal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      onAdd={onAddStock}
    />
    <div className="flex flex-col gap-3 p-3 md:p-4 pb-mobile-nav">
      {/* Month Selector */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button onClick={() => onMonthChange(-1)} className="p-2 hover:bg-white/[0.05] rounded-full text-violet-400/70 hover:text-violet-300 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 text-sm font-semibold text-foreground min-w-[160px] text-center">
            {selectedMonth?.year}년 {selectedMonth?.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-violet-400">(현재)</span>}
          </span>
          <button
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
            className={`p-2 rounded-full transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed text-violet-400/50' : 'hover:bg-white/[0.05] text-violet-400/70 hover:text-violet-300'}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Hero Summary Cards - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bento-card-sm border-violet-500/20 bg-violet-500/5 animate-enter delay-0 relative group">
          <p className="text-xs font-semibold text-violet-600 dark:text-violet-300/80 uppercase tracking-wider mb-1 whitespace-nowrap">주식 평가액</p>
          <p className="text-lg md:text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{formatKRW(portfolioValue, true)}</p>
          {/* Hover Tooltip - 3개 계좌 */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-2xl min-w-[180px]">
              <p className="text-[10px] uppercase text-zinc-500 font-semibold mb-2 tracking-wider">계좌별 평가액</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">향화영웅문</span>
                  <span className="text-violet-600 dark:text-violet-400 font-mono font-semibold">{formatKRW(accountValues.향화영웅문, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">향화카카오</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold">{formatKRW(accountValues.향화카카오, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">재호영웅문</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">{formatKRW(accountValues.재호영웅문, true)}</span>
                </div>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-zinc-900"></div>
          </div>
        </div>
        <div className="bento-card-sm border-cyan-500/20 bg-cyan-500/5 animate-enter delay-50 relative group">
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-300/80 uppercase tracking-wider mb-1 whitespace-nowrap">투자 원금</p>
          <p className="text-lg md:text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{formatKRW(investedPrincipal, true)}</p>
          <p className="text-xs text-cyan-600 dark:text-cyan-300/70 mt-1">향화영웅문</p>
          {/* Hover Tooltip */}
          {stockDetails.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-2xl min-w-[200px]">
                <p className="text-[10px] uppercase text-zinc-500 font-semibold mb-2 tracking-wider">종목별 원금</p>
                <div className="space-y-1.5 text-xs">
                  {stockDetails.map(s => (
                    <div key={s.ticker} className="flex justify-between items-center">
                      <span className="text-zinc-400">{s.ticker}</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">{formatKRW(s.principal, true)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-zinc-900"></div>
            </div>
          )}
        </div>
        <div className={`bento-card-sm animate-enter delay-100 relative group ${profitAmount >= 0 ? 'border-green-500/20 bg-green-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1 whitespace-nowrap">평가 손익</p>
          <p className={`text-lg md:text-xl font-bold font-mono ${profitAmount >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
            {profitAmount >= 0 ? '+' : ''}{formatKRW(profitAmount, true)}
          </p>
          <p className={`text-xs mt-1 font-semibold ${profitAmount >= 0 ? 'text-green-600 dark:text-green-300/70' : 'text-rose-600 dark:text-rose-300/70'}`}>
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
          </p>
          {/* Hover Tooltip */}
          {stockDetails.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-2xl min-w-[220px]">
                <p className="text-[10px] uppercase text-zinc-500 font-semibold mb-2 tracking-wider">종목별 손익</p>
                <div className="space-y-1.5 text-xs">
                  {stockDetails.map(s => (
                    <div key={s.ticker} className="flex justify-between items-center gap-3">
                      <span className="text-zinc-400">{s.ticker}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold ${s.profit >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                          {s.profit >= 0 ? '+' : ''}{formatKRW(s.profit, true)}
                        </span>
                        <span className={`text-[10px] ${s.profitPct >= 0 ? 'text-green-600 dark:text-green-300/70' : 'text-rose-600 dark:text-rose-300/70'}`}>
                          {s.profitPct >= 0 ? '+' : ''}{s.profitPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-zinc-900"></div>
            </div>
          )}
        </div>
        <div className="bento-card-sm border-amber-500/20 bg-amber-500/5 animate-enter delay-150">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-300/80 uppercase tracking-wider mb-1 whitespace-nowrap">채권 자산</p>
          <p className="text-lg md:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{formatKRW(bonds.balance, true)}</p>
          {bonds.monthsLeft !== undefined && (
            <p className="text-xs text-amber-600 dark:text-amber-300/70 mt-1">만기 {bonds.monthsLeft}개월</p>
          )}
        </div>
        <div className="bento-card-sm border-blue-500/20 bg-blue-500/5 animate-enter delay-200">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-300/80 uppercase tracking-wider mb-1 whitespace-nowrap">총 투자자산</p>
          <p className="text-lg md:text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{formatKRW(data.totalInvestmentKRW, true)}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300/70 mt-1">주식+채권</p>
        </div>
        <div className="bento-card-sm border-teal-500/20 bg-teal-500/5 animate-enter delay-250 relative group">
          <p className="text-xs font-semibold text-teal-600 dark:text-teal-300/80 uppercase tracking-wider mb-1 whitespace-nowrap">예상 연 배당</p>
          <p className="text-lg md:text-xl font-bold font-mono text-teal-600 dark:text-teal-400">{formatKRW(estimatedAnnualDividend, true)}</p>
          <p className="text-xs text-teal-700 dark:text-teal-300/70 mt-1">월 {formatKRW(estimatedAnnualDividend / 12, true)}</p>
          {/* Hover Tooltip */}
          {dividendDetails.length > 0 && (
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-2xl min-w-[220px]">
                <p className="text-[10px] uppercase text-zinc-500 font-semibold mb-2 tracking-wider">종목/계좌별 예상 배당</p>
                <div className="space-y-1.5 text-xs max-h-[200px] overflow-y-auto">
                  {dividendDetails.map(d => (
                    <div key={d.name} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-400">{d.name}</span>
                        <span className="text-zinc-600 text-[10px]">({d.yieldRate}%)</span>
                      </div>
                      <span className="text-teal-600 dark:text-teal-400 font-mono font-semibold">{formatKRW(d.dividend, true)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute top-full right-4 border-4 border-transparent border-t-white dark:border-t-zinc-900"></div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-3">
        {/* Portfolio Allocation - Compact */}
        <div className="glass-card animate-enter delay-300 border-violet-500/10">
          <div className="h-10 border-b border-violet-200 dark:border-white/[0.06] flex items-center justify-between px-4 bg-violet-500/10">
            <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Portfolio vs Benchmark</h3>
            <div className="flex gap-2">
              {['SPY', 'QQQ', 'TQQQ'].map(b => (
                <button
                  key={b}
                  onClick={() => toggleBenchmark(b)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    selectedBenchmarks.includes(b)
                      ? b === 'SPY' ? 'bg-blue-500/30 text-blue-600 dark:text-blue-300' : b === 'QQQ' ? 'bg-green-500/30 text-green-600 dark:text-green-300' : 'bg-amber-500/30 text-amber-600 dark:text-amber-300'
                      : 'bg-zinc-200 dark:bg-white/5 text-zinc-600 dark:text-zinc-500'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={benchmarkComparisonData} margin={{ left: 0, right: 15, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      if (v >= 100000000) return `${(v/100000000).toFixed(1)}억`;
                      return `${Math.round(v/10000)}만`;
                    }}
                    width={55}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const sortedPayload = [...payload]
                        .filter(p => p.value != null)
                        .sort((a, b) => b.value - a.value);
                      const colorMap = { portfolio: '#8B5CF6', spy: '#3B82F6', qqq: '#22C55E', tqqq: '#F59E0B' };
                      const nameMap = { portfolio: '내 포트폴리오', spy: 'SPY', qqq: 'QQQ', tqqq: 'TQQQ' };
                      return (
                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-2xl">
                          <p className="text-zinc-800 dark:text-white font-semibold text-xs mb-2">{label}</p>
                          <div className="space-y-1">
                            {sortedPayload.map((entry) => (
                              <div key={entry.dataKey} className="flex justify-between items-center gap-4 text-xs">
                                <span style={{ color: colorMap[entry.dataKey] }}>{nameMap[entry.dataKey]}</span>
                                <span className="font-mono font-semibold" style={{ color: colorMap[entry.dataKey] }}>
                                  {formatKRW(entry.value, true)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconSize={10} />
                  <Line type="monotone" dataKey="portfolio" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="내 포트폴리오" />
                  {selectedBenchmarks.includes('SPY') && <Line type="monotone" dataKey="spy" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="SPY" />}
                  {selectedBenchmarks.includes('QQQ') && <Line type="monotone" dataKey="qqq" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="QQQ" />}
                  {selectedBenchmarks.includes('TQQQ') && <Line type="monotone" dataKey="tqqq" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="TQQQ" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Account Tables */}
        <div className="glass-card flex flex-col animate-enter delay-400">
          <div className="h-12 border-b border-violet-500/20 flex items-center px-4 md:px-6 bg-violet-500/10 justify-between">
            <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Account Details</h3>
            {data.hasIndividualStocks && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase">향화 영웅문</span>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-green-500/30"
                >
                  <Plus size={14} /> 종목 추가
                </button>
              </div>
            )}
          </div>

          {data.hasIndividualStocks ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead className="bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-300 uppercase">
                  <tr>
                    <th className="p-3 md:p-4 whitespace-nowrap">종목</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">수량</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">평단가</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">현재가</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">평가액($)</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">평가액(₩)</th>
                    <th className="p-3 md:p-4 text-right whitespace-nowrap">수익률</th>
                    <th className="p-3 md:p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {[...stocks.list]
                    .sort((a, b) => {
                      const valueA = a.qty * (data.stockPrices[a.ticker] || 0);
                      const valueB = b.qty * (data.stockPrices[b.ticker] || 0);
                      return valueB - valueA; // 평가액 내림차순
                    })
                    .map((s, idx) => {
                    const price = data.stockPrices[s.ticker] || 0;
                    const avgPrice = parseFloat(s.avgPrice) || price;
                    const valUSD = s.qty * price;
                    const valKRW = valUSD * exchangeRate;
                    const profit = avgPrice > 0 ? ((price / avgPrice) - 1) * 100 : 0;
                    const profitAmount = s.qty * (price - avgPrice);
                    return (
                      <tr key={s.ticker} className={`data-row border-b border-zinc-200 dark:border-white/[0.04] animate-enter delay-${idx * 50} group`}>
                        <td className="p-3 md:p-4 text-foreground whitespace-nowrap">
                          <div>{s.name}</div>
                          <span className="text-violet-600/70 dark:text-violet-400/70 font-mono text-xs">{s.ticker}</span>
                        </td>
                        <td className="p-3 md:p-4 text-right text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap">
                          <EditableCell
                            value={s.qty}
                            onSave={(newQty) => onUpdateStock && onUpdateStock(s.ticker, { qty: newQty })}
                            className="text-zinc-700 dark:text-zinc-300"
                          />
                        </td>
                        <td className="p-3 md:p-4 text-right text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                          <EditableCell
                            value={avgPrice.toFixed(2)}
                            onSave={(newAvgPrice) => onUpdateStock && onUpdateStock(s.ticker, { avgPrice: newAvgPrice })}
                            className="text-amber-600 dark:text-amber-400"
                          />
                        </td>
                        <td className="p-3 md:p-4 text-right text-zinc-800 dark:text-white font-mono whitespace-nowrap">{formatUSD(price)}</td>
                        <td className="p-3 md:p-4 text-right text-zinc-800 dark:text-white font-bold font-mono whitespace-nowrap">{formatUSD(valUSD)}</td>
                        <td className="p-3 md:p-4 text-right text-violet-600 dark:text-violet-400 font-mono whitespace-nowrap">{formatKRW(valKRW, true)}</td>
                        <td className={`p-3 md:p-4 text-right font-mono whitespace-nowrap ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          <div className="flex flex-col items-end">
                            <span>{formatPercent(profit)}</span>
                            <span className="text-xs opacity-70">{profitAmount >= 0 ? '+' : ''}{formatUSD(profitAmount)}</span>
                          </div>
                        </td>
                        <td className="p-3 md:p-4 text-center">
                          <button
                            onClick={() => onDeleteStock && onDeleteStock(s.ticker)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 p-6 space-y-4">
              {/* 재호 영웅문 */}
              <div className="bento-card border-violet-500/20 bg-violet-500/5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-violet-600 dark:text-violet-300">재호 영웅문</h4>
                  <span className="text-xs text-violet-500 dark:text-violet-400/70">월간 평가액</span>
                </div>
                <p className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400">{formatKRW(data.investmentTotals?.재호영웅문 || data.investmentTotals?.재호 || 0, true)}</p>
              </div>
              {/* 향화 카카오 (단타) */}
              <div className="bento-card border-amber-500/20 bg-amber-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-300">향화 카카오</h4>
                  <span className="text-xs text-amber-500 dark:text-amber-400/70">단타</span>
                </div>
                <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{formatKRW(data.investmentTotals?.향화카카오 || 0, true)}</p>
              </div>
              {/* 향화 영웅문 (장투) */}
              <div className="bento-card border-blue-500/20 bg-blue-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-300">향화 영웅문</h4>
                  <span className="text-xs text-blue-500 dark:text-blue-400/70">장투</span>
                </div>
                <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{formatKRW(data.investmentTotals?.향화영웅문 || 0, true)}</p>
              </div>
              {data.investmentTotals?.배당 > 0 && (
                <div className="bento-card border-green-500/20 bg-green-500/5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-300">배당금</h4>
                    <span className="text-xs text-green-500 dark:text-green-400/70">이번 달</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">{formatKRW(data.investmentTotals?.배당 || 0, true)}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-violet-500/10 border-t border-violet-500/20 flex items-center px-6 py-4 justify-between">
            {data.hasIndividualStocks ? (
              <div className="flex gap-4 md:gap-6 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-xs text-violet-500 dark:text-violet-400/70 uppercase font-semibold">향화 영웅문</span>
                  <span className="text-base text-zinc-800 dark:text-white font-semibold font-mono">{formatKRW(data.manual.younghwa, true)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-violet-500 dark:text-violet-400/70 uppercase font-semibold">향화 카카오</span>
                  <span className="text-base text-zinc-800 dark:text-white font-semibold font-mono">{formatKRW(data.manual.kakao, true)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-violet-500 dark:text-violet-400/70 uppercase font-semibold">재호 영웅문</span>
                  <span className="text-base text-zinc-800 dark:text-white font-semibold font-mono">{formatKRW(data.manual.jaeho, true)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs text-violet-500 dark:text-violet-400/70 uppercase font-semibold">투자 원금</span>
                <span className="text-base text-zinc-800 dark:text-white font-semibold font-mono">{formatKRW(data.investmentTotals?.원금 || 0, true)}</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-xs text-violet-500 dark:text-violet-400/70 uppercase font-semibold block">주식 총 합계</span>
              <span className="text-xl text-violet-600 dark:text-violet-400 font-bold font-mono">{formatKRW(data.totalStockKRW, true)}</span>
            </div>
          </div>
        </div>

        {/* 변경이력 & 월별 투자 현황 */}
        {changeHistory.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* 월별 투자 현황 차트 */}
            {monthlyInvestmentData.length > 0 && (
              <div className="glass-card animate-enter delay-500 border-cyan-500/10">
                <div className="h-10 border-b border-white/[0.06] flex items-center px-4 bg-cyan-500/10">
                  <TrendingUp size={14} className="text-cyan-400 mr-2" />
                  <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">월별 매수 현황</h3>
                </div>
                <div className="p-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyInvestmentData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="#a1a1aa"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => v.slice(2).replace('.', '/')}
                        />
                        <YAxis
                          stroke="#a1a1aa"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${Math.round(v/10000)}만`}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(24,24,27,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
                          formatter={(value, name) => [formatKRW(value, true), '매수액']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Bar dataKey="invested" fill="#22d3ee" name="매수액" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 변경이력 테이블 */}
            <div className="glass-card animate-enter delay-550 border-amber-500/10">
              <div className="h-10 border-b border-white/[0.06] flex items-center px-4 bg-amber-500/10">
                <History size={14} className="text-amber-400 mr-2" />
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">변경 이력</h3>
                <span className="ml-2 text-xs text-amber-400/60">{changeHistory.length}건</span>
                {onClearHistory && changeHistory.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('모든 변경 이력을 삭제하시겠습니까?')) {
                        await onClearHistory();
                      }
                    }}
                    className="ml-auto px-2 py-1 text-[10px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                  >
                    전체 초기화
                  </button>
                )}
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-amber-500/5 sticky top-0">
                    <tr>
                      <th className="p-2 text-left text-amber-400/70 font-semibold">시간</th>
                      <th className="p-2 text-left text-amber-400/70 font-semibold">종목</th>
                      <th className="p-2 text-left text-amber-400/70 font-semibold">유형</th>
                      <th className="p-2 text-left text-amber-400/70 font-semibold">변경</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeHistory.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] group">
                        <td className="p-2 text-zinc-500 font-mono">{formatHistoryDate(item.timestamp)}</td>
                        <td className="p-2 text-white font-mono font-semibold">{item.ticker}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.changeType === '추가' ? 'bg-green-500/20 text-green-400' :
                            item.changeType === '삭제' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.changeType}
                          </span>
                        </td>
                        <td className="p-2 text-zinc-400">
                          {item.changeType === '추가' ? (
                            <span className="text-green-400/80">{item.afterValue}</span>
                          ) : item.changeType === '삭제' ? (
                            <span className="text-red-400/80 line-through">{item.beforeValue}</span>
                          ) : (
                            <span>
                              <span className="text-zinc-500">{item.field}:</span>{' '}
                              <span className="text-zinc-500 line-through">{item.beforeValue}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-cyan-400">{item.afterValue}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {onDeleteHistoryItem && item.rowIndex && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`${item.ticker} ${item.changeType} 이력을 삭제하시겠습니까?`)) {
                                  await onDeleteHistoryItem(item.rowIndex);
                                  if (onRefreshHistory) onRefreshHistory();
                                }
                              }}
                              className="text-zinc-600 hover:text-red-400 transition-all"
                              title="삭제"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
