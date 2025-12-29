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

// Auto Save Investment
import { useAutoSaveInvestment } from './hooks/useAutoSaveInvestment';

// Toast Component
import Toast from './components/common/Toast';

// AI Chat Components
import FloatingAIChatButton from './components/common/FloatingAIChatButton';
import AIChatModal from './components/common/AIChatModal';
import DesktopAIChatPanel from './components/common/DesktopAIChatPanel';

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
  const [toast, setToast] = useState(null); // 토스트 알림
  const [isAIChatOpen, setIsAIChatOpen] = useState(false); // AI 챗봇 모달

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
    cardHistory,
    balanceHistory,
    assetsHistory,
    expenseByCategory,
    reload: reloadSheet,
  } = useSheetData();

  // --- Real Estate (별도 시트) ---
  const realEstateData = useRealEstate();

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

      // 변동 수입(수입-변동) 처리 (레거시 항목 제외)
      const validVariableIncomes = sheetData.incomes.variable.filter(i => !legacyNames.includes(i.name));
      const variableTotal = validVariableIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

      // 추가수입: 수입-고정에 저장된 값 우선 사용, 없으면 변동 수입 합계
      const extraIncomeIdx = mergedIncomes.findIndex(i => i.name === '추가수입');
      if (extraIncomeIdx >= 0) {
        // 수입-고정에서 이미 병합된 추가수입 값이 있으면 유지
        const savedExtraIncome = mergedIncomes[extraIncomeIdx].amount;
        // 저장된 값이 없고 변동 수입이 있을 때만 합계로 대체
        if (!savedExtraIncome && variableTotal > 0) {
          mergedIncomes[extraIncomeIdx] = {
            ...mergedIncomes[extraIncomeIdx],
            amount: variableTotal
          };
        }
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

      // 레거시 투자 총액 (개별 종목 데이터가 없는 월용)
      if (sheetData.investmentTotals) {
        setInvestmentTotals(sheetData.investmentTotals);
      }

      // 주식계좌 (수동 입력값만 - 보유종목은 별도 시트)
      // 레거시 연결: 재호영웅문 = 재호해외주식 (2025.09 이전 데이터)
      const jaehoYounghwamun = sheetData.stockAccounts?.재호영웅문 || 0;
      const jaehoLegacy = sheetData.investmentTotals?.재호해외주식 || 0;
      setManualAccounts({
        향화카카오: String(sheetData.stockAccounts?.향화카카오 || 0),
        재호영웅문: String(jaehoYounghwamun || jaehoLegacy), // 현재값 없으면 레거시 사용
      });
    }
  }, [sheetData, defaultFixedExpensesFromSheet]);

  // 키보드 단축키: 1-5로 탭 전환
  useEffect(() => {
    const handleKeyDown = (e) => {
      // input, textarea에서는 무시
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const tabMap = {
        '1': 'overview',
        '2': 'investment',
        '3': 'watchlist',
        '4': 'realestate',
        '5': 'annual',
        '6': 'input',
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
    history: changeHistory,
    fetchHistory,
    clearHistory,
    deleteHistoryItem,
  } = useHoldings();

  // 변경이력 초기 로드
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // --- Auto Save Investment (매월 1일 향화 영웅문 자동 저장) ---
  useAutoSaveInvestment({
    rawData,
    holdings,
    stockPrices,
    exchangeRate,
    holdingsLoading,
    onSuccess: (msg) => setToast({ type: 'success', message: msg }),
    onError: (msg) => setToast({ type: 'error', message: msg }),
    onReload: reloadSheet,
  });

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

  // 순자산 계산용 (적금 포함)
  const cashTotal = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalAssetsValue = totalStockKRW + bond.balance + cashTotal;

  // 잔고통합 (지출 계산용): 재호잔고 + 향화잔고 (적금, 채권 제외!)
  const balanceTotal = (assets.재호잔고 || 0) + (assets.향화잔고 || 0);

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

  // 전달 월 계산
  const getPrevMonth = (monthStr) => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('.').map(Number);
    if (month === 1) {
      return `${year - 1}.12`;
    }
    return `${year}.${String(month - 1).padStart(2, '0')}`;
  };

  const prevMonth = getPrevMonth(selectedMonth);
  // 전달 잔고통합: 재호잔고 + 향화잔고 (적금, 채권 제외!)
  const prevMonthBalance = useMemo(() => {
    if (!prevMonth || !balanceHistory[prevMonth]) return null;
    const prev = balanceHistory[prevMonth];
    return (prev.재호잔고 || 0) + (prev.향화잔고 || 0);
  }, [prevMonth, balanceHistory]);

  // 총지출 계산: 총수입 - 잔고증감 (구글 시트 행 30 계산식)
  // 잔고증감 = 현재 잔고통합 - 전달 잔고통합
  // 전달 잔고가 없으면 기존 방식 사용
  const balanceChange = prevMonthBalance !== null ? balanceTotal - prevMonthBalance : null;
  const thisMonthExpense = balanceChange !== null
    ? thisMonthIncome - balanceChange
    : (parseInt(cardExpense.replace(/,/g,'')) || 0) +
      fixedExpenses.filter(e => e.checked).reduce((s, e) => s + e.amount, 0) +
      variableExpenses.reduce((s, e) => s + e.amount, 0);

  // 순수익 계산
  const netProfit = thisMonthIncome - thisMonthExpense;

  // AI 챗봇 컨텍스트 (전체 재무 데이터)
  const aiContext = useMemo(() => ({
    incomes: { fixed: fixedIncomes, variable: variableIncomes },
    expenses: { fixed: fixedExpenses, variable: variableExpenses, card: cardExpense },
    assets,
    bond,
    holdings,
    stockPrices,
    exchangeRate,
    manualAccounts,
    realEstate: {
      myProperties: realEstateData.myProperties,
      loans: realEstateData.loans,
      netWorth: realEstateData.netWorth,
    },
    summary: {
      selectedMonth,
      totalIncome: thisMonthIncome,
      totalExpense: thisMonthExpense,
      totalAssets: totalAssetsValue,
    },
  }), [
    fixedIncomes, variableIncomes, fixedExpenses, variableExpenses, cardExpense,
    assets, bond, holdings, stockPrices, exchangeRate, manualAccounts,
    realEstateData, selectedMonth, thisMonthIncome, thisMonthExpense, totalAssetsValue
  ]);

  // AI 챗봇 액션 핸들러 (이름으로 항목 찾아서 수정)
  const aiActionHandlers = useMemo(() => ({
    updateCardExpense: async ({ amount }) => {
      setCardExpense(String(amount));
      await upsertRow(selectedMonth, '지출-카드', '카드값', [selectedMonth, '지출-카드', '카드값', amount, '']);
      reloadSheet();
    },
    updateFixedIncome: async ({ name, amount }) => {
      const index = fixedIncomes.findIndex(i => i.name === name);
      if (index === -1) throw new Error(`수입 항목 "${name}"을(를) 찾을 수 없습니다.`);
      const newIncomes = fixedIncomes.map((item, i) =>
        i === index ? { ...item, amount } : item
      );
      setFixedIncomes(newIncomes);
      await upsertRow(selectedMonth, '수입-고정', name, [selectedMonth, '수입-고정', name, amount, '']);
      reloadSheet();
    },
    addVariableExpense: async ({ name, amount }) => {
      const newExpense = { name, amount };
      setVariableExpenses(prev => [...prev, newExpense]);
      await appendToSheet('시트1', [[selectedMonth, '지출-변동', name, amount, '']]);
      reloadSheet();
    },
    updateAsset: async ({ name, amount }) => {
      const categoryMap = {
        '재호잔고': ['자산-잔고', '재호잔고'],
        '향화잔고': ['자산-잔고', '향화잔고'],
        '적금': ['자산-저축', '적금'],
      };
      const [category, assetName] = categoryMap[name] || ['자산-잔고', name];
      setAssets(prev => ({ ...prev, [name]: amount }));
      await upsertRow(selectedMonth, category, assetName, [selectedMonth, category, assetName, amount, '']);
      reloadSheet();
    },
    updateFixedExpense: async ({ name, amount }) => {
      const index = fixedExpenses.findIndex(e => e.name === name);
      if (index === -1) throw new Error(`지출 항목 "${name}"을(를) 찾을 수 없습니다.`);
      const expense = fixedExpenses[index];
      const newExpenses = fixedExpenses.map((item, i) =>
        i === index ? { ...item, amount } : item
      );
      setFixedExpenses(newExpenses);
      await upsertRow(selectedMonth, '지출-고정', name, [
        selectedMonth, '지출-고정', name, amount, expense.checked ? 'checked' : 'unchecked'
      ]);
      reloadSheet();
    },
    toggleFixedExpense: async ({ name, checked }) => {
      const index = fixedExpenses.findIndex(e => e.name === name);
      if (index === -1) throw new Error(`지출 항목 "${name}"을(를) 찾을 수 없습니다.`);
      const expense = fixedExpenses[index];
      const newExpenses = fixedExpenses.map((item, i) =>
        i === index ? { ...item, checked } : item
      );
      setFixedExpenses(newExpenses);
      await upsertRow(selectedMonth, '지출-고정', name, [
        selectedMonth, '지출-고정', name, expense.amount, checked ? 'checked' : 'unchecked'
      ]);
      reloadSheet();
    },
    updateManualAccount: async ({ name, amount }) => {
      setManualAccounts(prev => ({ ...prev, [name]: String(amount) }));
      await upsertRow(selectedMonth, '자산-주식계좌', name, [
        selectedMonth, '자산-주식계좌', name, amount, ''
      ]);
      reloadSheet();
    },
  }), [selectedMonth, fixedIncomes, fixedExpenses, reloadSheet]);

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

  // Yahoo Finance 연동 (보유종목 + 관심종목 + 기본 티커)
  const allTickers = useMemo(() => {
    const holdingTickers = holdings?.map(h => h.ticker) || [];
    const watchTickers = watchlist?.map(s => s.ticker) || [];
    const baseTickers = ['KRW=X', 'SPY', 'QQQ', 'TQQQ', 'BTC-KRW', 'ETH-KRW'];
    return [...new Set([...holdingTickers, ...watchTickers, ...baseTickers])];
  }, [holdings, watchlist]);

  const {
    data: yahooData,
    loading: yahooLoading,
  } = useYahooFinance(allTickers, { range: '5y' }); // 항상 5년치 로딩, chartRange는 visible range만 조절

  // --- Effects ---
  // Yahoo Finance에서 환율 가져오기
  useEffect(() => {
    if (yahooData?.['KRW=X']?.price) {
      setExchangeRate(yahooData['KRW=X'].price);
    }
  }, [yahooData]);

  // Yahoo Finance 데이터를 stockPrices에 반영
  useEffect(() => {
    if (yahooData && Object.keys(yahooData).length > 0) {
      const prices = {};
      Object.entries(yahooData).forEach(([ticker, data]) => {
        if (data?.price) prices[ticker] = data.price;
      });
      setStockPrices(prices);
    }
  }, [yahooData]);

  // 전달 순자산 계산 (증감률용) - 주식 데이터가 있는 이전 월 찾기
  const prevMonthAssetsData = useMemo(() => {
    if (!selectedMonth || !assetsHistory) return { assets: null, month: null };

    // 현재 월의 주식 데이터 확인
    const current = assetsHistory[selectedMonth];
    const currentHasStocks = current?.stocks > 0;

    // 이전 월들을 최근순으로 정렬
    const sortedMonths = Object.keys(assetsHistory)
      .filter(m => m < selectedMonth)
      .sort((a, b) => b.localeCompare(a));

    // 주식 데이터가 있는 이전 월 찾기
    for (const month of sortedMonths) {
      const prev = assetsHistory[month];
      if (currentHasStocks && prev.stocks > 0) {
        // 현재/이전 둘 다 주식 데이터가 있으면 전체 비교
        return {
          assets: (prev.cash || 0) + (prev.savings || 0) + (prev.bonds || 0) + (prev.stocks || 0),
          month
        };
      } else if (!currentHasStocks && prev.stocks === 0) {
        // 둘 다 주식 데이터가 없으면 주식 제외 비교
        return {
          assets: (prev.cash || 0) + (prev.savings || 0) + (prev.bonds || 0),
          month
        };
      }
    }

    return { assets: null, month: null };
  }, [selectedMonth, assetsHistory]);

  const prevMonthAssets = prevMonthAssetsData.assets;

  // 순자산 증감률
  const assetsChangePercent = prevMonthAssets && prevMonthAssets > 0
    ? ((totalAssetsValue - prevMonthAssets) / prevMonthAssets * 100).toFixed(1)
    : null;

  // --- Tab Data Mapping ---
  const overviewStats = {
    income: thisMonthIncome,
    expense: thisMonthExpense,
    netProfit: netProfit,
    totalAssets: totalAssetsValue,
    stockAssets: totalStockKRW,
    savingsRate: thisMonthIncome > 0 ? (((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100).toFixed(1) : '0.0',
    // 순자산 구성 상세
    assetBreakdown: {
      stocks: totalStockKRW,
      bonds: bond.balance,
      cash: cashTotal,
      cashDetail: assets, // { 재호잔고, 향화잔고, 적금 }
    },
    // 지출 계산 상세 (툴팁용) - 총지출 = 총수입 - 잔고증감
    expenseCalc: {
      prevMonthBalance: prevMonthBalance,
      currentBalance: balanceTotal,
      balanceChange: balanceChange,
      thisMonthIncome: thisMonthIncome,
      hasPrevData: prevMonthBalance !== null,
    },
    // 순자산 증감
    assetsChange: {
      prevMonthAssets: prevMonthAssets,
      changeAmount: prevMonthAssets ? totalAssetsValue - prevMonthAssets : null,
      changePercent: assetsChangePercent,
      hasPrevData: prevMonthAssets !== null,
    }
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

  // 투자 총액 계산: 3개 계좌 분리 표시
  const hasIndividualStocks = holdings.length > 0;

  // 재호 영웅문 (신규 값 우선, 레거시 fallback)
  const jaehoYounghwamun = parseFloat(manualAccounts.재호영웅문) ||
    investmentTotals.재호해외주식 || 0;

  // 향화 카카오 (단타용)
  const hyangKakao = parseFloat(manualAccounts.향화카카오) || 0;

  // 향화 영웅문 (장투용 - 보유종목 합계)
  const hyangYounghwamun = holdings
    .filter(h => h.account === '향화영웅문')
    .reduce((sum, h) => sum + h.qty * (stockPrices[h.ticker] || 0) * exchangeRate, 0);

  // 레거시: 향화해외주식 값이 있으면 사용 (9월 이전 데이터)
  const hyangTotal = investmentTotals.향화해외주식 || (hyangKakao + hyangYounghwamun);

  const effectiveStockTotal = jaehoYounghwamun + hyangTotal;

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
    benchmarkHistory: {
      SPY: yahooData?.['SPY']?.history || [],
      QQQ: yahooData?.['QQQ']?.history || [],
      TQQQ: yahooData?.['TQQQ']?.history || [],
    },
    history: investmentHistory || [],
    manual: {
      kakao: hyangKakao,
      jaeho: jaehoYounghwamun,
      younghwa: hyangYounghwamun
    },
    // 3개 계좌 분리 표시
    investmentTotals: {
      재호영웅문: jaehoYounghwamun,
      향화카카오: hyangKakao,
      향화영웅문: hyangYounghwamun,
      // 레거시 호환 (9월 이전 데이터용)
      재호: investmentTotals.재호해외주식 || jaehoYounghwamun,
      향화: investmentTotals.향화해외주식 || (hyangKakao + hyangYounghwamun),
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
        watchlist={watchlist}
        yahooData={yahooData}
      />
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
              activeTab={tab}
              onTabChange={setTab}
              isOpen={true}
              onClose={() => {}}
              onAIChatOpen={() => setIsAIChatOpen(true)}
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
                  cardHistory={cardHistory}
                  data={statusData}
                />
              )}
              {tab === 'investment' && (
                <InvestmentTab
                  data={investmentData}
                  handlers={investmentHandlers}
                  selectedMonth={selectedMonthObj}
                  onMonthChange={handleMonthChange}
                  changeHistory={changeHistory}
                  onClearHistory={clearHistory}
                  onDeleteHistoryItem={deleteHistoryItem}
                  onRefreshHistory={fetchHistory}
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
                  monthlyHistory={monthlyHistory}
                  cardHistory={cardHistory}
                  expenseTop5={expenseByCategory}
                  changeHistory={changeHistory}
                  exchangeRate={exchangeRate}
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
                    watchProperties: realEstateData.watchProperties,
                    myProperties: realEstateData.myProperties,
                    loans: realEstateData.loans,
                    priceHistory: realEstateData.priceHistory,
                    totalAssets: realEstateData.totalAssets,
                    totalDebt: realEstateData.totalDebt,
                    netWorth: realEstateData.netWorth,
                    monthlyInterest: realEstateData.monthlyInterest,
                  }}
                  handlers={{
                    addWatch: realEstateData.addWatch,
                    removeWatch: realEstateData.removeWatch,
                    addProperty: realEstateData.addProperty,
                    updateProperty: realEstateData.updateProperty,
                    removeProperty: realEstateData.removeProperty,
                    addLoan: realEstateData.addLoan,
                    updateLoan: realEstateData.updateLoan,
                    removeLoan: realEstateData.removeLoan,
                    addPrice: realEstateData.addPrice,
                  }}
                />
              )}
            </>
          )}
        </main>

        {/* Desktop AI Chat Panel (inside flex container) */}
        <DesktopAIChatPanel
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          context={aiContext}
          actionHandlers={aiActionHandlers}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={tab} onTabChange={setTab} />

      {/* AI Chat Floating Button (Mobile Only) */}
      <div className="md:hidden">
        <FloatingAIChatButton onClick={() => setIsAIChatOpen(true)} />
      </div>

      {/* AI Chat Modal (Mobile Only) */}
      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        context={aiContext}
        actionHandlers={aiActionHandlers}
        mobileOnly={true}
      />

      {/* Variable Expense Modal */}
      <AddVariableExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onAdd={handleAddVariableExpense}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  );
}