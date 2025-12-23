/**
 * @context budget-dashboard / components / input / AssetForm.jsx
 * @purpose Form for updating liquid cash, manual stock valuations, and savings actions.
 * @role Asset and activity data entry handler.
 * @dependencies parent State setters.
 */

import React from 'react';

export default function AssetForm({
  assets, setAssets,
  manualAccounts, setManualAccounts,
  bondBalance, setBondBalance,
  actions, setActions
}) {
  return (
    <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2">
      {/* Cash Assets */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">현금성 자산 (Cash)</label>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">재호 잔고 (카뱅)</span>
            <input 
              type="text" 
              value={assets.재호잔고 || ''}
              onChange={e => setAssets({...assets, 재호잔고: parseInt(e.target.value.replace(/,/g, '')) || 0})}
              className="w-full bg-background border border-border text-white text-sm py-2 px-3 rounded focus:border-blue-500 outline-none" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">적금</span>
            <input 
              type="text" 
              value={assets.적금 || ''}
              onChange={e => setAssets({...assets, 적금: parseInt(e.target.value.replace(/,/g, '')) || 0})}
              className="w-full bg-background border border-border text-white text-sm py-2 px-3 rounded focus:border-blue-500 outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Manual Stock Inputs */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">수기 주식 자산 (Manual)</label>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">향화 카카오</span>
            <input 
              type="text" 
              value={manualAccounts.향화카카오 || ''}
              onChange={e => setManualAccounts({...manualAccounts, 향화카카오: e.target.value.replace(/,/g, '')})}
              className="w-full bg-background border border-border text-white text-sm py-2 px-3 rounded focus:border-blue-500 outline-none" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">재호 영웅문</span>
            <input 
              type="text" 
              value={manualAccounts.재호영웅문 || ''}
              onChange={e => setManualAccounts({...manualAccounts, 재호영웅문: e.target.value.replace(/,/g, '')})}
              className="w-full bg-background border border-border text-white text-sm py-2 px-3 rounded focus:border-blue-500 outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">이번 달 행위 (Actions)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-gray-500 mb-1 block">저축함</span>
            <input 
              type="text" 
              value={actions.저축한금액 || ''}
              onChange={e => setActions({...actions, 저축한금액: parseInt(e.target.value.replace(/,/g, '')) || 0})}
              className="w-full bg-background border border-border text-emerald-400 text-sm py-2 px-3 rounded focus:border-emerald-500 outline-none font-bold" 
            />
          </div>
          <div>
            <span className="text-xs text-gray-500 mb-1 block">투자함</span>
            <input 
              type="text" 
              value={actions.투자한금액 || ''}
              onChange={e => setActions({...actions, 투자한금액: parseInt(e.target.value.replace(/,/g, '')) || 0})}
              className="w-full bg-background border border-border text-blue-400 text-sm py-2 px-3 rounded focus:border-blue-500 outline-none font-bold" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}