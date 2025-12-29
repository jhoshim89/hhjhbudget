import React, { useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 월 이름 상수
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

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

export default function AnnualTab({ currentData, investmentData, monthlyHistory = [], cardHistory = [], expenseTop5 = [] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // 카드값 차트 데이터 (선택된 연도만)
  const cardChartData = useMemo(() => {
    if (!cardHistory || cardHistory.length === 0) return [];

    // 선택된 연도만 필터링
    const yearData = cardHistory.filter(item => {
      const separator = item.month.includes('.') ? '.' : '-';
      return item.month.startsWith(`${selectedYear}${separator}`);
    });

    if (yearData.length === 0) return [];

    const avg = yearData.reduce((sum, d) => sum + d.amount, 0) / yearData.length;

    return yearData.map(item => {
      const separator = item.month.includes('.') ? '.' : '-';
      const [year, month] = item.month.split(separator);

      return {
        name: `${parseInt(month)}월`,
        displayMonth: `${year}.${month}`,
        amount: item.amount,
        avg,
        isOver: item.amount > avg,
      };
    });
  }, [cardHistory, selectedYear]);

  const cardAvg = useMemo(() => {
    if (cardChartData.length === 0) return 0;
    return cardChartData[0]?.avg || 0;
  }, [cardChartData]);

  // monthlyHistory에서 차트 데이터 생성 (선택된 연도만 필터링)
  const chartData = useMemo(() => {
    const data = MONTHS.map(name => ({ name, income: 0, expense: 0, net: 0 }));

    monthlyHistory
      .filter(({ month }) => {
        // 점(.) 또는 하이픈(-) 구분자 모두 지원
        const separator = month.includes('.') ? '.' : '-';
        return month.startsWith(`${selectedYear}${separator}`);
      })
      .forEach(({ month, income, expense, saving = 0, investment = 0 }) => {
        // 점(.) 또는 하이픈(-) 구분자 모두 지원
        const separator = month.includes('.') ? '.' : '-';
        const m = parseInt(month.split(separator)[1]) - 1; // '2025.12' or '2025-12' → 11
        if (m >= 0 && m < 12) {
          data[m] = {
            name: MONTHS[m],
            income: Math.round(income / 10000),
            expense: Math.round(expense / 10000),
            net: Math.round((income - expense) / 10000),
            saving: Math.round(saving / 10000),
            investment: Math.round(investment / 10000)
          };
        }
      });
    return data;
  }, [monthlyHistory, selectedYear]);

  // 연간 합계 계산
  const annualStats = useMemo(() => {
    const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
    const totalSaving = chartData.reduce((sum, d) => sum + (d.saving || 0), 0);
    const totalInvestment = chartData.reduce((sum, d) => sum + (d.investment || 0), 0);
    const netIncome = totalIncome - totalExpense;
    const avgIncome = Math.round(totalIncome / 12);
    const avgExpense = Math.round(totalExpense / 12);
    const savingsRate = totalIncome > 0 ? ((netIncome) / totalIncome * 100).toFixed(1) : '0.0';
    const investmentRate = totalIncome > 0 ? ((totalSaving + totalInvestment) / totalIncome * 100).toFixed(1) : '0.0';
    return { totalIncome, totalExpense, totalSaving, totalInvestment, netIncome, avgIncome, avgExpense, savingsRate, investmentRate };
  }, [chartData]);

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      {/* Year Selection */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-6 text-base font-display font-bold text-foreground">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))}
            disabled={selectedYear >= currentYear}
            className={`p-2 rounded-full text-foreground-muted transition-colors ${
              selectedYear >= currentYear ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.05]'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bento-card-sm border-green-500/20 bg-green-500/5 animate-enter delay-0">
          <p className="text-[10px] font-semibold text-green-600 dark:text-green-300/80 uppercase tracking-wider mb-1">연간 총 수입</p>
          <p className="text-lg md:text-xl font-bold font-mono text-green-600 dark:text-green-400">{formatKRW(annualStats.totalIncome * 10000, true)}</p>
        </div>
        <div className="bento-card-sm border-rose-500/20 bg-rose-500/5 animate-enter delay-50">
          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-300/80 uppercase tracking-wider mb-1">연간 총 지출</p>
          <p className="text-lg md:text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{formatKRW(annualStats.totalExpense * 10000, true)}</p>
        </div>
        <div className="bento-card-sm border-blue-500/20 bg-blue-500/5 animate-enter delay-100">
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-300/80 uppercase tracking-wider mb-1">연간 순수익</p>
          <p className={`text-lg md:text-xl font-bold font-mono ${annualStats.netIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {annualStats.netIncome >= 0 ? '+' : ''}{formatKRW(annualStats.netIncome * 10000, true)}
          </p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">수입 대비 <span className="text-blue-600 dark:text-blue-400 font-semibold">{annualStats.savingsRate}%</span></p>
        </div>
        <div className="bento-card-sm border-amber-500/20 bg-amber-500/5 animate-enter delay-150">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-300/80 uppercase tracking-wider mb-1">연간 투자+저축</p>
          <p className="text-lg md:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{formatKRW((annualStats.totalSaving + annualStats.totalInvestment) * 10000, true)}</p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">수입 대비 <span className="text-amber-600 dark:text-amber-400 font-semibold">{annualStats.investmentRate}%</span></p>
        </div>
        <div className="bento-card-sm border-violet-500/20 bg-violet-500/5 animate-enter delay-200">
          <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-300/80 uppercase tracking-wider mb-1">주식 평가액</p>
          <p className="text-lg md:text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{formatKRW(investmentData?.totalValue || 0, true)}</p>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">원금 {formatKRW(investmentData?.principal || 0, true)}</p>
        </div>
        <div className="bento-card-sm border-cyan-500/20 bg-cyan-500/5 animate-enter delay-250">
          <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-300/80 uppercase tracking-wider mb-1">주식 수익</p>
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
              {(expenseTop5.length ? expenseTop5 : [
                { n: '데이터 없음', v: 0, p: 0 }
              ]).map((i, idx) => (
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

      {/* Card Expense Chart */}
      {cardChartData.length > 0 && (
        <div className="glass-card p-4 md:p-6 flex flex-col animate-enter delay-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                {selectedYear}년 카드값 추이
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">연평균</span>
              <span className="text-rose-400 font-mono font-semibold">{formatKRW(cardAvg, true)}</span>
            </div>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cardGradientAnnual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="cardOverGradientAnnual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                <XAxis
                  dataKey="name"
                  stroke="transparent"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525B' }}
                />

                <YAxis
                  stroke="transparent"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(v/10000)}만`}
                  width={35}
                  tick={{ fill: '#52525B' }}
                />

                <ReferenceLine
                  y={cardAvg}
                  stroke="#F43F5E"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />

                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    const diff = data.amount - data.avg;
                    return (
                      <div className="bg-zinc-900 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
                        <div className="text-white font-semibold text-xs mb-2">{data.displayMonth}</div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-zinc-400 text-xs">카드값</span>
                          <span className="text-rose-400 font-mono font-semibold text-sm">{formatKRW(data.amount, true)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4 mt-1 pt-1 border-t border-white/[0.06]">
                          <span className="text-zinc-500 text-[10px]">평균 대비</span>
                          <span className={`font-mono font-semibold text-xs ${diff >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff >= 0 ? '+' : ''}{formatKRW(diff, true)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />

                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {cardChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isOver ? 'url(#cardOverGradientAnnual)' : 'url(#cardGradientAnnual)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
