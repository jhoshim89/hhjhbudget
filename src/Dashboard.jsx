/**
 * @context budget-dashboard / Dashboard.jsx
 * @purpose Root application container managing global state, business logic, and routing.
 * @role Central Orchestrator (Container Component).
 * @dependencies Layout, Sidebar, Header, Dashboard Sub-components, Input Forms.
 */

import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AssetSummary from './components/dashboard/AssetSummary';
import KeyMetrics from './components/dashboard/KeyMetrics';
import StockTable from './components/dashboard/StockTable';
import InputConsole from './components/input/InputConsole';

// Note: In a real app, this would come from an API or Google Sheets
const rawData = [
  { date: '2023-11', category: '수입', item: '고정수입', amount: 7670063 },
  { date: '2023-11', category: '지출-고정월납', item: '대출 상환', amount: 1410000 },
];

export default function Dashboard() {
  const [tab, setTab] = useState('dashboard');
  const [exchangeRate, setExchangeRate] = useState(1380);
  const [stockPrices, setStockPrices] = useState({});
  const [inputMonth, setInputMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- State from Legacy ---
  const [stockList, setStockList] = useState([
    { ticker: 'NVDA', name: '엔비디아', qty: 140, avgPrice: '110' },
    { ticker: 'TSLA', name: '테슬라', qty: 50, avgPrice: '260' },
    { ticker: 'AAPL', name: '애플', qty: 20, avgPrice: '180' },
    { ticker: 'GOOGL', name: '구글', qty: 10, avgPrice: '150' },
    { ticker: 'MSFT', name: '마이크로소프트', qty: 5, avgPrice: '400' },
  ]);

  const [manualAccounts, setManualAccounts] = useState({
    향화카카오: '0', 
    재호영웅문: '0'
  });

  const [assets, setAssets] = useState({
    재호잔고: 26276263,
    향화잔고: 0,
    적금: 8020000
  });

  const [bondBalance, setBondBalance] = useState(14744359);
  const [bondProfit, setBondProfit] = useState(0);

  const [fixedExpenses, setFixedExpenses] = useState([
    { name: '대출 상환', amount: 1410000, checked: true },
    { name: '관리비', amount: 250000, checked: true },
    { name: '가스비', amount: 100000, checked: true },
    { name: '인터넷', amount: 17000, checked: true },
    { name: '구독료', amount: 16000, checked: true },
    { name: '주유비', amount: 150000, checked: true },
    { name: '애들 보험/화재보험', amount: 40000, checked: true },
    { name: '재호 메리츠실비', amount: 12000, checked: true },
    { name: '향화 삼성실비', amount: 17000, checked: true },
    { name: '치과보험', amount: 50000, checked: true },
    { name: '향화 용돈', amount: 100000, checked: true },
    { name: '향화 운동', amount: 120000, checked: true },
  ]);

  const [variableItems, setVariableItems] = useState(['관리비', '주유비', '기타']);
  const [expenseInputs, setExpenseInputs] = useState({});
  const [cardExpense, setCardExpense] = useState('');

  const [fixedIncomes, setFixedIncomes] = useState([
    { name: '학교월급', amount: 5618990 },
    { name: '연구비', amount: 0 },
    { name: '월세', amount: 0 }
  ]);
  const [variableIncomes, setVariableIncomes] = useState([]);
  
  const [actions, setActions] = useState({
    저축한금액: 0,
    투자한금액: 0
  });

  const [showFixedSettings, setShowFixedSettings] = useState(false);

  // --- Calculations ---
  const getYounghwaValueUSD = () => stockList.reduce((sum, s) => {
    const price = stockPrices[s.ticker] || 0;
    return sum + (s.qty * price);
  }, 0);

  const getTotalValueKRW = () => {
    const younghwaUSD = getYounghwaValueUSD();
    const younghwaKRW = younghwaUSD * exchangeRate;
    const kakao = parseFloat(manualAccounts.향화카카오.replace(/,/g,'')) || 0;
    const jaeho = parseFloat(manualAccounts.재호영웅문.replace(/,/g,'')) || 0;
    return younghwaKRW + kakao + jaeho;
  };

  const totalAssetsValue = getTotalValueKRW() + bondBalance + Object.values(assets).reduce((a, b) => a + b, 0);

  const thisMonthIncome = fixedIncomes.reduce((s, i) => s + i.amount, 0) + variableIncomes.reduce((s, i) => s + i.amount, 0);
  const thisMonthExpense = (parseInt(cardExpense.replace(/,/g,'')) || 0) + 
    fixedExpenses.filter(e => e.checked).reduce((s, e) => s + e.amount, 0) + 
    Object.values(expenseInputs).reduce((s, v) => s + (parseInt(v.replace(/,/g,'')) || 0), 0);

  // --- Effects ---
  useEffect(() => {
    const demoPrices = {
      'NVDA': 140.50, 'TSLA': 250.00, 'AAPL': 195.00, 
      'GOOGL': 175.00, 'MSFT': 430.00, 'SPY': 595.20, 'QQQ': 480.11
    };
    setStockPrices(demoPrices);
  }, []);

  const inputConsoleProps = {
    cardExpense, setCardExpense,
    fixedExpenses, setFixedExpenses,
    variableItems, setVariableItems,
    expenseInputs, setExpenseInputs,
    showFixedSettings, setShowFixedSettings,
    fixedIncomes, setFixedIncomes,
    variableIncomes, setVariableIncomes,
    assets, setAssets,
    manualAccounts, setManualAccounts,
    bondBalance, setBondBalance,
    actions, setActions
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <Sidebar activeTab={tab} onTabChange={setTab} />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header 
            exchangeRate={exchangeRate} 
            indices={[
              { name: 'SPY', value: stockPrices['SPY'] || 0, change: 'up' },
              { name: 'QQQ', value: stockPrices['QQQ'] || 0, change: 'up' }
            ]} 
          />
          
          <main className="flex-1 overflow-auto p-0.5 bg-border grid grid-cols-1 md:grid-cols-12 grid-rows-6 gap-0.5">
            
            {/* Conditional Rendering based on Tab */}
            {tab === 'dashboard' && (
              <>
                <div className="col-span-12 md:col-span-8 row-span-2">
                  <AssetSummary totalAssets={totalAssetsValue} prevAssets={totalAssetsValue * 0.98} />
                </div>
                <div className="col-span-12 md:col-span-4 row-span-2">
                  <KeyMetrics bondBalance={bondBalance} income={thisMonthIncome} expense={thisMonthExpense} />
                </div>
                <div className="col-span-12 md:col-span-8 row-span-4 bg-panel border border-border flex flex-col">
                  <div className="h-12 border-b border-border flex items-center px-6 bg-[#1A1D24] justify-between shrink-0">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">보유 종목 현황</h3>
                  </div>
                  <StockTable stocks={stockList} prices={stockPrices} exchangeRate={exchangeRate} />
                </div>
                <div className="col-span-12 md:col-span-4 row-span-4 bg-panel border border-border p-6">
                  <InputConsole {...inputConsoleProps} />
                </div>
              </>
            )}

            {tab === 'portfolio' && (
              <div className="col-span-12 row-span-6 bg-panel border border-border flex flex-col">
                <div className="h-12 border-b border-border flex items-center px-6 bg-[#1A1D24] justify-between shrink-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">전체 포트폴리오 상세</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                   <div className="bg-background p-4 rounded-lg border border-border">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">주식 평가액</p>
                      <p className="text-2xl font-bold text-white">{new Intl.NumberFormat('ko-KR').format(getTotalValueKRW())}원</p>
                   </div>
                   <div className="bg-background p-4 rounded-lg border border-border">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">안전 자산</p>
                      <p className="text-2xl font-bold text-white">{new Intl.NumberFormat('ko-KR').format(bondBalance)}원</p>
                   </div>
                   <div className="bg-background p-4 rounded-lg border border-border">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">현금 비중</p>
                      <p className="text-2xl font-bold text-white">{((Object.values(assets).reduce((a,b)=>a+b,0) / totalAssetsValue) * 100).toFixed(1)}%</p>
                   </div>
                </div>
                <StockTable stocks={stockList} prices={stockPrices} exchangeRate={exchangeRate} />
              </div>
            )}

            {tab === 'input' && (
              <div className="col-span-12 row-span-6 bg-panel border border-border p-8 flex justify-center">
                <div className="max-w-2xl w-full">
                  <InputConsole {...inputConsoleProps} />
                </div>
              </div>
            )}

            {(tab === 'transactions' || tab === 'analysis' || tab === 'report') && (
              <div className="col-span-12 row-span-6 bg-panel border border-border p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                   <i data-lucide="construction" size={32}></i>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{tab.toUpperCase()} 준비 중</h2>
                <p className="text-slate-400">해당 기능은 다음 업데이트에서 제공될 예정입니다.</p>
              </div>
            )}

          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}