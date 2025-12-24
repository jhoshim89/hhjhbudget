import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp } from 'lucide-react';

// 기본 데이터 (만 원 단위)
const baseData = [
  { name: '1월', income: 720, expense: 310 },
  { name: '2월', income: 810, expense: 290 },
  { name: '3월', income: 750, expense: 450 },
  { name: '4월', income: 920, expense: 330 },
  { name: '5월', income: 840, expense: 310 },
  { name: '6월', income: 880, expense: 350 },
  { name: '7월', income: 850, expense: 320 },
  { name: '8월', income: 880, expense: 410 },
  { name: '9월', income: 910, expense: 350 },
  { name: '10월', income: 890, expense: 380 },
  { name: '11월', income: 950, expense: 310 },
  { name: '12월', income: 910, expense: 310 },
];

const AnalysisPanel = ({ title, children }) => (
  <div className="panel flex flex-col">
    <div className="h-10 border-b border-border flex items-center px-4 bg-panel-dark">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="p-4 flex-1">
      {children}
    </div>
  </div>
);

export default function AnnualTab({ currentData }) {
  const currentMonth = new Date().getMonth(); // 0-11
  const currentYear = new Date().getFullYear();
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'

  // 현재 월의 실제 데이터로 대체
  const chartData = useMemo(() => {
    return baseData.map((d, i) => {
      if (i === currentMonth && currentData) {
        return {
          ...d,
          income: Math.round(currentData.income / 10000),
          expense: Math.round(currentData.expense / 10000),
        };
      }
      return d;
    });
  }, [currentData, currentMonth]);

  // 연간 합계 계산
  const annualStats = useMemo(() => {
    const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
    const avgIncome = Math.round(totalIncome / 12);
    const avgExpense = Math.round(totalExpense / 12);
    const savingsRate = ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1);
    return { totalIncome, totalExpense, avgIncome, avgExpense, savingsRate };
  }, [chartData]);

  return (
    <div className="flex-1 flex flex-col bg-border gap-0.5">
      {/* Year Selection */}
      <div className="shrink-0 bg-panel border-b border-border p-4 flex justify-center items-center">
          <div className="flex items-center bg-background rounded border border-border p-1">
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft size={20} /></button>
            <span className="px-8 text-lg font-black text-white">{currentYear}</span>
            <button className="p-1 opacity-20 cursor-not-allowed text-slate-400"><ChevronRight size={20} /></button>
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5 bg-border shrink-0">
        <div className="panel p-4 md:p-6">
           <p className="text-label">연간 총 수입</p>
           <p className="text-xl md:text-2xl font-black text-emerald-400">{formatKRW(annualStats.totalIncome * 10000, true)}</p>
        </div>
        <div className="panel p-4 md:p-6">
           <p className="text-label">연간 총 지출</p>
           <p className="text-xl md:text-2xl font-black text-red-400">{formatKRW(annualStats.totalExpense * 10000, true)}</p>
        </div>
        <div className="panel p-4 md:p-6">
           <p className="text-label">연간 순수익</p>
           <p className="text-xl md:text-2xl font-black text-white">{formatKRW((annualStats.totalIncome - annualStats.totalExpense) * 10000, true)}</p>
        </div>
        <div className="panel p-4 md:p-6">
           <p className="text-label">평균 저축률</p>
           <p className="text-xl md:text-2xl font-black text-amber-400">{annualStats.savingsRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0.5 bg-border">
        <div className="col-span-12 md:col-span-8 panel p-4 md:p-6 flex flex-col min-h-[300px]">
           <div className="flex items-center justify-between mb-4 md:mb-6">
             <h3 className="text-sm font-bold text-white flex items-center gap-2">월별 수입/지출 추이</h3>
             <div className="flex bg-background rounded border border-border p-0.5">
               <button
                 onClick={() => setChartType('line')}
                 className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 <TrendingUp size={14} /> 라인
               </button>
               <button
                 onClick={() => setChartType('bar')}
                 className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 <BarChart3 size={14} /> 바
               </button>
             </div>
           </div>
           <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}만`} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B' }}
                      formatter={(value) => [`${value}만`, '']}
                    />
                    <Bar dataKey="income" fill="#10B981" radius={[2, 2, 0, 0]} name="수입" />
                    <Bar dataKey="expense" fill="#EF4444" radius={[2, 2, 0, 0]} name="지출" />
                 </BarChart>
                ) : (
                 <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncomeAnnual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenseAnnual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}만`} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B' }}
                      formatter={(value) => [`${value}만`, '']}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncomeAnnual)" strokeWidth={2} name="수입" />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpenseAnnual)" strokeWidth={2} name="지출" />
                 </AreaChart>
                )}
              </ResponsiveContainer>
           </div>
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-0.5 bg-border">
           <AnalysisPanel title="월평균 지표">
              <div className="flex gap-4">
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">평균 수입</p>
                    <p className="text-base font-black text-emerald-400">{formatKRW(annualStats.avgIncome * 10000, true)}</p>
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">평균 지출</p>
                    <p className="text-base font-black text-red-400">{formatKRW(annualStats.avgExpense * 10000, true)}</p>
                 </div>
              </div>
           </AnalysisPanel>
           <AnalysisPanel title="지출 TOP 5">
              <div className="space-y-2">
                 {[
                   { n: '대출 상환', v: 1692, p: 40 },
                   { n: '식비', v: 850, p: 20 },
                   { n: '교육비', v: 620, p: 15 },
                   { n: '관리비/가스', v: 420, p: 10 },
                   { n: '주유/교통', v: 310, p: 7 },
                 ].map(i => (
                   <div key={i.n}>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                         <span className="text-slate-300">{i.n}</span>
                         <span className="text-slate-500">{i.v}만 ({i.p}%)</span>
                      </div>
                      <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                         <div className="bg-red-500/50 h-full" style={{ width: `${i.p}%` }}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </AnalysisPanel>
        </div>
      </div>
    </div>
  );
}
