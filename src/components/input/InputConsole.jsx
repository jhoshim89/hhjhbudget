/**
 * @context budget-dashboard / components / input / InputConsole.jsx
 * @purpose Tabbed container for all data entry forms.
 * @role Centralized input hub for expenses, income, and assets.
 * @dependencies sub-forms (ExpenseForm, IncomeForm, AssetForm).
 */

import React, { useState } from 'react';
import { Terminal } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import AssetForm from './AssetForm';

export default function InputConsole(props) {
  const [activeTab, setActiveTab] = useState('expense');

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-zinc-800 dark:text-white mb-6 flex items-center gap-2">
        <Terminal size={16} /> 데이터 입력 콘솔
      </h3>
      
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">입력 유형 (Type)</label>
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => setActiveTab('expense')}
            className={`py-3 text-sm font-bold rounded transition ${activeTab === 'expense' ? 'bg-blue-600 text-white' : 'bg-background text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
          >
            지출 (Expense)
          </button>
          <button 
            onClick={() => setActiveTab('income')}
            className={`py-3 text-sm font-bold rounded transition ${activeTab === 'income' ? 'bg-blue-600 text-white' : 'bg-background text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
          >
            수입 (Income)
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={`py-3 text-sm font-bold rounded transition ${activeTab === 'assets' ? 'bg-blue-600 text-white' : 'bg-background text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
          >
            자산 (Assets)
          </button>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'expense' && <ExpenseForm {...props} />}
        {activeTab === 'income' && <IncomeForm {...props} />}
        {activeTab === 'assets' && <AssetForm {...props} />}
      </div>
    </div>
  );
}
