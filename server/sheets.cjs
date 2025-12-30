const { google } = require('googleapis');

// 시트 이름 상수
const MAIN_SHEET_NAME = '시트1';

// 레거시 데이터 기준월 (이 월 이전 데이터는 읽기전용)
const LEGACY_CUTOFF = '2025.09';

// 레거시 월인지 확인 (숫자 비교로 수정)
function isLegacyMonth(monthStr) {
  if (!monthStr) return false;
  // '2025.09' -> [2025, 9] 형식으로 파싱하여 숫자 비교
  const [year, month] = monthStr.split('.').map(Number);
  const [cutoffYear, cutoffMonth] = LEGACY_CUTOFF.split('.').map(Number);
  if (year < cutoffYear) return true;
  if (year > cutoffYear) return false;
  return month <= cutoffMonth;
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// 시트 데이터 읽기
async function getSheetData(range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error reading sheet:', error.message);
    throw error;
  }
}

// 시트 데이터 쓰기
async function updateSheetData(range, values) {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating sheet:', error.message);
    throw error;
  }
}

// 행 추가
async function appendSheetData(range, values) {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error.message);
    throw error;
  }
}

// 월 형식 정규화 (2025-12 또는 2025.12 → 2025.12)
function normalizeMonth(monthStr) {
  if (!monthStr) return '';
  return monthStr.replace('-', '.');
}

// 행 삭제 (조건에 맞는 행 찾아서 삭제)
async function deleteSheetRow(month, category, name) {
  try {
    // 먼저 모든 데이터 가져오기
    const allData = await getSheetData('A:E');

    // 월 형식 정규화
    const normalizedMonth = normalizeMonth(month);

    // 삭제할 행 찾기 (0-indexed, 헤더 제외하므로 +1)
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      // 월 형식을 정규화해서 비교
      if (normalizeMonth(row[0]) === normalizedMonth && row[1] === category && row[2] === name) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row not found: ${month}, ${category}, ${name}`);
    }

    // 시트 ID 가져오기 (첫 번째 시트)
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = sheetInfo.data.sheets[0].properties.sheetId;

    // 행 삭제
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting row:', error.message);
    throw error;
  }
}

// 메인 시트에서 특정 범위의 행 삭제 (1-indexed)
async function deleteRowsRange(startRow, endRow, sheetName = MAIN_SHEET_NAME) {
  try {
    // 시트 정보 가져오기
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const targetSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === sheetName
    );

    if (!targetSheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const sheetId = targetSheet.properties.sheetId;

    // 행 삭제 (0-indexed로 변환)
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: startRow - 1, // 1-indexed → 0-indexed
              endIndex: endRow,         // endIndex는 exclusive
            },
          },
        }],
      },
    });

    return { deleted: `rows ${startRow}-${endRow}` };
  } catch (error) {
    console.error('Error deleting rows range:', error.message);
    throw error;
  }
}

// 특정 월 데이터 파싱 (시트 구조에 맞게 조정 필요)
async function getMonthData(year, month) {
  const monthStr = `${year}.${String(month).padStart(2, '0')}`;
  const allData = await getSheetData('A:Z');

  // 헤더 찾기
  const headerRow = allData[0] || [];
  const monthIndex = headerRow.findIndex(h => h && h.includes(monthStr));

  if (monthIndex === -1) {
    return null;
  }

  // 데이터 파싱
  const result = {
    income: { fixed: [], variable: [] },
    expense: { fixed: [], variable: [], card: 0 },
    assets: {},
    stocks: [],
  };

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const category = row[0];
    const name = row[1];
    const value = parseFloat(row[monthIndex]?.replace(/,/g, '')) || 0;

    if (!category || !name) continue;

    // 카테고리별 분류 (시트 구조에 맞게 조정)
    if (category.includes('수입') || category.includes('Income')) {
      if (category.includes('고정') || category.includes('Fixed')) {
        result.income.fixed.push({ name, amount: value });
      } else {
        result.income.variable.push({ name, amount: value });
      }
    } else if (category.includes('지출') || category.includes('Expense')) {
      if (category.includes('카드') || category.includes('Card')) {
        result.expense.card = value;
      } else if (category.includes('고정') || category.includes('Fixed')) {
        result.expense.fixed.push({ name, amount: value, checked: true });
      } else {
        result.expense.variable.push({ name, amount: value });
      }
    } else if (category.includes('자산') || category.includes('Asset')) {
      result.assets[name] = value;
    }
  }

  return result;
}

// 행 업데이트 (월, 카테고리, 이름으로 찾아서 업데이트)
async function updateRowByKey(month, category, name, newValues) {
  try {
    // 먼저 모든 데이터 가져오기
    const allData = await getSheetData('A:E');

    // 월 형식 정규화
    const normalizedMonth = normalizeMonth(month);

    // 업데이트할 행 찾기
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      // 월 형식을 정규화해서 비교
      if (normalizeMonth(row[0]) === normalizedMonth && row[1] === category && row[2] === name) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row not found: ${month}, ${category}, ${name}`);
    }

    // 해당 행 업데이트
    const range = `A${rowIndex}:E${rowIndex}`;
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newValues] },
    });

    return response.data;
  } catch (error) {
    console.error('Error updating row:', error.message);
    throw error;
  }
}

// ============================================
// 관심종목 전용 함수 (별도 시트: "관심종목")
// ============================================

const WATCHLIST_SHEET = '관심종목';

// 관심종목 시트 ID 가져오기 (없으면 생성)
async function getOrCreateWatchlistSheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const watchlistSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === WATCHLIST_SHEET
    );

    if (watchlistSheet) {
      return watchlistSheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: WATCHLIST_SHEET }
          }
        }]
      }
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating watchlist sheet:', error.message);
    throw error;
  }
}

// 관심종목 조회
async function getWatchlist() {
  try {
    await getOrCreateWatchlistSheet(); // 시트 존재 확인

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${WATCHLIST_SHEET}!A:C`,
    });

    const rows = response.data.values || [];
    return rows
      .filter(row => row[0]) // 빈 행 제외
      .map(([ticker, name, order]) => ({
        ticker,
        name: name || ticker,
        order: parseInt(order) || 999,
      }))
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error getting watchlist:', error.message);
    return [];
  }
}

// 관심종목 추가
async function addWatchlistStock(ticker, name) {
  try {
    await getOrCreateWatchlistSheet();

    // 현재 종목 수 확인 (순서 번호용)
    const currentList = await getWatchlist();
    const newOrder = currentList.length + 1;

    // 중복 체크
    if (currentList.some(s => s.ticker === ticker)) {
      throw new Error(`Stock ${ticker} already exists`);
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${WATCHLIST_SHEET}!A:C`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[ticker, name, newOrder]] },
    });

    return response.data;
  } catch (error) {
    console.error('Error adding watchlist stock:', error.message);
    throw error;
  }
}

// 관심종목 삭제
async function removeWatchlistStock(ticker) {
  try {
    const sheetId = await getOrCreateWatchlistSheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${WATCHLIST_SHEET}!A:C`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === ticker);

    if (rowIndex === -1) {
      throw new Error(`Stock ${ticker} not found`);
    }

    // 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    return { deleted: ticker };
  } catch (error) {
    console.error('Error removing watchlist stock:', error.message);
    throw error;
  }
}

// 관심종목 순서 저장 (전체 덮어쓰기)
async function saveWatchlistOrder(stocks) {
  try {
    const sheetId = await getOrCreateWatchlistSheet();

    // 기존 데이터 모두 삭제
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${WATCHLIST_SHEET}!A:C`,
    });

    const rowCount = currentData.data.values?.length || 0;

    if (rowCount > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: 0,
                endIndex: rowCount,
              },
            },
          }],
        },
      });
    }

    // 새 데이터 쓰기
    if (stocks.length > 0) {
      const values = stocks.map((s, i) => [s.ticker, s.name, i + 1]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${WATCHLIST_SHEET}!A1:C${stocks.length}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });
    }

    return { saved: stocks.length };
  } catch (error) {
    console.error('Error saving watchlist order:', error.message);
    throw error;
  }
}

// ============================================
// 보유종목 전용 함수 (별도 시트: "보유종목")
// ============================================

const HOLDINGS_SHEET = '보유종목';

// 보유종목 시트 ID 가져오기 (없으면 생성)
async function getOrCreateHoldingsSheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const holdingsSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === HOLDINGS_SHEET
    );

    if (holdingsSheet) {
      return holdingsSheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: HOLDINGS_SHEET }
          }
        }]
      }
    });

    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['ticker', 'name', 'qty', 'avgPrice', 'account', 'addedDate', 'order']] },
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating holdings sheet:', error.message);
    throw error;
  }
}

// 보유종목 조회
async function getHoldings() {
  try {
    await getOrCreateHoldingsSheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A:G`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // 헤더만 있으면 빈 배열

    // 헤더 제외
    return rows.slice(1)
      .filter(row => row[0]) // 빈 행 제외
      .map(([ticker, name, qty, avgPrice, account, addedDate, order]) => ({
        ticker,
        name: name || ticker,
        qty: parseInt(qty) || 0,
        avgPrice: parseFloat(avgPrice) || 0,
        account: account || '',
        addedDate: addedDate || '',
        order: parseInt(order) || 999,
      }))
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error getting holdings:', error.message);
    return [];
  }
}

// 보유종목 추가
async function addHolding(ticker, name, qty, avgPrice, account) {
  try {
    await getOrCreateHoldingsSheet();

    // 현재 종목 수 확인 (순서 번호용)
    const currentList = await getHoldings();
    const newOrder = currentList.length + 1;

    // 중복 체크
    if (currentList.some(s => s.ticker === ticker)) {
      throw new Error(`Stock ${ticker} already exists`);
    }

    const addedDate = new Date().toISOString().slice(0, 10);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A:G`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[ticker, name, qty, avgPrice, account, addedDate, newOrder]] },
    });

    // 변경이력 저장
    await addChangeHistory(ticker, '추가', '종목', '', `${name} ${qty}주 @${avgPrice}`);

    return { ticker, name, qty, avgPrice, account, addedDate, order: newOrder };
  } catch (error) {
    console.error('Error adding holding:', error.message);
    throw error;
  }
}

// 보유종목 업데이트
async function updateHolding(ticker, updates) {
  try {
    const sheetId = await getOrCreateHoldingsSheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A:G`,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentData = {};

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === ticker) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        currentData = {
          ticker: rows[i][0],
          name: rows[i][1],
          qty: parseInt(rows[i][2]) || 0,
          avgPrice: parseFloat(rows[i][3]) || 0,
          account: rows[i][4] || '',
          addedDate: rows[i][5] || '',
          order: parseInt(rows[i][6]) || 999,
        };
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Holding ${ticker} not found`);
    }

    // 데이터 병합
    const newData = { ...currentData, ...updates };

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A${rowIndex}:G${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newData.ticker, newData.name, newData.qty, newData.avgPrice, newData.account, newData.addedDate, newData.order]] },
    });

    // 변경이력 저장 (변경된 필드만)
    for (const [key, value] of Object.entries(updates)) {
      if (currentData[key] !== value) {
        await addChangeHistory(ticker, '수정', key, String(currentData[key]), String(value));
      }
    }

    return newData;
  } catch (error) {
    console.error('Error updating holding:', error.message);
    throw error;
  }
}

// 보유종목 삭제
async function removeHolding(ticker) {
  try {
    const sheetId = await getOrCreateHoldingsSheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A:G`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === ticker);

    if (rowIndex === -1 || rowIndex === 0) { // 헤더는 삭제하면 안됨
      throw new Error(`Holding ${ticker} not found`);
    }

    // 삭제 전 데이터 저장 (이력용)
    const deletedRow = rows[rowIndex];
    const deletedInfo = `${deletedRow[1]} ${deletedRow[2]}주 @${deletedRow[3]}`;

    // 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    // 변경이력 저장
    await addChangeHistory(ticker, '삭제', '종목', deletedInfo, '');

    return { deleted: ticker };
  } catch (error) {
    console.error('Error removing holding:', error.message);
    throw error;
  }
}

// 보유종목 순서 저장
async function saveHoldingsOrder(stocks) {
  try {
    const sheetId = await getOrCreateHoldingsSheet();

    // 헤더 유지하고 데이터만 교체
    const values = stocks.map((s, i) => [
      s.ticker, s.name, s.qty, s.avgPrice, s.account, s.addedDate, i + 1
    ]);

    // 기존 데이터 삭제 (헤더 제외)
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOLDINGS_SHEET}!A:G`,
    });

    const rowCount = currentData.data.values?.length || 0;

    if (rowCount > 1) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: 1, // 헤더 제외
                endIndex: rowCount,
              },
            },
          }],
        },
      });
    }

    // 새 데이터 쓰기
    if (values.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${HOLDINGS_SHEET}!A2:G`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });
    }

    return { saved: stocks.length };
  } catch (error) {
    console.error('Error saving holdings order:', error.message);
    throw error;
  }
}

// ============================================
// 변경이력 전용 함수 (별도 시트: "변경이력")
// ============================================

const HISTORY_SHEET = '변경이력';

// 변경이력 시트 가져오기 (없으면 생성)
async function getOrCreateHistorySheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const historySheet = sheetInfo.data.sheets.find(
      s => s.properties.title === HISTORY_SHEET
    );

    if (historySheet) {
      return historySheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: HISTORY_SHEET }
          }
        }]
      }
    });

    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HISTORY_SHEET}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['날짜시간', '종목', '변경유형', '항목', '변경전', '변경후']] },
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating history sheet:', error.message);
    throw error;
  }
}

// 변경이력 추가
async function addChangeHistory(ticker, changeType, field, beforeValue, afterValue) {
  try {
    await getOrCreateHistorySheet();

    const timestamp = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HISTORY_SHEET}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[timestamp, ticker, changeType, field, beforeValue, afterValue]] },
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding change history:', error.message);
    // 이력 저장 실패해도 원래 작업은 계속 진행
    return { success: false, error: error.message };
  }
}

// 변경이력 조회
async function getChangeHistory(limit = 100) {
  try {
    await getOrCreateHistorySheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HISTORY_SHEET}!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // 헤더만 있으면 빈 배열

    // 헤더 제외, 최신 순 정렬 (원래 행 번호도 함께 반환)
    return rows.slice(1)
      .map((row, idx) => ({ row, rowIndex: idx + 2 })) // 2번 행부터 시작 (헤더가 1)
      .filter(item => item.row[0])
      .map(({ row: [timestamp, ticker, changeType, field, beforeValue, afterValue], rowIndex }) => ({
        timestamp,
        ticker,
        changeType,
        field,
        beforeValue: beforeValue || '',
        afterValue: afterValue || '',
        rowIndex, // 삭제용 행 번호
      }))
      .reverse()
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting change history:', error.message);
    return [];
  }
}

// 변경이력 초기화 (전체 삭제)
async function clearChangeHistory() {
  try {
    const sheetId = await getOrCreateHistorySheet();

    // 데이터 행만 삭제 (헤더 유지)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HISTORY_SHEET}!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return { success: true, deleted: 0 };

    // 2번 행부터 끝까지 삭제
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HISTORY_SHEET}!A2:F`,
    });

    return { success: true, deleted: rows.length - 1 };
  } catch (error) {
    console.error('Error clearing change history:', error.message);
    throw error;
  }
}

// 변경이력 개별 삭제
async function deleteHistoryItem(rowIndex) {
  try {
    const sheetId = await getOrCreateHistorySheet();

    // 해당 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-based index
              endIndex: rowIndex,
            }
          }
        }]
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting history item:', error.message);
    throw error;
  }
}

// ============================================
// 부동산 전용 함수 (별도 시트: "부동산")
// ============================================

const REALESTATE_SHEET = '부동산';

// 부동산 시트 ID 가져오기 (없으면 생성)
async function getOrCreateRealEstateSheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const realEstateSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === REALESTATE_SHEET
    );

    if (realEstateSheet) {
      return realEstateSheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: REALESTATE_SHEET }
          }
        }]
      }
    });

    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A1:D1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['id', 'type', 'propertyId', 'data']] },
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating real estate sheet:', error.message);
    throw error;
  }
}

// UUID 생성 함수
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 부동산 데이터 전체 조회
async function getRealEstateData() {
  try {
    await getOrCreateRealEstateSheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return { watchProperties: [], myProperties: [], loans: [], priceHistory: {} };

    const result = {
      watchProperties: [],
      myProperties: [],
      loans: [],
      priceHistory: {},
    };

    // 헤더 제외하고 파싱
    for (let i = 1; i < rows.length; i++) {
      const [id, type, propertyId, dataStr] = rows[i];
      if (!id || !type) continue;

      try {
        const data = JSON.parse(dataStr || '{}');

        switch (type) {
          case 'watch':
            result.watchProperties.push({ id, ...data });
            break;
          case 'my':
            result.myProperties.push({ id, ...data });
            break;
          case 'loan':
            result.loans.push({ id, propertyId, ...data });
            break;
          case 'price':
            if (!result.priceHistory[propertyId]) {
              result.priceHistory[propertyId] = [];
            }
            result.priceHistory[propertyId].push({ id, ...data });
            break;
        }
      } catch (e) {
        console.error('Error parsing real estate data:', e.message);
      }
    }

    // 시세 기록 날짜순 정렬
    Object.keys(result.priceHistory).forEach(key => {
      result.priceHistory[key].sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    return result;
  } catch (error) {
    console.error('Error getting real estate data:', error.message);
    throw error;
  }
}

// 관심 부동산 추가
async function addWatchProperty(name, area, regionCode, address) {
  try {
    await getOrCreateRealEstateSheet();

    const id = generateId();
    const data = JSON.stringify({
      name,
      area,
      regionCode: regionCode || '',
      address: address || '',
      addedDate: new Date().toISOString().slice(0, 10),
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[id, 'watch', '', data]] },
    });

    return { id, name, area, regionCode, address };
  } catch (error) {
    console.error('Error adding watch property:', error.message);
    throw error;
  }
}

// 내 부동산 추가
async function addMyProperty(name, area, purchasePrice, purchaseDate, currentValue) {
  try {
    await getOrCreateRealEstateSheet();

    const id = generateId();
    const data = JSON.stringify({
      name,
      area,
      purchasePrice,
      purchaseDate,
      currentValue: currentValue || purchasePrice,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[id, 'my', '', data]] },
    });

    return { id, name, area, purchasePrice, purchaseDate, currentValue };
  } catch (error) {
    console.error('Error adding my property:', error.message);
    throw error;
  }
}

// 대출 추가
async function addLoan(propertyId, amount, rate, startDate, term, loanType, extra = {}) {
  try {
    await getOrCreateRealEstateSheet();

    const id = generateId();
    const data = JSON.stringify({
      amount,
      rate,
      startDate,
      term: term || 360, // 기본 30년
      type: loanType || '원리금균등',
      bank: extra.bank || '',
      balance: extra.balance || amount,
      monthlyPayment: extra.monthlyPayment || 0,
      lastPaymentDate: extra.lastPaymentDate || '',
      lastPrincipal: extra.principal || 0,
      lastInterest: extra.interest || 0,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[id, 'loan', propertyId, data]] },
    });

    return { id, propertyId, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error adding loan:', error.message);
    throw error;
  }
}

// 시세 기록 추가
async function addPriceRecord(propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount) {
  try {
    await getOrCreateRealEstateSheet();

    const id = generateId();
    const data = JSON.stringify({
      date,
      salePrice,
      jeonsePrice,
      monthlyDeposit,
      monthlyRent,
      listingCount,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[id, 'price', propertyId, data]] },
    });

    return { id, propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount };
  } catch (error) {
    console.error('Error adding price record:', error.message);
    throw error;
  }
}

// 부동산 데이터 업데이트
async function updateRealEstate(id, updates) {
  try {
    const sheetId = await getOrCreateRealEstateSheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentData = {};

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        try {
          currentData = JSON.parse(rows[i][3] || '{}');
        } catch (e) {}
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Real estate record not found: ${id}`);
    }

    // 데이터 병합 및 업데이트
    const newData = JSON.stringify({ ...currentData, ...updates });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newData]] },
    });

    return { id, ...currentData, ...updates };
  } catch (error) {
    console.error('Error updating real estate:', error.message);
    throw error;
  }
}

// ============================================
// 부동산 시세 히스토리 (별도 시트: "부동산시세")
// ============================================

const PRICE_HISTORY_SHEET = '부동산시세';

// 부동산시세 시트 가져오기 (없으면 생성)
async function getOrCreatePriceHistorySheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const priceSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === PRICE_HISTORY_SHEET
    );

    if (priceSheet) {
      return priceSheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: PRICE_HISTORY_SHEET }
          }
        }]
      }
    });

    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_HISTORY_SHEET}!A1:L1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['date', 'complexId', 'complexName', 'area', 'saleCount', 'saleMin', 'saleMax', 'jeonseCount', 'jeonseMin', 'jeonseMax', 'monthlyCount', 'updatedAt']]
      },
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating price history sheet:', error.message);
    throw error;
  }
}

// 오늘 시세 데이터 조회
async function getTodayPriceData(date) {
  try {
    await getOrCreatePriceHistorySheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_HISTORY_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return null;

    // 해당 날짜 데이터 필터링
    const todayData = rows.slice(1)
      .filter(row => row[0] === date)
      .map(([date, complexId, complexName, area, saleCount, saleMin, saleMax, jeonseCount, jeonseMin, jeonseMax, monthlyCount, updatedAt]) => ({
        date,
        complexId,
        complexName,
        area: parseInt(area) || 0,
        saleCount: parseInt(saleCount) || 0,
        saleMin: parseInt(saleMin) || 0,
        saleMax: parseInt(saleMax) || 0,
        jeonseCount: parseInt(jeonseCount) || 0,
        jeonseMin: parseInt(jeonseMin) || 0,
        jeonseMax: parseInt(jeonseMax) || 0,
        monthlyCount: parseInt(monthlyCount) || 0,
        updatedAt,
      }));

    return todayData.length > 0 ? todayData : null;
  } catch (error) {
    console.error('Error getting today price data:', error.message);
    return null;
  }
}

// 시세 데이터 저장 (upsert)
async function savePriceHistory(records) {
  try {
    const sheetId = await getOrCreatePriceHistorySheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_HISTORY_SHEET}!A:L`,
    });

    const existingRows = response.data.values || [];

    // 새 데이터 준비 (중복 체크)
    const existingKeys = new Set();
    existingRows.slice(1).forEach(row => {
      if (row[0] && row[1] && row[3]) {
        existingKeys.add(`${row[0]}_${row[1]}_${row[3]}`); // date_complexId_area
      }
    });

    const newRecords = records.filter(r =>
      !existingKeys.has(`${r.date}_${r.complexId}_${r.area}`)
    );

    if (newRecords.length === 0) {
      console.log('[Sheets] No new price records to save');
      return { saved: 0 };
    }

    // 새 데이터 추가
    const values = newRecords.map(r => [
      r.date,
      r.complexId,
      r.complexName,
      r.area,
      r.saleCount,
      r.saleMin,
      r.saleMax,
      r.jeonseCount,
      r.jeonseMin,
      r.jeonseMax,
      r.monthlyCount,
      r.updatedAt || new Date().toISOString(),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_HISTORY_SHEET}!A:L`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    console.log(`[Sheets] Saved ${newRecords.length} price records`);
    return { saved: newRecords.length };
  } catch (error) {
    console.error('Error saving price history:', error.message);
    throw error;
  }
}

// 시세 히스토리 조회 (특정 단지, 평형, 기간)
async function getPriceHistory(complexId, area, days = 30) {
  try {
    await getOrCreatePriceHistorySheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_HISTORY_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    // 날짜 기준 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // 필터링 및 정렬
    return rows.slice(1)
      .filter(row => {
        const matchComplex = !complexId || row[1] === complexId;
        const matchArea = !area || parseInt(row[3]) === area;
        const matchDate = row[0] >= cutoffStr;
        return matchComplex && matchArea && matchDate;
      })
      .map(([date, cId, complexName, a, saleCount, saleMin, saleMax, jeonseCount, jeonseMin, jeonseMax, monthlyCount, updatedAt]) => ({
        date,
        complexId: cId,
        complexName,
        area: parseInt(a) || 0,
        saleCount: parseInt(saleCount) || 0,
        saleMin: parseInt(saleMin) || 0,
        saleMax: parseInt(saleMax) || 0,
        jeonseCount: parseInt(jeonseCount) || 0,
        jeonseMin: parseInt(jeonseMin) || 0,
        jeonseMax: parseInt(jeonseMax) || 0,
        monthlyCount: parseInt(monthlyCount) || 0,
        updatedAt,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting price history:', error.message);
    return [];
  }
}

// ============================================
// 매물 상세 (별도 시트: "매물상세")
// ============================================

const ARTICLE_DETAIL_SHEET = '매물상세';

// 매물상세 시트 가져오기 (없으면 생성)
async function getOrCreateArticleDetailSheet() {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const articleSheet = sheetInfo.data.sheets.find(
      s => s.properties.title === ARTICLE_DETAIL_SHEET
    );

    if (articleSheet) {
      return articleSheet.properties.sheetId;
    }

    // 시트가 없으면 생성
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: ARTICLE_DETAIL_SHEET }
          }
        }]
      }
    });

    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ARTICLE_DETAIL_SHEET}!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['date', 'complexId', 'complexName', 'area', 'tradeType', 'price', 'deposit', 'monthlyRent', 'floor', 'articleNo', 'updatedAt']]
      },
    });

    return response.data.replies[0].addSheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting/creating article detail sheet:', error.message);
    throw error;
  }
}

// 오늘 매물상세 데이터 존재 여부 확인
async function getTodayArticleDetails(date) {
  try {
    await getOrCreateArticleDetailSheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ARTICLE_DETAIL_SHEET}!A:K`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return null;

    // 해당 날짜 데이터 필터링
    const todayData = rows.slice(1)
      .filter(row => row[0] === date)
      .map(([date, complexId, complexName, area, tradeType, price, deposit, monthlyRent, floor, articleNo, updatedAt]) => ({
        date,
        complexId,
        complexName,
        area: parseFloat(area) || 0,
        tradeType,
        price: parseInt(price) || 0,
        deposit: parseInt(deposit) || 0,
        monthlyRent: parseInt(monthlyRent) || 0,
        floor,
        articleNo,
        updatedAt,
      }));

    return todayData.length > 0 ? todayData : null;
  } catch (error) {
    console.error('Error getting today article details:', error.message);
    return null;
  }
}

// 매물상세 저장
async function saveArticleDetails(records) {
  try {
    await getOrCreateArticleDetailSheet();

    // 현재 데이터 가져오기 (중복 체크용)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ARTICLE_DETAIL_SHEET}!A:K`,
    });

    const existingRows = response.data.values || [];

    // 기존 키 세트 (date_complexId_articleNo)
    const existingKeys = new Set();
    existingRows.slice(1).forEach(row => {
      if (row[0] && row[1] && row[9]) {
        existingKeys.add(`${row[0]}_${row[1]}_${row[9]}`);
      }
    });

    // 새 데이터만 필터링
    const newRecords = records.filter(r =>
      !existingKeys.has(`${r.date}_${r.complexId}_${r.articleNo}`)
    );

    if (newRecords.length === 0) {
      console.log('[Sheets] No new article details to save');
      return { saved: 0 };
    }

    // 새 데이터 추가
    const values = newRecords.map(r => [
      r.date,
      r.complexId,
      r.complexName,
      r.area,
      r.tradeType,
      r.price || '',
      r.deposit || '',
      r.monthlyRent || '',
      r.floor || '',
      r.articleNo,
      r.updatedAt || new Date().toISOString(),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ARTICLE_DETAIL_SHEET}!A:K`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    console.log(`[Sheets] Saved ${newRecords.length} article details`);
    return { saved: newRecords.length };
  } catch (error) {
    console.error('Error saving article details:', error.message);
    throw error;
  }
}

// 매물상세 히스토리 조회
async function getArticleDetailHistory(complexId, tradeType, days = 30) {
  try {
    await getOrCreateArticleDetailSheet();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ARTICLE_DETAIL_SHEET}!A:K`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    // 날짜 기준 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // 필터링 및 정렬
    return rows.slice(1)
      .filter(row => {
        const matchComplex = !complexId || row[1] === complexId;
        const matchTradeType = !tradeType || row[4] === tradeType;
        const matchDate = row[0] >= cutoffStr;
        return matchComplex && matchTradeType && matchDate;
      })
      .map(([date, cId, complexName, area, tType, price, deposit, monthlyRent, floor, articleNo, updatedAt]) => ({
        date,
        complexId: cId,
        complexName,
        area: parseFloat(area) || 0,
        tradeType: tType,
        price: parseInt(price) || 0,
        deposit: parseInt(deposit) || 0,
        monthlyRent: parseInt(monthlyRent) || 0,
        floor,
        articleNo,
        updatedAt,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting article detail history:', error.message);
    return [];
  }
}

// 부동산 데이터 삭제
async function removeRealEstate(id) {
  try {
    const sheetId = await getOrCreateRealEstateSheet();

    // 현재 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REALESTATE_SHEET}!A:D`,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Real estate record not found: ${id}`);
    }

    // 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    return { deleted: id };
  } catch (error) {
    console.error('Error removing real estate:', error.message);
    throw error;
  }
}

module.exports = {
  getSheetData,
  updateSheetData,
  appendSheetData,
  deleteSheetRow,
  deleteRowsRange,
  updateRowByKey,
  getMonthData,
  // 레거시 체크
  isLegacyMonth,
  LEGACY_CUTOFF,
  // 관심종목 전용
  getWatchlist,
  addWatchlistStock,
  removeWatchlistStock,
  saveWatchlistOrder,
  // 보유종목 전용
  getHoldings,
  addHolding,
  updateHolding,
  removeHolding,
  saveHoldingsOrder,
  // 변경이력 전용
  addChangeHistory,
  getChangeHistory,
  clearChangeHistory,
  deleteHistoryItem,
  // 부동산 전용
  getRealEstateData,
  addWatchProperty,
  addMyProperty,
  addLoan,
  addPriceRecord,
  updateRealEstate,
  removeRealEstate,
  // 부동산 시세 히스토리
  getTodayPriceData,
  savePriceHistory,
  getPriceHistory,
  // 매물 상세
  getTodayArticleDetails,
  saveArticleDetails,
  getArticleDetailHistory,
};
