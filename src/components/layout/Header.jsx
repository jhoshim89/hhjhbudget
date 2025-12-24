import React from 'react';
import { formatKRW, formatUSD } from '../../utils/formatters';

export default function Header({ exchangeRate, indices }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <header className="min-h-14 border-b border-border bg-panel flex items-center px-4 md:px-6 justify-between shrink-0 relative z-40">
      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
        <span className="text-lg md:text-xl font-black tracking-tighter text-white whitespace-nowrap">
          BUDGET<span className="text-blue-500">.CMD</span>
        </span>
      </div>
      <div className="hidden lg:flex gap-4 xl:gap-6 text-sm font-semibold text-gray-400 flex-shrink min-w-0 overflow-x-auto">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
          USD {formatUSD(1380.50).replace('$', '')}
        </span>
        {indices.map(idx => (
          <span key={idx.name} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-emerald-500">▲</span> {idx.name} {idx.value.toFixed(2)}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 md:gap-4 text-sm font-medium flex-shrink-0">
        <div className="px-2 md:px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="hidden sm:inline">ONLINE</span>
        </div>
        <span className="text-gray-500 hidden sm:inline">{today}</span>
      </div>
    </header>
  );
}
