import React from 'react';
import { PenTool, Heart, User } from 'lucide-react';
import { formatKRW, numberToHangul } from '../../utils/formatters';

const SectionHeader = ({ title, icon: Icon, theme }) => (
  <div className={`flex items-center gap-3 py-3 px-4 border-l-4 ${theme === 'pink' ? 'border-l-pink-500 bg-pink-900/10' : 'border-l-blue-500 bg-blue-900/10'}`}>
    <div className={`w-6 h-6 rounded flex items-center justify-center ${theme === 'pink' ? 'bg-pink-900/30 text-pink-500' : 'bg-blue-900/30 text-blue-500'}`}>
      <Icon size={14} />
    </div>
    <h3 className="text-xs font-black text-white uppercase tracking-widest">{title}</h3>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, prefix = "₩", compact = false }) => (
  <div className="min-w-0">
    <label className="text-label block mb-1 truncate text-[10px]">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">{prefix}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className={`w-full bg-background border border-border text-white font-black pl-7 pr-2 rounded focus:border-blue-500 outline-none transition font-mono ${compact ? 'py-2 text-sm' : 'py-2.5 text-base'}`}
        placeholder={placeholder || "0"}
      />
    </div>
    {value && value !== '0' && (
      <p className="text-right text-[9px] text-slate-500 mt-0.5 font-bold truncate">
        {numberToHangul(value)}
      </p>
    )}
  </div>
);

const Divider = ({ label }) => (
  <div className="flex items-center gap-2 py-2">
    <div className="h-px flex-1 bg-border"></div>
    <span className="text-[9px] font-black text-slate-500 uppercase">{label}</span>
    <div className="h-px flex-1 bg-border"></div>
  </div>
);

export default function InputTab({ data, handlers }) {
  const { onManualAccountChange, onAssetChange, onFixedIncomeChange, onCardExpenseChange, onToggleFixedExpense } = handlers;

  return (
    <div className="bg-panel border border-border">
      <div className="p-4 space-y-4">
        {/* 향화 Section */}
        <SectionHeader title="향화" icon={Heart} theme="pink" />
        <div className="grid grid-cols-2 gap-3 px-2">
          <InputField
            label="향화 카카오 (원화)"
            value={formatKRW(data.manualAccounts.향화카카오).replace('원', '')}
            onChange={(e) => onManualAccountChange('향화카카오', e.target.value)}
            compact
          />
          <InputField
            label="향화 잔고 (신한)"
            value={formatKRW(data.assets.향화잔고).replace('원', '')}
            onChange={(e) => onAssetChange('향화잔고', e.target.value)}
            compact
          />
        </div>
        <p className="text-[9px] text-pink-400/70 px-2">* 향화 영웅문은 주식 탭에서 자동 계산</p>

        {/* 재호 Section */}
        <SectionHeader title="재호" icon={User} theme="blue" />

        <div className="px-2 space-y-3">
          <Divider label="Income" />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="학교월급"
              value={formatKRW(data.fixedIncomes[0].amount).replace('원', '')}
              onChange={(e) => onFixedIncomeChange(0, e.target.value)}
              compact
            />
            <InputField label="연구비/월세" value={0} compact />
          </div>

          <Divider label="Expense" />
          <InputField
            label="💳 이번 달 카드값"
            value={formatKRW(data.cardExpense).replace('원', '')}
            onChange={(e) => onCardExpenseChange(e.target.value)}
            compact
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] text-slate-400 font-bold">고정 지출 내역</label>
              <button className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase">Toggle All</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {data.fixedExpenses.map((e, index) => (
                <div
                  key={e.name}
                  onClick={() => onToggleFixedExpense(index)}
                  className={`flex items-center justify-between p-1.5 rounded border border-border/50 cursor-pointer transition-all ${e.checked ? 'bg-panel-dark border-blue-500/30' : 'opacity-40 grayscale hover:opacity-70'}`}
                >
                  <span className="text-[9px] font-bold text-slate-300 truncate flex-1">{e.name}</span>
                  <span className="text-[9px] font-black text-white ml-1">{formatKRW(e.amount, true)}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider label="Assets" />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="재호 카뱅 잔고"
              value={formatKRW(data.assets.재호잔고).replace('원', '')}
              onChange={(e) => onAssetChange('재호잔고', e.target.value)}
              compact
            />
            <InputField
              label="재호 영웅문 (원화)"
              value={formatKRW(data.manualAccounts.재호영웅문).replace('원', '')}
              onChange={(e) => onManualAccountChange('재호영웅문', e.target.value)}
              compact
            />
          </div>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-black text-sm tracking-widest transition shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 mt-4">
          <PenTool size={16} /> SAVE ALL DATA
        </button>
      </div>
    </div>
  );
}
