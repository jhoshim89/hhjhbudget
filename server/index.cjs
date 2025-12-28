require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const {
  getSheetData, updateSheetData, appendSheetData, deleteSheetRow, deleteRowsRange, updateRowByKey, getMonthData,
  getWatchlist, addWatchlistStock, removeWatchlistStock, saveWatchlistOrder,
  getHoldings, addHolding, updateHolding, removeHolding, saveHoldingsOrder,
  addChangeHistory, getChangeHistory,
  getRealEstateData, addWatchProperty, addMyProperty, addLoan, addPriceRecord, updateRealEstate, removeRealEstate,
  isLegacyMonth, LEGACY_CUTOFF
} = require('./sheets.cjs');

// 메인 시트 이름 상수
const MAIN_SHEET_NAME = '시트1';
const { yahooFinanceHandler } = require('./yahooFinance.cjs');
const { molitApiHandler } = require('./molitApi.cjs');
const { naverRealestateHandler } = require('./naverRealestate.cjs');

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
    // 레거시 월 체크 (첫 번째 컬럼이 날짜)
    const month = values?.[0]?.[0];
    if (month && isLegacyMonth(month)) {
      return res.status(403).json({
        success: false,
        error: `레거시 데이터는 수정할 수 없습니다 (${LEGACY_CUTOFF} 이전)`
      });
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
    // 레거시 월 체크
    if (isLegacyMonth(month)) {
      return res.status(403).json({
        success: false,
        error: `레거시 데이터는 삭제할 수 없습니다 (${LEGACY_CUTOFF} 이전)`
      });
    }
    const result = await deleteSheetRow(month, category, name);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 행 범위 삭제 (관리용)
app.delete('/api/sheet/rows', async (req, res) => {
  try {
    const { startRow, endRow, sheetName } = req.body;
    if (!startRow || !endRow) {
      return res.status(400).json({ success: false, error: 'startRow and endRow required' });
    }
    const result = await deleteRowsRange(startRow, endRow, sheetName || MAIN_SHEET_NAME);
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
    // 레거시 월 체크
    if (isLegacyMonth(month)) {
      return res.status(403).json({
        success: false,
        error: `레거시 데이터는 수정할 수 없습니다 (${LEGACY_CUTOFF} 이전)`
      });
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

// Yahoo Finance 데이터 조회
app.get('/api/yahoo-finance', yahooFinanceHandler);

// 국토교통부 실거래가 조회
app.get('/api/molit', molitApiHandler);

// 네이버 부동산 크롤링 API
app.get('/api/naver-realestate', naverRealestateHandler);

// ============================================
// 관심종목 API (별도 시트)
// ============================================

// 관심종목 목록 조회
app.get('/api/watchlist', async (req, res) => {
  try {
    const data = await getWatchlist();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 관심종목 추가
app.post('/api/watchlist', async (req, res) => {
  try {
    const { ticker, name } = req.body;
    if (!ticker || !name) {
      return res.status(400).json({ success: false, error: 'ticker and name required' });
    }
    const result = await addWatchlistStock(ticker, name);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 관심종목 삭제
app.delete('/api/watchlist/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ success: false, error: 'ticker required' });
    }
    const result = await removeWatchlistStock(ticker);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 관심종목 순서 저장
app.put('/api/watchlist/order', async (req, res) => {
  try {
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ success: false, error: 'stocks array required' });
    }
    const result = await saveWatchlistOrder(stocks);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 보유종목 API (별도 시트)
// ============================================

// 보유종목 목록 조회
app.get('/api/holdings', async (req, res) => {
  try {
    const data = await getHoldings();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 보유종목 추가
app.post('/api/holdings', async (req, res) => {
  try {
    const { ticker, name, qty, avgPrice, account } = req.body;
    if (!ticker || !name) {
      return res.status(400).json({ success: false, error: 'ticker and name required' });
    }
    const result = await addHolding(ticker, name, qty || 0, avgPrice || 0, account || '');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 보유종목 업데이트
app.put('/api/holdings/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const updates = req.body;
    if (!ticker) {
      return res.status(400).json({ success: false, error: 'ticker required' });
    }
    const result = await updateHolding(ticker, updates);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 보유종목 삭제
app.delete('/api/holdings/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ success: false, error: 'ticker required' });
    }
    const result = await removeHolding(ticker);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 보유종목 순서 저장
app.put('/api/holdings/order', async (req, res) => {
  try {
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ success: false, error: 'stocks array required' });
    }
    const result = await saveHoldingsOrder(stocks);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 변경이력 API (별도 시트)
// ============================================

// 변경이력 조회
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const data = await getChangeHistory(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 부동산 API (별도 시트)
// ============================================

// 부동산 데이터 전체 조회
app.get('/api/realestate', async (req, res) => {
  try {
    const data = await getRealEstateData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 관심 부동산 추가
app.post('/api/realestate/watch', async (req, res) => {
  try {
    const { name, area, regionCode, address } = req.body;
    if (!name || !area) {
      return res.status(400).json({ success: false, error: 'name and area required' });
    }
    const result = await addWatchProperty(name, area, regionCode, address);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 내 부동산 추가
app.post('/api/realestate/my', async (req, res) => {
  try {
    const { name, area, purchasePrice, purchaseDate, currentValue } = req.body;
    if (!name || !area || !purchasePrice) {
      return res.status(400).json({ success: false, error: 'name, area, and purchasePrice required' });
    }
    const result = await addMyProperty(name, area, purchasePrice, purchaseDate, currentValue);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 대출 추가
app.post('/api/realestate/loan', async (req, res) => {
  try {
    const { propertyId, amount, rate, startDate, term, type, bank, balance, monthlyPayment, lastPaymentDate, principal, interest } = req.body;
    if (!propertyId || !amount || !rate) {
      return res.status(400).json({ success: false, error: 'propertyId, amount, and rate required' });
    }
    const extra = { bank, balance, monthlyPayment, lastPaymentDate, principal, interest };
    const result = await addLoan(propertyId, amount, rate, startDate, term, type, extra);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 시세 기록 추가
app.post('/api/realestate/price', async (req, res) => {
  try {
    const { propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount } = req.body;
    if (!propertyId || !date) {
      return res.status(400).json({ success: false, error: 'propertyId and date required' });
    }
    const result = await addPriceRecord(propertyId, date, salePrice, jeonsePrice, monthlyDeposit, monthlyRent, listingCount);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 부동산 데이터 업데이트
app.put('/api/realestate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (!id || !updates) {
      return res.status(400).json({ success: false, error: 'id and updates required' });
    }
    const result = await updateRealEstate(id, updates);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 부동산 데이터 삭제
app.delete('/api/realestate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id required' });
    }
    const result = await removeRealEstate(id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Sheet ID: ${process.env.GOOGLE_SHEETS_ID}`);
});
