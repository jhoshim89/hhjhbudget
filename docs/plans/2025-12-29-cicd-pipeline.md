# CI/CD Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use execute-plan skill

**Goal:** GitHub Actions를 사용한 자동화된 테스트 및 빌드 파이프라인 구축
**Architecture:** PR 생성 및 main 브랜치 푸시 시 자동으로 테스트/빌드 실행
**Tech Stack:** GitHub Actions, Vitest, Vite

---

## 바이브 코더를 위한 요약

> **이 섹션의 목적**: 코드를 직접 작성하지 않는 분이 플랜을 검토하고 "이건 이렇게 바꿔줘"라고 지시할 수 있도록 합니다.

---

### 1. 이 플랜이 하는 일

**한 줄 요약**: "코드 변경 시 자동으로 테스트하고 빌드해서 문제를 미리 발견함"

**상세 설명**:
현재는 코드 푸시 후 수동으로 테스트/빌드를 해야 합니다. 이 플랜은 GitHub Actions를 설정해서 PR 생성이나 main 푸시 시 자동으로 테스트와 빌드가 실행되도록 합니다. 문제가 있으면 GitHub에서 바로 알려줍니다.

---

### 2. 사용자 확인 완료 항목

| 확인 항목 | 사용자 답변 | 비고 |
|----------|------------|------|
| CI/CD 플랫폼 | GitHub Actions | 무료 tier 사용 |
| 파이프라인 단계 | Test + Build | 배포는 수동 |
| 트리거 브랜치 | Best Practice | main + PR |

---

### 3. 작업 흐름도

**전체 파이프라인**:
```
[코드 푸시 / PR 생성]
    ↓
[GitHub Actions 트리거] ─── .github/workflows/ci.yml
    ↓
[Step 1: Checkout] ─── 코드 가져오기
    ↓
[Step 2: Setup Node.js] ─── Node 20 설치
    ↓
[Step 3: Install Dependencies] ─── npm ci
    ↓
[Step 4: Run Tests] ─── npm test
    ↓
[Step 5: Build] ─── npm run build
    ↓
[결과: Pass/Fail 표시]
```

---

### 4. 파일별 역할

| 파일 | 한 줄 설명 | 무슨 작업? | 잘못되면? |
|------|-----------|-----------|----------|
| `.github/workflows/ci.yml` | CI 파이프라인 정의 | 새로 생성 | CI 실행 안됨 |

---

### 5. 단계별 상세 설명

## Phase 1: GitHub Actions 워크플로우 생성

### 1.1 워크플로우 파일 생성

**Subagent:** `cicd-setup-agent`
**Type:** devops-architect
**Model:** haiku

**Files:**
- Create: `.github/workflows/ci.yml`

**Implementation:**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --run

      - name: Build
        run: npm run build
```

**Verification:**
```bash
# 로컬에서 동일한 명령어 테스트
npm ci && npm test -- --run && npm run build
```

---

## Phase 2: 테스트 실행 확인

### 2.1 기존 테스트 확인

**Subagent:** `test-check-agent`
**Type:** quality-engineer
**Model:** haiku

```bash
# 테스트 실행 확인
npm test -- --run
```

**Expected Output:**
```
✓ All tests passed
```

**만약 테스트 없으면:**
- 빈 테스트 파일 생성하여 CI가 실패하지 않도록 함

---

## Phase 3: 커밋 및 푸시

### 3.1 변경사항 커밋

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for test and build"
git push origin main
```

### 3.2 GitHub에서 확인

1. GitHub 레포지토리 > Actions 탭 이동
2. 워크플로우 실행 확인
3. 모든 step이 녹색 체크인지 확인

---

### 6. 예상 결과

| 항목 | Before | After |
|------|--------|-------|
| 테스트 자동화 | 수동 | 자동 (PR/푸시 시) |
| 빌드 검증 | 수동 | 자동 |
| 문제 발견 시점 | 배포 후 | PR 단계에서 |

---

### 7. 주의사항 및 리스크

**잘못될 수 있는 상황**:
| 상황 | 증상 | 해결 방법 |
|------|------|----------|
| 테스트 없음 | `npm test` 실패 | `--passWithNoTests` 옵션 추가 또는 빈 테스트 생성 |
| Node 버전 불일치 | 빌드 실패 | package.json의 engines 필드와 일치시킴 |
| npm ci 실패 | lock 파일 오류 | `npm install` 후 lock 파일 커밋 |

**롤백 방법**:
```bash
git revert HEAD  # 워크플로우 커밋 되돌리기
```

---

### 8. 플랜 수정 요청 예시

- "배포 단계도 추가해줘"
- "Node 18 버전으로 바꿔줘"
- "테스트 실패해도 빌드는 하게 해줘"
- "캐싱 최적화 해줘"

---

## Pre-execution Checklist

### Required MCP Servers
없음 (GitHub Actions는 GitHub 자체 기능)

### Environment Variables
없음 (GitHub에서 자동 제공)

### Dependencies
없음 (기존 package.json 사용)

---

## Execution

플랜 실행 준비가 되면:
```
/executing-plans docs/plans/2025-12-29-cicd-pipeline.md
```
