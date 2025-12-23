# Implementation Task List

이 문서는 에이전트가 순차적으로 실행할 작업 목록입니다.

## Phase 1: 환경 설정 및 유틸리티 분리
- [x] **Task 1.1**: `lucide-react` 패키지 설치 및 `tailwind.config.js`에 커스텀 컬러/폰트 설정 추가.
- [x] **Task 1.2**: `src/utils/formatters.js` 파일 생성. (`formatKRW`, `formatFull` 함수 이동)
- [x] **Task 1.3**: `src/utils/formatters.test.js` 작성 및 테스트 통과 확인. (TDD)

## Phase 2: UI 컴포넌트 구현 (TDD)
- [x] **Task 2.1**: `src/components/layout/DashboardLayout.jsx` 구현. (기본 Grid 구조 잡기)
- [x] **Task 2.2**: `src/components/layout/Header.test.jsx` 작성 -> `Header.jsx` 구현.
- [x] **Task 2.3**: `src/components/layout/Sidebar.test.jsx` 작성 -> `Sidebar.jsx` 구현.

## Phase 3: 핵심 기능 컴포넌트 구현 (TDD)
- [x] **Task 3.1**: `src/components/dashboard/AssetSummary.test.jsx` 작성 -> `AssetSummary.jsx` 구현.
- [x] **Task 3.2**: `src/components/dashboard/StockTable.test.jsx` 작성 -> `StockTable.jsx` 구현.
- [x] **Task 3.3**: `src/components/input/InputConsole.test.jsx` 작성 (탭 전환 로직) -> `InputConsole.jsx` 뼈대 구현.
- [x] **Task 3.4**: `InputConsole` 내부의 서브 폼(`ExpenseForm`, `IncomeForm`) 구현.

## Phase 4: 통합 (Integration)
- [x] **Task 4.1**: 기존 `src/Dashboard.jsx`를 `src/Dashboard_legacy.jsx`로 백업.
- [x] **Task 4.2**: 새로운 `src/Dashboard.jsx` 생성. 기존 State 로직 복사.
- [x] **Task 4.3**: 하위 컴포넌트들을 import하고 Props 연결.
- [x] **Task 4.4**: 전체 앱 실행 및 E2E 수동 검증.

## Phase 5: Cleanup
- [x] **Task 5.1**: 사용하지 않는 레거시 코드 및 임시 파일 삭제.
