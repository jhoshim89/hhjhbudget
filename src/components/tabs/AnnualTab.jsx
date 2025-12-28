import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 기본 데이터 (만 원 단위)
const baseData = [
  { name: '1월', income: 720, expense: 310, net: 410 },
  { name: '2월', income: 810, expense: 290, net: 520 },
  { name: '3월', income: 750, expense: 450, net: 300 },
  { name: '4월', income: 920, expense: 330, net: 590 },
  { name: '5월', income: 840, expense: 310, net: 530 },
  { name: '6월', income: 880, expense: 350, net: 530 },
  { name: '7월', income: 850, expense: 320, net: 530 },
  { name: '8월', income: 880, expense: 410, net: 470 },
  { name: '9월', income: 910, expense: 350, net: 560 },
  { name: '10월', income: 890, expense: 380, net: 510 },
  { name: '11월', income: 950, expense: 310, net: 640 },
  { name: '12월', income: 910, expense: 310, net: 600 },
];

const AnalysisPanel = ({ title, children }) => (
  <div className="glass-card flex flex-col">
    <div className="h-10 border-b border-white/[0.06] flex items-center px-4 bg-panel/20">
      <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4 flex-1">
      {children}
    </div>
  </div>
);

export default function AnnualTab({ currentData, investmentData }) {
  const currentMonth = new Date().getMonth(); // 0-11
  const currentYear = new Date().getFullYear();

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
    <div className="flex flex-col gap-3 p-3 md:p-4">
      {/* Year Selection */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="px-6 text-base font-display font-bold text-foreground">{currentYear}</span>
          <button className="p-2 opacity-20 cursor-not-allowed rounded-full text-foreground-muted">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bento-card-sm border-green-500/20 bg-green-500/5 animate-enter delay-0">
          <p className="text-[10px] font-semibold text-green-600 dark:text-green-300/80 uppercase tracking-wider mb-1">연간 총 수입</p>
          <p className="text-lg md:text-xl font-bold font-mono text-green-600 dark:text-green-400">{formatKRW(annualStats.totalIncome * 10000, true)}</p>
        </div>
        <div className="bento-card-sm border-rose-500/20 bg-rose-500/5 animate-enter delay-50">
          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-300/80 uppercase tracking-wider mb-1">연간 총 지출</p>
          <p className="text-lg md:text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{formatKRW(annualStats.totalExpense * 10000, true)}</p>
        </div>
        <div className="bento-card-sm border-amber-500/20 bg-amber-500/5 animate-enter delay-100">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-300/80 uppercase tracking-wider mb-1">연간 투자+저축</p>
          <p className="text-lg md:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{formatKRW((annualStats.totalIncome - annualStats.totalExpense) * 10000, true)}</p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">수입 대비 <span className="text-amber-600 dark:text-amber-400 font-semibold">{annualStats.savingsRate}%</span></p>
        </div>
        <div className="bento-card-sm border-violet-500/20 bg-violet-500/5 animate-enter delay-150">
          <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-300/80 uppercase tracking-wider mb-1">주식 평가액</p>
          <p className="text-lg md:text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{formatKRW(investmentData?.totalValue || 0, true)}</p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">원금 {formatKRW(investmentData?.principal || 0, true)}</p>
        </div>
        <div className="bento-card-sm border-blue-500/20 bg-blue-500/5 animate-enter delay-200">
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-300/80 uppercase tracking-wider mb-1">주식 수익</p>
          <p className={`text-lg md:text-xl font-bold font-mono ${(investmentData?.profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {(investmentData?.profit || 0) >= 0 ? '+' : ''}{formatKRW(investmentData?.profit || 0, true)}
          </p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">
            수익률 <span className={`font-semibold ${(investmentData?.profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {(investmentData?.profit || 0) >= 0 ? '+' : ''}{investmentData?.profitPercent || 0}%
            </span>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 glass-card p-4 md:p-6 flex flex-col min-h-[300px] animate-enter delay-300">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            월별 수입/지출 추이
          </h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradientAnnual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGradientAnnual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="transparent"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71717A', fontWeight: 500 }}
                />
                <YAxis
                  stroke="transparent"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}만`}
                  width={45}
                  tick={{ fill: '#52525B' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0]?.payload;
                    const income = data?.income || 0;
                    const expense = data?.expense || 0;
                    const net = income - expense;
                    return (
                      <div className="bg-white dark:bg-surface/95 backdrop-blur-xl border border-black/10 dark:border-white/[0.08] rounded-2xl p-4 shadow-2xl">
                        <p className="text-blue-600 dark:text-blue-400 font-semibold mb-3 text-sm">{label}</p>
                        <div className="space-y-1.5 text-sm">
                          <p className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-foreground-muted">수입</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">{income}만원</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-foreground-muted">지출</span>
                            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{expense}만원</span>
                          </p>
                          <p className="flex justify-between gap-4 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                            <span className="text-zinc-600 dark:text-foreground-muted">순수익</span>
                            <span className={`font-mono font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>{net}만원</span>
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#incomeGradientAnnual)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#22C55E', strokeWidth: 2, fill: '#09090B' }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#expenseGradientAnnual)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#F43F5E', strokeWidth: 2, fill: '#09090B' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex gap-6 mt-4 justify-center pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-zinc-600 dark:text-foreground-muted">수입</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-xs text-zinc-600 dark:text-foreground-muted">지출</span>
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-600">|</div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">hover → 순수익</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <AnalysisPanel title="월평균 지표">
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">평균 수입</p>
                <p className="text-base font-bold font-mono text-green-600 dark:text-green-400">{formatKRW(annualStats.avgIncome * 10000, true)}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">평균 지출</p>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">{formatKRW(annualStats.avgExpense * 10000, true)}</p>
              </div>
            </div>
          </AnalysisPanel>

          <AnalysisPanel title="지출 TOP 5">
            <div className="space-y-3">
              {[
                { n: '대출 상환', v: 1692, p: 40 },
                { n: '식비', v: 850, p: 20 },
                { n: '교육비', v: 620, p: 15 },
                { n: '관리비/가스', v: 420, p: 10 },
                { n: '주유/교통', v: 310, p: 7 },
              ].map((i, idx) => (
                <div key={i.n} className="animate-enter" style={{ animationDelay: `${(idx + 1) * 100}ms` }}>
                  <div className="flex justify-between text-[10px] font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">{i.n}</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-mono">{i.v}만 ({i.p}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-panel rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${i.p}%` }}
                    ></div>
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
