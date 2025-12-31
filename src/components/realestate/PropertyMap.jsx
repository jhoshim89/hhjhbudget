import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

/**
 * 단지 위치 지도
 * Kakao Maps API 사용
 */
export default function PropertyMap({ complexes, selectedId, onSelectComplex }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [error, setError] = useState(null);
  const [markers, setMarkers] = useState([]);

  // 직장 위치 (고정)
  const workplaces = [
    { name: '동명대학교', lat: 35.1421, lng: 129.0992 },
    { name: '경상국립대학교동물병원', lat: 35.1543, lng: 128.0979 },
  ];

  // 지도 초기화
  useEffect(() => {
    // SDK 체크
    if (!window.kakao || !window.kakao.maps) {
      setError('Kakao Maps SDK가 로드되지 않았습니다');
      return;
    }

    const container = mapRef.current;
    if (!container || mapInstanceRef.current) return;

    try {
      const options = {
        center: new window.kakao.maps.LatLng(35.15, 129.05), // 부산 중심
        level: 9,
      };

      const mapInstance = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = mapInstance;

      // 직장 마커 추가
      workplaces.forEach(place => {
        const position = new window.kakao.maps.LatLng(place.lat, place.lng);

        const markerImage = new window.kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
          new window.kakao.maps.Size(24, 35)
        );

        const marker = new window.kakao.maps.Marker({
          position,
          map: mapInstance,
          image: markerImage,
          title: place.name,
        });

        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:12px;font-weight:bold;color:#14b8a6;">${place.name}<br><span style="font-size:10px;color:#888;">직장</span></div>`,
        });

        window.kakao.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(mapInstance, marker);
        });
      });
    } catch (err) {
      console.error('[PropertyMap] Init error:', err);
      setError(err.message);
    }
  }, []);

  // 단지 마커 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !complexes?.length) return;
    if (!window.kakao?.maps?.services) return;

    // 기존 마커 제거
    markers.forEach(m => m.setMap(null));

    const geocoder = new window.kakao.maps.services.Geocoder();
    const newMarkers = [];
    const bounds = new window.kakao.maps.LatLngBounds();

    // 직장 위치도 bounds에 포함
    workplaces.forEach(place => {
      bounds.extend(new window.kakao.maps.LatLng(place.lat, place.lng));
    });

    let processedCount = 0;

    complexes.forEach(complex => {
      const address = complex.region || complex.address;
      if (!address) {
        processedCount++;
        return;
      }

      geocoder.addressSearch(address, (result, status) => {
        processedCount++;

        if (status === window.kakao.maps.services.Status.OK) {
          const position = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          bounds.extend(position);

          const marker = new window.kakao.maps.Marker({
            position,
            map,
            title: complex.name,
          });

          const infoContent = `
            <div style="padding:8px;min-width:120px;">
              <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">${complex.name}</div>
              <div style="font-size:11px;color:#666;">${complex.region || ''}</div>
              ${complex.isMine ? '<div style="font-size:10px;color:#14b8a6;margin-top:2px;">내 집</div>' : ''}
            </div>
          `;

          const infoWindow = new window.kakao.maps.InfoWindow({
            content: infoContent,
          });

          window.kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(map, marker);
            if (onSelectComplex) onSelectComplex(complex.id);
          });

          if (complex.id === selectedId) {
            infoWindow.open(map, marker);
          }

          newMarkers.push(marker);
        }

        // 모든 주소 처리 완료 시 bounds 조정
        if (processedCount === complexes.length && newMarkers.length > 0) {
          map.setBounds(bounds);
        }
      });
    });

    setMarkers(newMarkers);
  }, [complexes, selectedId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
        <AlertCircle size={24} className="text-rose-400 mb-2" />
        <p className="text-sm text-rose-400">{error}</p>
        <p className="text-xs text-zinc-500 mt-1">브라우저 콘솔을 확인해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">단지 위치</h3>
        <span className="text-[10px] text-zinc-500">★ = 직장</span>
      </div>
      <div
        ref={mapRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
        style={{ minHeight: '256px' }}
      />
    </div>
  );
}
