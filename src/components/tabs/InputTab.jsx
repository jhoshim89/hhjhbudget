import React from 'react';
import { PenTool, Heart, User, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatKRW, numberToHangul } from '../../utils/formatters';

const InputSection = ({ title, icon: Icon, colorClass, children, theme }) => (
  <div className={`flex-1 flex flex-col panel border-t-4 ${theme === 'pink' ? 'border-t-pink-500' : 'border-t-blue-500'}`}>
    <div className="h-14 border-b border-border flex items-center px-6 bg-panel-dark gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'pink' ? 'bg-pink-900/30 text-pink-500' : 'bg-blue-900/30 text-blue-500'}`}>
        <Icon size={18} />
      </div>
      <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
    </div>
    <div className="flex-1 overflow-auto p-6 space-y-8">
      {children}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, prefix = "₩" }) => (
  <div>
    <label className="text-label block mb-2">{label}</label>
    <div className="relative">
      <span className="absolute left-4 top-3.5 text-slate-500 font-bold text-sm">{prefix}</span>
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        className="w-full bg-background border border-border text-white text-lg font-black py-3 pl-10 pr-4 rounded focus:border-blue-500 outline-none transition"
        placeholder={placeholder || "0"}
      />
    </div>
    {value && value !== '0' && (
      <p className="text-right text-xs text-slate-400 mt-1 font-bold tracking-tight">
        {numberToHangul(value)}
      </p>
    )}
  </div>
);

export default function InputTab({ data, handlers }) {
  const { onManualAccountChange, onAssetChange, onFixedIncomeChange, onCardExpenseChange, onToggleFixedExpense } = handlers;

  return (
    <div className="flex-1 flex overflow-hidden bg-border gap-0.5 p-0.5">
      {/* Hyanghwa Section (Pink) */}
      <InputSection title="Hyanghwa Input" icon={Heart} theme="pink">
        <InputField 
          label="향화 카카오 평가액 (원화)" 
          value={formatKRW(data.manualAccounts.향화카카오).replace('원', '')} 
          onChange={(e) => onManualAccountChange('향화카카오', e.target.value)} 
        />
        <InputField 
          label="향화 잔고 (신한)" 
          value={formatKRW(data.assets.향화잔고).replace('원', '')} 
          onChange={(e) => onAssetChange('향화잔고', e.target.value)} 
        />
        
        <div className="mt-8 p-4 bg-pink-900/10 border border-pink-900/20 rounded-lg">
           <p className="text-[10px] font-bold text-pink-500 uppercase mb-2">Notice</p>
           <p className="text-xs text-pink-200/70 leading-relaxed font-medium">
             향화 영웅문은 주식 종목 관리 탭에서 <br/>실시간 시세로 자동 계산됩니다.
           </p>
        </div>
      </InputSection>

      {/* Jaeho Section (Blue) */}
      <InputSection title="Jaeho Input" icon={User} theme="blue">
        {/* Income Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-px flex-1 bg-border"></div>
             <span className="text-[10px] font-black text-slate-500 uppercase">Income</span>
             <div className="h-px flex-1 bg-border"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <InputField 
               label="학교월급" 
               value={formatKRW(data.fixedIncomes[0].amount).replace('원', '')} 
               onChange={(e) => onFixedIncomeChange(0, e.target.value)} 
             />
             <InputField label="연구비/월세" value={0} />
          </div>
        </div>

        {/* Expense Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-px flex-1 bg-border"></div>
             <span className="text-[10px] font-black text-slate-500 uppercase">Expense</span>
             <div className="h-px flex-1 bg-border"></div>
          </div>
          <InputField 
            label="💳 이번 달 카드값" 
            value={formatKRW(data.cardExpense).replace('원', '')} 
            onChange={(e) => onCardExpenseChange(e.target.value)} 
          />
          
          <div className="space-y-2">
             <div className="flex justify-between items-center mb-1">
                <label className="text-label">고정 지출 내역</label>
                <button className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-tighter">Toggle All</button>
             </div>
             <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto pr-2">
                {data.fixedExpenses.map((e, index) => (
                   <div 
                     key={e.name} 
                     onClick={() => onToggleFixedExpense(index)}
                     className={`flex items-center justify-between p-2 rounded border border-border/50 cursor-pointer transition-all ${e.checked ? 'bg-panel-dark border-blue-500/30' : 'opacity-40 grayscale hover:opacity-70'}`}
                   >
                      <span className="text-[10px] font-bold text-slate-300 truncate w-20">{e.name}</span>
                      <span className="text-[10px] font-black text-white">{formatKRW(e.amount, true)}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-px flex-1 bg-border"></div>
             <span className="text-[10px] font-black text-slate-500 uppercase">Assets & Actions</span>
             <div className="h-px flex-1 bg-border"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <InputField 
               label="재호 카뱅 잔고" 
               value={formatKRW(data.assets.재호잔고).replace('원', '')} 
               onChange={(e) => onAssetChange('재호잔고', e.target.value)} 
             />
             <InputField 
               label="재호 영웅문 (원화)" 
               value={formatKRW(data.manualAccounts.재호영웅문).replace('원', '')} 
               onChange={(e) => onManualAccountChange('재호영웅문', e.target.value)} 
             />
          </div>
        </div>

        <div className="mt-auto pt-6">
           <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded font-black text-sm tracking-widest transition shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3">
              <PenTool size={18} /> SAVE ALL DATA (ENTER)
           </button>
        </div>
      </InputSection>
    </div>
  );
}
