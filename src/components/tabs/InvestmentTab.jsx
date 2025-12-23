import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { formatKRW, formatUSD, formatPercent } from '../../utils/formatters';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const BenchmarkItem = ({ name, value, change }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">{name}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white font-mono">{value.toFixed(2)}</span>
      <span className="text-[10px] font-bold text-emerald-500 font-mono">▲ 1.2%</span>
    </div>
  </div>
);

export default function InvestmentTab({ data, handlers }) {
  const { exchangeRate, stocks, bonds, benchmarks } = data;
  const { onExchangeRateChange } = handlers || {};

  const pieData = stocks.list.map(s => ({ name: s.ticker, value: s.qty * (data.stockPrices[s.ticker] || 0) }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-border gap-0.5">
      {/* Top Controls & Summaries */}
      <div className="shrink-0 bg-panel border-b border-border p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-background rounded border border-border p-1">
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft size={16} /></button>
            <span className="px-3 text-sm font-bold text-white font-mono">2023-11</span>
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronRight size={16} /></button>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">환율</span>
            <input 
              type="number" 
              value={exchangeRate} 
              onChange={(e) => onExchangeRateChange && onExchangeRateChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-white w-16 outline-none font-mono text-right" 
            />
            <button className="text-blue-500 hover:text-blue-400"><RefreshCw size={14} /></button>
          </div>
        </div>
        <div className="flex gap-6">
           <BenchmarkItem name="SPY" value={ benchmarks.spy } />
           <BenchmarkItem name="QQQ" value={ benchmarks.qqq } />
           <BenchmarkItem name="TQQQ" value={ benchmarks.tqqq } />
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition font-sans shadow-lg shadow-blue-900/20">
          <RefreshCw size={14} /> 전체 업데이트
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-0.5 bg-border shrink-0">
        <div className="panel p-4 animate-enter delay-0">
           <p className="text-label">총 평가액 (USD)</p>
           <p className="text-xl font-bold font-mono text-white">{formatUSD(data.totalStockUSD)}</p>
        </div>
        <div className="panel p-4 animate-enter delay-100">
           <p className="text-label">총 평가액 (KRW)</p>
           <p className="text-xl font-bold font-mono text-violet-400">{formatKRW(data.totalStockKRW, true)}</p>
        </div>
        <div className="panel p-4 animate-enter delay-200">
           <p className="text-label">채권 자산</p>
           <p className="text-xl font-bold font-mono text-amber-400">{formatKRW(bonds.balance, true)}</p>
        </div>
        <div className="panel p-4 animate-enter delay-300">
           <p className="text-label">총 자산</p>
           <p className="text-xl font-bold font-mono text-blue-400">{formatKRW(data.totalInvestmentKRW, true)}</p>
        </div>
        <div className="panel p-4 animate-enter delay-400">
           <p className="text-label">투자 원금</p>
           <p className="text-xl font-bold font-mono text-slate-400">{formatKRW(data.investedPrincipal, true)}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-0.5 bg-border overflow-hidden">
        {/* Left Column: Visualization */}
        <div className="col-span-12 md:col-span-4 panel flex flex-col overflow-hidden animate-enter delay-500">
           <div className="h-10 border-b border-border flex items-center px-4 bg-panel-dark">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Portfolio Allocation</h3>
           </div>
           <div className="flex-1 overflow-auto p-4 space-y-6">
              <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                          {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                       </Pie>
                       <Tooltip contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', fontFamily: 'Manrope' }} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase font-sans">평가액 vs 원금</h4>
                 <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={data.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
                          <Area type="monotone" dataKey="principal" stroke="#64748B" fill="#64748B" fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: Account Tables */}
        <div className="col-span-12 md:col-span-8 panel flex flex-col overflow-hidden animate-enter delay-500">
           <div className="h-10 border-b border-border flex items-center px-6 bg-panel-dark justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Account Details</h3>
              <span className="text-[10px] font-bold text-blue-400 uppercase font-sans">Hyanghwa Youngpoong-moon</span>
           </div>
           <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-panel-dark/50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 font-sans">
                    <tr>
                       <th className="p-4">종목</th>
                       <th className="p-4 text-right">수량</th>
                       <th className="p-4 text-right">현재가</th>
                       <th className="p-4 text-right">평가액($)</th>
                       <th className="p-4 text-right">평가액(₩)</th>
                       <th className="p-4 text-right">수익률</th>
                    </tr>
                 </thead>
                 <tbody className="text-xs font-bold">
                    {stocks.list.map((s, idx) => {
                       const price = data.stockPrices[s.ticker] || 0;
                       const valUSD = s.qty * price;
                       const valKRW = valUSD * exchangeRate;
                       const profit = ((price / parseFloat(s.avgPrice)) - 1) * 100;
                       return (
                          <tr key={s.ticker} className={`data-row border-b border-border/50 animate-enter delay-${idx * 50}`}>
                             <td className="p-4 text-white font-sans">{s.name} <span className="text-slate-500 ml-1 font-mono text-[10px]">{s.ticker}</span></td>
                             <td className="p-4 text-right text-slate-300 font-mono">{s.qty}</td>
                             <td className="p-4 text-right text-white font-mono">{formatUSD(price)}</td>
                             <td className="p-4 text-right text-white font-black font-mono">{formatUSD(valUSD)}</td>
                             <td className="p-4 text-right text-violet-400 font-mono">{formatKRW(valKRW, true)}</td>
                             <td className={`p-4 text-right font-mono ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatPercent(profit)}</td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
           <div className="h-14 bg-panel-dark border-t border-border flex items-center px-6 justify-between shrink-0">
              <div className="flex gap-4">
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
  );
}
