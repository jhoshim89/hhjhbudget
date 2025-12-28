import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatKRW, formatUSD, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import AddStockModal from '../investment/AddStockModal';

// Portfolio Bar Item - 그라데이션 바 리스트 스타일
const PortfolioBarItem = ({ ticker, value, percent, profit, isLast }) => {
  const isPositive = profit >= 0;

  return (
    <div className={`p-3 ${!isLast ? 'border-b border-white/[0.06]' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{ticker}</span>
          <span className="text-xs text-foreground-muted font-mono">{formatKRW(value, true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">{percent.toFixed(1)}%</span>
          <span className={`text-xs font-bold font-mono ${isPositive ? 'text-teal-400' : 'text-rose-400'}`}>
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
  const boxStyle = "w-16 px-2 py-0.5 text-right font-mono text-xs";

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

// Dividend yields
const DIVIDEND_YIELDS = {
  'NVDA': 0.03,
  'AAPL': 0.50,
  'MSFT': 0.75,
  'GOOGL': 0.50,
  'TSLA': 0,
  'SPY': 1.30,
  'QQQ': 0.55,
  'TQQQ': 0,
  'VOO': 1.35,
  'VTI': 1.40,
  'SCHD': 3.50,
};

export default function InvestmentTab({ data, handlers, selectedMonth, onMonthChange }) {
  const { exchangeRate, stocks, bonds, benchmarks } = data;
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

  const estimatedAnnualDividend = data.hasIndividualStocks
    ? stocks.list.reduce((total, s) => {
        const price = data.stockPrices[s.ticker] || 0;
        const value = s.qty * price * exchangeRate;
        const yieldRate = DIVIDEND_YIELDS[s.ticker] || 0.5;
        return total + (value * yieldRate / 100);
      }, 0)
    : data.totalStockKRW * 0.012;

  const portfolioValue = data.totalStockKRW;
  const investedPrincipal = data.investedPrincipal || portfolioValue * 0.8;

  const spyPrice = data.stockPrices['SPY'] || 595;
  const qqqPrice = data.stockPrices['QQQ'] || 520;
  const tqqqPrice = data.stockPrices['TQQQ'] || 75;

  const benchmarkReturns = {
    spy: 0.12,
    qqq: 0.18,
    tqqq: 0.45,
  };

  const historyData = data.history || [];
  const currentMonthStr = `${selectedMonth?.year}-${String(selectedMonth?.month).padStart(2, '0')}`;
  const lastHistoryMonth = historyData.length > 0 ? historyData[historyData.length - 1].month : null;
  const isCurrentInHistory = lastHistoryMonth === currentMonthStr;

  const benchmarkComparisonData = historyData.length > 0
    ? (() => {
        const firstMonth = historyData[0];
        const baseValue = firstMonth.원금 || firstMonth.total;

        const chartData = historyData.map((h, idx) => {
          const monthsElapsed = idx;
          return {
            date: h.month.slice(2).replace('-', '/'),
            portfolio: h.total,
            spy: baseValue * Math.pow(1.10, monthsElapsed / 12),
            qqq: baseValue * Math.pow(1.15, monthsElapsed / 12),
            tqqq: baseValue * Math.pow(1.30, monthsElapsed / 12),
            isProjected: false,
          };
        });

        if (!isCurrentInHistory && portfolioValue > 0) {
          const totalMonths = historyData.length;
          chartData.push({
            date: '현재',
            portfolio: portfolioValue,
            spy: baseValue * Math.pow(1.10, totalMonths / 12),
            qqq: baseValue * Math.pow(1.15, totalMonths / 12),
            tqqq: baseValue * Math.pow(1.30, totalMonths / 12),
            isProjected: true,
          });
        }
        return chartData;
      })()
    : [
        { date: '시작', portfolio: investedPrincipal, spy: investedPrincipal, qqq: investedPrincipal, tqqq: investedPrincipal, isProjected: false },
        { date: '현재', portfolio: portfolioValue, spy: investedPrincipal * (1 + benchmarkReturns.spy), qqq: investedPrincipal * (1 + benchmarkReturns.qqq), tqqq: investedPrincipal * (1 + benchmarkReturns.tqqq), isProjected: true },
      ];

  const allValues = benchmarkComparisonData.flatMap(d => [d.portfolio, d.spy, d.qqq, d.tqqq].filter(Boolean));
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const yPadding = (dataMax - dataMin) * 0.1 || dataMin * 0.1;
  const yDomain = [Math.max(0, dataMin - yPadding), dataMax + yPadding];

  const toggleBenchmark = (benchmark) => {
    setSelectedBenchmarks(prev =>
      prev.includes(benchmark)
        ? prev.filter(b => b !== benchmark)
        : [...prev, benchmark]
    );
  };

  return (
    <>
    <AddStockModal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      onAdd={onAddStock}
    />
    <div className="flex flex-col gap-3 p-3 md:p-4">
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bento-card-sm border-violet-500/20 bg-violet-500/5 animate-enter delay-0">
          <p className="text-[10px] font-semibold text-violet-300/80 uppercase tracking-wider mb-1">주식 평가액</p>
          <p className="text-lg md:text-xl font-bold font-mono text-violet-400">{formatKRW(data.totalStockKRW, true)}</p>
          <p className="text-[10px] text-violet-600 dark:text-violet-300/70 font-mono mt-1">원금 {formatKRW(investedPrincipal, true)}</p>
        </div>
        <div className="bento-card-sm border-amber-500/20 bg-amber-500/5 animate-enter delay-50">
          <p className="text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider mb-1">채권 자산</p>
          <p className="text-lg md:text-xl font-bold font-mono text-amber-400">{formatKRW(bonds.balance, true)}</p>
          {bonds.monthsLeft !== undefined && (
            <p className="text-[10px] text-amber-600 dark:text-amber-300/70 mt-1">만기 {bonds.monthsLeft}개월</p>
          )}
        </div>
        <div className="bento-card-sm border-blue-500/20 bg-blue-500/5 animate-enter delay-100">
          <p className="text-[10px] font-semibold text-blue-300/80 uppercase tracking-wider mb-1">총 투자자산</p>
          <p className="text-lg md:text-xl font-bold font-mono text-blue-400">{formatKRW(data.totalInvestmentKRW, true)}</p>
        </div>
        <div className="bento-card-sm border-green-500/20 bg-green-500/5 animate-enter delay-150">
          <p className="text-[10px] font-semibold text-green-300/80 uppercase tracking-wider mb-1">예상 연 배당</p>
          <p className="text-lg md:text-xl font-bold font-mono text-green-400">{formatKRW(estimatedAnnualDividend, true)}</p>
          <p className="text-[10px] text-green-600 dark:text-green-300/70 mt-1">월 {formatKRW(estimatedAnnualDividend / 12, true)}</p>
        </div>
        <div className="bento-card-sm border-rose-500/20 bg-rose-500/5 animate-enter delay-200">
          <p className="text-[10px] font-semibold text-rose-300/80 uppercase tracking-wider mb-1">평가 손익</p>
          <p className={`text-lg md:text-xl font-bold font-mono ${portfolioValue - investedPrincipal >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
            {portfolioValue - investedPrincipal >= 0 ? '+' : ''}{formatKRW(portfolioValue - investedPrincipal, true)}
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-300/70 mt-1">
            {((portfolioValue / investedPrincipal - 1) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-3">
        {/* Visualization */}
        <div className="glass-card flex flex-col animate-enter delay-300 border-violet-500/10">
          <div className="h-10 border-b border-white/[0.06] flex items-center px-4 bg-violet-500/10">
            <h3 className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Portfolio Allocation</h3>
          </div>
          <div className="flex-1 flex flex-col">
            {/* Portfolio Bar List */}
            <div className="flex-1 overflow-y-auto max-h-[220px]">
              {data.hasIndividualStocks ? (
                (() => {
                  const barData = stocks.list.map(s => {
                    const price = data.stockPrices[s.ticker] || 0;
                    const value = s.qty * price * exchangeRate;
                    const profit = ((price / parseFloat(s.avgPrice || price)) - 1) * 100;
                    return { ticker: s.ticker, value, profit };
                  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

                  const totalValue = barData.reduce((sum, d) => sum + d.value, 0);

                  return barData.map((item, idx) => (
                    <PortfolioBarItem
                      key={item.ticker}
                      ticker={item.ticker}
                      value={item.value}
                      percent={(item.value / totalValue) * 100}
                      profit={item.profit}
                      isLast={idx === barData.length - 1}
                    />
                  ));
                })()
              ) : (
                (() => {
                  const barData = pieData.map(item => ({
                    ticker: item.name.replace(' 해외주식', ''),
                    value: item.value,
                    profit: item.profit || 0,
                  })).filter(d => d.value > 0);

                  const totalValue = barData.reduce((sum, d) => sum + d.value, 0);

                  return barData.map((item, idx) => (
                    <PortfolioBarItem
                      key={item.ticker}
                      ticker={item.ticker}
                      value={item.value}
                      percent={(item.value / totalValue) * 100}
                      profit={item.profit}
                      isLast={idx === barData.length - 1}
                    />
                  ));
                })()
              )}
            </div>

            {/* Benchmark Comparison */}
            <div className="space-y-3 p-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-violet-400/80 uppercase">벤치마크 비교</h4>
                <div className="flex gap-2">
                  {['SPY', 'QQQ', 'TQQQ'].map(b => (
                    <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBenchmarks.includes(b)}
                        onChange={() => toggleBenchmark(b)}
                        className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0"
                      />
                      <span className={`text-[10px] font-semibold ${b === 'SPY' ? 'text-blue-400' : b === 'QQQ' ? 'text-green-400' : 'text-amber-400'}`}>{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-violet-500/10 rounded-xl p-2 border border-violet-500/20">
                  <p className="text-[9px] text-violet-600 dark:text-violet-300">포트폴리오</p>
                  <p className="text-xs font-semibold text-violet-400">{formatKRW(portfolioValue, true)}</p>
                </div>
                {selectedBenchmarks.includes('SPY') && (
                  <div className="bg-blue-500/10 rounded-xl p-2 border border-blue-500/20">
                    <p className="text-[9px] text-blue-600 dark:text-blue-300">SPY</p>
                    <p className="text-xs font-semibold text-blue-400">{formatKRW(investedPrincipal * (1 + benchmarkReturns.spy), true)}</p>
                  </div>
                )}
                {selectedBenchmarks.includes('QQQ') && (
                  <div className="bg-green-500/10 rounded-xl p-2 border border-green-500/20">
                    <p className="text-[9px] text-green-600 dark:text-green-300">QQQ</p>
                    <p className="text-xs font-semibold text-green-400">{formatKRW(investedPrincipal * (1 + benchmarkReturns.qqq), true)}</p>
                  </div>
                )}
                {selectedBenchmarks.includes('TQQQ') && (
                  <div className="bg-amber-500/10 rounded-xl p-2 border border-amber-500/20">
                    <p className="text-[9px] text-amber-600 dark:text-amber-300">TQQQ</p>
                    <p className="text-xs font-semibold text-amber-400">{formatKRW(investedPrincipal * (1 + benchmarkReturns.tqqq), true)}</p>
                  </div>
                )}
              </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchmarkComparisonData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#52525B" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#52525B" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/10000)}만`} width={40} domain={yDomain} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(24,24,27,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value) => [formatKRW(value, true)]}
                    />
                    <Line type="monotone" dataKey="portfolio" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3, fill: '#8B5CF6' }} activeDot={{ r: 5 }} name="포트폴리오" />
                    {selectedBenchmarks.includes('SPY') && <Line type="monotone" dataKey="spy" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2.5, fill: '#3B82F6' }} activeDot={{ r: 4 }} name="SPY" />}
                    {selectedBenchmarks.includes('QQQ') && <Line type="monotone" dataKey="qqq" stroke="#22C55E" strokeWidth={2} dot={{ r: 2.5, fill: '#22C55E' }} activeDot={{ r: 4 }} name="QQQ" />}
                    {selectedBenchmarks.includes('TQQQ') && <Line type="monotone" dataKey="tqqq" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2.5, fill: '#F59E0B' }} activeDot={{ r: 4 }} name="TQQQ" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Account Tables */}
        <div className="glass-card flex flex-col animate-enter delay-400">
          <div className="h-10 border-b border-violet-500/20 flex items-center px-4 md:px-6 bg-violet-500/10 justify-between">
            <h3 className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Account Details</h3>
            {data.hasIndividualStocks && (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-semibold text-blue-400 uppercase">향화 영웅문</span>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition border border-green-500/30"
                >
                  <Plus size={12} /> 종목 추가
                </button>
              </div>
            )}
          </div>

          {data.hasIndividualStocks ? (
            <div className="flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-violet-500/10 text-[10px] font-semibold text-violet-400 dark:text-violet-300 uppercase">
                  <tr>
                    <th className="p-4">종목</th>
                    <th className="p-4 text-right">수량</th>
                    <th className="p-4 text-right">평단가</th>
                    <th className="p-4 text-right">현재가</th>
                    <th className="p-4 text-right">평가액($)</th>
                    <th className="p-4 text-right">평가액(₩)</th>
                    <th className="p-4 text-right">수익률</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium">
                  {stocks.list.map((s, idx) => {
                    const price = data.stockPrices[s.ticker] || 0;
                    const avgPrice = parseFloat(s.avgPrice) || price;
                    const valUSD = s.qty * price;
                    const valKRW = valUSD * exchangeRate;
                    const profit = avgPrice > 0 ? ((price / avgPrice) - 1) * 100 : 0;
                    const profitAmount = s.qty * (price - avgPrice);
                    return (
                      <tr key={s.ticker} className={`data-row border-b border-white/[0.04] animate-enter delay-${idx * 50} group`}>
                        <td className="p-4 text-foreground">{s.name} <span className="text-violet-400/70 ml-1 font-mono text-[10px]">{s.ticker}</span></td>
                        <td className="p-4 text-right text-zinc-300 font-mono">
                          <EditableCell
                            value={s.qty}
                            onSave={(newQty) => onUpdateStock && onUpdateStock(s.ticker, { qty: newQty })}
                            className="text-zinc-300"
                          />
                        </td>
                        <td className="p-4 text-right text-amber-400 font-mono">
                          <EditableCell
                            value={avgPrice.toFixed(2)}
                            onSave={(newAvgPrice) => onUpdateStock && onUpdateStock(s.ticker, { avgPrice: newAvgPrice })}
                            className="text-amber-400"
                          />
                        </td>
                        <td className="p-4 text-right text-white font-mono">{formatUSD(price)}</td>
                        <td className="p-4 text-right text-white font-bold font-mono">{formatUSD(valUSD)}</td>
                        <td className="p-4 text-right text-violet-400 font-mono">{formatKRW(valKRW, true)}</td>
                        <td className={`p-4 text-right font-mono ${profit >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                          <div className="flex flex-col items-end">
                            <span>{formatPercent(profit)}</span>
                            <span className="text-[10px] opacity-70">{profitAmount >= 0 ? '+' : ''}{formatUSD(profitAmount)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
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
                  <h4 className="text-sm font-semibold text-violet-300">재호 영웅문</h4>
                  <span className="text-xs text-violet-400/70">월간 평가액</span>
                </div>
                <p className="text-2xl font-bold font-mono text-violet-400">{formatKRW(data.investmentTotals?.재호영웅문 || data.investmentTotals?.재호 || 0, true)}</p>
              </div>
              {/* 향화 카카오 (단타) */}
              <div className="bento-card border-amber-500/20 bg-amber-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-amber-300">향화 카카오</h4>
                  <span className="text-xs text-amber-400/70">단타</span>
                </div>
                <p className="text-2xl font-bold font-mono text-amber-400">{formatKRW(data.investmentTotals?.향화카카오 || 0, true)}</p>
              </div>
              {/* 향화 영웅문 (장투) */}
              <div className="bento-card border-blue-500/20 bg-blue-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-blue-300">향화 영웅문</h4>
                  <span className="text-xs text-blue-400/70">장투</span>
                </div>
                <p className="text-2xl font-bold font-mono text-blue-400">{formatKRW(data.investmentTotals?.향화영웅문 || 0, true)}</p>
              </div>
              {data.investmentTotals?.배당 > 0 && (
                <div className="bento-card border-green-500/20 bg-green-500/5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-green-300">배당금</h4>
                    <span className="text-xs text-green-400/70">이번 달</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-green-400">{formatKRW(data.investmentTotals?.배당 || 0, true)}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-violet-500/10 border-t border-violet-500/20 flex items-center px-6 py-4 justify-between">
            {data.hasIndividualStocks ? (
              <div className="flex gap-4 md:gap-6 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-[10px] text-violet-400/70 uppercase font-semibold">향화 영웅문</span>
                  <span className="text-sm text-white font-semibold font-mono">{formatKRW(data.manual.younghwa, true)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-violet-400/70 uppercase font-semibold">향화 카카오</span>
                  <span className="text-sm text-white font-semibold font-mono">{formatKRW(data.manual.kakao, true)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-violet-400/70 uppercase font-semibold">재호 영웅문</span>
                  <span className="text-sm text-white font-semibold font-mono">{formatKRW(data.manual.jaeho, true)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[10px] text-violet-400/70 uppercase font-semibold">투자 원금</span>
                <span className="text-sm text-white font-semibold font-mono">{formatKRW(data.investmentTotals?.원금 || 0, true)}</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-[10px] text-violet-400/70 uppercase font-semibold block">주식 총 합계</span>
              <span className="text-lg text-violet-400 font-bold font-mono">{formatKRW(data.totalStockKRW, true)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
