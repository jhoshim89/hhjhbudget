import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';

// 주요 종목 데이터베이스
const STOCK_DATABASE = [
  { ticker: 'AAPL', name: '애플', nameEn: 'Apple' },
  { ticker: 'MSFT', name: '마이크로소프트', nameEn: 'Microsoft' },
  { ticker: 'GOOGL', name: '구글', nameEn: 'Google' },
  { ticker: 'AMZN', name: '아마존', nameEn: 'Amazon' },
  { ticker: 'NVDA', name: '엔비디아', nameEn: 'Nvidia' },
  { ticker: 'TSLA', name: '테슬라', nameEn: 'Tesla' },
  { ticker: 'META', name: '메타', nameEn: 'Meta' },
  { ticker: 'NFLX', name: '넷플릭스', nameEn: 'Netflix' },
  { ticker: 'AMD', name: 'AMD', nameEn: 'AMD' },
  { ticker: 'INTC', name: '인텔', nameEn: 'Intel' },
  { ticker: 'SPY', name: 'S&P 500 ETF', nameEn: 'SPY' },
  { ticker: 'QQQ', name: '나스닥 100 ETF', nameEn: 'QQQ' },
  { ticker: 'TQQQ', name: '나스닥 3배 레버리지', nameEn: 'TQQQ' },
  { ticker: 'SOXL', name: '반도체 3배 레버리지', nameEn: 'SOXL' },
  { ticker: 'VOO', name: 'Vanguard S&P 500', nameEn: 'VOO' },
  { ticker: 'VTI', name: 'Vanguard Total Market', nameEn: 'VTI' },
  { ticker: 'ARKK', name: 'ARK Innovation', nameEn: 'ARKK' },
  { ticker: 'PLTR', name: '팔란티어', nameEn: 'Palantir' },
  { ticker: 'COIN', name: '코인베이스', nameEn: 'Coinbase' },
  { ticker: 'SNOW', name: '스노우플레이크', nameEn: 'Snowflake' },
  { ticker: 'CRM', name: '세일즈포스', nameEn: 'Salesforce' },
  { ticker: 'UBER', name: '우버', nameEn: 'Uber' },
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

export default function AddStockModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    qty: '',
    avgPrice: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // 모달 열릴 때 검색창에 포커스
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 검색 결과 필터링
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const query = searchQuery.toLowerCase();
    return STOCK_DATABASE.filter(stock =>
      stock.name.toLowerCase().includes(query) ||
      stock.nameEn.toLowerCase().includes(query) ||
      stock.ticker.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSelectStock = (stock) => {
    setFormData(prev => ({
      ...prev,
      ticker: stock.ticker,
      name: stock.name
    }));
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ticker || !formData.name || !formData.qty || !formData.avgPrice) {
      return;
    }
    onAdd({
      ticker: formData.ticker.toUpperCase(),
      name: formData.name,
      qty: parseInt(formData.qty),
      avgPrice: formData.avgPrice
    });
    setFormData({ ticker: '', name: '', qty: '', avgPrice: '' });
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">종목 추가</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 종목 검색 */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              종목 검색
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="종목명, 티커, 영문명으로 검색..."
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* 검색 결과 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-panel border border-border rounded-lg shadow-xl max-h-48 overflow-auto">
                {suggestions.map((stock) => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => handleSelectStock(stock)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span className="text-white font-medium">{stock.name}</span>
                    <span className="text-slate-500 font-mono text-sm">{stock.ticker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 종목 표시 */}
          {formData.ticker && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{formData.name}</p>
                <p className="text-blue-400 font-mono text-sm">{formData.ticker}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, ticker: '', name: '' }))}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 직접 입력 옵션 */}
          {!formData.ticker && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-slate-500 mb-3">또는 직접 입력:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    티커
                  </label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                    placeholder="AAPL"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    종목명
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="애플"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                수량
              </label>
              <input
                type="number"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                placeholder="100"
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                평균 매수가 ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.avgPrice}
                onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                placeholder="150.00"
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
