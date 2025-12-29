# Budget Dashboard PWA 변환 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use execute-plan skill

**Goal:** React 앱을 PWA로 변환하여 모바일에서 앱처럼 설치/사용 가능하게 만들기
**Architecture:** vite-plugin-pwa로 서비스 워커 자동 생성, manifest.json 설정, 아이콘 생성 후 Vercel 배포
**Tech Stack:** vite-plugin-pwa, Workbox, Vercel

---

## 바이브 코더를 위한 요약

### 1. 이 플랜이 하는 일

**한 줄 요약**: 웹사이트를 앱처럼 설치할 수 있게 만들기 (PWA)

**상세 설명**:
현재 Budget Dashboard는 브라우저에서만 접속 가능합니다. PWA(Progressive Web App)로 변환하면 아이폰/안드로이드 홈 화면에 앱 아이콘을 추가하고, 풀스크린으로 앱처럼 사용할 수 있습니다. 앱스토어 없이 URL만 공유하면 누구나 설치 가능합니다.

---

### 2. 사용자 확인 완료 항목

| 확인 항목 | 사용자 답변 | 비고 |
|----------|------------|------|
| 앱 아이콘 | 간단한 텍스트 아이콘 생성 | SVG → PNG 변환 |
| 배포 플랫폼 | Vercel | 이미 api/ 폴더에 서버리스 함수 준비됨 |
| 네이버 부동산 | mobile API 사용 | axios 기반, Puppeteer 없음 → Vercel 가능 |
| 테스트 방법 | 로컬 테스트 먼저 | npm run build && npm run preview |

---

### 3. 작업 흐름도

```
[현재 상태: React 웹앱]
    ↓
[Phase 1: PWA 패키지 설치] ─── vite-plugin-pwa 추가
    ↓
[Phase 2: 아이콘 생성] ─── public/ 폴더에 PNG 아이콘
    ↓
[Phase 3: vite.config.js 수정] ─── PWA 플러그인 설정
    ↓
[Phase 4: index.html 수정] ─── PWA 메타 태그 추가
    ↓
[Phase 5: 업데이트 알림 컴포넌트] ─── ReloadPrompt.jsx
    ↓
[Phase 6: 로컬 테스트] ─── Lighthouse PWA 감사
    ↓
[Phase 7: Vercel 배포] ─── vercel.json 생성 후 배포
    ↓
[최종 결과: 앱처럼 설치 가능한 PWA]
```

---

### 4. 파일별 역할

| 파일 | 한 줄 설명 | 무슨 작업? | 잘못되면? |
|------|-----------|-----------|----------|
| `vite.config.js` | Vite 빌드 설정 | VitePWA 플러그인 추가 | 빌드 실패 |
| `index.html` | HTML 진입점 | PWA 메타 태그 추가 | iOS에서 앱 아이콘 안 보임 |
| `public/favicon.svg` | 앱 아이콘 원본 | 새로 생성 (SVG) | 아이콘 없음 |
| `public/pwa-192x192.png` | 안드로이드 아이콘 | 새로 생성 | 설치 불가 |
| `public/pwa-512x512.png` | 스플래시 스크린용 | 새로 생성 | 스플래시 없음 |
| `public/apple-touch-icon.png` | iOS 아이콘 | 새로 생성 | iOS에서 기본 아이콘 |
| `src/components/common/ReloadPrompt.jsx` | 업데이트 알림 | 새로 생성 | 자동 업데이트만 됨 |
| `vercel.json` | Vercel 배포 설정 | 새로 생성 | 캐싱 문제 |

---

### 5. 단계별 상세 설명

---

## Phase 1: PWA 패키지 설치

**Subagent:** `pwa-setup-agent`
**Type:** devops-architect
**Model:** haiku

**뭘 하는 단계인가?**
PWA 기능을 추가하기 위한 npm 패키지를 설치합니다.

### 1.1 vite-plugin-pwa 설치

```bash
npm install vite-plugin-pwa -D
```

**Verification:**
```bash
npm list vite-plugin-pwa
# Expected: vite-plugin-pwa@x.x.x
```

---

## Phase 2: 아이콘 생성

**Subagent:** `icon-creation-agent`
**Type:** frontend-architect
**Model:** haiku

**뭘 하는 단계인가?**
앱 아이콘을 SVG로 디자인하고 PNG로 변환합니다. 다크 테마(#09090B)에 보라색(#A78BFA) "B" 글자.

### 2.1 public 폴더 생성

```bash
mkdir public
```

### 2.2 favicon.svg 생성

**File:** `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#09090B"/>
  <text x="256" y="340" font-family="Arial Black, sans-serif" font-size="280" font-weight="900" fill="#A78BFA" text-anchor="middle">B</text>
</svg>
```

### 2.3 PNG 아이콘 생성

**Manual Step:** SVG를 PNG로 변환 (온라인 도구 사용)
- https://svgtopng.com/ 또는 https://cloudconvert.com/svg-to-png

**생성할 파일:**
| 파일명 | 크기 | 용도 |
|--------|------|------|
| `pwa-192x192.png` | 192x192 | Android 아이콘 |
| `pwa-512x512.png` | 512x512 | 스플래시, maskable |
| `apple-touch-icon.png` | 180x180 | iOS 아이콘 |

### 2.4 robots.txt 생성

**File:** `public/robots.txt`

```
User-agent: *
Allow: /
```

**Verification:**
```bash
ls public/
# Expected: favicon.svg, pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, robots.txt
```

---

## Phase 3: vite.config.js 수정

**Subagent:** `vite-config-agent`
**Type:** frontend-architect
**Model:** sonnet

**뭘 하는 단계인가?**
Vite 설정에 PWA 플러그인을 추가합니다. manifest.json과 서비스 워커가 자동 생성됩니다.

### 3.1 vite.config.js 전체 교체

**File:** `vite.config.js`

```javascript
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Budget Dashboard',
        short_name: 'Budget',
        description: '가계부 대시보드 - 수입, 지출, 투자 관리',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true
  }
})
```

**Verification:**
```bash
npm run build
# Expected: dist/ 폴더에 sw.js, manifest.webmanifest 생성
```

---

## Phase 4: index.html 수정

**Subagent:** `html-update-agent`
**Type:** frontend-architect
**Model:** haiku

**뭘 하는 단계인가?**
HTML에 PWA 관련 메타 태그를 추가합니다. iOS Safari에서 앱처럼 보이게 합니다.

### 4.1 index.html 전체 교체

**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="ko" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

    <!-- PWA 메타 태그 -->
    <meta name="theme-color" content="#09090B" />
    <meta name="description" content="가계부 대시보드 - 수입, 지출, 투자 관리" />

    <!-- Apple PWA 지원 -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Budget" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- 파비콘 -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <!-- 폰트 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">

    <title>Budget Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## Phase 5: 업데이트 알림 컴포넌트

**Subagent:** `reload-prompt-agent`
**Type:** frontend-architect
**Model:** sonnet

**뭘 하는 단계인가?**
앱 업데이트가 있을 때 사용자에게 알림을 표시합니다.

### 5.1 ReloadPrompt.jsx 생성

**File:** `src/components/common/ReloadPrompt.jsx`

```jsx
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl">
        <p className="text-sm text-zinc-200 mb-3">
          {offlineReady
            ? '오프라인에서도 사용할 수 있습니다.'
            : '새 버전이 있습니다. 업데이트하시겠습니까?'}
        </p>
        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-md transition-colors"
            >
              업데이트
            </button>
          )}
          <button
            onClick={close}
            className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-md transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReloadPrompt
```

### 5.2 Dashboard.jsx에 ReloadPrompt 추가

**File:** `src/Dashboard.jsx`

**수정 내용:**
1. import 추가: `import ReloadPrompt from './components/common/ReloadPrompt'`
2. return 문 마지막에 `<ReloadPrompt />` 추가

---

## Phase 6: 로컬 테스트

**Subagent:** `test-agent`
**Type:** quality-engineer
**Model:** haiku

**뭘 하는 단계인가?**
빌드하고 로컬에서 PWA가 정상 동작하는지 확인합니다.

### 6.1 빌드 및 프리뷰

```bash
npm run build
npm run preview
```

### 6.2 PWA 확인 방법

1. Chrome에서 http://localhost:4173 접속
2. DevTools (F12) > Application > Manifest
   - Name, Icons, Start URL 확인
3. DevTools > Application > Service Workers
   - 서비스 워커 등록 확인
4. 주소창 오른쪽에 "설치" 버튼 확인

### 6.3 Lighthouse PWA 감사

1. DevTools > Lighthouse
2. "Progressive Web App" 체크
3. "Analyze page load" 클릭
4. PWA 점수 확인 (100점 목표)

**Expected Result:**
- Manifest 정상 로드
- Service Worker 등록됨
- "설치" 버튼 표시됨

---

## Phase 7: Vercel 배포

**Subagent:** `deploy-agent`
**Type:** devops-architect
**Model:** sonnet

**뭘 하는 단계인가?**
Vercel에 배포하고 환경 변수를 설정합니다.

### 7.1 vercel.json 생성

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 7.2 Vercel CLI 배포

```bash
# Vercel CLI 설치 (없으면)
npm install -g vercel

# 배포
vercel --prod
```

### 7.3 환경 변수 설정

**Vercel Dashboard에서 설정:**
```
GOOGLE_SHEETS_ID=xxx
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx
GOOGLE_PRIVATE_KEY=xxx
```

**Verification:**
- 배포된 URL 접속
- Chrome에서 "설치" 버튼 확인
- 모바일에서 "홈 화면에 추가" 테스트

---

## 6. 예상 결과

| 항목 | Before | After |
|------|--------|-------|
| 홈 화면 설치 | 불가능 | 가능 (앱 아이콘) |
| 주소창 | 보임 | 숨김 (standalone) |
| 오프라인 | 에러 | 캐시된 페이지 표시 |
| 앱 업데이트 | 수동 새로고침 | 자동 알림 |

---

## 7. 주의사항 및 리스크

**잘못될 수 있는 상황:**
| 상황 | 증상 | 해결 방법 |
|------|------|----------|
| 아이콘 크기 오류 | Lighthouse 경고 | 정확한 크기로 재생성 |
| Service Worker 캐시 문제 | 구버전 계속 표시 | 브라우저 캐시 삭제 |
| iOS Safari 미지원 기능 | 일부 기능 안됨 | apple-mobile-web-app 메타 태그 확인 |

**롤백 방법:**
```bash
# vite.config.js에서 VitePWA 플러그인 제거
# index.html에서 PWA 메타 태그 제거
npm run build
vercel --prod
```

---

## 8. 플랜 수정 요청 예시

- "아이콘 색상 바꿔줘 (파란색으로)"
- "Phase 6 로컬 테스트 건너뛰고 바로 배포해줘"
- "오프라인 캐싱 비활성화해줘"

---

## Pre-execution Checklist

### Dependencies
```bash
npm install vite-plugin-pwa -D
```

### Required Files to Create
- `public/favicon.svg`
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/apple-touch-icon.png`
- `public/robots.txt`
- `src/components/common/ReloadPrompt.jsx`
- `vercel.json`

### Files to Modify
- `vite.config.js`
- `index.html`
- `src/Dashboard.jsx`
