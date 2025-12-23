import React from 'react';
import { Menu } from 'lucide-react';
import { formatKRW, formatUSD } from '../../utils/formatters';

export default function Header({ exchangeRate, indices, onMenuClick }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <header className="h-14 border-b border-border bg-panel flex items-center px-4 md:px-6 justify-between shrink-0">
      <div className="flex items-center gap-4 md:gap-6">
        <button className="md:hidden text-slate-400 hover:text-white" onClick={onMenuClick}>
            <Menu size={24} />
        </button>
        <span className="text-xl font-black tracking-tighter text-white">
          BUDGET<span className="text-blue-500">.CMD</span>
        </span>
        <div className="hidden md:flex gap-6 text-sm font-semibold text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
            USD {formatUSD(1380.50).replace('$', '')}
          </span>
          {indices.map(idx => (
            <span key={idx.name} className="flex items-center gap-2">
              <span className="text-emerald-500">▲</span> {idx.name} {idx.value.toFixed(2)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium">
        <div className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            ONLINE
        </div>
        <span className="text-gray-500">{today}</span>
      </div>
    </header>
  );
}
