/**
 * @context budget-dashboard / components / input / ExpenseForm.jsx
 * @purpose Specialized form for recording card and fixed/variable expenses.
 * @role Expense data entry handler.
 * @dependencies formatters.js, parent State setters.
 */

import React from 'react';
import { formatKRW } from '../../utils/formatters';

export default function ExpenseForm({ 
  cardExpense, setCardExpense, 
  fixedExpenses, setFixedExpenses, 
  variableItems, setVariableItems, 
  expenseInputs, setExpenseInputs,
  showFixedSettings, setShowFixedSettings
}) {
  return (
    <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2">
      {/* Card Expense */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">카드값 (Credit Card)</label>
        <div className="relative">
          <span className="absolute left-4 top-3.5 text-gray-400 font-bold">₩</span>
          <input 
            type="text" 
            value={cardExpense} 
            onChange={e => setCardExpense(e.target.value)}
            className="w-full bg-background border border-border text-white text-lg font-bold py-3 pl-10 pr-4 rounded focus:border-blue-500 outline-none transition" 
            placeholder="0"
          />
        </div>
      </div>

      {/* Fixed Expenses */}
      <div className="bg-background border border-border p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">고정 지출 (Fixed)</label>
          <button 
            onClick={() => setShowFixedSettings(!showFixedSettings)}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold"
          >
            {showFixedSettings ? '닫기' : '상세 설정'}
          </button>
        </div>
        
        {showFixedSettings ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {fixedExpenses.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={item.checked !== false}
                    onChange={e => {
                      const newExpenses = [...fixedExpenses];
                      newExpenses[i].checked = e.target.checked;
                      setFixedExpenses(newExpenses);
                    }}
                    className="rounded border-gray-600 bg-panel text-blue-600 focus:ring-0"
                  />
                  <span className={item.checked === false ? 'line-through opacity-50' : ''}>{item.name}</span>
                </label>
                <span className={`font-mono ${item.checked === false ? 'opacity-50' : 'text-red-400'}`}>
                  {formatKRW(item.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">총 합계</span>
            <span className="text-lg font-bold text-red-400">
              {formatKRW(fixedExpenses.filter(e => e.checked !== false).reduce((s,e) => s + e.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* Variable Expenses */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">변동 지출 (Variable)</label>
        <div className="space-y-3">
          {variableItems.map(item => (
            <div key={item} className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 w-16">{item}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-500 text-xs">₩</span>
                <input 
                  type="text" 
                  value={expenseInputs[item] || ''} 
                  onChange={e => setExpenseInputs({...expenseInputs, [item]: e.target.value})}
                  className="w-full bg-background border border-border text-white text-sm py-2 pl-7 pr-3 rounded focus:border-blue-500 outline-none" 
                  placeholder="0" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}