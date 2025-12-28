import React, { useState } from 'react';
import { X, TrendingUp, Home, Building } from 'lucide-react';

/**
 * 시세 입력 모달
 */
export default function PriceInputModal({ isOpen, onClose, property, onSubmit }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    salePrice: '',
    jeonsePrice: '',
    monthlyDeposit: '',
    monthlyRent: '',
    listingCount: '',
  });

  if (!isOpen || !property) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await onSubmit?.({
        propertyId: property.id,
        date: formData.date,
        salePrice: parseInt(formData.salePrice.replace(/,/g, '')) || 0,
        jeonsePrice: parseInt(formData.jeonsePrice.replace(/,/g, '')) || 0,
        monthlyDeposit: parseInt(formData.monthlyDeposit.replace(/,/g, '')) || 0,
        monthlyRent: parseInt(formData.monthlyRent.replace(/,/g, '')) || 0,
        listingCount: parseInt(formData.listingCount) || 0,
      });

      // 초기화 및 닫기
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        salePrice: '', jeonsePrice: '', monthlyDeposit: '', monthlyRent: '', listingCount: '',
      });
      onClose();
    } catch (err) {
      alert('시세 입력 실패: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-md animate-enter">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">시세 입력</h3>
              <p className="text-xs text-zinc-500">{property.name} {property.area}㎡</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              기준일 *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              required
            />
          </div>

          {/* 매매가 */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              <Home size={10} className="inline mr-1" />
              매매가 (원)
            </label>
            <input
              type="text"
              name="salePrice"
              value={formData.salePrice}
              onChange={handleChange}
              placeholder="4200000000"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* 전세가 */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              <Building size={10} className="inline mr-1" />
              전세가 (원)
            </label>
            <input
              type="text"
              name="jeonsePrice"
              value={formData.jeonsePrice}
              onChange={handleChange}
              placeholder="1800000000"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* 월세 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                월세 보증금 (원)
              </label>
              <input
                type="text"
                name="monthlyDeposit"
                value={formData.monthlyDeposit}
                onChange={handleChange}
                placeholder="800000000"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                월세 (원)
              </label>
              <input
                type="text"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleChange}
                placeholder="3500000"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 매물 수 */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              매물 수
            </label>
            <input
              type="text"
              name="listingCount"
              value={formData.listingCount}
              onChange={handleChange}
              placeholder="23"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-zinc-700 text-zinc-400 hover:bg-white/[0.02] rounded-xl font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
