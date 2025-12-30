/**
 * @context budget-dashboard / components / dashboard / KeyMetrics.jsx
 * @purpose Vertical summary of secondary metrics (Bonds, Monthly Income/Expense).
 * @role Quick-look financial status container.
 * @dependencies bondBalance, income, expense (numbers).
 */

import React from 'react';
import { formatKRW } from '../../utils/formatters';

export default function KeyMetrics({ bondBalance, income, expense }) {
  const budgetLimit = 4500000; // Example limit from design
  const expenseRate = Math.min((expense / budgetLimit) * 100, 100);

  return (
    <div className="bg-panel border border-border grid grid-rows-3 divide-y divide-border h-full rounded-lg">
      <div className="px-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 whitespace-nowrap">안전 자산 (Bonds)</p>
          <p className="text-2xl font-bold text-zinc-800 dark:text-white">{formatKRW(bondBalance)}</p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 bg-amber-900/30 text-amber-500 text-xs font-bold rounded">YIELD 4.2%</span>
        </div>
      </div>
      <div className="px-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 whitespace-nowrap">이번 달 수입</p>
          <p className="text-2xl font-bold text-emerald-400">{formatKRW(income)}</p>
        </div>
      </div>
      <div className="px-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 whitespace-nowrap">이번 달 지출</p>
          <p className="text-2xl font-bold text-red-400">{formatKRW(expense)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 mb-1">예산의 {expenseRate.toFixed(0)}%</p>
          <div className="w-20 h-2 bg-gray-700 rounded-full">
            <div className="bg-red-500 h-full rounded-full" style={{ width: `${expenseRate}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}