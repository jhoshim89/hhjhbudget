/**
 * 네이버 부동산 단지 코드 데이터
 * complexNo는 서버에서 자동 조회 후 캐싱
 */

export const TARGET_COMPLEXES = [
  {
    id: 'forena-songpa',
    name: '포레나송파',
    region: '서울 송파구 거여동',
    regionCode: '11710', // 송파구
    areas: [80, 84],
    isMine: true,
    complexNo: null, // 자동 조회
  },
  {
    id: 'the-beach-prugio-summit',
    name: '더비치푸르지오써밋',
    region: '부산 남구 대연동',
    regionCode: '26290', // 남구
    areas: [84],
    isMine: false,
    complexNo: null,
  },
  {
    id: 'daeyeon-lotte-castle',
    name: '대연롯데캐슬레전드',
    region: '부산 남구 대연동',
    regionCode: '26290',
    areas: [84],
    isMine: false,
    complexNo: null,
  },
  {
    id: 'the-sharp-namcheon',
    name: '더샵남천프레스티지',
    region: '부산 수영구 남천동',
    regionCode: '26500', // 수영구
    areas: [84],
    isMine: false,
    complexNo: null,
  },
  {
    id: 'daeyeon-hillstate-prugio',
    name: '대연힐스테이트푸르지오',
    region: '부산 남구 대연동',
    regionCode: '26290',
    areas: [84],
    isMine: false,
    complexNo: null,
  },
  {
    id: 'daeyeon-diel',
    name: '대연디아이엘',
    region: '부산 남구 대연동',
    regionCode: '26290',
    areas: [84],
    isMine: false,
    complexNo: null, // 2027년 입주 예정
  },
  {
    id: 'doosan-weave-zenith-ocean',
    name: '두산위브더제니스오션시티',
    region: '부산 남구 우암동',
    regionCode: '26290',
    areas: [84],
    isMine: false,
    complexNo: null, // 2026년 1월 입주 예정
  },
];

// 거래 유형 코드
export const TRADE_TYPES = {
  SALE: 'A1',      // 매매
  JEONSE: 'B1',    // 전세
  MONTHLY: 'B2',   // 월세
};

export default TARGET_COMPLEXES;
