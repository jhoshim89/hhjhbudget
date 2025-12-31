import React, { useMemo, useRef, useEffect, useState } from 'react';

// 가격 포맷팅 함수
function formatPrice(ticker, price) {
  if (!price) return '0';
  // KRW 암호화폐는 원화 형식으로 표시
  if (ticker.endsWith('-KRW')) {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  }
  return price.toFixed(2);
}

// 단일 티커 아이템
function TickerItem({ ticker, price, changePercent }) {
  const isPositive = changePercent >= 0;
  const isKRW = ticker.endsWith('-KRW');

  return (
    <span className="flex items-center gap-2 whitespace-nowrap bg-panel/50 px-3 py-1.5 rounded-full border border-white/[0.06] mx-1.5">
      <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-rose-400'}`}>
        {isPositive ? '▲' : '▼'}
      </span>
      <span className="text-foreground-muted text-sm">{ticker}</span>
      <span className="text-foreground font-semibold font-mono text-sm">
        {isKRW ? '₩' : '$'}{formatPrice(ticker, price)}
      </span>
      <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-rose-400'}`}>
        {isPositive ? '+' : ''}{changePercent?.toFixed(2) || '0.00'}%
      </span>
    </span>
  );
}

export default function StockTicker({ stocks = [], priceData = {} }) {
  const contentRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(30);

  // 티커 아이템 생성 (관심종목 + 기본 인덱스)
  const tickerItems = useMemo(() => {
    const baseIndices = ['SPY', 'QQQ', 'TQQQ'];
    const items = [];

    // 기본 인덱스 추가
    baseIndices.forEach(ticker => {
      const data = priceData[ticker];
      if (data) {
        items.push({
          ticker,
          price: data.price || 0,
          changePercent: data.changePercent || 0
        });
      }
    });

    // 관심종목 추가 (기본 인덱스와 중복 제외)
    stocks.forEach(stock => {
      if (baseIndices.includes(stock.ticker)) return;
      const data = priceData[stock.ticker];
      if (data) {
        items.push({
          ticker: stock.ticker,
          price: data.price || 0,
          changePercent: data.changePercent || 0
        });
      }
    });

    return items;
  }, [stocks, priceData]);

  // 콘텐츠 너비에 따라 애니메이션 속도 조절
  useEffect(() => {
    if (contentRef.current && tickerItems.length >= 4) {
      const contentWidth = contentRef.current.scrollWidth / 2;
      // 약 40px/초 속도
      const duration = Math.max(15, contentWidth / 40);
      setAnimationDuration(duration);
    }
  }, [tickerItems]);

  // 4개 미만이면 애니메이션 안 함
  const shouldAnimate = tickerItems.length >= 4;

  if (tickerItems.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden flex-1 mx-4 mask-fade">
      <div
        ref={contentRef}
        className={`flex items-center ${shouldAnimate ? 'animate-ticker' : 'justify-center'}`}
        style={shouldAnimate ? { animationDuration: `${animationDuration}s` } : {}}
      >
        {tickerItems.map((item, index) => (
          <TickerItem key={`${item.ticker}-${index}`} {...item} />
        ))}

        {/* 무한 루프를 위한 복제 */}
        {shouldAnimate && tickerItems.map((item, index) => (
          <TickerItem key={`${item.ticker}-dup-${index}`} {...item} />
        ))}
      </div>
    </div>
  );
}
