import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * 단지 위치 지도 (정적 이미지)
 * OpenStreetMap Static Map 사용
 */

// 하드코딩된 좌표
const LOCATIONS = {
  workplace: { name: '동명대학교', lat: 35.1421, lng: 129.0992 },
  complexes: [
    { name: '더비치푸르지오써밋', lat: 35.1363, lng: 129.0986 },
    { name: '대연롯데캐슬레전드', lat: 35.1342, lng: 129.0878 },
    { name: '더샵남천프레스티지', lat: 35.1372, lng: 129.1097 },
    { name: '대연힐스테이트푸르지오', lat: 35.1318, lng: 129.0856 },
  ],
};

export default function PropertyMap() {
  // 정적 지도 URL 생성 (OpenStreetMap StaticMap)
  const { workplace, complexes } = LOCATIONS;

  // 마커 문자열: lat,lng,marker-type
  const workplaceMarker = `${workplace.lat},${workplace.lng},ol-marker-gold`;
  const complexMarkers = complexes.map(c => `${c.lat},${c.lng},ol-marker-blue`).join('|');

  // 중심점 계산 (모든 마커의 평균)
  const allLats = [workplace.lat, ...complexes.map(c => c.lat)];
  const allLngs = [workplace.lng, ...complexes.map(c => c.lng)];
  const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
  const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;

  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=13&size=600x256&maptype=mapnik&markers=${workplaceMarker}|${complexMarkers}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">단지 위치</h3>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 동명대
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 관심단지
          </span>
        </div>
      </div>

      <div className="w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <img
          src={mapUrl}
          alt="부산 관심단지 위치"
          className="w-full h-auto"
          loading="lazy"
        />
      </div>

      {/* 단지 목록 */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
        {complexes.map((c, i) => (
          <span key={i}>• {c.name}</span>
        ))}
      </div>
    </div>
  );
}
