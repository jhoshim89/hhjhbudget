/**
 * 10월, 11월 주식계좌 데이터 계산 및 스프레드시트 추가 스크립트
 *
 * 사용법:
 * - 조회만: node scripts/calculate-past-assets.js
 * - 추가: node scripts/calculate-past-assets.js --commit
 */

const API_BASE = 'http://localhost:3001/api';

// 향화영웅문 보유종목 (수동 입력)
const HOLDINGS = [
  { ticker: 'NVDA', qty: 470 },
  { ticker: 'TSLA', qty: 153 },
  { ticker: 'GOOGL', qty: 76 },
  { ticker: 'MSFT', qty: 33 },
  { ticker: 'AMZN', qty: 33 },
  { ticker: 'CPNG', qty: 154 },
  { ticker: 'O', qty: 38 },
  { ticker: 'IONQ', qty: 1 },
];

// 12월 수동 입력 계좌 금액
const MANUAL_ACCOUNTS = {
  재호영웅문: 31040000,
  향화카카오: 21900000,
};

// Yahoo Finance에서 3개월 히스토리 가져오기
async function fetchYahooHistory(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const json = await response.json();
  const result = json.chart.result[0];
  const timestamps = result.timestamp || [];
  const closes = result.indicators.quote[0].close || [];

  // 날짜별 종가 맵핑
  const priceByDate = {};
  timestamps.forEach((ts, i) => {
    const date = new Date(ts * 1000).toISOString().split('T')[0];
    if (closes[i] !== null) {
      priceByDate[date] = closes[i];
    }
  });

  return priceByDate;
}

// 환율 조회
async function fetchExchangeRate() {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const json = await response.json();
    const closes = json.chart.result[0].indicators.quote[0].close;
    return closes[closes.length - 1] || 1450;
  } catch {
    return 1450; // 폴백
  }
}

// 특정 월 말일 시세 가져오기
function getEndOfMonthPrice(priceByDate, year, month) {
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = lastDay; day >= 1; day--) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (priceByDate[dateStr]) {
      return { date: dateStr, price: priceByDate[dateStr] };
    }
  }

  return null;
}

async function main() {
  console.log('=== 10월/11월 주식계좌 데이터 계산 ===\n');

  try {
    // 1. 보유종목 표시
    console.log('1. 향화영웅문 보유종목:');
    HOLDINGS.forEach(s => {
      console.log(`   - ${s.ticker}: ${s.qty}주`);
    });

    // 2. 환율 조회
    console.log('\n2. 환율 조회...');
    const exchangeRate = await fetchExchangeRate();
    console.log(`   환율: ${exchangeRate.toFixed(2)} KRW/USD`);

    // 3. 각 종목의 과거 시세 조회
    console.log('\n3. 과거 시세 조회...');
    const priceHistories = {};

    for (const stock of HOLDINGS) {
      process.stdout.write(`   ${stock.ticker}...`);
      try {
        priceHistories[stock.ticker] = await fetchYahooHistory(stock.ticker);
        console.log(' OK');
      } catch (err) {
        console.log(` 실패: ${err.message}`);
        priceHistories[stock.ticker] = {};
      }
    }

    // 4. 10월, 11월 말 시세로 계산
    console.log('\n4. 월별 계산...');

    const months = [
      { year: 2025, month: 10, label: '2025.10' },
      { year: 2025, month: 11, label: '2025.11' },
    ];

    const results = [];

    for (const { year, month, label } of months) {
      let hyangYounghwamunTotal = 0;

      console.log(`\n   === ${label} ===`);

      for (const stock of HOLDINGS) {
        const history = priceHistories[stock.ticker] || {};
        const priceData = getEndOfMonthPrice(history, year, month);

        if (priceData) {
          const valueUSD = stock.qty * priceData.price;
          const valueKRW = valueUSD * exchangeRate;
          hyangYounghwamunTotal += valueKRW;
          console.log(`   ${stock.ticker.padEnd(6)}: ${priceData.date} @ $${priceData.price.toFixed(2).padStart(8)} × ${String(stock.qty).padStart(3)}주 = ${Math.round(valueKRW).toLocaleString().padStart(15)}원`);
        } else {
          console.log(`   ${stock.ticker}: 시세 없음`);
        }
      }

      console.log(`   ${'─'.repeat(60)}`);
      console.log(`   향화영웅문 합계: ${Math.round(hyangYounghwamunTotal).toLocaleString()}원`);

      results.push({
        month: label,
        hyangYounghwamun: Math.round(hyangYounghwamunTotal),
      });
    }

    // 5. 결과 요약
    console.log('\n\n=== 결과 요약 ===');
    console.log('스프레드시트에 추가할 데이터 (자산-주식계좌 카테고리):');
    console.log('');
    for (const r of results) {
      const total = r.hyangYounghwamun + MANUAL_ACCOUNTS.재호영웅문 + MANUAL_ACCOUNTS.향화카카오;
      console.log(`${r.month}:`);
      console.log(`  향화영웅문: ${r.hyangYounghwamun.toLocaleString()}원`);
      console.log(`  재호영웅문: ${MANUAL_ACCOUNTS.재호영웅문.toLocaleString()}원`);
      console.log(`  향화카카오: ${MANUAL_ACCOUNTS.향화카카오.toLocaleString()}원`);
      console.log(`  총계: ${total.toLocaleString()}원`);
    }

    // 6. 스프레드시트에 추가
    if (process.argv.includes('--commit')) {
      console.log('\n\n=== 스프레드시트에 데이터 추가 ===');

      for (const r of results) {
        // 향화영웅문
        await appendToSheet([r.month, '자산-주식계좌', '향화영웅문', r.hyangYounghwamun, '']);
        console.log(`${r.month} 향화영웅문: ${r.hyangYounghwamun.toLocaleString()}원 추가 완료`);

        // 재호영웅문
        await appendToSheet([r.month, '자산-주식계좌', '재호영웅문', MANUAL_ACCOUNTS.재호영웅문, '']);
        console.log(`${r.month} 재호영웅문: ${MANUAL_ACCOUNTS.재호영웅문.toLocaleString()}원 추가 완료`);

        // 향화카카오
        await appendToSheet([r.month, '자산-주식계좌', '향화카카오', MANUAL_ACCOUNTS.향화카카오, '']);
        console.log(`${r.month} 향화카카오: ${MANUAL_ACCOUNTS.향화카카오.toLocaleString()}원 추가 완료`);
      }

      console.log('\n완료!');
    } else {
      console.log('\n스프레드시트에 추가하려면: node scripts/calculate-past-assets.js --commit');
    }

  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

// 스프레드시트에 데이터 추가
async function appendToSheet(values) {
  const res = await fetch(`${API_BASE}/sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: 'A:E', values: [values] }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

main();
