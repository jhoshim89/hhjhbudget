import { useState, useEffect, useCallback } from 'react';
import { fetchAllComplexes } from '../services/naverRealestateApi';

/**
 * 네이버 부동산 데이터 훅
 * 5개 대상 단지의 매물 현황을 조회
 *
 * 반환값:
 * - data: 원본 데이터 배열
 * - groupedByComplex: 단지별로 그룹화된 데이터
 * - myProperty: 내 부동산 (isMine=true)
 * - watchProperties: 관심 단지 (isMine=false)
 * - loading: 로딩 상태
 * - error: 에러 메시지
 * - isStale: 데이터가 만료되었는지 (캐시에서 반환된 오래된 데이터)
 * - cachedAt: 캐시된 시간 (timestamp)
 * - lastUpdated: 마지막 업데이트 시간 (Date 객체)
 * - refetch: 수동 새로고침 함수
 * - forceRefetch: 캐시 무시하고 새로고침
 */
export function useNaverRealestate() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAllComplexes(forceRefresh);

      // 새 응답 구조 처리
      const resultData = result.data || result;
      setData(Array.isArray(resultData) ? resultData : []);

      // 캐시 메타데이터 처리
      setIsStale(result.isStale || false);
      setCachedAt(result.cachedAt || null);
      setFromCache(result.fromCache || false);
      setLastUpdated(new Date());

      // 에러가 있지만 데이터도 있는 경우 (stale cache)
      if (result.error && resultData.length > 0) {
        console.warn('[useNaverRealestate] Partial error:', result.error);
      }
    } catch (err) {
      console.error('[useNaverRealestate] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 새로고침
  const refetch = useCallback(() => {
    loadData(false);
  }, [loadData]);

  // 강제 새로고침 (캐시 무시)
  const forceRefetch = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // 단지별로 그룹화된 데이터
  const groupedByComplex = data.reduce((acc, item) => {
    const key = item.id;
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = {
        id: item.id,
        name: item.name,
        region: item.region,
        isMine: item.isMine,
        areas: {},
      };
    }
    acc[key].areas[item.area] = {
      area: item.area,
      complexNo: item.complexNo,
      sale: item.sale,
      jeonse: item.jeonse,
      monthly: item.monthly,
      updatedAt: item.updatedAt,
      fromCache: item.fromCache,
      isStale: item.isStale,
    };
    return acc;
  }, {});

  // 포레나송파 (내 집) 데이터
  const myProperty = data.filter(d => d.isMine);

  // 관심 단지 데이터
  const watchProperties = data.filter(d => !d.isMine);

  // 캐시 시간 포맷팅 헬퍼
  const getTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return null;

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 전`;
    }
    return `${minutes}분 전`;
  }, []);

  return {
    // 데이터
    data,
    groupedByComplex: Object.values(groupedByComplex),
    myProperty,
    watchProperties,

    // 상태
    loading,
    error,
    lastUpdated,

    // 캐시 정보
    isStale,
    cachedAt,
    fromCache,
    cacheAge: cachedAt ? getTimeAgo(cachedAt) : null,

    // 액션
    refetch,
    forceRefetch,
  };
}

export default useNaverRealestate;
