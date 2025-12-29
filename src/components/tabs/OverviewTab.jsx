import React, { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react';
import DraggableList from '../common/DraggableList';

const colorMap = {
  income: 'border-green-500/30 bg-green-500/5',
  expense: 'border-rose-500/30 bg-rose-500/5',
  net: 'border-blue-500/30 bg-blue-500/5',
  netNegative: 'border-amber-500/30 bg-amber-500/5',
  assets: 'border-violet-500/30 bg-violet-500/5',
};

const iconMap = {
  income: TrendingUp,
  expense: TrendingDown,
  net: TrendingUp,
  netNegative: TrendingDown,
  assets: Wallet,
};

const SummaryCard = ({ title, value, type, delay = 0, subInfo }) => {
  const Icon = iconMap[type];
  const colorClass = colorMap[type];
  const textColorMap = {
    income: 'text-green-400',
    expense: 'text-rose-400',
    net: 'text-blue-400',
    netNegative: 'text-amber-400',
    assets: 'text-violet-400',
  };

  return (
    <div className={`bento-card ${colorClass} border animate-enter delay-${delay} flex flex-col min-h-[120px] relative`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">{title}</p>
        <div className={`p-1.5 rounded-lg ${colorClass}`}>
          <Icon size={14} className={textColorMap[type]} />
        </div>
      </div>
      <p className={`text-2xl md:text-3xl font-bold font-mono ${textColorMap[type]} tracking-tight`}>
        {value}
      </p>
      {/* 카드 내 서브 정보 */}
      {subInfo && (
        <div className="mt-auto pt-2 border-t border-white/[0.06] text-[10px] text-zinc-500">
          {subInfo}
        </div>
      )}
    </div>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0]?.payload;
  if (!data?.hasData) return null;

  const income = data.income;
  const expense = data.expense;
  const net = income - expense;

  const formatManWon = (value) => {
    const man = value / 10000;
    if (Math.abs(man) >= 100) {
      return `${Math.round(man).toLocaleString()}만`;
    }
    return `${man.toFixed(1)}만`;
  };

  return (
    <div className="bg-zinc-900 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[180px]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
        <span className="text-white font-bold text-sm">{data.displayMonth}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 text-xs">수입</span>
          <span className="text-green-400 font-mono font-semibold text-sm">{formatManWon(income)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 text-xs">지출</span>
          <span className="text-rose-400 font-mono font-semibold text-sm">{formatManWon(expense)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-zinc-400 text-xs">순수익</span>
          <span className={`font-mono font-bold text-sm ${net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
            {net >= 0 ? '+' : ''}{formatManWon(net)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Custom Cursor
const CustomCursor = ({ points, height }) => {
  if (!points || points.length === 0) return null;
  const { x } = points[0];

  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={height}
      stroke="#3B82F6"
      strokeWidth={1}
      strokeDasharray="4 4"
      strokeOpacity={0.4}
    />
  );
};

// StatusTab Components
const ColumnHeader = ({ title, total, colorClass }) => (
  <div className="border-b border-white/[0.06] px-4 py-3 bg-panel/30 shrink-0">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className={`text-sm font-bold font-mono ${colorClass}`}>{formatKRW(total)}</p>
    </div>
  </div>
);

const DataItem = ({ name, amount, subtext, colorClass = "text-white", highlight = false, delay = 0, indent = false }) => (
  <div className={`flex justify-between items-center p-3 border-b border-white/[0.04] data-row ${highlight ? 'bg-rose-500/5' : ''} animate-enter delay-${delay} ${indent ? 'pl-5' : ''}`}>
    <div className="flex items-center gap-2">
      {indent && <span className="text-zinc-600 text-[10px]">├</span>}
      <div>
        <p className={`text-xs font-medium ${highlight ? 'text-rose-400' : 'text-zinc-300'}`}>{name}</p>
        {subtext && <p className="text-[10px] text-zinc-500">{subtext}</p>}
      </div>
    </div>
    <p className={`text-xs font-semibold font-mono ${colorClass}`}>{formatKRW(amount, true)}</p>
  </div>
);

export default function OverviewTab({ stats, selectedMonth, onMonthChange, monthlyHistory = [], cardHistory = [], data }) {
  const [isFixedExpenseOpen, setIsFixedExpenseOpen] = useState(false);
  const today = new Date();
  const isCurrentMonth = selectedMonth?.year === today.getFullYear() && selectedMonth?.month === today.getMonth() + 1;

  // StatusTab data destructuring
  const { incomes, expenses, assets, handlers } = data || {};
  const fixedTotal = expenses?.fixed?.reduce((sum, e) => sum + e.amount, 0) || 0;

  const renderExpenseItem = (item, idx) => (
    <DataItem name={item.name} amount={item.amount} colorClass="text-rose-400" delay={0} indent />
  );

  // Card expense chart data
  const cardChartData = useMemo(() => {
    if (!cardHistory || cardHistory.length === 0) return [];

    const avg = cardHistory.reduce((sum, d) => sum + d.amount, 0) / cardHistory.length;

    let prevYear = null;
    return cardHistory.map(item => {
      const separator = item.month.includes('.') ? '.' : '-';
      const [year, month] = item.month.split(separator);
      const shortYear = year.slice(2);
      const isYearStart = prevYear !== null && prevYear !== year;
      prevYear = year;

      return {
        name: isYearStart ? `'${shortYear}` : `${parseInt(month)}`,
        displayMonth: `${year}.${month}`,
        amount: item.amount,
        avg,
        isOver: item.amount > avg,
        isYearStart,
      };
    });
  }, [cardHistory]);

  const cardAvg = useMemo(() => {
    if (cardChartData.length === 0) return 0;
    return cardChartData[0]?.avg || 0;
  }, [cardChartData]);

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!monthlyHistory || monthlyHistory.length === 0) {
      return [{
        name: `${selectedMonth?.month || 12}월`,
        fullMonth: `${selectedMonth?.year}.${String(selectedMonth?.month).padStart(2, '0')}`,
        displayMonth: `${selectedMonth?.year}.${String(selectedMonth?.month).padStart(2, '0')}`,
        income: stats.income || 0,
        expense: stats.expense || 0,
        hasData: true
      }];
    }

    let prevYear = null;
    return monthlyHistory.map((item, idx) => {
      // 점(.) 또는 하이픈(-) 구분자 모두 지원
      const separator = item.month.includes('.') ? '.' : '-';
      const [year, month] = item.month.split(separator);
      const monthNum = parseInt(month);
      const shortYear = year.slice(2);
      const isYearStart = prevYear !== null && prevYear !== year;
      prevYear = year;

      return {
        name: isYearStart ? `'${shortYear}` : `${monthNum}`,
        fullMonth: item.month,
        displayMonth: `${year}.${month}`,
        income: item.income,
        expense: item.expense,
        net: item.income - item.expense,
        hasData: true,
        isYearStart,
        index: idx,
        year: shortYear
      };
    });
  }, [monthlyHistory, selectedMonth, stats.income, stats.expense]);

  // Year markers
  const yearMarkers = useMemo(() => {
    return chartData.filter(d => d.isYearStart).map(d => d.name);
  }, [chartData]);

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      {/* Month Selector */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button
            onClick={() => onMonthChange(-1)}
            className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-all hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 text-sm font-semibold text-foreground min-w-[160px] text-center">
            {selectedMonth?.year}년 {selectedMonth?.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-blue-400 font-normal">(현재)</span>}
          </span>
          <button
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
            className={`p-2 rounded-full transition-all ${isCurrentMonth ? 'opacity-20 cursor-not-allowed text-foreground-muted' : 'hover:bg-white/[0.05] text-foreground-muted hover:text-foreground'}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="총 수입" value={formatKRW(stats.income, true)} type="income" delay={0} />
        <SummaryCard
          title="총 지출"
          value={formatKRW(stats.expense, true)}
          type="expense"
          delay={100}
          subInfo={stats.expenseCalc && stats.expenseCalc.hasPrevData && (
            <div className="flex justify-between">
              <span>전달+수입-현재</span>
              <span className="font-mono">
                {formatKRW(stats.expenseCalc.prevMonthBalance, true)}+{formatKRW(stats.expenseCalc.thisMonthIncome, true)}-{formatKRW(stats.expenseCalc.currentBalance, true)}
              </span>
            </div>
          )}
        />
        <SummaryCard
          title="순수익"
          value={formatKRW(stats.netProfit, true)}
          type={stats.netProfit >= 0 ? 'net' : 'netNegative'}
          delay={200}
          subInfo={(
            <div className="flex justify-between">
              <span>수입 - 지출</span>
              <span className="font-mono">
                {formatKRW(stats.income, true)} - {formatKRW(stats.expense, true)}
              </span>
            </div>
          )}
        />
        <SummaryCard
          title="순자산"
          value={formatKRW(stats.totalAssets, true)}
          type="assets"
          delay={300}
          subInfo={(
            <div className="flex justify-between gap-2">
              {stats.assetsChange && stats.assetsChange.hasPrevData ? (
                <span className={stats.assetsChange.changePercent >= 0 ? 'text-green-400' : 'text-rose-400'}>
                  전월 대비 {stats.assetsChange.changePercent >= 0 ? '+' : ''}{stats.assetsChange.changePercent}%
                </span>
              ) : (
                <span className="text-violet-400">주식 {formatKRW(stats.assetBreakdown?.stocks, true)}</span>
              )}
              <span className="text-blue-400">현금 {formatKRW(stats.assetBreakdown?.cash, true)}</span>
            </div>
          )}
        />
      </div>

      {/* Main Chart */}
      <div className="flex-1 glass-card p-4 md:p-6 flex flex-col min-h-[320px]">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              수입/지출 추이
            </h3>
            {chartData.length > 0 && (
              <span className="text-xs text-zinc-500 font-mono">
                {chartData[0]?.displayMonth} — {chartData[chartData.length - 1]?.displayMonth}
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />

              {/* Year markers */}
              {yearMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={`year-${idx}`}
                  x={marker}
                  stroke="#3B82F6"
                  strokeDasharray="5 5"
                  strokeOpacity={0.3}
                  label={{
                    value: marker,
                    position: 'top',
                    fill: '#60A5FA',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
                />
              ))}

              <XAxis
                dataKey="name"
                stroke="transparent"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={chartData.length > 18 ? 2 : chartData.length > 12 ? 1 : 0}
                tick={({ x, y, payload, index }) => {
                  const item = chartData[index];
                  if (!item || item.isYearStart) return null;
                  return (
                    <text x={x} y={y + 10} textAnchor="middle" fill="#a1a1aa" fontSize={11}>
                      {payload.value}월
                    </text>
                  );
                }}
              />

              <YAxis
                stroke="transparent"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v/10000)}만`}
                width={45}
                tick={{ fill: '#a1a1aa' }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={<CustomCursor />}
              />

              <Area
                type="monotone"
                dataKey="income"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#incomeGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#22C55E',
                  stroke: '#09090B',
                  strokeWidth: 2
                }}
              />

              <Area
                type="monotone"
                dataKey="expense"
                stroke="#F43F5E"
                strokeWidth={2}
                fill="url(#expenseGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#F43F5E',
                  stroke: '#09090B',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-foreground-muted">수입</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-xs text-foreground-muted">지출</span>
          </div>
          <div className="text-xs text-zinc-600">|</div>
          <span className="text-xs text-zinc-500">호버하면 상세 정보</span>
        </div>
      </div>

      {/* Card Expense Chart */}
      {cardChartData.length > 0 && (
        <div className="glass-card p-4 md:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                카드값 추이
              </h3>
              {cardChartData.length > 0 && (
                <span className="text-xs text-zinc-500 font-mono">
                  {cardChartData[0]?.displayMonth} — {cardChartData[cardChartData.length - 1]?.displayMonth}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">평균</span>
              <span className="text-rose-400 font-mono font-semibold">{formatKRW(cardAvg, true)}</span>
            </div>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="cardOverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                <XAxis
                  dataKey="name"
                  stroke="transparent"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#a1a1aa' }}
                />

                <YAxis
                  stroke="transparent"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(v/10000)}만`}
                  width={45}
                  tick={{ fill: '#a1a1aa' }}
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
                    <Cell key={`cell-${index}`} fill={entry.isOver ? 'url(#cardOverGradient)' : 'url(#cardGradient)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3 Columns - Status Section */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Income Column */}
          <div className="glass-card flex flex-col animate-enter delay-300">
            <ColumnHeader title="수입" total={incomes?.total || 0} colorClass="text-green-400" />
            <div className="flex-1">
              {['학교월급', '연구비', '월세', '추가수입'].map((name, idx) => {
                const item = [...(incomes?.fixed || []), ...(incomes?.variable || [])].find(i => i.name === name);
                return (
                  <DataItem
                    key={name}
                    name={name}
                    amount={item?.amount || 0}
                    subtext={item?.memo}
                    colorClass="text-green-400"
                    delay={idx * 50}
                    indent
                  />
                );
              })}
            </div>
          </div>

          {/* Expense Column */}
          <div className="glass-card flex flex-col animate-enter delay-400">
            <ColumnHeader title="지출" total={expenses?.total || 0} colorClass="text-rose-400" />
            <div className="flex-1">
              {/* Fixed Expenses - Accordion */}
              <button
                onClick={() => setIsFixedExpenseOpen(!isFixedExpenseOpen)}
                className="w-full bg-panel/20 px-4 py-3 flex justify-between items-center border-b border-white/[0.04] hover:bg-panel/30 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isFixedExpenseOpen ? 'rotate-180' : ''}`} />
                  <span className="text-xs font-semibold text-zinc-400 uppercase">Fixed</span>
                </div>
                <span className="text-sm font-semibold text-rose-400 font-mono">{formatKRW(fixedTotal, true)}</span>
              </button>
              {isFixedExpenseOpen && (
                handlers?.onReorderFixedExpenses ? (
                  <DraggableList
                    items={expenses?.fixed || []}
                    onReorder={handlers.onReorderFixedExpenses}
                    renderItem={renderExpenseItem}
                    getItemId={(item) => item.name}
                  />
                ) : (
                  (expenses?.fixed || []).map((e, idx) => <DataItem key={e.name} name={e.name} amount={e.amount} colorClass="text-rose-400" delay={idx * 50} indent />)
                )
              )}
              {/* Variable Expenses */}
              <div className="bg-panel/20 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-b border-white/[0.04] mt-1">
                Variable
              </div>
              <DataItem name="카드값" amount={expenses?.card || 0} colorClass="text-rose-400" delay={0} indent />
              {(expenses?.variable || []).map((e, idx) => (
                <div key={e.name} className="flex justify-between items-center p-3 pl-5 border-b border-white/[0.04] data-row group">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 text-[10px]">├</span>
                    <p className="text-xs font-medium text-zinc-300">{e.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold font-mono text-rose-400">{formatKRW(e.amount, true)}</p>
                    <button
                      onClick={() => handlers?.onDeleteVariableExpense?.(idx)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Column */}
          <div className="glass-card flex flex-col animate-enter delay-500">
            <ColumnHeader title="자산" total={assets?.total || 0} colorClass="text-blue-400" />
            <div className="flex-1">
              <div className="bg-panel/20 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-b border-white/[0.04]">Cash / Savings</div>
              {Object.entries(assets?.cash || {}).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-blue-400" delay={idx * 50} indent />)}
              <div className="bg-panel/20 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-b border-white/[0.04] mt-1">Stocks</div>
              {Object.entries(assets?.stocks || {}).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-violet-400" delay={idx * 50} indent />)}
              <div className="bg-panel/20 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-b border-white/[0.04] mt-1">Bonds</div>
              <DataItem name="채권 잔액" amount={assets?.bonds || 0} colorClass="text-amber-400" delay={0} indent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
