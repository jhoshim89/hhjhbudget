const { google } = require('googleapis');

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

// 행 삭제 (조건에 맞는 행 찾아서 삭제)
async function deleteSheetRow(month, category, name) {
  try {
    // 먼저 모든 데이터 가져오기
    const allData = await getSheetData('A:E');

    // 삭제할 행 찾기 (0-indexed, 헤더 제외하므로 +1)
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[0] === month && row[1] === category && row[2] === name) {
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

    // 업데이트할 행 찾기
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[0] === month && row[1] === category && row[2] === name) {
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

module.exports = {
  getSheetData,
  updateSheetData,
  appendSheetData,
  deleteSheetRow,
  updateRowByKey,
  getMonthData,
};
