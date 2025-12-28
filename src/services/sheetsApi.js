// Vercel 배포 시 상대경로, 로컬 개발 시 localhost
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

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
  };

  // 헤더 제외 (첫 행)
  for (let i = 1; i < rows.length; i++) {
    const [date, category, name, amount, detail] = rows[i];

    // 특정 월 필터링
    if (targetMonth && date !== targetMonth) continue;

    const value = parseInt(String(amount)?.replace(/,/g, '')) || 0;

    if (!category || !name) continue;

    // 수입
    if (category === '수입-고정') {
      data.incomes.fixed.push({ name, amount: value });
    } else if (category === '수입-변동') {
      data.incomes.variable.push({ name, amount: value, memo: detail || '' });
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
    // 자산 - 주식 (상세: 수량|평단가|계좌)
    else if (category === '자산-주식') {
      if (detail) {
        const [qty, avgPrice, account] = detail.split('|');
        data.stocks.push({
          ticker: name,
          name: name, // 나중에 STOCK_DATABASE에서 매칭
          qty: parseInt(qty) || 0,
          avgPrice: avgPrice || '0',
          account: account || '',
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

    // === 기존 구조 호환 (레거시) ===
    else if (category.includes('수입')) {
      if (category.includes('고정')) {
        data.incomes.fixed.push({ name, amount: value });
      } else {
        data.incomes.variable.push({ name, amount: value });
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
