import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatKRW } from '../../utils/formatters';

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

const SummaryCard = ({ title, value, unit = '', colorClass = 'text-white', delay = 0 }) => (
  <div className={`panel p-6 flex flex-col justify-between animate-enter delay-${delay}`}>
    <p className="text-label text-sm mb-3">{title}</p>
    <p className={`text-4xl font-black font-mono ${colorClass} tracking-tighter`}>
      {value}<span className="text-lg font-bold ml-1 text-slate-500 font-sans">{unit}</span>
    </p>
  </div>
);

export default function OverviewTab({ stats }) {
  return (
    <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-0.5 bg-border p-0.5 overflow-hidden">
      {/* Summary Cards */}
      <div className="col-span-12 md:col-span-12 row-span-1 grid grid-cols-2 md:grid-cols-5 gap-0.5 bg-border">
        <SummaryCard title="총 수입" value={formatKRW(stats.income, true)} colorClass="text-emerald-400" delay={0} />
        <SummaryCard title="총 지출" value={formatKRW(stats.expense, true)} colorClass="text-red-400" delay={100} />
        <SummaryCard title="순자산" value={formatKRW(stats.totalAssets, true)} colorClass="text-blue-400" delay={200} />
        <SummaryCard title="주식 자산" value={formatKRW(stats.stockAssets, true)} colorClass="text-violet-400" delay={300} />
        <SummaryCard title="저축률" value={stats.savingsRate} unit="%" colorClass="text-amber-400" delay={400} />
      </div>

      {/* Main Charts */}
      <div className="col-span-12 md:col-span-8 row-span-5 panel p-6 flex flex-col animate-enter delay-500">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span> 수입/지출 추이 (Last 6 Months)
        </h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', borderRadius: '8px', fontFamily: 'Manrope' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
              <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 row-span-5 panel p-6 flex flex-col animate-enter delay-500">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span> 지출 구성 (Current Month)
        </h3>
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B', borderRadius: '8px', fontFamily: 'Manrope' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-6 w-full space-y-3">
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
  );
}
