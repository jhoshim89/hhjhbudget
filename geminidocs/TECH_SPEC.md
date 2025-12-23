# Technical Specification: Hybrid Dashboard Refactoring

## 1. 아키텍처 설계를 (Architecture)
유지보수와 테스트 용이성(TDD)을 위해 거대 컴포넌트인 `Dashboard.jsx`를 기능 단위의 작은 컴포넌트로 분리한다.

### 1.1 컴포넌트 구조
```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.jsx  (Grid 레이아웃, 배경, 폰트 설정)
│   │   ├── Sidebar.jsx          (좌측 네비게이션, Tab State 제어)
│   │   └── Header.jsx           (환율, 날짜, 시스템 상태 표시)
│   ├── dashboard/
│   │   ├── AssetSummary.jsx     (총 자산 카드, 미니 차트)
│   │   ├── KeyMetrics.jsx       (채권, 수입/지출 요약 카드)
│   │   └── StockTable.jsx       (주식 리스트 테이블)
│   ├── input/
│   │   ├── InputConsole.jsx     (통합 입력 컨테이너 - Tabs 포함)
│   │   ├── ExpenseForm.jsx      (지출 입력 폼)
│   │   ├── IncomeForm.jsx       (수입 입력 폼)
│   │   └── AssetForm.jsx        (자산 수정 폼)
│   └── ui/
│       ├── Card.jsx             (공통 패널 스타일)
│       └── Button.jsx           (공통 버튼 스타일)
└── Dashboard.jsx                (메인 컨테이너 - State 관리 및 하위 컴포넌트 주입)
```

## 2. 상태 관리 (State Management)
*   초기 단계에서는 Redux/Zustand 도입보다 **Prop Drilling**을 최소화하는 방향으로 리팩토링.
*   `Dashboard.jsx`가 **Container Component** 역할을 수행하며 모든 데이터를 보유하고, 하위 컴포넌트(Presentational)에 Props로 전달.

## 3. 테스트 전략 (TDD Strategy)
**Vitest**와 **React Testing Library**를 사용하여 단위 테스트를 먼저 작성한다.

### 3.1 테스트 대상 우선순위
1.  **유틸리티 함수**: `formatKRW`, `getTotalValueKRW` 등 계산 로직.
2.  **InputConsole**: 탭 전환 및 입력값 업데이트가 상위 State에 올바르게 반영되는지 테스트.
3.  **StockTable**: 데이터 배열이 올바르게 렌더링되고 수익률 계산이 맞는지 검증.

### 3.2 테스트 시나리오 예시
*   `describe('formatKRW')`: 숫자가 '1.2억', '5,000만' 등으로 변환되는지 확인.
*   `describe('InputConsole')`:
    *   '지출' 탭 클릭 시 지출 폼이 렌더링되어야 한다.
    *   금액 입력 후 '입력 완료' 버튼 클릭 시 `onSubmit` 핸들러가 호출되어야 한다.

## 4. 기술 스택 (Tech Stack)
*   **Framework**: React 18 (Vite)
*   **Styling**: Tailwind CSS (설정 파일에 커스텀 컬러 추가 권장)
*   **Icons**: `lucide-react` (HTML의 script 태그 대신 라이브러리 사용)
*   **Charts**: `recharts` (기존 라이브러리 유지하되 스타일 커스터마이징)

## 5. 마이그레이션 단계
1.  **Setup**: Tailwind 설정 업데이트 (폰트, 컬러).
2.  **Utility TDD**: 계산 함수 분리 및 테스트 작성.
3.  **Component TDD**: `Sidebar`, `Header` 등 UI 컴포넌트 테스트 작성 및 구현.
4.  **Complex Logic TDD**: `InputConsole` 로직 테스트 및 구현.
5.  **Integration**: `Dashboard.jsx`에서 레고 조립하듯 컴포넌트 통합.
