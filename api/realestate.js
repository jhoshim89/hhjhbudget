import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const REALESTATE_SHEET = '부동산';

// UUID 생성
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 부동산 시트 가져오기/생성
async function getOrCreateSheet() {
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const realEstateSheet = sheetInfo.data.sheets.find(s => s.properties.title === REALESTATE_SHEET);

  if (realEstateSheet) return realEstateSheet.properties.sheetId;

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{ addSheet: { properties: { title: REALESTATE_SHEET } } }]
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!A1:D1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [['id', 'type', 'propertyId', 'data']] },
  });

  return response.data.replies[0].addSheet.properties.sheetId;
}

// 전체 조회
async function getRealEstateData() {
  await getOrCreateSheet();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!A:D`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return { watchProperties: [], myProperties: [], loans: [], priceHistory: {} };

  const result = { watchProperties: [], myProperties: [], loans: [], priceHistory: {} };

  for (let i = 1; i < rows.length; i++) {
    const [id, type, propertyId, dataStr] = rows[i];
    if (!id || !type) continue;

    try {
      const data = JSON.parse(dataStr || '{}');
      switch (type) {
        case 'watch': result.watchProperties.push({ id, ...data }); break;
        case 'my': result.myProperties.push({ id, ...data }); break;
        case 'loan': result.loans.push({ id, propertyId, ...data }); break;
        case 'price':
          if (!result.priceHistory[propertyId]) result.priceHistory[propertyId] = [];
          result.priceHistory[propertyId].push({ id, ...data });
          break;
      }
    } catch (e) {}
  }

  Object.keys(result.priceHistory).forEach(key => {
    result.priceHistory[key].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return result;
}

// 데이터 추가
async function addRecord(type, propertyId, data) {
  await getOrCreateSheet();
  const id = generateId();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!A:D`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, type, propertyId || '', JSON.stringify(data)]] },
  });

  return { id, ...data };
}

// 데이터 업데이트
async function updateRecord(id, updates) {
  await getOrCreateSheet();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!A:D`,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;
  let currentData = {};

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i + 1;
      try { currentData = JSON.parse(rows[i][3] || '{}'); } catch (e) {}
      break;
    }
  }

  if (rowIndex === -1) throw new Error(`Record not found: ${id}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!D${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[JSON.stringify({ ...currentData, ...updates })]] },
  });

  return { id, ...currentData, ...updates };
}

// 데이터 삭제
async function deleteRecord(id) {
  const sheetId = await getOrCreateSheet();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REALESTATE_SHEET}!A:D`,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { rowIndex = i; break; }
  }

  if (rowIndex === -1) throw new Error(`Record not found: ${id}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
        }
      }]
    }
  });

  return { deleted: id };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: 전체 조회
    if (req.method === 'GET') {
      const data = await getRealEstateData();
      return res.json({ success: true, data });
    }

    // POST: 추가
    if (req.method === 'POST') {
      const { type, propertyId, ...data } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, error: 'type required' });
      }
      const result = await addRecord(type, propertyId, data);
      return res.json({ success: true, data: result });
    }

    // PUT: 업데이트
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'id required' });
      }
      const result = await updateRecord(id, updates);
      return res.json({ success: true, data: result });
    }

    // DELETE: 삭제
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'id required' });
      }
      const result = await deleteRecord(id);
      return res.json({ success: true, data: result });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Real estate API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
