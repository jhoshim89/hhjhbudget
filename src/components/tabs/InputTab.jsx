import React, { useState } from 'react';
import { PenTool, Heart, User, ChevronLeft, ChevronRight, Plus, Check, RefreshCw, Trash2 } from 'lucide-react';
import { formatKRW, evaluateExpression } from '../../utils/formatters';

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

// 계산기 기능이 있는 입력 필드
const CalcInputField = ({ label, value, onChange, placeholder, prefix = "₩", compact = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isExpression, setIsExpression] = useState(false);

  // value prop이 변경되면 displayValue 업데이트
  React.useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setDisplayValue(val);
    // 수식 포함 여부 확인 (/ 도 더하기로 처리)
    setIsExpression(/[+\-*/]/.test(val.replace(/,/g, '')));
  };

  const handleBlur = () => {
    const result = evaluateExpression(displayValue);
    if (result !== null) {
      const formatted = result.toLocaleString();
      setDisplayValue(formatted);
      setIsExpression(false);
      onChange({ target: { value: formatted } });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
      e.target.blur();
    }
  };

  return (
    <div className="min-w-0">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5 truncate">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-zinc-500 font-semibold text-xs">{prefix}</span>
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full bg-surface border text-foreground font-semibold pl-7 pr-2 rounded-xl outline-none transition-all font-mono ${
            isExpression ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20' : 'border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          } ${compact ? 'py-2.5 text-sm' : 'py-3 text-base'}`}
          placeholder={placeholder || "0 또는 500+100"}
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
  const [editValue, setEditValue] = useState(expense.amount.toLocaleString());

  React.useEffect(() => {
    setEditValue(expense.amount.toLocaleString());
  }, [expense.amount]);

  const handleSave = () => {
    const result = evaluateExpression(editValue);
    if (result !== null) {
      onAmountChange(result);
      setEditValue(result.toLocaleString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(expense.amount.toLocaleString());
      setIsEditing(false);
    }
  };

  return (
    <div className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${expense.checked ? 'bg-rose-500/10 border-rose-500/30' : 'opacity-40 grayscale hover:opacity-70 border-zinc-800 dark:border-zinc-700'}`}>
      <span
        onClick={onToggle}
        className="text-[10px] font-semibold text-foreground truncate cursor-pointer min-w-0 flex-shrink"
      >
        {expense.name}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-16 text-[10px] font-bold text-foreground bg-surface border border-blue-500 rounded-lg px-2 py-1 text-right outline-none font-mono"
          />
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-[10px] font-bold text-foreground font-mono px-1.5 py-0.5 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition"
            >
              {formatKRW(expense.amount, true)}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition p-1"
            >
              <Trash2 size={10} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default function InputTab({ data, handlers, selectedMonth, onMonthChange }) {
  const {
    onManualAccountChange, onAssetChange, onFixedIncomeChange, onCardExpenseChange,
    onToggleFixedExpense, onAddVariableIncome, onReload
  } = handlers;

  // 현재 월 체크
  const today = new Date();
  const isCurrentMonth = selectedMonth?.year === today.getFullYear() && selectedMonth?.month === today.getMonth() + 1;

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
    <div className="flex flex-col bg-surface/50">
      {/* Month Selector */}
      <div className="p-3 flex justify-center border-b border-white/[0.06]">
        <div className="inline-flex items-center bg-panel/50 backdrop-blur-sm rounded-full border border-white/[0.06] p-1">
          <button onClick={() => onMonthChange(-1)} className="p-2 hover:bg-white/[0.05] rounded-full text-foreground-muted transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 text-sm font-semibold text-foreground min-w-[160px] text-center">
            {selectedMonth?.year}년 {selectedMonth?.month}월
            {isCurrentMonth && <span className="ml-2 text-xs text-blue-400">(현재)</span>}
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

      <div className="p-4 pb-32 md:pb-4 space-y-4 flex-1">
        {/* 향화 Section */}
        <div className="glass-card p-4 space-y-4 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5">
          <SectionHeader title="향화" icon={Heart} theme="pink" />
          <div className="grid grid-cols-2 gap-4 px-2">
            <CalcInputField
              label="향화 카카오 (원화)"
              value={formatKRW(data.manualAccounts.향화카카오).replace('원', '')}
              onChange={(e) => onManualAccountChange('향화카카오', e.target.value)}
              compact
            />
            <CalcInputField
              label="향화 잔고 (신한)"
              value={formatKRW(data.assets.향화잔고).replace('원', '')}
              onChange={(e) => onAssetChange('향화잔고', e.target.value)}
              compact
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
          {/* Total Income Display */}
          <div className="bento-card-sm border-green-500/20 bg-green-500/5 flex justify-between items-center">
            <span className="text-xs font-semibold text-green-600 dark:text-green-300 uppercase tracking-wide">Total Income</span>
            <span className="text-xl font-bold font-mono text-green-400">
              {formatKRW(
                (data.fixedIncomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0) +
                (data.variableIncomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0),
                true
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Divider label="Income" />
            <button
              onClick={() => setShowIncomeForm(!showIncomeForm)}
              className="text-blue-400 hover:text-blue-300 transition p-1.5 hover:bg-blue-500/10 rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Income 추가 폼 */}
          {showIncomeForm && (
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

          {/* 기존 수입 목록 */}
          <div className="grid grid-cols-2 gap-4">
            {data.fixedIncomes.map((income, index) => (
              <CalcInputField
                key={income.name}
                label={income.name}
                value={formatKRW(income.amount).replace('원', '')}
                onChange={(e) => onFixedIncomeChange(index, e.target.value)}
                compact
              />
            ))}
          </div>

          {/* 변동 수입 목록 */}
          {data.variableIncomes?.length > 0 && (
            <div className="space-y-2">
              {data.variableIncomes.map((income, index) => (
                <div key={income.name} className="flex items-center gap-3 bg-panel/50 p-3 rounded-xl border border-zinc-700 group">
                  <span className="text-xs font-semibold text-zinc-300 flex-1">{income.name}</span>
                  {income.memo && <span className="text-[10px] text-zinc-500">{income.memo}</span>}
                  <span className="text-xs font-bold text-green-400 font-mono">{formatKRW(income.amount, true)}</span>
                  <button
                    onClick={() => handlers.onDeleteVariableIncome?.(index)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition-all p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
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
            value={formatKRW(data.cardExpense).replace('원', '')}
            onChange={(e) => onCardExpenseChange(e.target.value)}
            compact
          />

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">고정 지출 내역</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="text-blue-400 hover:text-blue-300 transition p-1.5 hover:bg-blue-500/10 rounded-lg"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* 고정지출 추가 폼 */}
            {showExpenseForm && (
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

            <div className="grid grid-cols-3 gap-2">
              {data.fixedExpenses.map((e, index) => (
                <FixedExpenseItem
                  key={e.name}
                  expense={e}
                  onToggle={() => onToggleFixedExpense(index)}
                  onAmountChange={(value) => handlers.onFixedExpenseAmountChange(index, value)}
                  onDelete={() => handlers.onDeleteFixedExpense?.(index)}
                />
              ))}
            </div>
          </div>

          <Divider label="Assets" />
          <div className="grid grid-cols-2 gap-4">
            <CalcInputField
              label="재호 카뱅 잔고"
              value={formatKRW(data.assets.재호잔고).replace('원', '')}
              onChange={(e) => onAssetChange('재호잔고', e.target.value)}
              compact
            />
            <CalcInputField
              label="재호 영웅문 (원화)"
              value={formatKRW(data.manualAccounts.재호영웅문).replace('원', '')}
              onChange={(e) => onManualAccountChange('재호영웅문', e.target.value)}
              compact
            />
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
