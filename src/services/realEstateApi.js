// 부동산 API 클라이언트
const API_BASE = '/api';

/**
 * 부동산 데이터 전체 조회
 */
export async function fetchRealEstateData() {
  const res = await fetch(`${API_BASE}/realestate`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 관심 부동산 추가
 */
export async function addWatchProperty({ name, area, regionCode, address }) {
  const res = await fetch(`${API_BASE}/realestate/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, area, regionCode, address }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 내 부동산 추가
 */
export async function addMyProperty({ name, area, purchasePrice, purchaseDate, currentValue }) {
  const res = await fetch(`${API_BASE}/realestate/my`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, area, purchasePrice, purchaseDate, currentValue }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 대출 추가
 */
export async function addLoan({ propertyId, amount, rate, startDate, term, type }) {
  const res = await fetch(`${API_BASE}/realestate/loan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, amount, rate, startDate, term, type }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 시세 기록 추가
 */
export async function addPriceRecord({ propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount }) {
  const res = await fetch(`${API_BASE}/realestate/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 부동산 데이터 업데이트
 */
export async function updateRealEstate(id, updates) {
  const res = await fetch(`${API_BASE}/realestate/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/**
 * 부동산 데이터 삭제
 */
export async function deleteRealEstate(id) {
  const res = await fetch(`${API_BASE}/realestate/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}
