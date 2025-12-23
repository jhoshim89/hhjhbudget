# PRD: Budget Dashboard UI Renewal (Hybrid Design)

## 1. 개요 (Overview)
기존 `Budget Dashboard`의 데이터 로직과 기능을 유지한 채, UI를 **'Final Hybrid (Design #14)'** 테마로 전면 개편한다. 터미널 스타일의 고대비(High Contrast) 디자인과 직관적인 대시보드 레이아웃을 결합하여 가독성과 심미성을 동시에 확보한다.

## 2. 목표 (Goals)
*   **Design Match**: `14-final-hybrid.html`의 룩앤필(Look & Feel)을 100% 리액트 컴포넌트로 구현한다.
*   **Logic Preservation**: 기존 `Dashboard.jsx`의 모든 계산 로직(환율, 주식 평가액, 고정/변동 지출, 수입 등)을 누락 없이 이식한다.
*   **UX Improvement**: 단순 나열식 입력 폼을 **탭(Tab) 기반의 'Input Console'**로 고도화하여 사용성을 개선한다.

## 3. 핵심 기능 요구사항 (Functional Requirements)

### 3.1 레이아웃 & 네비게이션
*   **Header**: 실시간 환율(USD/KRW), 주요 지수(SPY 등) 표시.
*   **Wide Sidebar**: 메뉴 탭 전환 기능 (Overview, Status, Investment, Input 등).
    *   기존 상단 탭 버튼을 좌측 사이드바 메뉴로 변경.

### 3.2 대시보드 메인 (Overview)
*   **Asset Summary**: 총 순자산(KRW) 표시 및 전월 대비 증감율 표시.
*   **Key Metrics**:
    *   안전 자산(채권) 잔액 및 수익률.
    *   이번 달 수입 vs 지출 현황 및 예산 소진율 그래프.

### 3.3 포트폴리오 관리 (Table)
*   **Stock Table**: 보유 주식(`stockList`)을 터미널 테이블 스타일로 출력.
    *   컬럼: 종목명, 수량, 평단가, 현재가, 평가금액, 수익률.
    *   수익률에 따른 색상 구분 (상승: Emerald, 하락: Red).

### 3.4 데이터 입력 콘솔 (Input Console)
*   기존의 산재된 입력 폼들을 우측 하단 패널에 통합.
*   **Tab UI**:
    1.  **지출**: 카드값, 변동지출, 고정지출 관리.
    2.  **수입**: 고정수입, 변동수입 관리.
    3.  **자산**: 현금 잔고, 수기 주식 자산, 채권, 저축/투자 행위 기록.
*   **Log View**: 입력 행위에 대한 시스템 로그 스타일 피드백 표시.

## 4. 데이터 요구사항 (Data Requirements)
*   기존 `Dashboard.jsx`의 `useState`를 그대로 활용하거나 Context로 마이그레이션.
*   **필수 State**:
    *   `stockList` (주식 배열)
    *   `fixedExpenses`, `variableItems`, `expenseInputs` (지출)
    *   `fixedIncomes`, `variableIncomes` (수입)
    *   `assets`, `bondBalance` (자산)
    *   `exchangeRate` (환율)

## 5. 디자인 요구사항 (Design Requirements)
*   **Font**: `Inter` (숫자/영문), `Noto Sans KR` (한글).
*   **Color Palette**:
    *   Bg: `#0F1115` (Main), `#161920` (Panel)
    *   Text: `#E2E8F0` (Main), `#94A3B8` (Label)
    *   Accent: `#3B82F6` (Blue), `#10B981` (Emerald), `#EF4444` (Red)
*   **Interaction**: Hover 시 배경색 변경, 버튼 클릭 시 Ripple 효과 또는 색상 반전.
