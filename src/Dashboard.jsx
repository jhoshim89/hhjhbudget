/**
 * @context budget-dashboard / Dashboard.jsx
 * @purpose Root application container managing global state, business logic, and routing.
 * @role Central Orchestrator (Container Component).
 * @dependencies Layout, Sidebar, Header, Dashboard Sub-components, Input Forms.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';

// Tabs
import OverviewTab from './components/tabs/OverviewTab';
import StatusTab from './components/tabs/StatusTab';
import InvestmentTab from './components/tabs/InvestmentTab';
import AnnualTab from './components/tabs/AnnualTab';
import InputTab from './components/tabs/InputTab';
import WatchlistTab from './components/tabs/WatchlistTab';
import RealEstateTab from './components/tabs/RealEstateTab';
import AddVariableExpenseModal from './components/expense/AddVariableExpenseModal';

// Yahoo Finance Integration
import { useYahooFinance } from './hooks/useYahooFinance';
import { useWatchlist } from './hooks/useWatchlist';

// Real Estate Integration
import { useRealEstate } from './hooks/useRealEstate';

// Holdings Integration
import { useHoldings } from './hooks/useHoldings';

// Google Sheets Integration
import { useSheetData } from './hooks/useSheetData';
import { appendToSheet, deleteFromSheet, upsertRow } from './services/sheetsApi';
import { parseMonthString, toMonthString, changeMonthObj } from './utils/formatters';

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const [exchangeRate, setExchangeRate] = useState(1380);
  const [stockPrices, setStockPrices] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartRange, setChartRange] = useState('3mo'); // 차트 기간: 7d, 1mo, 3mo, 1y (기본 3개월)

  // --- Google Sheets 연동 ---
  const {
    rawData,
    data: sheetData,
    loading: sheetLoading,
    error: sheetError,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    investmentHistory,
    monthlyHistory,
    reload: reloadSheet,
  } = useSheetData();

  // 탭에서 사용할 월 객체 형식 변환
  const selectedMonthObj = useMemo(() => {
    return parseMonthString(selectedMonth);
  }, [selectedMonth]);

  // 월 변경 핸들러 (탭에서 호출)
  const handleMonthChange = useCallback((delta) => {
    const newMonthObj = changeMonthObj(selectedMonthObj, delta);
    setSelectedMonth(toMonthString(newMonthObj));
  }, [selectedMonthObj, setSelectedMonth]);

  // 변동 지출 모달
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  // --- 시트 데이터 기반 State (시트 로드 후 초기화) ---
  const [manualAccounts, setManualAccounts] = useState({ 향화카카오: '0', 재호영웅문: '0' });
  const [assets, setAssets] = useState({ 재호잔고: 0, 향화잔고: 0, 적금: 0 });
  const [bond, setBond] = useState({ balance: 0, purchaseDate: '', yieldRate: 0, maturityMonths: 0 });
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [fixedIncomes, setFixedIncomes] = useState([]);
  const [variableIncomes, setVariableIncomes] = useState([]);
  const [cardExpense, setCardExpense] = useState('0');
  const [investmentTotals, setInvestmentTotals] = useState({ 재호해외주식: 0, 향화해외주식: 0, 투자원금: 0, 배당: 0 });

  // 기본 수입 항목 정의 (기본값 0, 시트에서 값 불러옴)
  const DEFAULT_FIXED_INCOMES = [
    { name: '학교월급', amount: 0 },
    { name: '연구비', amount: 0 },
    { name: '월세', amount: 0 },
    { name: '추가수입', amount: 0 },
  ];

  // 기본 고정지출 항목 정의
  const DEFAULT_FIXED_EXPENSES = [];

  // rawData에서 가장 최근 월(12월)의 고정지출 항목과 금액을 기본값으로 사용
  // 월세는 수입으로 이동했으므로 제외
  const defaultFixedExpensesFromSheet = useMemo(() => {
    if (!rawData || rawData.length <= 1) return [];

    // 가장 최근 월 찾기
    const months = new Set();
    for (let i = 1; i < rawData.length; i++) {
      if (rawData[i][0]) months.add(rawData[i][0]);
    }
    const latestMonth = Array.from(months).sort().reverse()[0];

    // 최근 월의 고정지출 항목과 금액 수집
    const expenses = {};
    for (let i = 1; i < rawData.length; i++) {
      const [date, category, name, amount, detail] = rawData[i];
      if ((category === '지출-고정' || category === '지출-고정월납') && name !== '월세') {
        // 최근 월 데이터 우선, 없으면 다른 월 데이터라도 사용
        if (date === latestMonth || !expenses[name]) {
          const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;
          const isChecked = detail !== 'unchecked';
          expenses[name] = { name, amount: value, checked: isChecked };
        }
      }
    }
    return Object.values(expenses);
  }, [rawData]);

  // 레거시 항목 마이그레이션 (고정수입/변동수입 → 추가수입으로 합산 후 삭제)
  const migrateAndCleanLegacyIncomes = useCallback(async (fixedIncomes, variableIncomes) => {
    const legacyNames = ['고정수입', '변동수입'];

    // 고정 수입에서 레거시 항목 삭제
    for (const income of fixedIncomes) {
      if (legacyNames.includes(income.name) && income.amount > 0) {
        try {
          await deleteFromSheet(selectedMonth, '수입-고정', income.name);
          console.log(`Deleted legacy fixed income: ${income.name}`);
        } catch (error) {
          console.log(`Legacy fixed item ${income.name} not found, skipping...`);
        }
      }
    }

    // 변동 수입에서 레거시 항목 삭제
    for (const income of variableIncomes) {
      if (legacyNames.includes(income.name) && income.amount > 0) {
        try {
          await deleteFromSheet(selectedMonth, '수입-변동', income.name);
          console.log(`Deleted legacy variable income: ${income.name}`);
        } catch (error) {
          console.log(`Legacy variable item ${income.name} not found, skipping...`);
        }
      }
    }
  }, [selectedMonth]);

  // 시트 데이터 로드 시 로컬 상태 동기화
  useEffect(() => {
    if (sheetData) {
      // 수입 - 기본 항목 병합
      const mergedIncomes = [...DEFAULT_FIXED_INCOMES];
      const legacyNames = ['고정수입', '변동수입'];

      // 고정 수입에서 데이터 병합 (레거시 항목 제외)
      sheetData.incomes.fixed.forEach(income => {
        if (legacyNames.includes(income.name)) return;

        const existingIdx = mergedIncomes.findIndex(i => i.name === income.name);
        if (existingIdx >= 0) {
          mergedIncomes[existingIdx] = income;
        } else {
          mergedIncomes.push(income);
        }
      });

      // 변동 수입(수입-변동)의 합계를 "추가수입"에 연동 (레거시 항목 제외)
      const validVariableIncomes = sheetData.incomes.variable.filter(i => !legacyNames.includes(i.name));
      const variableTotal = validVariableIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

      // 추가수입 = 변동 수입 합계
      const extraIncomeIdx = mergedIncomes.findIndex(i => i.name === '추가수입');
      if (extraIncomeIdx >= 0) {
        mergedIncomes[extraIncomeIdx] = {
          ...mergedIncomes[extraIncomeIdx],
          amount: variableTotal
        };
      }

      setFixedIncomes(mergedIncomes);
      // 변동 수입 상세 내역 저장 (UI에서 펼쳐볼 수 있도록)
      setVariableIncomes(validVariableIncomes);

      // 지출 - 12월(최근월) 고정지출을 기본값으로 사용
      const mergedExpenses = [...defaultFixedExpensesFromSheet];
      // 현재 월 데이터로 업데이트 (월세는 수입으로 이동했으므로 제외)
      sheetData.expenses.fixed
        .filter(expense => expense.name !== '월세')
        .forEach(expense => {
          const existingIdx = mergedExpenses.findIndex(e => e.name === expense.name);
          if (existingIdx >= 0) {
            mergedExpenses[existingIdx] = expense;
          } else {
            mergedExpenses.push(expense);
          }
        });
      setFixedExpenses(mergedExpenses);
      setVariableExpenses(sheetData.expenses.variable);
      setCardExpense(String(sheetData.expenses.card || 0));

      // 자산
      setAssets(sheetData.assets);
      setBond(sheetData.bond);

      // 주식계좌 (수동 입력값만 - 보유종목은 별도 시트)
      setManualAccounts({
        향화카카오: String(sheetData.stockAccounts?.향화카카오 || 0),
        재호영웅문: String(sheetData.stockAccounts?.재호영웅문 || 0),
      });

      // 레거시 투자 총액 (개별 종목 데이터가 없는 월용)
      if (sheetData.investmentTotals) {
        setInvestmentTotals(sheetData.investmentTotals);
      }
    }
  }, [sheetData, defaultFixedExpensesFromSheet]);

  // 키보드 단축키: 1-5로 탭 전환
  useEffect(() => {
    const handleKeyDown = (e) => {
      // input, textarea에서는 무시
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const tabMap = {
        '1': 'overview',
        '2': 'status',
        '3': 'investment',
        '4': 'annual',
        '5': 'input',
        '6': 'watchlist',
        '7': 'realestate',
      };

      if (tabMap[e.key]) {
        setTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Holdings (보유종목 - 별도 시트) ---
  const {
    stocks: holdings,
    loading: holdingsLoading,
    addStock: addHolding,
    updateStock: updateHolding,
    removeStock: removeHolding,
    reorderStocks: reorderHoldings,
  } = useHoldings();

  // --- Calculations ---
  const totalStockUSD = useMemo(() => {
    return holdings.reduce((sum, s) => {
      const price = stockPrices[s.ticker] || 0;
      return sum + (s.qty * price);
    }, 0);
  }, [holdings, stockPrices]);

  const totalStockKRW = useMemo(() => {
    const younghwaKRW = totalStockUSD * exchangeRate;
    const kakao = parseFloat(manualAccounts.향화카카오) || 0;
    const jaeho = parseFloat(manualAccounts.재호영웅문) || 0;
    return younghwaKRW + kakao + jaeho;
  }, [totalStockUSD, exchangeRate, manualAccounts]);

  const cashTotal = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalAssetsValue = totalStockKRW + bond.balance + cashTotal;

  // 채권 만기 계산
  const getBondMaturity = () => {
    const purchase = new Date(bond.purchaseDate);
    const maturity = new Date(purchase);
    maturity.setMonth(maturity.getMonth() + bond.maturityMonths);
    const today = new Date();
    const monthsLeft = Math.max(0, Math.ceil((maturity - today) / (30 * 24 * 60 * 60 * 1000)));
    return { maturityDate: maturity, monthsLeft, isMatured: monthsLeft === 0 };
  };

  const thisMonthIncome = fixedIncomes.reduce((s, i) => s + i.amount, 0) + variableIncomes.reduce((s, i) => s + i.amount, 0);
  const thisMonthExpense = (parseInt(cardExpense.replace(/,/g,'')) || 0) +
    fixedExpenses.filter(e => e.checked).reduce((s, e) => s + e.amount, 0) +
    variableExpenses.reduce((s, e) => s + e.amount, 0);

  // --- Handlers ---
  const handleManualAccountChange = async (key, value) => {
    const newValue = value.replace(/,/g, '');
    setManualAccounts(prev => ({ ...prev, [key]: newValue }));

    try {
      // 자산-주식계좌 카테고리로 저장 (없으면 새로 생성)
      await upsertRow(selectedMonth, '자산-주식계좌', key, [
        selectedMonth, '자산-주식계좌', key, parseInt(newValue) || 0, ''
      ]);
      reloadSheet();
    } catch (error) {
      console.error('Failed to update manual account:', error);
    }
  };

  const handleAssetChange = async (key, value) => {
    const newValue = parseInt(value.replace(/,/g, '')) || 0;
    setAssets(prev => ({ ...prev, [key]: newValue }));

    // 카테고리 매핑
    const categoryMap = {
      '재호잔고': ['자산-잔고', '재호잔고'],
      '향화잔고': ['자산-잔고', '향화잔고'],
      '적금': ['자산-저축', '적금'],
    };
    const [category, name] = categoryMap[key] || ['자산-잔고', key];

    try {
      await upsertRow(selectedMonth, category, name, [selectedMonth, category, name, newValue, '']);
    } catch (error) {
      console.error('Failed to update asset:', error);
    }
  };

  const handleFixedIncomeChange = async (index, value) => {
    const income = fixedIncomes[index];
    const newAmount = parseInt(value.replace(/,/g, '')) || 0;

    // 새 객체로 교체 (불변성 유지)
    const newIncomes = fixedIncomes.map((item, i) =>
      i === index ? { ...item, amount: newAmount } : item
    );
    setFixedIncomes(newIncomes);

    try {
      await upsertRow(selectedMonth, '수입-고정', income.name, [selectedMonth, '수입-고정', income.name, newAmount, '']);
      console.log(`Saved ${income.name}: ${newAmount} to ${selectedMonth}`);
      // 시트 데이터 리로드하여 rawData 동기화
      reloadSheet();
    } catch (error) {
      console.error('Failed to update income:', error);
      alert('저장 실패: ' + error.message);
    }
  };

  const handleCardExpenseChange = async (value) => {
    const newValue = value.replace(/,/g, '');
    setCardExpense(newValue);

    try {
      await upsertRow(selectedMonth, '지출-카드', '카드값', [selectedMonth, '지출-카드', '카드값', newValue, '']);
    } catch (error) {
      console.error('Failed to update card expense:', error);
    }
  };

  const handleToggleFixedExpense = async (index) => {
    const expense = fixedExpenses[index];
    const newChecked = !expense.checked;

    // 새 객체로 교체 (불변성 유지)
    const newExpenses = fixedExpenses.map((item, i) =>
      i === index ? { ...item, checked: newChecked } : item
    );
    setFixedExpenses(newExpenses);

    try {
      // detail 필드에 체크 상태 저장 (checked/unchecked)
      await upsertRow(selectedMonth, '지출-고정', expense.name, [
        selectedMonth, '지출-고정', expense.name, expense.amount, newChecked ? 'checked' : 'unchecked'
      ]);
    } catch (error) {
      console.error('Failed to update fixed expense check:', error);
    }
  };

  const handleFixedExpenseAmountChange = async (index, value) => {
    const expense = fixedExpenses[index];
    const newAmount = parseInt(String(value).replace(/,/g, ''), 10) || 0;

    const newExpenses = fixedExpenses.map((item, i) =>
      i === index ? { ...item, amount: newAmount } : item
    );
    setFixedExpenses(newExpenses);

    try {
      await upsertRow(selectedMonth, '지출-고정', expense.name, [
        selectedMonth, '지출-고정', expense.name, newAmount, expense.checked ? 'checked' : 'unchecked'
      ]);
    } catch (error) {
      console.error('Failed to update fixed expense amount:', error);
    }
  };

  const handleAddFixedExpense = async (expense) => {
    try {
      await appendToSheet('A:E', [[selectedMonth, '지출-고정', expense.name, expense.amount, 'checked']]);
      setFixedExpenses(prev => [...prev, { ...expense, checked: true }]);
    } catch (error) {
      console.error('Failed to add fixed expense:', error);
      alert('고정지출 추가 실패: ' + error.message);
    }
  };

  const handleDeleteFixedExpense = async (index) => {
    const expense = fixedExpenses[index];
    // 금액이 0이면 시트에 없는 기본값이므로 로컬에서만 제거
    if (expense.amount === 0) {
      setFixedExpenses(prev => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      await deleteFromSheet(selectedMonth, '지출-고정', expense.name);
      setFixedExpenses(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to delete fixed expense:', error);
      // 시트에서 못 찾아도 로컬에서는 제거
      setFixedExpenses(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleExchangeRateChange = (value) => {
    setExchangeRate(parseFloat(value) || 0);
  };

  // --- Reorder Handlers ---
  const handleReorderFixedIncomes = (newOrder) => {
    setFixedIncomes(newOrder);
  };

  const handleReorderVariableIncomes = (newOrder) => {
    setVariableIncomes(newOrder);
  };

  const handleReorderFixedExpenses = (newOrder) => {
    setFixedExpenses(newOrder);
  };

  // --- Variable Income Handlers ---
  const handleAddVariableIncome = async (income) => {
    try {
      // 시트에 저장: [날짜, 카테고리, 이름, 금액, 메모]
      await appendToSheet('A:E', [[selectedMonth, '수입-변동', income.name, income.amount, income.memo || '']]);
      setVariableIncomes(prev => [...prev, income]);
      reloadSheet();
    } catch (error) {
      console.error('Failed to add income:', error);
      alert('수입 추가 실패: ' + error.message);
    }
  };

  // --- Variable Expense Handlers ---
  const handleAddVariableExpense = async (expense) => {
    try {
      // 시트에 저장: [날짜, 카테고리, 이름, 금액, 상세]
      await appendToSheet('A:E', [[selectedMonth, '지출-변동', expense.name, expense.amount, '']]);
      setVariableExpenses(prev => [...prev, expense]);
      reloadSheet();
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('지출 추가 실패: ' + error.message);
    }
  };

  const handleDeleteVariableExpense = async (index) => {
    try {
      const expense = variableExpenses[index];
      await deleteFromSheet(selectedMonth, '지출-변동', expense.name);
      setVariableExpenses(prev => prev.filter((_, i) => i !== index));
      reloadSheet();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('지출 삭제 실패: ' + error.message);
    }
  };

  const handleDeleteVariableIncome = async (index) => {
    try {
      const income = variableIncomes[index];
      await deleteFromSheet(selectedMonth, '수입-변동', income.name);
      setVariableIncomes(prev => prev.filter((_, i) => i !== index));
      reloadSheet();
    } catch (error) {
      console.error('Failed to delete income:', error);
      alert('수입 삭제 실패: ' + error.message);
    }
  };

  const handleDeleteFixedIncome = async (index) => {
    const income = fixedIncomes[index];
    // 기본 4개 항목(학교월급, 연구비, 월세, 추가수입)은 삭제 불가, 금액만 0으로 리셋
    const defaultNames = ['학교월급', '연구비', '월세', '추가수입'];
    if (defaultNames.includes(income.name)) {
      // 금액만 0으로 설정
      const newIncomes = fixedIncomes.map((item, i) =>
        i === index ? { ...item, amount: 0 } : item
      );
      setFixedIncomes(newIncomes);
      try {
        await upsertRow(selectedMonth, '수입-고정', income.name, [selectedMonth, '수입-고정', income.name, 0, '']);
      } catch (error) {
        console.error('Failed to reset income:', error);
      }
      return;
    }

    // 기본 항목이 아닌 경우 완전 삭제
    try {
      await deleteFromSheet(selectedMonth, '수입-고정', income.name);
      setFixedIncomes(prev => prev.filter((_, i) => i !== index));
      reloadSheet();
    } catch (error) {
      console.error('Failed to delete fixed income:', error);
      // 시트에서 못 찾아도 로컬에서는 제거
      setFixedIncomes(prev => prev.filter((_, i) => i !== index));
    }
  };

  // --- Stock Management Handlers (보유종목 시트 사용) ---
  const handleAddStock = async (newStock) => {
    const success = await addHolding(
      newStock.ticker,
      newStock.name || newStock.ticker,
      newStock.qty || 0,
      newStock.avgPrice || 0,
      newStock.account || ''
    );
    if (!success) {
      alert('종목 추가 실패');
    }
  };

  const handleDeleteStock = async (ticker) => {
    const success = await removeHolding(ticker);
    if (!success) {
      alert('종목 삭제 실패');
    }
  };

  const handleUpdateStock = async (ticker, updates) => {
    const success = await updateHolding(ticker, updates);
    if (!success) {
      console.error('Failed to update stock');
    }
  };

  // --- Watchlist (별도 시트) ---
  const {
    stocks: watchlist,
    loading: watchlistLoading,
    addStock: addWatchlistStock,
    removeStock: removeWatchlistStock,
    reorderStocks: reorderWatchlist,
  } = useWatchlist();

  // --- Real Estate (별도 시트) ---
  const realEstate = useRealEstate();

  // Yahoo Finance 연동 (관심종목 티커 기반)
  const watchlistTickers = useMemo(() => {
    return watchlist?.map(s => s.ticker) || [];
  }, [watchlist]);

  const {
    data: yahooData,
    loading: yahooLoading,
  } = useYahooFinance(watchlistTickers, { range: '5y' }); // 항상 5년치 로딩, chartRange는 visible range만 조절

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
    expenses: { total: thisMonthExpense, fixed: fixedExpenses.filter(e => e.checked), variable: variableExpenses, card: parseInt(cardExpense) },
    assets: { total: totalAssetsValue, cash: assets, stocks: { '주식 계좌 합계': totalStockKRW }, bonds: bond.balance },
    handlers: {
      onReorderFixedIncomes: handleReorderFixedIncomes,
      onReorderVariableIncomes: handleReorderVariableIncomes,
      onReorderFixedExpenses: handleReorderFixedExpenses,
      onOpenAddVariableExpense: () => setIsAddExpenseModalOpen(true),
      onDeleteVariableExpense: handleDeleteVariableExpense,
    }
  };

  // 투자 총액 계산: 개별 종목 데이터가 있으면 사용, 없으면 레거시 총액 사용
  const hasIndividualStocks = holdings.length > 0;
  const legacyStockTotal = investmentTotals.재호해외주식 + investmentTotals.향화해외주식;
  const effectiveStockTotal = hasIndividualStocks ? totalStockKRW : legacyStockTotal;

  const investmentData = {
    exchangeRate,
    stockPrices,
    totalStockUSD,
    totalStockKRW: effectiveStockTotal,
    totalInvestmentKRW: effectiveStockTotal + bond.balance,
    investedPrincipal: investmentTotals.투자원금 || effectiveStockTotal * 0.8,
    stocks: { list: holdings },
    bonds: { ...bond, ...getBondMaturity() },
    benchmarks: { spy: stockPrices['SPY'] || 0, qqq: stockPrices['QQQ'] || 0, tqqq: stockPrices['TQQQ'] || 0 },
    history: investmentHistory || [],
    manual: {
      kakao: parseFloat(manualAccounts.향화카카오),
      jaeho: parseFloat(manualAccounts.재호영웅문),
      younghwa: totalStockUSD * exchangeRate  // 향화 영웅문 (실시간 계산)
    },
    // 레거시 데이터 (월별 총액)
    investmentTotals: {
      재호: investmentTotals.재호해외주식,
      향화: investmentTotals.향화해외주식,
      원금: investmentTotals.투자원금,
      배당: investmentTotals.배당,
    },
    hasIndividualStocks,
  };

  const inputData = { manualAccounts, assets, fixedIncomes, variableIncomes, fixedExpenses, cardExpense };
  const inputHandlers = {
    onManualAccountChange: handleManualAccountChange,
    onAssetChange: handleAssetChange,
    onFixedIncomeChange: handleFixedIncomeChange,
    onCardExpenseChange: handleCardExpenseChange,
    onToggleFixedExpense: handleToggleFixedExpense,
    onFixedExpenseAmountChange: handleFixedExpenseAmountChange,
    onAddFixedExpense: handleAddFixedExpense,
    onDeleteFixedExpense: handleDeleteFixedExpense,
    onAddVariableIncome: handleAddVariableIncome,
    onDeleteVariableIncome: handleDeleteVariableIncome,
    onDeleteFixedIncome: handleDeleteFixedIncome,
    onReload: reloadSheet
  };

  const investmentHandlers = {
    onExchangeRateChange: handleExchangeRateChange,
    onAddStock: handleAddStock,
    onDeleteStock: handleDeleteStock,
    onUpdateStock: handleUpdateStock,
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
      />
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
              activeTab={tab}
              onTabChange={setTab}
              isOpen={true}
              onClose={() => {}}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto bg-background pb-32 md:pb-0">
          {/* 로딩 상태 */}
          {sheetLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-sm">데이터 로딩 중...</p>
              </div>
            </div>
          )}

          {/* 에러 상태 */}
          {sheetError && !sheetLoading && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 max-w-md text-center">
                <p className="text-red-400 mb-2">데이터 로드 실패</p>
                <p className="text-slate-400 text-sm mb-3">{sheetError}</p>
                <button
                  onClick={reloadSheet}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* 정상 상태 */}
          {!sheetLoading && !sheetError && (
            <>
              {tab === 'overview' && (
                <OverviewTab
                  stats={overviewStats}
                  selectedMonth={selectedMonthObj}
                  onMonthChange={handleMonthChange}
                  monthlyHistory={monthlyHistory}
                />
              )}
              {tab === 'status' && (
                <StatusTab
                  data={statusData}
                  selectedMonth={selectedMonthObj}
                  onMonthChange={handleMonthChange}
                />
              )}
              {tab === 'investment' && (
                <InvestmentTab
                  data={investmentData}
                  handlers={investmentHandlers}
                  selectedMonth={selectedMonthObj}
                  onMonthChange={handleMonthChange}
                />
              )}
              {tab === 'annual' && (
                <AnnualTab
                  currentData={{ income: thisMonthIncome, expense: thisMonthExpense }}
                  investmentData={{
                    totalValue: investmentData.totalStockKRW,
                    principal: investmentData.investedPrincipal,
                    profit: investmentData.totalStockKRW - investmentData.investedPrincipal,
                    profitPercent: ((investmentData.totalStockKRW / investmentData.investedPrincipal - 1) * 100).toFixed(1),
                  }}
                />
              )}
              {tab === 'input' && (
                <InputTab
                  data={inputData}
                  handlers={inputHandlers}
                  selectedMonth={selectedMonthObj}
                  onMonthChange={handleMonthChange}
                />
              )}
              {tab === 'watchlist' && (
                <WatchlistTab
                  stocks={watchlist}
                  prices={yahooData || {}}
                  loading={watchlistLoading || yahooLoading}
                  onAddStock={addWatchlistStock}
                  onRemoveStock={removeWatchlistStock}
                  onReorderStocks={reorderWatchlist}
                  chartRange={chartRange}
                  onChartRangeChange={setChartRange}
                />
              )}
              {tab === 'realestate' && (
                <RealEstateTab
                  data={{
                    watchProperties: realEstate.watchProperties,
                    myProperties: realEstate.myProperties,
                    loans: realEstate.loans,
                    priceHistory: realEstate.priceHistory,
                    totalAssets: realEstate.totalAssets,
                    totalDebt: realEstate.totalDebt,
                    netWorth: realEstate.netWorth,
                    monthlyInterest: realEstate.monthlyInterest,
                  }}
                  handlers={{
                    addWatch: realEstate.addWatch,
                    removeWatch: realEstate.removeWatch,
                    addProperty: realEstate.addProperty,
                    updateProperty: realEstate.updateProperty,
                    removeProperty: realEstate.removeProperty,
                    addLoan: realEstate.addLoan,
                    updateLoan: realEstate.updateLoan,
                    removeLoan: realEstate.removeLoan,
                    addPrice: realEstate.addPrice,
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={tab} onTabChange={setTab} />

      {/* Variable Expense Modal */}
      <AddVariableExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onAdd={handleAddVariableExpense}
      />
    </DashboardLayout>
  );
}