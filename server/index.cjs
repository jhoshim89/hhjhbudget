require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getSheetData, updateSheetData, appendSheetData, deleteSheetRow, updateRowByKey, getMonthData } = require('./sheets.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 전체 시트 데이터 조회
app.get('/api/sheet', async (req, res) => {
  try {
    const range = req.query.range || 'A:Z';
    const data = await getSheetData(range);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 특정 월 데이터 조회
app.get('/api/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const data = await getMonthData(parseInt(year), parseInt(month));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Month not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 셀 업데이트
app.put('/api/sheet', async (req, res) => {
  try {
    const { range, values } = req.body;
    if (!range || !values) {
      return res.status(400).json({ success: false, error: 'range and values required' });
    }
    const result = await updateSheetData(range, values);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 행 추가
app.post('/api/sheet', async (req, res) => {
  try {
    const { range, values } = req.body;
    if (!range || !values) {
      return res.status(400).json({ success: false, error: 'range and values required' });
    }
    const result = await appendSheetData(range, values);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 행 삭제
app.delete('/api/sheet', async (req, res) => {
  try {
    const { month, category, name } = req.body;
    if (!month || !category || !name) {
      return res.status(400).json({ success: false, error: 'month, category, and name required' });
    }
    const result = await deleteSheetRow(month, category, name);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 행 업데이트 (키 기반)
app.patch('/api/sheet', async (req, res) => {
  try {
    const { month, category, name, values } = req.body;
    if (!month || !category || !name || !values) {
      return res.status(400).json({ success: false, error: 'month, category, name, and values required' });
    }
    const result = await updateRowByKey(month, category, name, values);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Sheet ID: ${process.env.GOOGLE_SHEETS_ID}`);
});
