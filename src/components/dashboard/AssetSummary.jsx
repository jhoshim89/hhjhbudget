/**
 * @context budget-dashboard / components / dashboard / AssetSummary.jsx
 * @purpose Display the total net worth with a mini-trend area chart.
 * @role Primary financial overview card.
 * @dependencies totalAssets (number), prevAssets (number), recharts (visualization).
 */

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { formatKRW, calcChange } from '../../utils/formatters';

const mockChartData = [
  { v: 480 }, { v: 500 }, { v: 490 }, { v: 510 }, { v: 515 }, { v: 523 }
];

export default function AssetSummary({ totalAssets, prevAssets }) {
  const change = calcChange(totalAssets, prevAssets);
  const isPositive = parseFloat(change) >= 0;

  return (
    <div className="bg-panel border border-border p-6 flex flex-col justify-between h-full rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">총 순자산 (Total Liquidity)</h2>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-black text-white tracking-tight">{formatKRW(totalAssets)}</span>
            {change && (
              <span className={`text-lg font-bold px-2 py-0.5 rounded ${isPositive ? 'text-emerald-500 bg-emerald-900/20' : 'text-red-500 bg-red-900/20'}`}>
                {isPositive ? '▲' : '▼'} {change}%
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-border text-xs font-bold text-slate-300 hover:bg-slate-700 rounded transition">1D</button>
          <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded">1M</button>
          <button className="px-4 py-2 bg-border text-xs font-bold text-slate-300 hover:bg-slate-700 rounded transition">1Y</button>
        </div>
      </div>
      
      <div className="h-28 w-full mt-4 border-t border-dashed border-border pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockChartData}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={3} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}