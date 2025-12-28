import React, { useState } from 'react';
import { X, Home, Building2, Landmark, Plus } from 'lucide-react';

/**
 * 부동산/대출 추가 모달
 */
export default function AddPropertyModal({ isOpen, onClose, onAddWatch, onAddMy, onAddLoan, myProperties = [] }) {
  const [tab, setTab] = useState('watch'); // watch | my | loan
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    regionCode: '',
    address: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    currentValue: '',
    propertyId: '',
    amount: '',
    rate: '',
    startDate: new Date().toISOString().slice(0, 10),
    term: '360',
    type: '원리금균등',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (tab === 'watch') {
        await onAddWatch?.({
          name: formData.name,
          area: formData.area,
          regionCode: formData.regionCode,
          address: formData.address,
        });
      } else if (tab === 'my') {
        await onAddMy?.({
          name: formData.name,
          area: formData.area,
          purchasePrice: parseInt(formData.purchasePrice.replace(/,/g, '')) || 0,
          purchaseDate: formData.purchaseDate,
          currentValue: parseInt(formData.currentValue.replace(/,/g, '')) || 0,
        });
      } else if (tab === 'loan') {
        await onAddLoan?.({
          propertyId: formData.propertyId,
          amount: parseInt(formData.amount.replace(/,/g, '')) || 0,
          rate: parseFloat(formData.rate) || 0,
          startDate: formData.startDate,
          term: parseInt(formData.term) || 360,
          type: formData.type,
        });
      }

      // 폼 초기화 및 닫기
      setFormData({
        name: '', area: '', regionCode: '', address: '',
        purchasePrice: '', purchaseDate: new Date().toISOString().slice(0, 10), currentValue: '',
        propertyId: '', amount: '', rate: '', startDate: new Date().toISOString().slice(0, 10),
        term: '360', type: '원리금균등',
      });
      onClose();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    }
  };

  const tabs = [
    { id: 'watch', label: '관심 부동산', icon: Home },
    { id: 'my', label: '내 부동산', icon: Building2 },
    { id: 'loan', label: '대출', icon: Landmark },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-md animate-enter">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">부동산 추가</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 관심 부동산 */}
          {tab === 'watch' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  아파트명 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="래미안 원베일리"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    평수 (㎡) *
                  </label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="84"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    지역코드
                  </label>
                  <input
                    type="text"
                    name="regionCode"
                    value={formData.regionCode}
                    onChange={handleChange}
                    placeholder="11680"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  주소
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="서울시 서초구 반포동"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
                />
              </div>
            </>
          )}

          {/* 내 부동산 */}
          {tab === 'my' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  아파트명 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="아파트명"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    평수 (㎡) *
                  </label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="84"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    매입일 *
                  </label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    매입가 (원) *
                  </label>
                  <input
                    type="text"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    placeholder="500000000"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    현재가 (원)
                  </label>
                  <input
                    type="text"
                    name="currentValue"
                    value={formData.currentValue}
                    onChange={handleChange}
                    placeholder="520000000"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* 대출 */}
          {tab === 'loan' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  연결 부동산
                </label>
                <select
                  name="propertyId"
                  value={formData.propertyId}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">선택 안 함</option>
                  {myProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.area}㎡)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    대출금 (원) *
                  </label>
                  <input
                    type="text"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="300000000"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    금리 (%) *
                  </label>
                  <input
                    type="text"
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    placeholder="4.5"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    대출 시작일
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    상환 기간 (개월)
                  </label>
                  <input
                    type="text"
                    name="term"
                    value={formData.term}
                    onChange={handleChange}
                    placeholder="360"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  상환 방식
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="원리금균등">원리금균등</option>
                  <option value="원금균등">원금균등</option>
                  <option value="만기일시">만기일시</option>
                </select>
              </div>
            </>
          )}

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
              className={`flex-1 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'watch' ? 'bg-teal-600 hover:bg-teal-500' :
                tab === 'my' ? 'bg-violet-600 hover:bg-violet-500' :
                'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              <Plus size={16} />
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
