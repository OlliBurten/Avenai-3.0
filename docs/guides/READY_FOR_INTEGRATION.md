# Ready for Integration - Phase 4 Systems
**Date:** October 23, 2025  
**Status:** ✅ All systems implemented and ready

---

## 🎯 Overview

All Phase 4 components are now **production-ready** and waiting for integration into the main chat API. This document provides the integration checklist and rollout plan.

---

## ✅ Completed Systems

### 1. Doc-Worker V2.1 (Python FastAPI) ✅
**Location:** `scripts/doc-worker/main.py`

**Endpoint:** `POST /extract/v2`

**Features Implemented:**
- ✅ Footer extraction (bottom 14% of each page)
- ✅ Email detection (`RE_EMAIL` pattern)
- ✅ JSON/code block detection (brace/colon ratio validation)
- ✅ Endpoint harvesting (`(GET|POST|...) /path` regex)
- ✅ Table detection (pipe-delimited markdown)
- ✅ Enhanced section paths (ALL-CAPS, numbered, colon headers)
- ✅ Smart chunking (never splits JSON/code/table blocks)

**Response Schema:**
```typescript
interface ChunkItemV2 {
  text: string;
  page: number;
  section_path?: string;
  element_type: "header" | "paragraph" | "table" | "code" | "footer" | "list";
  has_verbatim: boolean;
  verbatim_block?: string;  // Extracted JSON/code
  endpoint?: string;         // e.g., "POST /bankidse/auth"
}
```

**Health Check:**
```bash
curl http://localhost:8000/health
# Returns: version 2.1-enhanced with feature flags
```

---

### 2. Hybrid Retrieval System ✅
**Location:** `lib/retrieval/`

**Modules:**
- `hybrid.ts` - Semantic + BM25 fusion
- `bm25.ts` - Keyword ranking algorithm
- `confidence-fallback.ts` - Auto-widen loop
- `domain-schemas.ts` - API pattern recognition

**Key Features:**
```typescript
// Fusion formula
fusedScore = 0.7 * vectorScore + 0.3 * bm25Score

// Confidence-based fallback
if (confidence < 0.4) {
  expandQuery() → widenSearch() → multiDocMerge()
}

// Domain boosting
if (isHeaderQuery) boost *= 1.3;
if (isEndpointQuery) boost *= 1.3;
if (isErrorQuery) boost *= 1.2;
```

**Usage:**
```typescript
import { hybridSearch } from '@/lib/retrieval/hybrid';
import { retrieveWithFallback } from '@/lib/retrieval/confidence-fallback';

const results = await hybridSearch({
  query: "auth headers required",
  datasetId,
  organizationId,
  topK: 10,
  vectorWeight: 0.7,
  bm25Weight: 0.3
});

const { results, confidence, attempts } = await retrieveWithFallback({
  query,
  initialResults: results,
  datasetId,
  organizationId
});
```

---

### 3. Prompt Router V2 ✅
**Location:** `lib/generation/promptRouterV2.ts`

**Strict Mode Templates:**
- ✅ **JSON Mode** - Returns verbatim or "not available"
- ✅ **ENDPOINT Mode** - METHOD + path + auth + examples
- ✅ **WORKFLOW Mode** - 5-9 numbered steps
- ✅ **CONTACT Mode** - Email verbatim + location
- ✅ **TABLE Mode** - Markdown table preserved
- ✅ **ONE_LINE Mode** - Copy-ready auth headers

**Usage:**
```typescript
import { generatePromptV2 } from '@/lib/generation/promptRouterV2';

const prompt = generatePromptV2({
  query: "Which auth headers required?",
  intent: "ONE_LINE",
  contexts: retrievalResults
});

// Returns: Structured prompt with header schema helper
```

**Header Schema Helper Output:**
```markdown
**Required Authentication Headers:**

1. **Authorization**
```http
Authorization: Bearer <access_token>
```
• JWT Bearer token from OAuth endpoint

2. **Zs-Product-Key**
```http
Zs-Product-Key: <key>
```
• ZignSec product subscription key

**OAuth Token Endpoint:**
```http
POST https://gateway.zignsec.com/core/connect/token
```
```

---

### 4. Golden Eval Set V2 ✅
**Location:** `eval/`

**Files:**
- `golden-set-v2.jsonl` - 15 test questions
- `evaluator-v2.ts` - Exact + structured scoring

**Scoring System:**
```typescript
overallScore = 
  0.5 * exactScore +     // Verbatim string matching
  0.3 * keywordScore +   // Case-insensitive presence
  0.2 * structuredScore  // Pattern validation

passed = exactScore === 1.0 || overallScore >= 0.9
```

**Categories Covered:**
- Auth (3 questions)
- Endpoints (4 questions)
- JSON (2 questions)
- Errors (2 questions)
- Workflows (2 questions)
- SDK (2 questions)

**Usage:**
```typescript
import { runEvaluation } from '@/eval/evaluator-v2';

const report = await runEvaluation(
  'eval/golden-set-v2.jsonl',
  async (query) => {
    // Call your chat API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: query, datasetId })
    });
    return response.text();
  }
);

console.log(`Pass rate: ${report.pass_rate * 100}%`);
```

---

## 🚀 Integration Plan

### Phase 1: Deploy Doc-Worker V2.1
**Location:** `scripts/doc-worker/main.py`

1. **Deploy to Fly.io:**
```bash
cd scripts/doc-worker
fly deploy
```

2. **Verify health:**
```bash
curl https://avenai-doc-worker.fly.dev/health
# Expected: version 2.1-enhanced
```

3. **Test extraction:**
```bash
curl -X POST https://avenai-doc-worker.fly.dev/extract/v2 \
  -F "file=@test.pdf"
# Should return: items with endpoint, verbatim_block, element_type
```

---

### Phase 2: Integrate Hybrid Retrieval
**Target:** `app/api/chat/route.ts`

**Current (Vector-only):**
```typescript
const chunks = await prisma.documentChunk.findMany({
  where: { /* ... */ },
  orderBy: { /* cosine similarity */ }
});
```

**New (Hybrid):**
```typescript
import { hybridSearch } from '@/lib/retrieval/hybrid';
import { retrieveWithFallback } from '@/lib/retrieval/confidence-fallback';

// Step 1: Hybrid retrieval
const results = await hybridSearch({
  query: message,
  datasetId,
  organizationId: session.user.organizationId,
  topK: 10
});

// Step 2: Confidence fallback
const { results: finalResults, confidence } = await retrieveWithFallback({
  query: message,
  initialResults: results,
  datasetId,
  organizationId: session.user.organizationId
});

// Step 3: Domain boosting
import { boostDomainRelevance } from '@/lib/retrieval/domain-schemas';
const boostedResults = boostDomainRelevance(finalResults, message);
```

---

### Phase 3: Deploy Prompt Router V2
**Target:** `app/api/chat/route.ts`

**Current:**
```typescript
const prompt = generatePrompt(context);
```

**New:**
```typescript
import { generatePromptV2, generateNotFoundResponse } from '@/lib/generation/promptRouterV2';

const prompt = generatePromptV2({
  query: message,
  intent: detectedIntent,
  contexts: boostedResults,
  conversationHistory
});

// Graceful fallback
if (boostedResults.length === 0) {
  return generateNotFoundResponse(message, detectedIntent, nearestResults);
}
```

---

### Phase 4: Run Golden Eval
**Location:** `eval/evaluator-v2.ts`

```bash
# Create test script
cat > scripts/run-eval.ts << 'EOF'
import { runEvaluation, saveReport } from '../eval/evaluator-v2';

async function main() {
  const report = await runEvaluation(
    'eval/golden-set-v2.jsonl',
    async (query) => {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'session=...' },
        body: JSON.stringify({ message: query, datasetId: 'eu-test-dataset' })
      });
      return res.text();
    }
  );
  
  saveReport(report, `eval/reports/eval-${Date.now()}.json`);
  
  if (report.pass_rate >= 0.95) {
    console.log('✅ PASS - Meets 95% target!');
    process.exit(0);
  } else {
    console.log('❌ FAIL - Below 95% target');
    process.exit(1);
  }
}

main();
EOF

# Run eval
npx tsx scripts/run-eval.ts
```

---

## 📊 Success Metrics

### Quality Gates (Must Pass)
- ✅ ≥95% overall pass rate
- ✅ 100% on JSON/table/email questions
- ✅ No "refer to docs" when answer exists
- ✅ Endpoints include METHOD + path
- ✅ Confidence not "Low" for straightforward questions

### Performance Gates
- ✅ Latency p95 ≤ 1.8s
- ✅ Retrieval p95 ≤ 120ms
- ✅ Fallback rate ≤ 15%

---

## 🔧 Feature Flags

### Environment Variables
```bash
# .env.local
DOC_WORKER_V2=true           # Enable V2 endpoint
HYBRID_RETRIEVAL=true        # Enable hybrid search
CONFIDENCE_FALLBACK=true     # Enable auto-widen loop
PROMPT_ROUTER_V2=true        # Enable strict mode templates
DOMAIN_BOOSTING=true         # Enable pattern recognition
```

### Gradual Rollout
```typescript
// app/api/chat/route.ts
const useV2 = process.env.HYBRID_RETRIEVAL === 'true';

if (useV2) {
  // New hybrid retrieval
  const results = await hybridSearch(...);
} else {
  // Old vector-only retrieval
  const chunks = await prisma.documentChunk.findMany(...);
}
```

---

## 📝 Rollback Plan

### If ≥95% not achieved:
1. **Identify failing category** (auth, endpoints, json, etc.)
2. **Check component logs:**
   - Doc-Worker: Verbatim coverage
   - Retrieval: Confidence scores
   - Prompt Router: Intent detection
3. **Toggle feature flags** to isolate issue
4. **Rollback to stable** if needed

### One-Click Rollback
```bash
# Disable all V2 features
export DOC_WORKER_V2=false
export HYBRID_RETRIEVAL=false
export CONFIDENCE_FALLBACK=false
export PROMPT_ROUTER_V2=false

# Restart server
npm run dev
```

---

## 🎯 Next Actions

### Immediate (Ready Now)
1. ✅ Doc-Worker V2.1 - Deploy to Fly.io
2. ✅ Hybrid Retrieval - Integrate into chat API
3. ✅ Prompt Router V2 - Replace old prompt generator
4. ✅ Run golden eval - Validate ≥95%

### Follow-Up (After Integration)
1. 🔄 Monitor SLOs (latency, fallback rate)
2. 🔄 Re-ingest pilot docs with V2
3. 🔄 Fine-tune fusion weights (vector vs BM25)
4. 🔄 Expand golden set to 30+ questions

---

## 📚 Documentation

- ✅ `docs/guides/CHATGPT_LEVEL_RETRIEVAL.md` - Architecture
- ✅ `docs/guides/PHASE4_IMPLEMENTATION.md` - Implementation details
- ✅ `docs/guides/READY_FOR_INTEGRATION.md` - This document
- ✅ `docs/REPOSITORY_CLEANUP.md` - Cleanup summary

---

**Status:** 🟢 All systems green - Ready for integration  
**Confidence:** High - All components tested individually  
**Risk:** Low - Feature flags enable gradual rollout  

**Let's achieve ChatGPT-level performance!** 🚀

---

**Maintained by:** Avenai Development Team  
**Last Updated:** October 23, 2025

