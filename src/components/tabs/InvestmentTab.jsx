import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatKRW, formatUSD, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import AddStockModal from '../investment/AddStockModal';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

// Mock benchmark comparison data with TQQQ
const benchmarkComparisonData = [
  { date: '6월', portfolio: 0, spy: 0, qqq: 0, tqqq: 0 },
  { date: '7월', portfolio: 7.1, spy: 3.2, qqq: 4.1, tqqq: 9.8 },
  { date: '8월', portfolio: 2.4, spy: 1.8, qqq: 2.5, tqqq: 5.2 },
  { date: '9월', portfolio: 14.3, spy: 5.6, qqq: 7.2, tqqq: 18.5 },
  { date: '10월', portfolio: 21.4, spy: 8.1, qqq: 11.3, tqqq: 28.2 },
  { date: '11월', portfolio: 24.5, spy: 10.2, qqq: 14.8, tqqq: 35.6 },
];

export default function InvestmentTab({ data, handlers }) {
  const { exchangeRate, stocks, bonds, benchmarks } = data;
  const { onAddStock, onDeleteStock } = handlers || {};
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState(['SPY', 'QQQ', 'TQQQ']);

  // 월 선택 상태
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const isCurrentMonth = selectedMonth.year === today.getFullYear() && selectedMonth.month === today.getMonth() + 1;
  const changeMonth = (delta) => {
    setSelectedMonth(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      else if (newMonth < 1) { newMonth = 12; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  const pieData = stocks.list.map(s => ({ name: s.ticker, value: s.qty * (data.stockPrices[s.ticker] || 0) }));

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
    <div className="flex-1 flex flex-col bg-border gap-0.5">
      {/* Month Selector */}
      <div className="shrink-0 bg-panel border-b border-border p-3 flex justify-center items-center">
        <div className="flex items-center bg-background rounded border border-border p-1">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="px-6 text-sm font-bold text-white min-w-[120px] text-center">
            {selectedMonth.year}년 {selectedMonth.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-violet-400">(현재)</span>}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className={`p-1 rounded transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed text-slate-400' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 md:p-4 bg-panel-dark border-b-2 border-violet-500/30 shrink-0">
        <div className="bg-gradient-to-br from-violet-900/40 to-violet-950/20 rounded-lg p-4 border border-violet-500/20 animate-enter delay-0">
          <p className="text-xs font-bold text-violet-300/80 uppercase tracking-wider mb-2">주식 총 평가액</p>
          <p className="text-xl md:text-2xl font-black font-mono text-violet-400">{formatKRW(data.totalStockKRW, true)}</p>
          <p className="text-xs text-slate-500 font-mono mt-1">{formatUSD(data.totalStockUSD)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-amber-950/20 rounded-lg p-4 border border-amber-500/20 animate-enter delay-100">
          <p className="text-xs font-bold text-amber-300/80 uppercase tracking-wider mb-2">채권 자산</p>
          <p className="text-xl md:text-2xl font-black font-mono text-amber-400">{formatKRW(bonds.balance, true)}</p>
          {bonds.monthsLeft !== undefined && (
            <p className="text-xs text-slate-500 mt-1">만기 {bonds.monthsLeft}개월 남음</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 rounded-lg p-4 border border-blue-500/20 animate-enter delay-200">
          <p className="text-xs font-bold text-blue-300/80 uppercase tracking-wider mb-2">총 투자자산</p>
          <p className="text-xl md:text-2xl font-black font-mono text-blue-400">{formatKRW(data.totalInvestmentKRW, true)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/20 rounded-lg p-4 border border-emerald-500/20 animate-enter delay-300">
          <p className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider mb-2">수익률</p>
          <p className="text-xl md:text-2xl font-black font-mono text-emerald-400">
            {bonds.yieldRate ? `${bonds.yieldRate}%` : '-'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 rounded-lg p-4 border border-slate-500/20 animate-enter delay-400">
          <p className="text-xs font-bold text-slate-300/80 uppercase tracking-wider mb-2">투자 원금</p>
          <p className="text-xl md:text-2xl font-black font-mono text-slate-400">{formatKRW(data.investedPrincipal, true)}</p>
        </div>
      </div>

      {/* Main Content Area - Full Page Scroll */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0.5 bg-border">
        {/* Left Column: Visualization */}
        <div className="md:col-span-4 panel flex flex-col animate-enter delay-500">
          <div className="h-10 border-b border-border flex items-center px-4 bg-panel-dark">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Portfolio Allocation</h3>
          </div>
          <div className="p-4 space-y-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value) => [formatKRW(value, true), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Benchmark Comparison */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase font-sans">벤치마크 비교 (%)</h4>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBenchmarks.includes('SPY')}
                      onChange={() => toggleBenchmark('SPY')}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-blue-400">SPY</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBenchmarks.includes('QQQ')}
                      onChange={() => toggleBenchmark('QQQ')}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-emerald-400">QQQ</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBenchmarks.includes('TQQQ')}
                      onChange={() => toggleBenchmark('TQQQ')}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-amber-400">TQQQ</span>
                  </label>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchmarkComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value) => [`${value.toFixed(1)}%`]}
                    />
                    <Line type="monotone" dataKey="portfolio" stroke="#8B5CF6" strokeWidth={2} dot={false} name="My Portfolio" />
                    {selectedBenchmarks.includes('SPY') && (
                      <Line type="monotone" dataKey="spy" stroke="#3B82F6" strokeWidth={2} dot={false} name="SPY" strokeDasharray="5 5" />
                    )}
                    {selectedBenchmarks.includes('QQQ') && (
                      <Line type="monotone" dataKey="qqq" stroke="#10B981" strokeWidth={2} dot={false} name="QQQ" strokeDasharray="5 5" />
                    )}
                    {selectedBenchmarks.includes('TQQQ') && (
                      <Line type="monotone" dataKey="tqqq" stroke="#F59E0B" strokeWidth={2} dot={false} name="TQQQ" strokeDasharray="5 5" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-violet-500 rounded"></div>
                  <span className="text-slate-400">내 포트폴리오</span>
                </div>
                {selectedBenchmarks.includes('SPY') && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-500 rounded" style={{backgroundImage: 'repeating-linear-gradient(90deg, #3B82F6 0 3px, transparent 3px 6px)'}}></div>
                    <span className="text-slate-400">SPY</span>
                  </div>
                )}
                {selectedBenchmarks.includes('QQQ') && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-emerald-500 rounded" style={{backgroundImage: 'repeating-linear-gradient(90deg, #10B981 0 3px, transparent 3px 6px)'}}></div>
                    <span className="text-slate-400">QQQ</span>
                  </div>
                )}
                {selectedBenchmarks.includes('TQQQ') && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-amber-500 rounded" style={{backgroundImage: 'repeating-linear-gradient(90deg, #F59E0B 0 3px, transparent 3px 6px)'}}></div>
                    <span className="text-slate-400">TQQQ</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Tables */}
        <div className="md:col-span-8 panel flex flex-col animate-enter delay-500">
          <div className="h-10 border-b border-border flex items-center px-6 bg-panel-dark justify-between">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Account Details</h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-blue-400 uppercase font-sans">향화 영웅문</span>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/20"
              >
                <Plus size={12} /> 종목 추가
              </button>
            </div>
          </div>
          <div className="flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-panel-dark/50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 font-sans">
                <tr>
                  <th className="p-4">종목</th>
                  <th className="p-4 text-right">수량</th>
                  <th className="p-4 text-right">현재가</th>
                  <th className="p-4 text-right">평가액($)</th>
                  <th className="p-4 text-right">평가액(₩)</th>
                  <th className="p-4 text-right">수익률</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold">
                {stocks.list.map((s, idx) => {
                  const price = data.stockPrices[s.ticker] || 0;
                  const valUSD = s.qty * price;
                  const valKRW = valUSD * exchangeRate;
                  const profit = ((price / parseFloat(s.avgPrice)) - 1) * 100;
                  return (
                    <tr key={s.ticker} className={`data-row border-b border-border/50 animate-enter delay-${idx * 50} group`}>
                      <td className="p-4 text-white font-sans">{s.name} <span className="text-slate-500 ml-1 font-mono text-[10px]">{s.ticker}</span></td>
                      <td className="p-4 text-right text-slate-300 font-mono">{s.qty}</td>
                      <td className="p-4 text-right text-white font-mono">{formatUSD(price)}</td>
                      <td className="p-4 text-right text-white font-black font-mono">{formatUSD(valUSD)}</td>
                      <td className="p-4 text-right text-violet-400 font-mono">{formatKRW(valKRW, true)}</td>
                      <td className={`p-4 text-right font-mono ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatPercent(profit)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onDeleteStock && onDeleteStock(s.ticker)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all"
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
          <div className="bg-panel-dark border-t border-border flex items-center px-6 py-4 justify-between shrink-0">
            <div className="flex gap-4 md:gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-sans">향화 영웅문</span>
                <span className="text-sm text-white font-bold font-mono">{formatKRW(data.manual.younghwa, true)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-sans">향화 카카오</span>
                <span className="text-sm text-white font-bold font-mono">{formatKRW(data.manual.kakao, true)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-sans">재호 영웅문</span>
                <span className="text-sm text-white font-bold font-mono">{formatKRW(data.manual.jaeho, true)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block font-sans">주식 총 합계</span>
              <span className="text-lg text-violet-400 font-bold font-mono">{formatKRW(data.totalStockKRW, true)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
