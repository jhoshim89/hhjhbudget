import React, { useState } from 'react';
import { formatKRW } from '../../utils/formatters';
import DraggableList from '../common/DraggableList';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

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

export default function StatusTab({ data, selectedMonth, onMonthChange }) {
  const { incomes, expenses, assets, handlers } = data;
  const [isFixedExpenseOpen, setIsFixedExpenseOpen] = useState(false);

  const today = new Date();
  const isCurrentMonth = selectedMonth?.year === today.getFullYear() && selectedMonth?.month === today.getMonth() + 1;
  const monthName = selectedMonth ? `${selectedMonth.year}년 ${selectedMonth.month}월` : '';

  const fixedTotal = expenses.fixed.reduce((sum, e) => sum + e.amount, 0);

  const renderIncomeItem = (item, idx) => (
    <DataItem name={item.name} amount={item.amount} subtext={item.memo} colorClass="text-green-400" delay={0} indent />
  );

  const renderExpenseItem = (item, idx) => (
    <DataItem name={item.name} amount={item.amount} colorClass="text-rose-400" delay={0} indent />
  );

  return (
    <div className="flex flex-col">
      {/* Month Selector */}
      <div className="p-3 flex justify-center">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button
            onClick={() => onMonthChange(-1)}
            className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 text-sm font-semibold text-foreground min-w-[160px] text-center">
            {monthName}
            {isCurrentMonth && <span className="ml-2 text-xs text-blue-400">(현재)</span>}
          </span>
          <button
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
            className={`p-2 rounded-full transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed text-foreground-muted' : 'hover:bg-white/[0.05] text-foreground-muted'}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Hero Summary Section */}
      <div className="grid grid-cols-3 gap-3 px-3 pb-3">
        <div className="bento-card border-green-500/30 bg-green-500/15 animate-enter delay-0">
          <p className="text-xs font-semibold text-green-600 dark:text-green-300 uppercase tracking-wider mb-2">총 수입</p>
          <p className="text-xl md:text-2xl font-bold font-mono text-green-600 dark:text-green-400">{formatKRW(incomes.total, true)}</p>
        </div>
        <div className="bento-card border-rose-500/30 bg-rose-500/15 animate-enter delay-100">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wider mb-2">총 지출</p>
          <p className="text-xl md:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{formatKRW(expenses.total, true)}</p>
        </div>
        <div className="bento-card border-cyan-500/30 bg-cyan-500/15 animate-enter delay-200">
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-300 uppercase tracking-wider mb-2">순수익</p>
          <p className="text-xl md:text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{formatKRW(incomes.total - expenses.total, true)}</p>
        </div>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-3 pb-3">
        {/* Income Column */}
        <div className="glass-card flex flex-col animate-enter delay-300">
          <ColumnHeader title="수입" total={incomes.total} colorClass="text-green-400" />
          <div className="flex-1">
             <div className="bg-panel/20 px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase border-b border-white/[0.04]">Fixed</div>
             {handlers?.onReorderFixedIncomes ? (
               <DraggableList
                 items={incomes.fixed}
                 onReorder={handlers.onReorderFixedIncomes}
                 renderItem={renderIncomeItem}
                 getItemId={(item) => item.name}
               />
             ) : (
               incomes.fixed.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} colorClass="text-green-400" delay={idx * 50} indent />)
             )}
             <div className="bg-panel/20 px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase border-b border-white/[0.04] mt-1">Variable</div>
             {handlers?.onReorderVariableIncomes ? (
               <DraggableList
                 items={incomes.variable}
                 onReorder={handlers.onReorderVariableIncomes}
                 renderItem={renderIncomeItem}
                 getItemId={(item) => item.name}
               />
             ) : (
               incomes.variable.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} subtext={i.memo} colorClass="text-green-400" delay={idx * 50} indent />)
             )}
          </div>
        </div>

        {/* Expense Column */}
        <div className="glass-card flex flex-col animate-enter delay-400">
          <ColumnHeader title="지출" total={expenses.total} colorClass="text-rose-400" />
          <div className="flex-1">
             {/* Fixed Expenses - Accordion */}
             <button
               onClick={() => setIsFixedExpenseOpen(!isFixedExpenseOpen)}
               className="w-full bg-panel/20 px-4 py-2 flex justify-between items-center border-b border-white/[0.04] hover:bg-panel/30 transition-colors"
             >
               <span className="text-[10px] font-semibold text-zinc-500 uppercase">Fixed</span>
               <div className="flex items-center gap-2">
                 <span className="text-xs font-semibold text-rose-400 font-mono">{formatKRW(fixedTotal, true)}</span>
                 <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isFixedExpenseOpen ? 'rotate-180' : ''}`} />
               </div>
             </button>
             {isFixedExpenseOpen && (
               handlers?.onReorderFixedExpenses ? (
                 <DraggableList
                   items={expenses.fixed}
                   onReorder={handlers.onReorderFixedExpenses}
                   renderItem={renderExpenseItem}
                   getItemId={(item) => item.name}
                 />
               ) : (
                 expenses.fixed.map((e, idx) => <DataItem key={e.name} name={e.name} amount={e.amount} colorClass="text-rose-400" delay={idx * 50} indent />)
               )
             )}
             {/* Variable Expenses */}
             <div className="bg-panel/20 px-4 py-2 flex justify-between items-center border-b border-white/[0.04] mt-1">
               <span className="text-[10px] font-semibold text-zinc-500 uppercase">Variable</span>
               <button
                 onClick={() => handlers?.onOpenAddVariableExpense?.()}
                 className="text-zinc-500 hover:text-white transition-colors"
               >
                 <Plus size={14} />
               </button>
             </div>
             <DataItem name="카드값" amount={expenses.card} colorClass="text-rose-400" delay={0} indent />
             {expenses.variable.map((e, idx) => (
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
          <ColumnHeader title="자산" total={assets.total} colorClass="text-blue-400" />
          <div className="flex-1">
             <div className="bg-panel/20 px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase border-b border-white/[0.04]">Cash / Savings</div>
             {Object.entries(assets.cash).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-blue-400" delay={idx * 50} indent />)}
             <div className="bg-panel/20 px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase border-b border-white/[0.04] mt-1">Stocks</div>
             {Object.entries(assets.stocks).map(([name, val], idx) => <DataItem key={name} name={name} amount={val} colorClass="text-violet-400" delay={idx * 50} indent />)}
             <div className="bg-panel/20 px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase border-b border-white/[0.04] mt-1">Bonds</div>
             <DataItem name="채권 잔액" amount={assets.bonds} colorClass="text-amber-400" delay={0} indent />
          </div>
        </div>
      </div>
    </div>
  );
}
