/**
 * @context budget-dashboard / components / input / IncomeForm.jsx
 * @purpose Form for managing fixed salary and variable income sources.
 * @role Income data entry handler with dynamic list management.
 * @dependencies formatters.js, parent State setters.
 */

import React, { useState } from 'react';
import { formatKRW } from '../../utils/formatters';

export default function IncomeForm({
  fixedIncomes, setFixedIncomes,
  variableIncomes, setVariableIncomes
}) {
  const [newVarIncome, setNewVarIncome] = useState({ name: '강의비', amount: '', memo: '' });

  return (
    <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2">
      {/* Fixed Income */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">고정 수입 (Fixed)</label>
        <div className="space-y-3">
          {fixedIncomes.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 w-16">{item.name}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-500 text-xs">₩</span>
                <input 
                  type="text" 
                  value={item.amount || ''} 
                  onChange={e => { 
                    const u = [...fixedIncomes]; 
                    u[i].amount = parseInt(e.target.value.replace(/,/g,'')) || 0; 
                    setFixedIncomes(u); 
                  }}
                  className="w-full bg-background border border-border text-white text-sm py-2 pl-7 pr-3 rounded focus:border-blue-500 outline-none" 
                  placeholder="0" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variable Income */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">변동 수입 (Variable)</label>
        </div>
        
        {/* List */}
        <div className="space-y-2 mb-3">
          {variableIncomes.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-background p-2 rounded border border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-400">{item.name}</span>
                <span className="text-xs text-gray-500">({item.memo})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-white">{formatKRW(item.amount)}</span>
                <button 
                  onClick={() => setVariableIncomes(variableIncomes.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New */}
        <div className="bg-panel border border-border p-3 rounded">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select 
              value={newVarIncome.name}
              onChange={e => setNewVarIncome({...newVarIncome, name: e.target.value})}
              className="bg-background border border-border text-white text-xs p-2 rounded outline-none"
            >
              <option>강의비</option>
              <option>배당</option>
              <option>기타</option>
            </select>
            <input 
              type="text" 
              value={newVarIncome.amount}
              onChange={e => setNewVarIncome({...newVarIncome, amount: e.target.value})}
              className="bg-background border border-border text-white text-xs p-2 rounded outline-none"
              placeholder="금액"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newVarIncome.memo}
              onChange={e => setNewVarIncome({...newVarIncome, memo: e.target.value})}
              className="flex-1 bg-background border border-border text-white text-xs p-2 rounded outline-none"
              placeholder="메모"
            />
            <button 
              onClick={() => {
                if (newVarIncome.amount) {
                  setVariableIncomes([...variableIncomes, {
                    name: newVarIncome.name,
                    amount: parseInt(newVarIncome.amount.replace(/,/g, '')) || 0,
                    memo: newVarIncome.memo
                  }]);
                  setNewVarIncome({ ...newVarIncome, amount: '', memo: '' });
                }
              }}
              className="bg-emerald-600 text-white px-4 rounded text-xs font-bold hover:bg-emerald-500"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}