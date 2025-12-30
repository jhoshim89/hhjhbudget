/**
 * @context budget-dashboard / components / watchlist / AddWatchlistModal.jsx
 * @purpose 관심종목 추가 모달 - 종목 검색 및 선택 기능
 * @role 사용자가 관심종목 목록에 새로운 종목을 추가할 수 있게 함
 * @dependencies React, lucide-react
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';

// 주요 종목 데이터베이스 (주식 + ETF + 크립토)
const STOCK_DATABASE = [
  // === 크립토 ===
  { ticker: 'BTC-USD', name: '비트코인', nameEn: 'Bitcoin' },
  { ticker: 'ETH-USD', name: '이더리움', nameEn: 'Ethereum' },
  // === 환율 ===
  { ticker: 'KRW=X', name: '달러/원 환율', nameEn: 'USD/KRW' },
  // === 주요 빅테크 ===
  { ticker: 'AAPL', name: '애플', nameEn: 'Apple' },
  { ticker: 'MSFT', name: '마이크로소프트', nameEn: 'Microsoft' },
  { ticker: 'GOOGL', name: '구글', nameEn: 'Google' },
  { ticker: 'GOOG', name: '구글 C', nameEn: 'Google Class C' },
  { ticker: 'AMZN', name: '아마존', nameEn: 'Amazon' },
  { ticker: 'NVDA', name: '엔비디아', nameEn: 'Nvidia' },
  { ticker: 'TSLA', name: '테슬라', nameEn: 'Tesla' },
  { ticker: 'META', name: '메타', nameEn: 'Meta' },
  { ticker: 'AVGO', name: '브로드컴', nameEn: 'Broadcom' },
  { ticker: 'TSM', name: 'TSMC', nameEn: 'Taiwan Semiconductor' },
  // === 반도체 ===
  { ticker: 'AMD', name: 'AMD', nameEn: 'AMD' },
  { ticker: 'INTC', name: '인텔', nameEn: 'Intel' },
  // === ETF ===
  { ticker: 'SPY', name: 'S&P 500 ETF', nameEn: 'SPY' },
  { ticker: 'QQQ', name: '나스닥 100 ETF', nameEn: 'QQQ' },
  { ticker: 'TQQQ', name: '나스닥 3배 레버리지', nameEn: 'TQQQ' },
  { ticker: 'SOXL', name: '반도체 3배 레버리지', nameEn: 'SOXL' },
  { ticker: 'VOO', name: 'Vanguard S&P 500', nameEn: 'VOO' },
  { ticker: 'VTI', name: 'Vanguard Total Market', nameEn: 'VTI' },
  { ticker: 'SCHD', name: '슈왑 배당 ETF', nameEn: 'Schwab Dividend' },
  { ticker: 'ARKK', name: 'ARK Innovation', nameEn: 'ARKK' },
  // === 기타 성장주 ===
  { ticker: 'PLTR', name: '팔란티어', nameEn: 'Palantir' },
  { ticker: 'COIN', name: '코인베이스', nameEn: 'Coinbase' },
  { ticker: 'SNOW', name: '스노우플레이크', nameEn: 'Snowflake' },
  { ticker: 'NFLX', name: '넷플릭스', nameEn: 'Netflix' },
  { ticker: 'CRM', name: '세일즈포스', nameEn: 'Salesforce' },
  { ticker: 'UBER', name: '우버', nameEn: 'Uber' },
  // === 전통 우량주 ===
  { ticker: 'DIS', name: '디즈니', nameEn: 'Disney' },
  { ticker: 'BA', name: '보잉', nameEn: 'Boeing' },
  { ticker: 'JPM', name: 'JP모건', nameEn: 'JPMorgan' },
  { ticker: 'V', name: '비자', nameEn: 'Visa' },
  { ticker: 'MA', name: '마스터카드', nameEn: 'Mastercard' },
  { ticker: 'KO', name: '코카콜라', nameEn: 'Coca-Cola' },
  { ticker: 'PEP', name: '펩시', nameEn: 'PepsiCo' },
  { ticker: 'MCD', name: '맥도날드', nameEn: 'McDonald' },
  { ticker: 'SBUX', name: '스타벅스', nameEn: 'Starbucks' },
  { ticker: 'NKE', name: '나이키', nameEn: 'Nike' },
];

// 기본 관심종목 (초기화용)
export const DEFAULT_WATCHLIST = [
  { ticker: 'KRW=X', name: '달러/원 환율' },
  { ticker: 'BTC-USD', name: '비트코인' },
  { ticker: 'ETH-USD', name: '이더리움' },
  { ticker: 'NVDA', name: '엔비디아' },
  { ticker: 'TSLA', name: '테슬라' },
  { ticker: 'MSFT', name: '마이크로소프트' },
  { ticker: 'AMZN', name: '아마존' },
  { ticker: 'GOOGL', name: '구글' },
  { ticker: 'SCHD', name: '슈왑 배당 ETF' },
  { ticker: 'AVGO', name: '브로드컴' },
  { ticker: 'TSM', name: 'TSMC' },
  { ticker: 'PLTR', name: '팔란티어' },
  { ticker: 'SPY', name: 'S&P 500 ETF' },
];

export default function AddWatchlistModal({ isOpen, onClose, onAdd, existingStocks = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // 모달 열릴 때 검색창에 포커스
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 모달 닫힐 때 검색어 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // 검색 결과 필터링 (이미 추가된 종목 표시)
  const filteredStocks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return STOCK_DATABASE.map(stock => ({
        ...stock,
        isExisting: existingStocks.includes(stock.ticker)
      }));
    }
    const query = searchQuery.toLowerCase();
    return STOCK_DATABASE.filter(stock =>
      stock.name.toLowerCase().includes(query) ||
      stock.nameEn.toLowerCase().includes(query) ||
      stock.ticker.toLowerCase().includes(query)
    ).map(stock => ({
      ...stock,
      isExisting: existingStocks.includes(stock.ticker)
    }));
  }, [searchQuery, existingStocks]);

  // 종목 선택 핸들러
  const handleSelectStock = (stock) => {
    if (stock.isExisting) return; // 이미 추가된 종목은 선택 불가
    onAdd(stock.ticker, stock.name);
    setSearchQuery('');
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/[0.06] bg-amber-500/5">
          <h3 className="text-lg font-bold text-amber-500 dark:text-amber-400">관심종목 추가</h3>
          <button
            onClick={onClose}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1.5 hover:bg-zinc-100 dark:hover:bg-white/[0.05] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/[0.06]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="종목명, 티커, 영문명으로 검색..."
              className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>
        </div>

        {/* 종목 목록 */}
        <div className="max-h-[320px] overflow-y-auto">
          {filteredStocks.length > 0 ? (
            filteredStocks.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => handleSelectStock(stock)}
                disabled={stock.isExisting}
                className={`w-full px-6 py-3 text-left flex items-center justify-between transition-colors border-b border-zinc-100 dark:border-white/[0.03] last:border-b-0 ${
                  stock.isExisting
                    ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/30'
                    : 'hover:bg-amber-500/10 cursor-pointer'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-zinc-800 dark:text-white font-medium">{stock.name}</span>
                  <span className="text-zinc-500 text-xs font-mono">{stock.ticker}</span>
                </div>
                {stock.isExisting ? (
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Check size={14} />
                    <span>추가됨</span>
                  </div>
                ) : (
                  <span className="text-amber-400/70 text-xs font-medium opacity-0 group-hover:opacity-100">
                    선택
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <AlertCircle size={32} className="text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 text-center">
                검색 결과가 없습니다
              </p>
            </div>
          )}
        </div>

        {/* 푸터 안내 */}
        <div className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-white/[0.06]">
          <p className="text-[10px] text-zinc-500 text-center">
            종목을 선택하면 관심종목에 바로 추가됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
