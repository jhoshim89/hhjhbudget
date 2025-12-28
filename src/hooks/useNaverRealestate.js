import { useState, useEffect, useCallback } from 'react';
import { fetchAllComplexes } from '../services/naverRealestateApi';

/**
 * 네이버 부동산 데이터 훅
 * 5개 대상 단지의 매물 현황을 조회
 */
export function useNaverRealestate() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAllComplexes();
      setData(result);
      setLastUpdated(new Date());
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
    loadData();
  }, [loadData]);

  // 단지별로 그룹화된 데이터
  const groupedByComplex = data.reduce((acc, item) => {
    const key = item.id;
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
    };
    return acc;
  }, {});

  // 포레나송파 (내 집) 데이터
  const myProperty = data.filter(d => d.isMine);

  // 관심 단지 데이터
  const watchProperties = data.filter(d => !d.isMine);

  return {
    data,
    groupedByComplex: Object.values(groupedByComplex),
    myProperty,
    watchProperties,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}

export default useNaverRealestate;
