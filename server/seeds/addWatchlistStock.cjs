/**
 * SGOV 관심종목 추가 스크립트
 * 사용법: node server/seeds/addWatchlistStock.cjs
 */

require('dotenv').config({ path: '.env.local' });

const { addWatchlistStock, getWatchlist } = require('../sheets.cjs');

async function main() {
  const ticker = 'SGOV';
  const name = 'iShares 0-3 Month Treasury Bond ETF';

  console.log('📋 현재 관심종목 조회 중...');

  try {
    const currentList = await getWatchlist();
    console.log(`현재 관심종목 (${currentList.length}개):`, currentList.map(s => s.ticker).join(', '));

    // 이미 존재하는지 확인
    if (currentList.some(s => s.ticker === ticker)) {
      console.log(`⚠️  ${ticker}는 이미 관심종목에 있습니다.`);
      return;
    }

    console.log(`\n➕ ${ticker} (${name}) 추가 중...`);
    await addWatchlistStock(ticker, name);

    console.log(`✅ ${ticker} 추가 완료!`);

    // 확인
    const updatedList = await getWatchlist();
    console.log(`\n업데이트된 관심종목 (${updatedList.length}개):`, updatedList.map(s => s.ticker).join(', '));
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();
