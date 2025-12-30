# Budget Dashboard

개인 가계부 대시보드 애플리케이션

## 기술 스택

- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Backend**: Express.js (Node.js)
- **데이터**: Google Sheets API
- **외부 API**: Yahoo Finance, Naver 부동산, 정부 MOLIT API

## 배포 환경

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| Frontend | Vercel | https://hhjhbudget.vercel.app |
| Backend | Railway | https://hhjhbudget-production.up.railway.app |

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트엔드 + 백엔드)
npm run dev:all

# 프론트엔드만 실행 (포트 5173)
npm run dev

# 백엔드만 실행 (포트 3001)
npm run server
```

## 환경변수

### Backend (Railway / .env.local)
```
GOOGLE_SHEETS_ID=스프레드시트_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=서비스계정@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://hhjhbudget-production.up.railway.app
VITE_APP_PASSWORD=앱_비밀번호 (선택)
```

## 프로젝트 구조

```
budget-dashboard/
├── src/                    # React 프론트엔드
│   ├── components/         # UI 컴포넌트
│   ├── hooks/              # 커스텀 훅
│   ├── services/           # API 서비스
│   └── utils/              # 유틸리티
├── server/                 # Express 백엔드
│   ├── index.cjs           # 메인 서버
│   ├── sheets.cjs          # Google Sheets API
│   ├── yahooFinance.cjs    # 주식 가격 API
│   └── naverRealestate.cjs # 부동산 스크래핑
└── vercel.json             # Vercel 배포 설정
```

## 배포 방법

### 자동 배포
- GitHub에 push하면 Vercel/Railway 자동 배포

### 수동 배포
```bash
# Vercel
vercel --prod

# Railway
railway up
```

## API 엔드포인트

| 엔드포인트 | 설명 |
|------------|------|
| `GET /api/health` | 서버 상태 확인 |
| `GET /api/sheet` | 시트 데이터 조회 |
| `GET /api/holdings` | 보유종목 조회 |
| `GET /api/watchlist` | 관심종목 조회 |
| `GET /api/realestate` | 부동산 데이터 조회 |
| `GET /api/yahoo-finance` | 주식 시세 조회 |
