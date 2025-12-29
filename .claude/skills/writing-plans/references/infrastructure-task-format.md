# Infrastructure/Migration Task Format (Type B)

Use this format for: Database migrations, external service integrations, infrastructure changes.

**Note:** This format uses Phase-based steps, NOT TDD pattern.

## Phase-Based Format

```markdown
## Phase 1: 환경 설정 (30분)

### 1.1 외부 서비스 계정 생성

**Manual Steps:**
1. https://cloud.qdrant.io 접속
2. 무료 계정 생성 (GitHub 로그인)
3. Free Tier 클러스터 생성 (Region: AWS Tokyo)

**Expected Output:**
- Cluster URL: `https://xxx.cloud.qdrant.io:6333`
- API Key: `your-api-key`

### 1.2 환경 변수 설정

**Subagent:** `devops-agent`
**Type:** devops-architect
**Model:** haiku

```bash
# Supabase Secrets에 추가
npx supabase secrets set QDRANT_URL="https://xxx.cloud.qdrant.io:6333"
npx supabase secrets set QDRANT_API_KEY="your-api-key"
```

**Verification:**
```bash
npx supabase secrets list
# Expected: QDRANT_URL, QDRANT_API_KEY 표시
```

---

## Phase 2: 데이터 마이그레이션 (1시간)

### 2.1 마이그레이션 스크립트 작성

**Subagent:** `migration-agent`
**Type:** backend-architect
**Model:** sonnet
**Tools:** Read, Write, Bash, Glob

**Files:**
- Create: `scripts/migrate-to-qdrant.ts`

**Implementation:**
```typescript
// scripts/migrate-to-qdrant.ts
import { createClient } from '@supabase/supabase-js'
import { QdrantClient } from '@qdrant/js-client-rest'

async function migrate() {
  // ... migration logic ...
}

migrate().catch(console.error);
```

### 2.2 마이그레이션 실행

```bash
deno run --allow-net --allow-env scripts/migrate-to-qdrant.ts
```

**Expected Output:**
```
[1/2] paper_embeddings: 4,860 points uploaded
[2/2] textbook_chunks: 9,468 points uploaded
Migration complete!
```

**Rollback Plan:**
마이그레이션 실패 시 Supabase 원본 데이터 유지 (삭제하지 않음)
```

## Pre-execution Checklist

Every infrastructure plan MUST include:

```markdown
## Pre-execution Checklist

### Required MCP Servers
| MCP Server | Required By | Purpose |
|------------|-------------|---------|
| `mcp__supabase__*` | Phase 2 | Database operations |

### Environment Variables
```bash
VOYAGE_API_KEY=...
MONGODB_URI=...
```

### Dependencies
```bash
npm install @qdrant/js-client-rest
```
```
