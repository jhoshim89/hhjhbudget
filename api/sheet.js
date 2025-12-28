import { google } from 'googleapis';

// Google Sheets 인증
const getAuth = () => {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getSheets = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
};

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// 시트 데이터 읽기
async function getSheetData(range) {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return response.data.values || [];
}

// 행 추가
async function appendSheetData(range, values) {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
  return response.data;
}

// 행 삭제
async function deleteSheetRow(month, category, name) {
  const sheets = getSheets();
  const allData = await getSheetData('A:E');

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

  const sheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetId = sheetInfo.data.sheets[0].properties.sheetId;

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
}

// 행 업데이트
async function updateRowByKey(month, category, name, newValues) {
  const sheets = getSheets();
  const allData = await getSheetData('A:E');

  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[0] === month && row[1] === category && row[2] === name) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Row not found: ${month}, ${category}, ${name}`);
  }

  const range = `A${rowIndex}:E${rowIndex}`;
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [newValues] },
  });

  return response.data;
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET': {
        const range = req.query.range || 'A:Z';
        const data = await getSheetData(range);
        return res.json({ success: true, data });
      }

      case 'POST': {
        const { range, values } = req.body;
        if (!range || !values) {
          return res.status(400).json({ success: false, error: 'range and values required' });
        }
        const result = await appendSheetData(range, values);
        return res.json({ success: true, data: result });
      }

      case 'PATCH': {
        const { month, category, name, values } = req.body;
        if (!month || !category || !name || !values) {
          return res.status(400).json({ success: false, error: 'month, category, name, and values required' });
        }
        const result = await updateRowByKey(month, category, name, values);
        return res.json({ success: true, data: result });
      }

      case 'DELETE': {
        const { month, category, name } = req.body;
        if (!month || !category || !name) {
          return res.status(400).json({ success: false, error: 'month, category, and name required' });
        }
        const result = await deleteSheetRow(month, category, name);
        return res.json({ success: true, data: result });
      }

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
