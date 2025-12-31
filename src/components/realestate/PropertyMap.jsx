import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Building2, Briefcase } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 마커 아이콘 수정 (webpack 이슈 해결)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 커스텀 아이콘
const workplaceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const myHomeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 지도 범위 자동 조정 컴포넌트
function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, positions]);

  return null;
}

/**
 * 단지 위치 지도
 * Leaflet + OpenStreetMap 사용
 */
export default function PropertyMap({ complexes, selectedId, onSelectComplex }) {
  const [complexPositions, setComplexPositions] = useState([]);

  // 직장 위치 (고정)
  const workplaces = [
    { name: '동명대학교', lat: 35.1421, lng: 129.0992 },
    { name: '경상국립대학교동물병원', lat: 35.1543, lng: 128.0979 },
  ];

  // 단지 주소 -> 좌표 변환 (Nominatim 무료 API)
  useEffect(() => {
    if (!complexes?.length) return;

    const geocodeComplex = async (complex) => {
      const address = complex.region || complex.address;
      if (!address) return null;

      try {
        // Nominatim API (무료, 제한: 1req/sec)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=kr&limit=1`,
          { headers: { 'Accept-Language': 'ko' } }
        );
        const data = await response.json();

        if (data.length > 0) {
          return {
            ...complex,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      } catch (err) {
        console.warn(`[PropertyMap] Geocoding failed for ${address}:`, err.message);
      }
      return null;
    };

    // 순차적으로 geocoding (rate limit 준수)
    const geocodeAll = async () => {
      const results = [];
      for (const complex of complexes) {
        const result = await geocodeComplex(complex);
        if (result) results.push(result);
        // Rate limit: 1 request per second
        await new Promise((r) => setTimeout(r, 1100));
      }
      setComplexPositions(results);
    };

    geocodeAll();
  }, [complexes]);

  // 모든 마커 위치 (bounds 계산용)
  const allPositions = [
    ...workplaces.map((w) => [w.lat, w.lng]),
    ...complexPositions.map((c) => [c.lat, c.lng]),
  ];

  // 지도 중심 (부산)
  const center = [35.15, 129.05];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">단지 위치</h3>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 직장
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> 내 집
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 단지
          </span>
        </div>
      </div>

      <div
        className="w-full h-64 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
        style={{ minHeight: '256px' }}
      >
        <MapContainer
          center={center}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 직장 마커 */}
          {workplaces.map((place, idx) => (
            <Marker key={`work-${idx}`} position={[place.lat, place.lng]} icon={workplaceIcon}>
              <Popup>
                <div className="text-sm">
                  <div className="font-bold text-amber-600">{place.name}</div>
                  <div className="text-xs text-zinc-500">직장</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 단지 마커 */}
          {complexPositions.map((complex, idx) => (
            <Marker
              key={`complex-${complex.id || idx}`}
              position={[complex.lat, complex.lng]}
              icon={complex.isMine ? myHomeIcon : defaultIcon}
              eventHandlers={{
                click: () => onSelectComplex?.(complex.id),
              }}
            >
              <Popup>
                <div className="text-sm min-w-[120px]">
                  <div className="font-bold">{complex.name}</div>
                  <div className="text-xs text-zinc-500">{complex.region || ''}</div>
                  {complex.isMine && (
                    <div className="text-xs text-teal-500 mt-1">내 집</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 자동 범위 조정 */}
          {allPositions.length > 0 && <FitBounds positions={allPositions} />}
        </MapContainer>
      </div>
    </div>
  );
}
