import React, { useState } from 'react';
import { formatKRW } from '../../utils/formatters';
import DraggableList from '../common/DraggableList';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

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
  const { incomes, expenses, assets, handlers } = data;
  const [isFixedExpenseOpen, setIsFixedExpenseOpen] = useState(false);

  // 월 선택 상태
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1, // 1-12
  });

  const isCurrentMonth = selectedMonth.year === today.getFullYear() && selectedMonth.month === today.getMonth() + 1;

  const changeMonth = (delta) => {
    setSelectedMonth(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      return { year: newYear, month: newMonth };
    });
  };

  const monthName = `${selectedMonth.year}년 ${selectedMonth.month}월`;

  const fixedTotal = expenses.fixed.reduce((sum, e) => sum + e.amount, 0);

  const renderIncomeItem = (item, idx) => (
    <DataItem name={item.name} amount={item.amount} subtext={item.memo} colorClass="text-emerald-400" delay={0} />
  );

  const renderExpenseItem = (item, idx) => (
    <DataItem name={item.name} amount={item.amount} colorClass="text-red-400" delay={0} />
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Month Selector */}
      <div className="shrink-0 bg-panel border-b border-border p-3 flex justify-center items-center">
        <div className="flex items-center bg-background rounded border border-border p-1">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="px-6 text-sm font-bold text-white min-w-[120px] text-center">
            {monthName}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 md:p-4 bg-panel-dark border-b-2 border-blue-500/30 shrink-0">
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/20 rounded-lg p-4 md:p-6 border border-emerald-500/20 animate-enter delay-0">
          <p className="text-xs md:text-sm font-bold text-emerald-300/80 uppercase tracking-wider mb-2">총 수입</p>
          <p className="text-2xl md:text-3xl font-black font-mono text-emerald-400">{formatKRW(incomes.total, true)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/40 to-red-950/20 rounded-lg p-4 md:p-6 border border-red-500/20 animate-enter delay-100">
          <p className="text-xs md:text-sm font-bold text-red-300/80 uppercase tracking-wider mb-2">총 지출</p>
          <p className="text-2xl md:text-3xl font-black font-mono text-red-400">{formatKRW(expenses.total, true)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 rounded-lg p-4 md:p-6 border border-slate-500/20 animate-enter delay-200">
          <p className="text-xs md:text-sm font-bold text-slate-300/80 uppercase tracking-wider mb-2">순수익</p>
          <p className="text-2xl md:text-3xl font-black font-mono text-white">{formatKRW(incomes.total - expenses.total, true)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-amber-950/20 rounded-lg p-4 md:p-6 border border-amber-500/20 animate-enter delay-300">
          <p className="text-xs md:text-sm font-bold text-amber-300/80 uppercase tracking-wider mb-2">저축률</p>
          <p className="text-2xl md:text-3xl font-black font-mono text-amber-400">
            {(((incomes.total - expenses.total) / incomes.total) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-border">
        {/* Income Column */}
        <div className="panel flex flex-col animate-enter delay-500">
          <ColumnHeader title="💰 수입" total={incomes.total} colorClass="text-emerald-400" />
          <div>
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border font-sans">Fixed</div>
             {handlers?.onReorderFixedIncomes ? (
               <DraggableList
                 items={incomes.fixed}
                 onReorder={handlers.onReorderFixedIncomes}
                 renderItem={renderIncomeItem}
                 getItemId={(item) => item.name}
               />
             ) : (
               incomes.fixed.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} colorClass="text-emerald-400" delay={idx * 50} />)
             )}
             <div className="bg-panel-dark/30 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase border-b border-border mt-2 font-sans">Variable</div>
             {handlers?.onReorderVariableIncomes ? (
               <DraggableList
                 items={incomes.variable}
                 onReorder={handlers.onReorderVariableIncomes}
                 renderItem={renderIncomeItem}
                 getItemId={(item) => item.name}
               />
             ) : (
               incomes.variable.map((i, idx) => <DataItem key={i.name} name={i.name} amount={i.amount} subtext={i.memo} colorClass="text-emerald-400" delay={idx * 50} />)
             )}
          </div>
        </div>

        {/* Expense Column */}
        <div className="panel flex flex-col animate-enter delay-500">
          <ColumnHeader title="💸 지출" total={expenses.total} colorClass="text-red-400" />
          <div>
             {/* Fixed Expenses - Accordion */}
             <button
               onClick={() => setIsFixedExpenseOpen(!isFixedExpenseOpen)}
               className="w-full bg-panel-dark/30 px-4 py-2 flex justify-between items-center border-b border-border hover:bg-panel-dark/50 transition-colors"
             >
               <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">Fixed</span>
               <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-red-400 font-mono">{formatKRW(fixedTotal, true)}</span>
                 <ChevronDown size={14} className={`text-slate-500 transition-transform ${isFixedExpenseOpen ? 'rotate-180' : ''}`} />
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
                 expenses.fixed.map((e, idx) => <DataItem key={e.name} name={e.name} amount={e.amount} colorClass="text-red-400" delay={idx * 50} />)
               )
             )}
             {/* Variable Expenses */}
             <div className="bg-panel-dark/30 px-4 py-2 flex justify-between items-center border-b border-border mt-2 font-sans">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Variable</span>
               <button
                 onClick={() => handlers?.onOpenAddVariableExpense?.()}
                 className="text-slate-500 hover:text-white transition-colors"
               >
                 <Plus size={14} />
               </button>
             </div>
             <DataItem name="💳 카드값" amount={expenses.card} colorClass="text-slate-300" delay={0} />
             {expenses.variable.map((e, idx) => (
               <div key={e.name} className="flex justify-between items-center p-4 border-b border-border/50 data-row group">
                 <p className="text-sm font-bold text-slate-300 font-sans">{e.name}</p>
                 <div className="flex items-center gap-2">
                   <p className="text-sm font-bold font-mono text-red-400">{formatKRW(e.amount)}</p>
                   <button
                     onClick={() => handlers?.onDeleteVariableExpense?.(idx)}
                     className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all"
                   >
                     <Trash2 size={14} />
                   </button>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Asset Column */}
        <div className="panel flex flex-col animate-enter delay-500">
          <ColumnHeader title="🏦 자산" total={assets.total} colorClass="text-blue-400" />
          <div>
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
