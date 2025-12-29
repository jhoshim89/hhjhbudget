// Vercel dev & 배포 모두 상대경로 사용
const API_BASE = '/api';

// ============================================
// 데이터 소스 아키텍처:
// - 시트1 (메인): 수입, 지출, 자산 (월별 데이터)
// - 관심종목 시트: 관심 주식 (useWatchlist hook 사용)
// - 보유종목 시트: 보유 주식 포지션 (useHoldings hook 사용)
// - 부동산 시트: 부동산 데이터 (useRealEstate hook 사용)
//
// 레거시 데이터 (≤2025.09): 읽기전용, 중복 데이터 포함 가능
// 현재 데이터 (≥2025.10): 웹 UI만 사용, 별도 시트가 정본(source of truth)
// ============================================

// 레거시 기준월 (프론트엔드용)
export const LEGACY_CUTOFF = '2025.09';

// 레거시 월인지 확인 (숫자 비교로 수정)
export function isLegacyMonth(monthStr) {
  if (!monthStr) return false;
  // '2025.09' -> [2025, 9] 형식으로 파싱하여 숫자 비교
  const [year, month] = monthStr.split('.').map(Number);
  const [cutoffYear, cutoffMonth] = LEGACY_CUTOFF.split('.').map(Number);
  if (year < cutoffYear) return true;
  if (year > cutoffYear) return false;
  return month <= cutoffMonth;
}

// 시트 데이터 조회
export async function fetchSheetData(range = 'A:Z') {
  const res = await fetch(`${API_BASE}/sheet?range=${encodeURIComponent(range)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// 특정 월 데이터 조회
export async function fetchMonthData(year, month) {
  const res = await fetch(`${API_BASE}/month/${year}/${month}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// 셀 업데이트
export async function updateSheet(range, values) {
  const res = await fetch(`${API_BASE}/sheet`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, values }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// 행 추가
export async function appendToSheet(range, values) {
  const res = await fetch(`${API_BASE}/sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, values }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// 행 삭제
export async function deleteFromSheet(month, category, name) {
  const res = await fetch(`${API_BASE}/sheet`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, category, name }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// 행 업데이트 (키 기반)
export async function updateByKey(month, category, name, values) {
  const res = await fetch(`${API_BASE}/sheet`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, category, name, values }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// Upsert: 업데이트 시도 후 실패하면 새 행 추가
export async function upsertRow(month, category, name, values) {
  try {
    return await updateByKey(month, category, name, values);
  } catch (error) {
    // Row not found: 새로 추가
    if (error.message.includes('not found')) {
      return await appendToSheet('A:E', [values]);
    }
    throw error;
  }
}

// 특정 월 데이터만 필터링
export function filterByMonth(rows, yearMonth) {
  return rows.filter(row => row[0] === yearMonth);
}

// 시트 데이터를 앱 데이터 구조로 변환 (새 구조 지원)
export function parseSheetToAppData(rows, targetMonth = null) {
  const data = {
    incomes: { fixed: [], variable: [] },
    expenses: { fixed: [], variable: [], card: 0 },
    assets: { 재호잔고: 0, 향화잔고: 0, 적금: 0 },
    bond: { balance: 0, purchaseDate: '', yieldRate: 0, maturityMonths: 0 },
    stocks: [],
    stockAccounts: { 향화카카오: 0, 재호영웅문: 0 },
    // 레거시 투자 데이터 (총 평가액)
    investmentTotals: { 재호해외주식: 0, 향화해외주식: 0, 투자원금: 0, 배당: 0 },
    // 관심종목 (Yahoo Finance 연동용)
    watchlist: [],
  };

  // 새 형식 데이터가 있는지 추적 (새 형식 우선)
  const hasNewFormatIncome = { fixed: new Set(), variable: new Set() };

  // 헤더 제외 (첫 행)
  for (let i = 1; i < rows.length; i++) {
    const [date, category, name, amount, detail] = rows[i];

    // 특정 월 필터링
    if (targetMonth && date !== targetMonth) continue;

    const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

    if (!category || !name) continue;

    // 수입 (새 형식 - 우선순위 높음)
    if (category === '수입-고정') {
      data.incomes.fixed.push({ name, amount: value });
      hasNewFormatIncome.fixed.add(name); // 새 형식 데이터 있음 표시
    } else if (category === '수입-변동') {
      data.incomes.variable.push({ name, amount: value, memo: detail || '' });
      hasNewFormatIncome.variable.add(name);
    }
    // 자산 - 잔고
    else if (category === '자산-잔고') {
      if (name.includes('재호')) data.assets.재호잔고 = value;
      else if (name.includes('향화')) data.assets.향화잔고 = value;
    }
    // 자산 - 저축
    else if (category === '자산-저축') {
      data.assets.적금 = value;
    }
    // 자산 - 채권 (상세: 구입일|수익률|만기개월)
    else if (category === '자산-채권') {
      data.bond.balance = value;
      if (detail) {
        const [purchaseDate, yieldRate, maturityMonths] = detail.split('|');
        data.bond.purchaseDate = purchaseDate || '';
        data.bond.yieldRate = parseFloat(yieldRate) || 0;
        data.bond.maturityMonths = parseInt(maturityMonths) || 0;
      }
    }
    // 자산 - 주식 - 레거시 데이터만 파싱 (읽기전용)
    // 신규 데이터는 별도 '보유종목' 시트에서 useHoldings hook으로 관리
    else if (category === '자산-주식') {
      if (detail) {
        const [qty, avgPrice, account] = detail.split('|');
        data.stocks.push({
          ticker: name,
          name: name, // 나중에 STOCK_DATABASE에서 매칭
          qty: parseInt(qty) || 0,
          avgPrice: avgPrice || '0',
          account: account || '',
          isLegacy: true, // 레거시 데이터 표시
        });
      }
    }
    // 자산 - 주식계좌 (수동 입력 계좌)
    else if (category === '자산-주식계좌') {
      if (name.includes('카카오')) data.stockAccounts.향화카카오 = value;
      else if (name.includes('재호')) data.stockAccounts.재호영웅문 = value;
    }
    // 지출 - 카드
    else if (category === '지출-카드') {
      data.expenses.card = value;
    }
    // 지출 - 고정 (detail 필드에서 checked 상태 읽기)
    else if (category === '지출-고정') {
      const isChecked = detail !== 'unchecked'; // 'unchecked'가 아니면 체크됨 (기본값: true)
      data.expenses.fixed.push({ name, amount: value, checked: isChecked });
    }
    // 지출 - 변동
    else if (category === '지출-변동') {
      data.expenses.variable.push({ name, amount: value });
    }
    // 관심종목 - 레거시 데이터만 파싱 (읽기전용)
    // 신규 데이터는 별도 '관심종목' 시트에서 useWatchlist hook으로 관리
    else if (category === '관심종목') {
      // 레거시 호환용 - 과거 데이터 표시만 가능
      data.watchlist.push({
        ticker: name,           // name 필드에 티커 저장 (예: AAPL)
        name: detail || name,   // detail 필드에 한글명 저장 (예: 애플)
        addedDate: date,        // 추가 날짜
        isLegacy: true,         // 레거시 데이터 표시
      });
    }

    // === 기존 구조 호환 (레거시) ===
    // 2023년~2025년 9월 데이터: category="수입", name="고정수입"/"변동수입"
    // 새 형식 데이터가 있으면 레거시는 무시 (새 형식 우선)
    else if (category === '수입' || category.includes('수입')) {
      if (name === '고정수입') {
        // 고정수입 → 학교월급으로 매핑 (새 형식 없을 때만)
        if (!hasNewFormatIncome.fixed.has('학교월급')) {
          data.incomes.fixed.push({ name: '학교월급', amount: value });
        }
      } else if (name === '변동수입') {
        // 변동수입 → 추가수입(변동 수입)으로 매핑 (새 형식 없을 때만)
        if (!hasNewFormatIncome.variable.has('추가수입')) {
          data.incomes.variable.push({ name: '추가수입', amount: value, memo: detail || '' });
        }
      } else if (category.includes('고정')) {
        if (!hasNewFormatIncome.fixed.has(name)) {
          data.incomes.fixed.push({ name, amount: value });
        }
      } else {
        if (!hasNewFormatIncome.variable.has(name)) {
          data.incomes.variable.push({ name, amount: value, memo: detail || '' });
        }
      }
    } else if (category.includes('지출')) {
      if (category.includes('카드')) {
        data.expenses.card = value;
      } else if (category.includes('고정') || category.includes('월납')) {
        const isChecked = detail !== 'unchecked';
        data.expenses.fixed.push({ name, amount: value, checked: isChecked });
      } else {
        data.expenses.variable.push({ name, amount: value });
      }
    } else if (category.includes('자산-잔고')) {
      if (name.includes('재호')) data.assets.재호잔고 = value;
      else if (name.includes('채권')) data.bond.balance = value;
      else if (name.includes('향화')) data.assets.향화잔고 = value;
    } else if (category.includes('자산-저축')) {
      data.assets.적금 = value;
    }
    // 레거시: 자산-투자 (총 평가액)
    else if (category === '자산-투자') {
      if (name.includes('재호') && name.includes('해외주식')) {
        data.investmentTotals.재호해외주식 = value;
      } else if (name.includes('향화') && name.includes('해외주식')) {
        data.investmentTotals.향화해외주식 = value;
      } else if (name.includes('투자') && name.includes('원금')) {
        data.investmentTotals.투자원금 = value;
      } else if (name.includes('배당')) {
        data.investmentTotals.배당 = value;
      }
    }
  }

  return data;
}
