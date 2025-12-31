import React, { useState, useMemo } from 'react';
import {
  Home, Building2, Landmark, Plus,
  TrendingDown, Wallet, CreditCard,
  LayoutGrid, Table2, Eye
} from 'lucide-react';

// 컴포넌트
import WatchPropertyCard from '../realestate/WatchPropertyCard';
import MyPropertyCard from '../realestate/MyPropertyCard';
import LoanCard from '../realestate/LoanCard';
import AddPropertyModal from '../realestate/AddPropertyModal';
import PriceInputModal from '../realestate/PriceInputModal';
import ComparisonTable from '../realestate/ComparisonTable';
import PropertySummaryCard from '../realestate/PropertySummaryCard';
import PriceTrendChart from '../realestate/PriceTrendChart';
import PropertyMap from '../realestate/PropertyMap';

// 훅
import { useNaverRealestate } from '../../hooks/useNaverRealestate';

/**
 * 부동산 탭
 */
export default function RealEstateTab({ data, handlers }) {
  const [activeSubTab, setActiveSubTab] = useState('market');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [priceModalProperty, setPriceModalProperty] = useState(null);
  const [marketViewMode, setMarketViewMode] = useState('table'); // 'card' | 'table'
  const [selectedChartComplex, setSelectedChartComplex] = useState(null); // 차트용 단지 선택

  // 네이버 부동산 데이터
  const {
    groupedByComplex: naverData,
    loading: naverLoading,
    lastUpdated: naverLastUpdated,
    refetch: refetchNaver,
  } = useNaverRealestate();

  const {
    watchProperties = [],
    myProperties = [],
    loans = [],
    priceHistory = {},
    totalAssets = 0,
    totalDebt = 0,
    netWorth = 0,
    monthlyInterest = 0,
  } = data || {};

  const {
    addWatch,
    removeWatch,
    addProperty,
    updateProperty,
    removeProperty,
    addLoan,
    updateLoan,
    removeLoan,
    addPrice,
  } = handlers || {};

  // 서브탭 정의
  const subTabs = [
    { id: 'market', label: '시세 비교', icon: Eye, count: naverData.length },
    { id: 'watch', label: '관심', icon: Home, count: watchProperties.length },
    { id: 'my', label: '내 부동산', icon: Building2, count: myProperties.length },
    { id: 'loan', label: '대출', icon: Landmark, count: loans.length },
  ];

  // 금액 포맷
  const formatPrice = (amount) => {
    if (!amount) return '0';
    if (amount >= 100000000) {
      const eok = (amount / 100000000).toFixed(1);
      return `${eok}억`;
    }
    if (amount >= 10000) {
      return `${Math.round(amount / 10000)}만`;
    }
    return amount.toLocaleString();
  };

  // 부동산별 대출 매핑
  const loansByProperty = useMemo(() => {
    const map = {};
    loans.forEach(loan => {
      if (loan.propertyId) {
        if (!map[loan.propertyId]) map[loan.propertyId] = [];
        map[loan.propertyId].push(loan);
      }
    });
    return map;
  }, [loans]);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-mobile-nav">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bento-card-sm animate-enter delay-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Building2 size={16} className="text-violet-400" />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">내 부동산</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-white">{formatPrice(totalAssets)}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{myProperties.length}건</p>
        </div>

        <div className="bento-card-sm animate-enter delay-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <CreditCard size={16} className="text-rose-400" />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">총 대출</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-rose-500 dark:text-rose-400">{formatPrice(totalDebt)}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{loans.length}건</p>
        </div>

        <div className="bento-card-sm animate-enter delay-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Wallet size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">순자산</span>
          </div>
          <p className={`text-xl md:text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {netWorth >= 0 ? '' : '-'}{formatPrice(Math.abs(netWorth))}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">자산 - 대출</p>
        </div>

        <div className="bento-card-sm animate-enter delay-150">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingDown size={16} className="text-amber-400" />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">월 상환금</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">{formatPrice(loans.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0))}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">매월 지출</p>
        </div>
      </div>

      {/* 서브탭 + 추가 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeSubTab === tab.id ? 'bg-teal-500/30 text-teal-700 dark:text-teal-300' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeSubTab === 'market' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMarketViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                marketViewMode === 'card'
                  ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setMarketViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                marketViewMode === 'table'
                  ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Table2 size={16} />
            </button>
          </div>
        )}

        {activeSubTab !== 'market' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            추가
          </button>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="animate-enter">
        {/* 시세 비교 */}
        {activeSubTab === 'market' && (
          <div className="space-y-6">
            {marketViewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {naverData.map((complex) => (
                  <PropertySummaryCard
                    key={complex.id}
                    complex={complex}
                    onSelect={(c) => setSelectedChartComplex(c)}
                  />
                ))}
              </div>
            ) : (
              <ComparisonTable
                data={naverData}
                loading={naverLoading}
                onRefresh={refetchNaver}
                lastUpdated={naverLastUpdated}
              />
            )}

            {/* 단지 위치 지도 */}
            <div className="bento-card p-4">
              <PropertyMap
                complexes={naverData}
                selectedId={selectedChartComplex?.id}
                onSelectComplex={(id) => {
                  const complex = naverData.find(c => c.id === id);
                  setSelectedChartComplex(complex || null);
                }}
              />
            </div>

            {/* 시세 동향 그래프 */}
            <div className="bento-card p-4">
              {/* 단지 선택 드롭다운 */}
              <div className="flex items-center gap-3 mb-4">
                <select
                  value={selectedChartComplex?.id || ''}
                  onChange={(e) => {
                    const complex = naverData.find(c => c.id === e.target.value);
                    setSelectedChartComplex(complex || null);
                  }}
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">단지 선택 (시세 추이 보기)</option>
                  {naverData.map(complex => (
                    <option key={complex.id} value={complex.id}>
                      {complex.name} {complex.isMine ? '(내 집)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 차트 */}
              {selectedChartComplex ? (
                <PriceTrendChart
                  complexId={selectedChartComplex.id}
                  complexName={selectedChartComplex.name}
                  area={84}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-zinc-500">단지를 선택하면 시세 추이 그래프가 표시됩니다</p>
                  <p className="text-xs text-zinc-600 mt-1">매일 데이터가 수집되며, 일정 기간 후 그래프가 채워집니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 관심 부동산 */}
        {activeSubTab === 'watch' && (
          <div>
            {watchProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
                  <Home size={32} className="text-teal-400 opacity-50" />
                </div>
                <h4 className="text-lg font-semibold text-zinc-800 dark:text-white mb-2">관심 부동산이 없습니다</h4>
                <p className="text-sm text-zinc-500 mb-4">관심 있는 아파트를 추가하고 시세를 추적해보세요</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  관심 부동산 추가
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {watchProperties.map(property => (
                  <WatchPropertyCard
                    key={property.id}
                    property={property}
                    priceHistory={priceHistory[property.id] || []}
                    onRemove={removeWatch}
                    onAddPrice={(p) => setPriceModalProperty(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 내 부동산 */}
        {activeSubTab === 'my' && (
          <div>
            {myProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Building2 size={32} className="text-violet-400 opacity-50" />
                </div>
                <h4 className="text-lg font-semibold text-zinc-800 dark:text-white mb-2">보유 부동산이 없습니다</h4>
                <p className="text-sm text-zinc-500 mb-4">내 부동산을 등록하고 자산을 관리해보세요</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  내 부동산 추가
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myProperties.map(property => (
                  <MyPropertyCard
                    key={property.id}
                    property={property}
                    loans={loansByProperty[property.id] || []}
                    onUpdate={updateProperty}
                    onRemove={removeProperty}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 대출 */}
        {activeSubTab === 'loan' && (
          <div>
            {loans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Landmark size={32} className="text-amber-400 opacity-50" />
                </div>
                <h4 className="text-lg font-semibold text-zinc-800 dark:text-white mb-2">대출이 없습니다</h4>
                <p className="text-sm text-zinc-500 mb-4">대출을 등록하고 상환 계획을 관리해보세요</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  대출 추가
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loans.map(loan => {
                  const linkedProperty = myProperties.find(p => p.id === loan.propertyId);
                  return (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      property={linkedProperty}
                      onUpdate={updateLoan}
                      onRemove={removeLoan}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 모달 */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWatch={addWatch}
        onAddMy={addProperty}
        onAddLoan={addLoan}
        myProperties={myProperties}
      />

      <PriceInputModal
        isOpen={!!priceModalProperty}
        onClose={() => setPriceModalProperty(null)}
        property={priceModalProperty}
        onSubmit={addPrice}
      />
    </div>
  );
}
