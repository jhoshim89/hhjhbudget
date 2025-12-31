import React from 'react';
import { MapPin, Building2, Briefcase } from 'lucide-react';

/**
 * 단지 위치 표시 (CSS 기반 간단한 시각화)
 */

// 하드코딩된 위치 정보
const LOCATIONS = {
  workplace: { name: '동명대학교', area: '용당동' },
  complexes: [
    { name: '더비치푸르지오써밋', area: '대연동', distance: '2.1km' },
    { name: '대연롯데캐슬레전드', area: '대연동', distance: '2.8km' },
    { name: '더샵남천프레스티지', area: '남천동', distance: '2.4km' },
    { name: '대연힐스테이트푸르지오', area: '대연동', distance: '3.1km' },
  ],
};

export default function PropertyMap() {
  const { workplace, complexes } = LOCATIONS;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">단지 위치</h3>
      </div>

      {/* 직장 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <Briefcase size={14} className="text-amber-500" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{workplace.name}</span>
        <span className="text-[10px] text-amber-500/70">({workplace.area})</span>
      </div>

      {/* 관심단지 목록 */}
      <div className="grid grid-cols-2 gap-2">
        {complexes.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <Building2 size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{c.name}</div>
              <div className="text-[10px] text-zinc-500">
                {c.area} · <span className="text-teal-500">{c.distance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
