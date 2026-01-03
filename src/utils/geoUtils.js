/**
 * 지리 계산 유틸리티
 * 레이더 미니맵용 거리/방향 계산
 */

// 직장 좌표 (동명대학교)
export const WORKPLACE = {
  name: '동명대학교',
  area: '용당동',
  lat: 35.1166,
  lon: 129.1028,
};

/**
 * 도(degree)를 라디안으로 변환
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Haversine 공식으로 두 좌표 간 거리 계산 (km)
 * @param {number} lat1 - 시작점 위도
 * @param {number} lon1 - 시작점 경도
 * @param {number} lat2 - 끝점 위도
 * @param {number} lon2 - 끝점 경도
 * @returns {number} 거리 (km)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 중심점에서 대상점까지의 방위각 계산 (도)
 * @param {number} centerLat - 중심점 위도
 * @param {number} centerLon - 중심점 경도
 * @param {number} targetLat - 대상점 위도
 * @param {number} targetLon - 대상점 경도
 * @returns {number} 방위각 (0-360도, 북=0, 동=90, 남=180, 서=270)
 */
export function calculateBearing(centerLat, centerLon, targetLat, targetLon) {
  const dLon = toRad(targetLon - centerLon);
  const lat1 = toRad(centerLat);
  const lat2 = toRad(targetLat);

  const x = Math.sin(dLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = Math.atan2(x, y) * (180 / Math.PI);
  return (bearing + 360) % 360;
}

/**
 * 레이더 맵용 SVG 좌표 계산
 * @param {object} center - 중심점 {lat, lon}
 * @param {object} target - 대상점 {lat, lon}
 * @param {number} maxRadius - SVG 내 최대 반경 (픽셀)
 * @param {number} maxDistance - 최대 거리 (km)
 * @returns {object} {x, y, distance, bearing}
 */
export function getRadarPosition(center, target, maxRadius, maxDistance) {
  const distance = calculateDistance(
    center.lat,
    center.lon,
    target.lat,
    target.lon
  );
  const bearing = calculateBearing(
    center.lat,
    center.lon,
    target.lat,
    target.lon
  );

  // 거리를 반경으로 변환 (최대 거리 이내에서 비례)
  const normalizedDistance = Math.min(distance / maxDistance, 1);
  const radius = normalizedDistance * maxRadius;

  // 방위각을 SVG 좌표로 변환 (북=위쪽, 시계방향)
  // SVG에서 y축은 아래가 양수이므로 y를 반전
  const angleRad = ((bearing - 90) * Math.PI) / 180;
  const x = radius * Math.cos(angleRad);
  const y = radius * Math.sin(angleRad);

  return { x, y, distance, bearing };
}

/**
 * 단지 목록에 대해 레이더 좌표 일괄 계산
 * @param {Array} complexes - 단지 배열 [{lat, lon, ...}]
 * @param {object} center - 중심점 (기본값: WORKPLACE)
 * @param {number} maxRadius - SVG 최대 반경 (기본값: 130)
 * @param {number} maxDistance - 최대 거리 km (기본값: 자동 계산)
 * @returns {Array} 좌표가 추가된 단지 배열
 */
export function calculateRadarPositions(
  complexes,
  center = WORKPLACE,
  maxRadius = 130,
  maxDistance = null
) {
  if (!complexes || complexes.length === 0) return [];

  // 좌표가 없는 단지 필터링
  const validComplexes = complexes.filter(
    (c) => c.lat != null && c.lon != null
  );

  if (validComplexes.length === 0) return complexes;

  // maxDistance 자동 계산 (가장 먼 단지 기준 + 여유)
  if (!maxDistance) {
    const distances = validComplexes.map((c) =>
      calculateDistance(center.lat, center.lon, c.lat, c.lon)
    );
    maxDistance = Math.ceil(Math.max(...distances) * 1.2); // 20% 여유
  }

  return complexes.map((complex) => {
    if (complex.lat == null || complex.lon == null) {
      return { ...complex, radarPosition: null };
    }

    const radarPosition = getRadarPosition(
      center,
      { lat: complex.lat, lon: complex.lon },
      maxRadius,
      maxDistance
    );

    return {
      ...complex,
      radarPosition,
    };
  });
}
