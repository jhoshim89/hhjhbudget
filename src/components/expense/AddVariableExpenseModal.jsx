import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddVariableExpenseModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount) return;
    onAdd({ name, amount: parseInt(amount.replace(/,/g, '')) || 0 });
    setName('');
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">변동 지출 추가</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              항목명
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 외식비"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              금액 (원)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
