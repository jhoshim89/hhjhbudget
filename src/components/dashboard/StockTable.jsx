/**
 * @context budget-dashboard / components / dashboard / StockTable.jsx
 * @purpose Terminal-style table displaying active stock positions and ROI.
 * @role Primary data visualization for the investment portfolio.
 * @dependencies stocks (array), prices (object), exchangeRate (number).
 */

import React from 'react';
import { formatKRW } from '../../utils/formatters';

export default function StockTable({ stocks = [], prices = {}, exchangeRate = 1380 }) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#1A1D24] text-gray-400 text-xs font-bold sticky top-0">
          <tr>
            <th className="p-4">종목명</th>
            <th className="p-4 text-right">수량</th>
            <th className="p-4 text-right">평단가</th>
            <th className="p-4 text-right">현재가</th>
            <th className="p-4 text-right">평가금액</th>
            <th className="p-4 text-right">수익률</th>
          </tr>
        </thead>
        <tbody className="text-sm font-medium">
          {stocks.map((stock) => {
            const price = prices[stock.ticker] || 0;
            const avgPrice = parseFloat(stock.avgPrice) || 0;
            const marketValueUSD = stock.qty * price;
            const marketValueKRW = marketValueUSD * exchangeRate;
            const profitRate = avgPrice > 0 ? ((price - avgPrice) / avgPrice * 100) : 0;
            const isPositive = profitRate >= 0;

            return (
              <tr key={stock.ticker} className="data-row border-b border-border hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${isPositive ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400'}`}>
                    {stock.ticker[0]}
                  </span>
                  {stock.ticker}
                </td>
                <td className="p-4 text-right text-gray-300">{stock.qty}</td>
                <td className="p-4 text-right text-gray-500">${avgPrice.toLocaleString()}</td>
                <td className="p-4 text-right text-white">${price.toLocaleString()}</td>
                <td className="p-4 text-right font-bold text-white">{formatKRW(marketValueKRW)}</td>
                <td className={`p-4 text-right font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  <span className={`px-2 py-1 rounded ${isPositive ? 'bg-emerald-900/10' : 'bg-red-900/10'}`}>
                    {isPositive ? '+' : ''}{profitRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}