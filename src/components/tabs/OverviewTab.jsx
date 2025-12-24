import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { BarChart3, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

const data = [
  { name: '7월', income: 8500000, expense: 3200000 },
  { name: '8월', income: 8800000, expense: 4100000 },
  { name: '9월', income: 9100000, expense: 3500000 },
  { name: '10월', income: 8900000, expense: 3800000 },
  { name: '11월', income: 9500000, expense: 3100000 },
  { name: '12월', income: 9100000, expense: 3100000 },
];

const pieData = [
  { name: '고정지출', value: 2100000 },
  { name: '카드값', value: 850000 },
  { name: '변동지출', value: 150000 },
];

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B'];

const colorMap = {
  'text-emerald-400': 'from-emerald-900/40 to-emerald-950/20 border-emerald-500/20',
  'text-red-400': 'from-red-900/40 to-red-950/20 border-red-500/20',
  'text-blue-400': 'from-blue-900/40 to-blue-950/20 border-blue-500/20',
  'text-violet-400': 'from-violet-900/40 to-violet-950/20 border-violet-500/20',
  'text-amber-400': 'from-amber-900/40 to-amber-950/20 border-amber-500/20',
  'text-white': 'from-slate-800/60 to-slate-900/40 border-slate-500/20',
};

const SummaryCard = ({ title, value, unit = '', colorClass = 'text-white', delay = 0 }) => (
  <div className={`bg-gradient-to-br ${colorMap[colorClass] || colorMap['text-white']} rounded-lg p-4 md:p-6 flex flex-col justify-between animate-enter delay-${delay} min-h-[100px] border`}>
    <p className="text-xs md:text-sm font-bold uppercase tracking-wider mb-2 opacity-80">{title}</p>
    <p className={`text-2xl md:text-4xl font-black font-mono ${colorClass} tracking-tighter`}>
      {value}<span className="text-sm md:text-lg font-bold ml-1 text-slate-500 font-sans">{unit}</span>
    </p>
  </div>
);

export default function OverviewTab({ stats }) {
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'

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

  return (
    <div className="flex-1 flex flex-col gap-0.5 bg-border p-0.5">
      {/* Month Selector */}
      <div className="shrink-0 bg-panel border-b border-border p-3 flex justify-center items-center">
        <div className="flex items-center bg-background rounded border border-border p-1">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="px-6 text-sm font-bold text-white min-w-[120px] text-center">
            {selectedMonth.year}년 {selectedMonth.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-blue-400">(현재)</span>}
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

      {/* Hero Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 md:p-4 bg-panel-dark border-b-2 border-blue-500/30 shrink-0">
        <SummaryCard title="총 수입" value={formatKRW(stats.income, true)} colorClass="text-emerald-400" delay={0} />
        <SummaryCard title="총 지출" value={formatKRW(stats.expense, true)} colorClass="text-red-400" delay={100} />
        <SummaryCard title="순자산" value={formatKRW(stats.totalAssets, true)} colorClass="text-blue-400" delay={200} />
        <SummaryCard title="주식 자산" value={formatKRW(stats.stockAssets, true)} colorClass="text-violet-400" delay={300} />
        <SummaryCard title="저축률" value={stats.savingsRate} unit="%" colorClass="text-amber-400" delay={400} />
      </div>

      {/* Main Charts */}
      <div className="flex-1 grid grid-cols-12 gap-0.5 min-h-[500px]">
      <div className="col-span-12 md:col-span-8 panel p-6 flex flex-col animate-enter delay-500">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 수입/지출 추이 (Last 6 Months)
          </h3>
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
        <div className="flex-1 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} fontFamily="Manrope" />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/10000)}만`} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', borderRadius: '8px', fontFamily: 'Manrope' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => [formatKRW(value, true), '']}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} name="수입" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} name="지출" />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} fontFamily="Manrope" />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/10000)}만`} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', borderRadius: '8px', fontFamily: 'Manrope' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => [formatKRW(value, true), '']}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="수입" />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="지출" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 panel p-6 flex flex-col animate-enter delay-500">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500"></span> 지출 구성 (Current Month)
        </h3>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value, name) => [formatKRW(value, true), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 shrink-0">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-slate-400 font-medium font-sans">{item.name}</span>
                </div>
                <span className="text-white font-bold font-mono">{formatKRW(item.value, true)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
