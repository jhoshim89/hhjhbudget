/**
 * @context budget-dashboard / components / layout / Header.jsx
 * @purpose Top navigation bar displaying real-time currency and market indices.
 * @role Global status and branding header.
 * @dependencies exchangeRate (number), indices (array of objects).
 */

import React from 'react';

export default function Header({ exchangeRate = 0, indices = [] }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <header className="h-14 border-b border-border bg-panel flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-xl font-black tracking-tighter text-white">
          BUDGET<span className="text-blue-500">.CMD</span>
        </span>
        <div className="hidden md:flex gap-6 text-sm font-semibold text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
            USD {exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          {indices.map((idx) => (
            <span key={idx.name} className="flex items-center gap-2">
              <span className={idx.change === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                {idx.change === 'up' ? '▲' : '▼'}
              </span> 
              {idx.name} {idx.value.toFixed(2)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium">
        <div className="px-3 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          ONLINE
        </div>
        <span className="text-gray-500">{today}</span>
      </div>
    </header>
  );
}