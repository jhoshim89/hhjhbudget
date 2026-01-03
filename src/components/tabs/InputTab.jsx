import React, { useState, useMemo } from 'react';
import { PenTool, Heart, User, ChevronLeft, ChevronRight, Plus, Check, RefreshCw, Trash2, Lock } from 'lucide-react';
import { formatKRW, evaluateExpression } from '../../utils/formatters';
import { isLegacyMonth, LEGACY_CUTOFF } from '../../services/sheetsApi';

const SectionHeader = ({ title, icon: Icon, theme, action }) => (
  <div className={`flex items-center justify-between py-3 px-4 border-l-2 rounded-r-lg ${theme === 'pink' ? 'border-l-pink-500 bg-pink-500/5' : 'border-l-blue-500 bg-blue-500/5'}`}>
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme === 'pink' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
        <Icon size={14} />
      </div>
      <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</h3>
    </div>
    {action}
  </div>
);

// 숫자에 천 단위 콤마 추가
const formatWithCommas = (num) => {
  if (num === '' || num === null || num === undefined) return '';
  const numStr = String(num).replace(/,/g, '');
  const parsed = parseFloat(numStr);
  if (isNaN(parsed)) return numStr;
  return parsed.toLocaleString('ko-KR');
};

// 계산기 기능이 있는 입력 필드 (원 단위 입력)
const CalcInputField = ({ label, value, onChange, placeholder, prefix = "₩", compact = false, disabled = false }) => {
  const [displayValue, setDisplayValue] = useState(formatWithCommas(value));
  const [isExpression, setIsExpression] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // 사용자가 값을 변경했는지 추적
  const [isFocused, setIsFocused] = useState(false);

  // value prop이 변경되면 displayValue 업데이트 (포커스 안됐을 때만 콤마 포맷)
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(value));
    }
    setIsDirty(false); // 외부 값 변경 시 dirty 리셋
  }, [value, isFocused]);

  const handleChange = (e) => {
    const val = e.target.value;
    setDisplayValue(val);
    setIsDirty(true); // 사용자가 입력함
    // 수식 포함 여부 확인 (/ 도 더하기로 처리)
    setIsExpression(/[+\-*/]/.test(val.replace(/,/g, '')));
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // 값이 변경되지 않았으면 변환하지 않음 (기존 값 유지)
    if (!isDirty) {
      setDisplayValue(formatWithCommas(value));
      return;
    }

    // 원 단위 입력 (자동 변환 없음)
    const cleaned = String(displayValue).replace(/,/g, '').replace(/\//g, '+').replace(/\s/g, '');
    let result = null;

    // 수식이면 계산
    if (/[+\-*]/.test(cleaned)) {
      try {
        result = new Function(`return (${cleaned})`)();
        if (typeof result !== 'number' || !isFinite(result)) result = null;
      } catch { result = null; }
    } else {
      result = parseFloat(cleaned) || null;
    }

    if (result !== null) {
      // 원 단위 그대로 저장 (× 1000 변환 제거)
      const finalValue = Math.round(result);
      setDisplayValue(formatWithCommas(finalValue));
      setIsExpression(false);
      setIsDirty(false);
      onChange({ target: { value: String(finalValue) } });
    } else {
      // 결과가 없으면 기존 값으로 복원
      setDisplayValue(formatWithCommas(value));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
      e.target.blur();
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    // 값이 0이면 빈 칸으로 표시, 아니면 콤마 제거한 숫자로 표시
    const rawValue = String(value).replace(/,/g, '');
    if (rawValue === '0' || rawValue === '') {
      setDisplayValue('');
    } else {
      setDisplayValue(rawValue);
    }
    // 전체 선택
    setTimeout(() => e.target.select(), 0);
  };

  return (
    <div className="min-w-0">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5 truncate">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-zinc-500 font-semibold text-xs">{prefix}</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full bg-surface border text-foreground font-semibold pl-7 pr-2 rounded-xl outline-none transition-all font-mono ${
            isExpression ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20' : 'border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          } ${compact ? 'py-2.5 text-sm' : 'py-3 text-base'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          placeholder={placeholder || "금액 (원 단위)"}
        />
        {isExpression && (
          <span className="absolute right-2 top-2.5 text-amber-400 text-[9px] font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">=계산</span>
        )}
      </div>
    </div>
  );
};

const Divider = ({ label }) => (
  <div className="flex items-center gap-3 py-3">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
  </div>
);

// 고정지출 항목 (토글 + 금액 수정 + 삭제 가능)
const FixedExpenseItem = ({ expense, onToggle, onAmountChange, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(expense.amount));

  React.useEffect(() => {
    setEditValue(String(expense.amount));
  }, [expense.amount]);

  const handleSave = () => {
    const result = evaluateExpression(editValue);
    if (result !== null) {
      onAmountChange(result);
      setEditValue(String(result));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(expense.amount));
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${expense.checked ? 'bg-rose-500/10 border-rose-500/30' : 'opacity-40 grayscale hover:opacity-70 border-zinc-800 dark:border-zinc-700'}`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[11px] font-semibold text-foreground leading-tight"
          title={expense.name}
        >
          {expense.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition p-0.5 -mt-0.5 -mr-0.5"
        >
          <Trash2 size={10} />
        </button>
      </div>
      <div className="mt-1">
        {isEditing ? (
          <input
            type="text"
            inputMode="numeric"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              if (editValue === '0') setEditValue('');
              e.target.select();
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="w-full text-sm font-bold text-foreground bg-surface border border-blue-500 rounded-lg px-2 py-1 outline-none font-mono"
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="text-sm font-bold text-foreground font-mono hover:text-blue-400 transition"
          >
            {formatKRW(expense.amount, true)}
          </button>
        )}
      </div>
    </div>
  );
};

export default function InputTab({ data, handlers, selectedMonth, onMonthChange }) {
  const {
    onManualAccountChange, onAssetChange, onFixedIncomeChange, onCardExpenseChange,
    onToggleFixedExpense, onAddVariableIncome, onDeleteFixedIncome, onReload
  } = handlers;

  // 기본 4개 항목 (삭제 불가)
  const DEFAULT_INCOME_NAMES = ['학교월급', '연구비', '월세', '추가수입'];

  // 레거시 항목 이름 (숨김 처리)
  const LEGACY_INCOME_NAMES = ['고정수입', '변동수입'];

  // 표시할 수입 항목 필터링 (고정수입, 변동수입 이름 제외)
  const displayedFixedIncomes = data.fixedIncomes.filter(
    income => !LEGACY_INCOME_NAMES.includes(income.name)
  );

  // 변동 수입도 레거시 항목 필터링
  const displayedVariableIncomes = (data.variableIncomes || []).filter(
    income => !LEGACY_INCOME_NAMES.includes(income.name)
  );

  // 현재 월 체크
  const today = new Date();
  const isCurrentMonth = selectedMonth?.year === today.getFullYear() && selectedMonth?.month === today.getMonth() + 1;

  // 레거시 월 체크 (2025.09 이전은 읽기전용)
  const currentMonthStr = useMemo(() => {
    if (!selectedMonth) return '';
    return `${selectedMonth.year}.${String(selectedMonth.month).padStart(2, '0')}`;
  }, [selectedMonth]);
  const isReadOnly = useMemo(() => isLegacyMonth(currentMonthStr), [currentMonthStr]);

  // Income 추가 폼 상태
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [newIncome, setNewIncome] = useState({ name: '', amount: '', memo: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Expense 추가 폼 상태
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const handleAddIncome = async () => {
    if (!newIncome.name || !newIncome.amount) return;

    const amount = evaluateExpression(newIncome.amount);
    if (amount === null || amount <= 0) return;

    setIsSaving(true);
    try {
      await onAddVariableIncome?.({
        name: newIncome.name,
        amount,
        memo: newIncome.memo
      });
      setNewIncome({ name: '', amount: '', memo: '' });
      setShowIncomeForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return;

    const amount = evaluateExpression(newExpense.amount);
    if (amount === null || amount <= 0) return;

    setIsSavingExpense(true);
    try {
      await handlers.onAddFixedExpense?.({
        name: newExpense.name,
        amount,
        checked: true
      });
      setNewExpense({ name: '', amount: '' });
      setShowExpenseForm(false);
    } finally {
      setIsSavingExpense(false);
    }
  };

  return (
    <div className="flex flex-col bg-surface/50 h-full pb-mobile-nav">
      {/* Month Selector - Sticky */}
      <div className="sticky top-0 z-10 p-3 flex justify-center border-b border-white/[0.06] bg-surface/95 backdrop-blur-md">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button onClick={() => onMonthChange(-1)} className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 text-sm font-semibold text-foreground min-w-[160px] text-center">
            {selectedMonth?.year}년 {selectedMonth?.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-blue-400">(현재)</span>}
            {isReadOnly && <span className="ml-2 text-xs text-amber-400">(읽기전용)</span>}
          </span>
          <button
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
            className={`p-2 rounded-full transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed text-foreground-muted' : 'hover:bg-white/[0.05] text-foreground-muted'}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 레거시 월 경고 배너 */}
      {isReadOnly && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <Lock size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            <strong>{LEGACY_CUTOFF}</strong> 이전 데이터는 읽기전용입니다. 수정이 필요하면 Google 시트에서 직접 편집하세요.
          </p>
        </div>
      )}

      <div className="p-4 pb-32 md:pb-4 space-y-4 flex-1">
        {/* 향화 Section */}
        <div className="glass-card p-4 space-y-4 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5">
          <SectionHeader title="향화" icon={Heart} theme="pink" />
          <div className="grid grid-cols-2 gap-4 px-2">
            <CalcInputField
              label="향화 카카오 (원화)"
              value={String(data.manualAccounts.향화카카오 || 0)}
              onChange={(e) => onManualAccountChange('향화카카오', e.target.value)}
              compact
              disabled={isReadOnly}
            />
            <CalcInputField
              label="향화 잔고 (신한)"
              value={String(data.assets.향화잔고 || 0)}
              onChange={(e) => onAssetChange('향화잔고', e.target.value)}
              compact
              disabled={isReadOnly}
            />
          </div>
          <p className="text-[10px] text-pink-400/70 px-2">* 향화 영웅문은 주식 탭에서 자동 계산</p>
        </div>

        {/* 재호 Section */}
        <div className="glass-card p-4 space-y-4 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <SectionHeader
            title="재호"
            icon={User}
            theme="blue"
          />

          <div className="px-2 space-y-4">
          {/* Total Income Display (고정수입/변동수입 이름 항목 제외) */}
          <div className="bento-card-sm border-green-500/20 bg-green-500/5 flex justify-between items-center">
            <span className="text-xs font-semibold text-green-600 dark:text-green-300 uppercase tracking-wide">Total Income</span>
            <span className="text-xl font-bold font-mono text-green-400">
              {formatKRW(
                (displayedFixedIncomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0) +
                (data.variableIncomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0),
                true
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Divider label="Income" />
            {!isReadOnly && (
              <button
                onClick={() => setShowIncomeForm(!showIncomeForm)}
                className="text-blue-400 hover:text-blue-300 transition p-1.5 hover:bg-blue-500/10 rounded-lg"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Income 추가 폼 */}
          {showIncomeForm && !isReadOnly && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="수입명 (예: 연구비)"
                  value={newIncome.name}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-surface border border-zinc-700 text-foreground text-sm px-4 py-2.5 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <CalcInputField
                  label=""
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="금액 (500+100)"
                  compact
                />
              </div>
              <input
                type="text"
                placeholder="메모 (선택)"
                value={newIncome.memo}
                onChange={(e) => setNewIncome(prev => ({ ...prev, memo: e.target.value }))}
                className="w-full bg-surface border border-zinc-700 text-foreground text-sm px-4 py-2.5 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <button
                onClick={handleAddIncome}
                disabled={!newIncome.name || !newIncome.amount || isSaving}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                수입 추가
              </button>
            </div>
          )}

          {/* 기존 수입 목록 (고정수입, 변동수입 이름 제외) */}
          <div className="grid grid-cols-2 gap-4">
            {displayedFixedIncomes.map((income) => {
              // 원본 인덱스 찾기 (삭제/수정용)
              const originalIndex = data.fixedIncomes.findIndex(i => i.name === income.name);
              const isDefaultItem = DEFAULT_INCOME_NAMES.includes(income.name);
              return (
                <div key={income.name} className="relative group">
                  <CalcInputField
                    label={income.name}
                    value={String(income.amount || 0)}
                    onChange={(e) => onFixedIncomeChange(originalIndex, e.target.value)}
                    compact
                    disabled={isReadOnly}
                  />
                  {!isDefaultItem && (
                    <button
                      onClick={() => onDeleteFixedIncome?.(originalIndex)}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-rose-500/80 hover:bg-rose-500 text-white p-1 rounded-full transition-all"
                      title="삭제"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 변동 수입 목록 (고정수입/변동수입 이름 제외) */}
          {displayedVariableIncomes.length > 0 && (
            <div className="space-y-2">
              {displayedVariableIncomes.map((income) => {
                // 원본 인덱스 찾기 (삭제용)
                const originalIndex = data.variableIncomes.findIndex(i => i.name === income.name);
                return (
                  <div key={income.name} className="flex items-center gap-3 bg-panel/50 p-3 rounded-xl border border-zinc-700 group">
                    <span className="text-xs font-semibold text-zinc-300 flex-1">{income.name}</span>
                    {income.memo && <span className="text-[10px] text-zinc-500">{income.memo}</span>}
                    <span className="text-xs font-bold text-green-400 font-mono">{formatKRW(income.amount, true)}</span>
                    <button
                      onClick={() => handlers.onDeleteVariableIncome?.(originalIndex)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition-all p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Divider label="Expense" />

          {/* Total Expense Display */}
          <div className="bento-card-sm border-rose-500/20 bg-rose-500/5 flex justify-between items-center">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wide">Total Expense</span>
            <span className="text-xl font-bold font-mono text-rose-400">
              {formatKRW(
                (data.fixedExpenses?.filter(e => e.checked).reduce((sum, e) => sum + (e.amount || 0), 0) || 0) +
                (parseInt(String(data.cardExpense).replace(/,/g, ''), 10) || 0),
                true
              )}
            </span>
          </div>

          <CalcInputField
            label="이번 달 카드값"
            value={String(data.cardExpense || 0)}
            onChange={(e) => onCardExpenseChange(e.target.value)}
            compact
            disabled={isReadOnly}
          />

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">고정 지출 내역</label>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                    className="text-blue-400 hover:text-blue-300 transition p-1.5 hover:bg-blue-500/10 rounded-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* 고정지출 추가 폼 */}
            {showExpenseForm && !isReadOnly && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="지출명"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-surface border border-zinc-700 text-foreground text-xs px-3 py-2 rounded-xl focus:border-rose-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="금액"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-surface border border-zinc-700 text-foreground text-xs px-3 py-2 rounded-xl focus:border-rose-500 outline-none font-mono"
                  />
                </div>
                <button
                  onClick={handleAddExpense}
                  disabled={!newExpense.name || !newExpense.amount || isSavingExpense}
                  className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 transition-all"
                >
                  {isSavingExpense ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                  추가
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...data.fixedExpenses]
                .map((e, originalIndex) => ({ ...e, originalIndex }))
                .sort((a, b) => b.amount - a.amount)
                .map((e) => (
                <FixedExpenseItem
                  key={e.name}
                  expense={e}
                  onToggle={() => onToggleFixedExpense(e.originalIndex)}
                  onAmountChange={(value) => handlers.onFixedExpenseAmountChange(e.originalIndex, value)}
                  onDelete={() => handlers.onDeleteFixedExpense?.(e.originalIndex)}
                />
              ))}
            </div>
          </div>

          <Divider label="Assets" />
          <div className="grid grid-cols-2 gap-4">
            <CalcInputField
              label="재호 카뱅 잔고"
              value={String(data.assets.재호잔고 || 0)}
              onChange={(e) => onAssetChange('재호잔고', e.target.value)}
              compact
              disabled={isReadOnly}
            />
            <CalcInputField
              label="재호 영웅문 (원화)"
              value={String(data.manualAccounts.재호영웅문 || 0)}
              onChange={(e) => onManualAccountChange('재호영웅문', e.target.value)}
              compact
              disabled={isReadOnly}
            />
            <div className="col-span-2">
              <CalcInputField
                label="적금 (주택청약+저금)"
                value={String(data.assets.적금 || 0)}
                onChange={(e) => onAssetChange('적금', e.target.value)}
                compact
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <button
                  onClick={() => {
                    const newAmount = (data.assets.적금 || 0) + 120000;
                    onAssetChange('적금', String(newAmount));
                  }}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-semibold text-xs transition-all"
                >
                  +12만
                </button>
              )}
            </div>
          </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-green-400/70 py-2">
          <Check size={14} />
          <span className="text-[11px] font-medium">모든 입력은 자동 저장됩니다</span>
        </div>
      </div>
    </div>
  );
}
