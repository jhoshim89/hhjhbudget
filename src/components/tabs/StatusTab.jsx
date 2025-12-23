import React from 'react';
import { formatKRW } from '../../utils/formatters';

const ColumnHeader = ({ title, total, colorClass }) => (
  <div className="h-12 border-b border-border flex items-center px-6 bg-panel-dark justify-between shrink-0">
    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">{title}</h3>
    <span className={`text-sm font-bold font-mono ${colorClass}`}>{formatKRW(total, true)}</span>
  </div>
);

const DataItem = ({ name, amount, subtext, colorClass = "text-white", highlight = false, delay = 0 }) => (
  <div className={`flex justify-between items-center p-4 border-b border-border/50 data-row ${highlight ? 'bg-red-500/5' : ''} animate-enter delay-${delay}`}>
    <div>
      <p className={`text-sm font-bold ${highlight ? 'text-red-400' : 'text-slate-300'} font-sans`}>{name}</p>
      {subtext && <p className="text-[10px] text-slate-500 font-bold uppercase font-sans">{subtext}</p>}
    </div>
    <p className={`text-sm font-bold font-mono ${colorClass}`}>{formatKRW(amount)}</p>
  </div>
);

export default function StatusTab({ data }) {
  const { incomes, expenses, assets } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Summaries */}
      <div className="grid grid-cols-4 gap-0.5 bg-border border-b border-border shrink-0">
        <div className="panel p-6 animate-enter delay-0">
          <p className="text-label">총 수입</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{formatKRW(incomes.total, true)}</p>
        </div>
        <div className="panel p-6 animate-enter delay-100">
          <p className="text-label">총 지출</p>
          <p className="text-2xl font-bold font-mono text-red-400">{formatKRW(expenses.total, true)}</p>
        </div>
        <div className="panel p-6 animate-enter delay-200">
          <p className="text-label">순수익</p>
          <p className="text-2xl font-bold font-mono text-white">{formatKRW(incomes.total - expenses.total, true)}</p>
        </div>
        <div className="panel p-6 animate-enter delay-300">
          <p className="text-label">저축률</p>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {(((incomes.total - expenses.total) / incomes.total) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 3 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-border overflow-hidden">
        {/* Income Column */}
        <div className="panel flex flex-col overflow-hidden animate-enter delay-500">
          <ColumnHeader title="💰 수입" total={incomes.total} colorClass="text-emerald-400" />
          <div className="flex-1 overflow-auto">
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border font-sans">Fixed</div>
             {incomes.fixed.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} colorClass="text-emerald-400" delay={idx * 50} />)}
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Variable</div>
             {incomes.variable.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} subtext={i.memo} colorClass="text-emerald-400" delay={idx * 50} />)}
          </div>
        </div>

        {/* Expense Column */}
        <div className="panel flex flex-col overflow-hidden animate-enter delay-500">
          <ColumnHeader title="💸 지출" total={expenses.total} colorClass="text-red-400" />
          <div className="flex-1 overflow-auto">
             <DataItem name="💳 카드값" amount={expenses.card} colorClass="text-red-500" highlight delay={0} />
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Fixed</div>
             {expenses.fixed.map((e, idx) => <DataItem key={e.name} name={e.name} amount={e.amount} colorClass="text-red-400" delay={idx * 50} />)}
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Variable</div>
             {expenses.variable.map((e, idx) => <DataItem key={e.name} name={e.name} amount={e.amount} colorClass="text-red-400" delay={idx * 50} />)}
          </div>
        </div>

        {/* Asset Column */}
        <div className="panel flex flex-col overflow-hidden animate-enter delay-500">
          <ColumnHeader title="🏦 자산" total={assets.total} colorClass="text-blue-400" />
          <div className="flex-1 overflow-auto">
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border font-sans">Cash / Savings</div>
             {Object.entries(assets.cash).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-blue-400" delay={idx * 50} />)}
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Stocks</div>
             {Object.entries(assets.stocks).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-violet-400" delay={idx * 50} />)}
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Bonds</div>
             <DataItem name="채권 잔액" amount={assets.bonds} colorClass="text-amber-400" delay={0} />
          </div>
        </div>
      </div>
    </div>
  );
}
