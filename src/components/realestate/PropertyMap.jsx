import React, { useMemo, useEffect } from 'react';
import { MapPin, Building2, Home } from 'lucide-react';
import { WORKPLACE } from '../../utils/geoUtils';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MapControls,
  useMap,
} from '../ui/map';

/**
 * 마커 아이콘 컴포넌트
 */
function PropertyMarkerIcon({ isMine, isSelected, isWorkplace }) {
  if (isWorkplace) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-md">
        <Building2 size={14} className="text-white" />
      </div>
    );
  }

  const size = isSelected ? 'w-8 h-8' : 'w-6 h-6';
  const bgColor = isMine ? 'bg-rose-500' : isSelected ? 'bg-teal-500' : 'bg-blue-500';

  return (
    <div className={`flex items-center justify-center ${size} rounded-full ${bgColor} border-2 border-white shadow-md transition-all duration-200`}>
      <Home size={isSelected ? 16 : 12} className="text-white" />
    </div>
  );
}

/**
 * 선택된 단지로 지도 이동 컴포넌트
 */
function MapCenterController({ selectedComplex }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map || !selectedComplex) return;
    
    map.flyTo({
      center: [selectedComplex.lon, selectedComplex.lat],
      zoom: 14,
      duration: 800,
    });
  }, [map, isLoaded, selectedComplex]);

  return null;
}

/**
 * mapcn 기반 부동산 지도
 */
export default function PropertyMap({ complexes = [], selectedId, onSelectComplex }) {
  // 고유 단지 추출 (좌표 있는 것만)
  const uniqueComplexes = useMemo(() => {
    if (!complexes.length) return [];
    const seen = new Set();
    return complexes.filter(c => {
      if (seen.has(c.id) || !c.lat || !c.lon) return false;
      seen.add(c.id);
      return true;
    });
  }, [complexes]);

  // 선택된 단지
  const selectedComplex = useMemo(() => {
    return uniqueComplexes.find(c => c.id === selectedId);
  }, [uniqueComplexes, selectedId]);

  // 지도 중심 계산 (단지들의 중심 또는 기본값)
  const mapCenter = useMemo(() => {
    if (uniqueComplexes.length === 0) {
      return [129.095, 35.125]; // 부산 기본 중심 [lng, lat]
    }
    const avgLon = uniqueComplexes.reduce((sum, c) => sum + c.lon, 0) / uniqueComplexes.length;
    const avgLat = uniqueComplexes.reduce((sum, c) => sum + c.lat, 0) / uniqueComplexes.length;
    return [avgLon, avgLat];
  }, [uniqueComplexes]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">단지 위치</h3>
      </div>

      {/* 지도 */}
      <div
        className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
        style={{ width: '100%', height: 400 }}
      >
        <Map
          center={mapCenter}
          zoom={12}
          maxZoom={18}
          minZoom={8}
          className="h-[400px]"
        >
          <MapControls 
            position="bottom-right" 
            showZoom={true}
            showLocate={true}
          />

          {/* 선택된 단지로 이동 컨트롤러 */}
          <MapCenterController selectedComplex={selectedComplex} />

          {/* 직장 마커 (동명대) */}
          <MapMarker
            longitude={WORKPLACE.lon}
            latitude={WORKPLACE.lat}
          >
            <MarkerContent>
              <PropertyMarkerIcon isWorkplace />
            </MarkerContent>
            <MarkerTooltip>
              <span className="font-medium">직장 (동명대)</span>
            </MarkerTooltip>
          </MapMarker>

          {/* 단지 마커들 */}
          {uniqueComplexes.map((complex) => {
            const isSelected = selectedId === complex.id;
            return (
              <MapMarker
                key={complex.id}
                longitude={complex.lon}
                latitude={complex.lat}
                onClick={() => onSelectComplex?.(complex.id)}
              >
                <MarkerContent>
                  <PropertyMarkerIcon
                    isMine={complex.isMine}
                    isSelected={isSelected}
                  />
                </MarkerContent>
                <MarkerTooltip>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{complex.name}</span>
                    {complex.isMine && (
                      <span className="text-[10px] text-rose-400">내 집</span>
                    )}
                  </div>
                </MarkerTooltip>
              </MapMarker>
            );
          })}
        </Map>
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-zinc-500">직장</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-zinc-500">내 집</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-zinc-500">관심단지</span>
        </div>
      </div>

      {/* 단지 목록 */}
      {uniqueComplexes.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {uniqueComplexes.map((c) => {
            const isSelected = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectComplex?.(c.id)}
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition-colors
                  ${isSelected
                    ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'}
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.isMine ? 'bg-rose-500' : 'bg-blue-500'}`} />
                <span className="text-[10px] text-zinc-700 dark:text-zinc-300 truncate">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
