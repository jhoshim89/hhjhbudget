import React from 'react';
import ThemeToggle from '../common/ThemeToggle';
import StockTicker from '../common/StockTicker';

export default function Header({ exchangeRate, watchlist, yahooData }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <header className="min-h-14 bg-surface/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 md:px-6 justify-between shrink-0 relative z-40">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
        <span className="text-lg md:text-xl font-display font-black tracking-tight text-foreground whitespace-nowrap">
          유니쭈니네<span className="text-blue-400">.FIN</span>
        </span>
      </div>

      {/* Center: Fixed USD + Scrolling Ticker */}
      <div className="hidden lg:flex items-center flex-1 min-w-0 mx-4">
        {/* Fixed USD Exchange Rate */}
        <span className="flex items-center gap-2 whitespace-nowrap bg-panel/50 px-3 py-1.5 rounded-full border border-white/[0.06] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span className="text-foreground-muted text-sm">USD</span>
          <span className="text-foreground font-semibold font-mono text-sm">
            {exchangeRate?.toFixed(2) || '0.00'}
          </span>
        </span>

        {/* Scrolling Stock Ticker */}
        <StockTicker stocks={watchlist} priceData={yahooData} />
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-2 md:gap-4 text-sm font-medium flex-shrink-0">
        <div className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <span className="hidden sm:inline text-xs font-semibold">ONLINE</span>
        </div>
        <ThemeToggle />
        <span className="text-foreground-muted text-xs hidden sm:inline font-mono">{today}</span>
      </div>
    </header>
  );
}
