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

// Tabs
import OverviewTab from './components/tabs/OverviewTab';
import StatusTab from './components/tabs/StatusTab';
import InvestmentTab from './components/tabs/InvestmentTab';
import AnnualTab from './components/tabs/AnnualTab';
import InputTab from './components/tabs/InputTab';

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const [exchangeRate, setExchangeRate] = useState(1380);
  const [stockPrices, setStockPrices] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [inputMonth, setInputMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- Global State ---
  const [stockList, setStockList] = useState([
    { ticker: 'NVDA', name: '엔비디아', qty: 140, avgPrice: '110' },
    { ticker: 'TSLA', name: '테슬라', qty: 50, avgPrice: '260' },
    { ticker: 'AAPL', name: '애플', qty: 20, avgPrice: '180' },
    { ticker: 'GOOGL', name: '구글', qty: 10, avgPrice: '150' },
    { ticker: 'MSFT', name: '마이크로소프트', qty: 5, avgPrice: '400' },
  ]);

  const [manualAccounts, setManualAccounts] = useState({
    향화카카오: '5200000', 
    재호영웅문: '3800000'
  });

  const [assets, setAssets] = useState({
    재호잔고: 26276263,
    향화잔고: 12500000,
    적금: 8020000
  });

  const [bondBalance, setBondBalance] = useState(14744359);

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

  const [fixedIncomes, setFixedIncomes] = useState([
    { name: '학교월급', amount: 5618990 },
    { name: '연구비', amount: 0 },
    { name: '월세', amount: 0 }
  ]);
  
  const [variableIncomes, setVariableIncomes] = useState([
    { name: '강의비', amount: 200000, memo: '특강' }
  ]);
  
  const [cardExpense, setCardExpense] = useState('850000');

  // --- Calculations ---
  const totalStockUSD = useMemo(() => {
    return stockList.reduce((sum, s) => {
      const price = stockPrices[s.ticker] || 0;
      return sum + (s.qty * price);
    }, 0);
  }, [stockList, stockPrices]);

  const totalStockKRW = useMemo(() => {
    const younghwaKRW = totalStockUSD * exchangeRate;
    const kakao = parseFloat(manualAccounts.향화카카오) || 0;
    const jaeho = parseFloat(manualAccounts.재호영웅문) || 0;
    return younghwaKRW + kakao + jaeho;
  }, [totalStockUSD, exchangeRate, manualAccounts]);

  const cashTotal = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalAssetsValue = totalStockKRW + bondBalance + cashTotal;

  const thisMonthIncome = fixedIncomes.reduce((s, i) => s + i.amount, 0) + variableIncomes.reduce((s, i) => s + i.amount, 0);
  const thisMonthExpense = (parseInt(cardExpense.replace(/,/g,'')) || 0) + 
    fixedExpenses.filter(e => e.checked).reduce((s, e) => s + e.amount, 0);

  // --- Handlers ---
  const handleManualAccountChange = (key, value) => {
    setManualAccounts(prev => ({ ...prev, [key]: value.replace(/,/g, '') }));
  };

  const handleAssetChange = (key, value) => {
    setAssets(prev => ({ ...prev, [key]: parseInt(value.replace(/,/g, '')) || 0 }));
  };

  const handleFixedIncomeChange = (index, value) => {
    const newIncomes = [...fixedIncomes];
    newIncomes[index].amount = parseInt(value.replace(/,/g, '')) || 0;
    setFixedIncomes(newIncomes);
  };

  const handleCardExpenseChange = (value) => {
    setCardExpense(value.replace(/,/g, ''));
  };

  const handleToggleFixedExpense = (index) => {
    const newExpenses = [...fixedExpenses];
    newExpenses[index].checked = !newExpenses[index].checked;
    setFixedExpenses(newExpenses);
  };

  const handleExchangeRateChange = (value) => {
    setExchangeRate(parseFloat(value) || 0);
  };

  // --- Effects ---
  useEffect(() => {
    const demoPrices = {
      'NVDA': 140.50, 'TSLA': 250.00, 'AAPL': 195.00, 
      'GOOGL': 175.00, 'MSFT': 430.00, 'SPY': 595.20, 'QQQ': 480.11, 'TQQQ': 72.45
    };
    setStockPrices(demoPrices);
  }, []);

  // --- Tab Data Mapping ---
  const overviewStats = {
    income: thisMonthIncome,
    expense: thisMonthExpense,
    totalAssets: totalAssetsValue,
    stockAssets: totalStockKRW,
    savingsRate: (((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100).toFixed(1)
  };

  const statusData = {
    incomes: { total: thisMonthIncome, fixed: fixedIncomes, variable: variableIncomes },
    expenses: { total: thisMonthExpense, fixed: fixedExpenses.filter(e => e.checked), variable: [], card: parseInt(cardExpense) },
    assets: { total: totalAssetsValue, cash: assets, stocks: { '주식 계좌 합계': totalStockKRW }, bonds: bondBalance }
  };

  const investmentData = {
    exchangeRate,
    stockPrices,
    totalStockUSD,
    totalStockKRW,
    totalInvestmentKRW: totalStockKRW + bondBalance,
    investedPrincipal: totalStockKRW * 0.8, // Mock
    stocks: { list: stockList },
    bonds: { balance: bondBalance },
    benchmarks: { spy: stockPrices['SPY'] || 0, qqq: stockPrices['QQQ'] || 0, tqqq: stockPrices['TQQQ'] || 0 },
    history: [
      { date: '2023-06', value: 42000, principal: 40000 },
      { date: '2023-07', value: 45000, principal: 41000 },
      { date: '2023-08', value: 43000, principal: 42000 },
      { date: '2023-09', value: 48000, principal: 42000 },
      { date: '2023-10', value: 51000, principal: 43000 },
      { date: '2023-11', value: 52300, principal: 43000 },
    ],
    manual: { kakao: parseFloat(manualAccounts.향화카카오), jaeho: parseFloat(manualAccounts.재호영웅문) }
  };

  const inputData = { manualAccounts, assets, fixedIncomes, fixedExpenses, cardExpense };
  const inputHandlers = {
    onManualAccountChange: handleManualAccountChange,
    onAssetChange: handleAssetChange,
    onFixedIncomeChange: handleFixedIncomeChange,
    onCardExpenseChange: handleCardExpenseChange,
    onToggleFixedExpense: handleToggleFixedExpense
  };

  const investmentHandlers = {
    onExchangeRateChange: handleExchangeRateChange
  };

  return (
    <DashboardLayout>
      <Header 
        exchangeRate={exchangeRate} 
        indices={[
          { name: 'SPY', value: stockPrices['SPY'] || 0, change: 'up' },
          { name: 'QQQ', value: stockPrices['QQQ'] || 0, change: 'up' },
          { name: 'TQQQ', value: stockPrices['TQQQ'] || 0, change: 'up' }
        ]}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar 
            activeTab={tab} 
            onTabChange={setTab} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
        />
        
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {tab === 'overview' && <OverviewTab stats={overviewStats} />}
          {tab === 'status' && <StatusTab data={statusData} />}
          {tab === 'investment' && <InvestmentTab data={investmentData} handlers={investmentHandlers} />}
          {tab === 'annual' && <AnnualTab />}
          {tab === 'input' && <InputTab data={inputData} handlers={inputHandlers} />}
        </main>
      </div>
    </DashboardLayout>
  );
}