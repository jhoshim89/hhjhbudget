# Subagent Strategy

Configuration guide for using subagents in implementation plans.

## Pre-define Required Subagents

Before listing tasks, define all subagents needed:

```markdown
## Required Subagents

| Agent Name | Type | Model | Tools | Purpose |
|------------|------|-------|-------|---------|
| `chunking-agent` | backend-architect | sonnet | Read, Write, Bash, Glob | PDF parsing and chunking |
| `api-agent` | backend-architect | sonnet | Read, Write, Edit, Bash | Edge Function implementation |
| `db-agent` | supabase-operations | sonnet | mcp__supabase__* | Database operations |
| `test-agent` | quality-engineer | haiku | Read, Write, Bash | Unit test writing |
| `docs-agent` | technical-writer | haiku | Read, Write, Edit | Documentation updates |
```

## Model Selection Criteria

| Complexity | Model | When to Use |
|------------|-------|-------------|
| **Simple** | `haiku` | Tests, docs, simple CRUD, file operations |
| **Medium** | `sonnet` | Business logic, API endpoints, integrations |
| **Complex** | `opus` | Architecture decisions, complex algorithms, debugging |

## Task with Subagent Format

Each task MUST specify subagent, model, and tools:

```markdown
## Task 3: Implement Chunking Logic

**Subagent:** `chunking-agent`
**Type:** backend-architect
**Model:** sonnet
**Tools:** Read, Write, Bash, Glob, Grep

**Files:**
- Create: `rag/ingest/chunker.ts`
- Create: `rag/tests/test_chunker.ts`

**Step 1: Write failing test**
...
```

## Tools Configuration

- **Omit `tools`**: Inherit all tools from main thread (including MCP)
- **Specify `tools`**: Comma-separated list for granular control

```markdown
**Tools:** Read, Write, Bash, Glob, mcp__supabase__execute_sql
```

### MCP Tools Constraint (Important!)

> **Main thread에 MCP가 설정되어 있어야 subagent도 사용 가능!**
>
> - Main에서 MCP off → Subagent에서도 MCP 사용 불가
> - Subagent에서만 MCP on하는 기능은 현재 미지원

## Parallel Execution

For independent tasks, specify parallel execution:

```markdown
## Tasks 4-6: Parallel Execution

**Execute in parallel:**

| Task | Subagent | Model | Tools | Description |
|------|----------|-------|-------|-------------|
| Task 4 | test-agent | haiku | Read, Write, Bash | Write unit tests |
| Task 5 | docs-agent | haiku | Read, Write, Edit | Update README |
| Task 6 | api-agent | sonnet | Read, Write, Edit, Bash | Implement endpoint |
```

## Subagent File Limit (Critical!)

> **에이전트당 파일 수 제한: 최대 5-7개**

**파일 수 가이드라인:**
| 작업 유형 | 권장 파일 수 | 이유 |
|----------|-------------|------|
| 단순 치환 (색상, 텍스트) | 5-7개 | 빠른 작업 |
| 로직 수정 | 3-5개 | 분석 시간 필요 |
| 새 기능 구현 | 2-3개 | 복잡한 코드 생성 |

**Bad Example (18개 파일):**
```markdown
## Task 10: Page Migration
**Files:** HomePage.tsx, ArchivePage.tsx, ... (18개) ← 실패 위험
```

**Good Example (분할):**
```markdown
## Task 10a: Main Page Migration
**Files:** HomePage.tsx, ArchivePage.tsx, SearchPage.tsx (5개)

## Task 10b: Institution Page Migration
**Files:** InstitutionsPage.tsx, InstitutionDetailPage.tsx (4개)
```
