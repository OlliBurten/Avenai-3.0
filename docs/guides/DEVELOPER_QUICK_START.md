# Developer Quick Start - Phase 4 Integration
**Date:** October 23, 2025  
**For:** Developers integrating ChatGPT-level intelligence

---

## 🚀 Quick Integration (Copy-Paste Ready)

### **Step 1: Deploy FTS (1 command)**

```bash
./scripts/add-fts-column.sh
```

Expected output: `✅ FTS column added successfully!`

---

### **Step 2: Update Chat API (Replace retrieval)**

**File:** `app/api/chat/route.ts`

**FIND:**
```typescript
// Old vector-only retrieval
const chunks = await prisma.documentChunk.findMany({
  where: { /* ... */ },
  orderBy: { /* cosine */ }
});
```

**REPLACE WITH:**
```typescript
import { hybridSearch } from '@/lib/retrieval/hybrid';
import { mmrDiverseResults } from '@/lib/retrieval/mmr';
import { applyPolicy, detectIntent } from '@/lib/retrieval/policy';
import { boostDomainRelevance } from '@/lib/retrieval/domain-schemas';
import { analyzeConfidence, retrieveWithFallback } from '@/lib/retrieval/confidence-fallback';
import { createPrompt, postProcess } from '@/lib/generation/promptRouter';

// Step 1: Hybrid retrieval
const hybridResults = await hybridSearch({
  query: message,
  datasetId,
  organizationId: session.user.organizationId,
  topK: 40, // Get more for MMR
  vectorWeight: 0.7,
  textWeight: 0.3
});

// Step 2: Detect intent
const intent = detectIntent(message);

// Step 3: Apply policy (soft filtering)
const candidates = hybridResults.map(r => ({
  id: r.id,
  content: r.content,
  section_path: r.sectionPath,
  page: r.page || null,
  document_id: r.documentId,
  chunk_index: r.chunkIndex,
  metadata: r.metadata,
  cosine: r.vectorScore,
  textScore: r.textScore,
  finalScore: r.fusedScore
}));

const policiedCandidates = applyPolicy(intent, candidates);

// Step 4: Domain boosting
const boosted = policiedCandidates.map(c => ({
  ...hybridResults.find(r => r.id === c.id)!,
  fusedScore: c.finalScore
}));

const domainBoosted = boostDomainRelevance(boosted, message);

// Step 5: MMR diversity
const diverse = mmrDiverseResults(domainBoosted, {
  maxReturn: 12,
  maxPerPage: 2,
  minSections: 3
});

// Step 6: Confidence check + fallback
const confidence = analyzeConfidence(message, diverse as any);

let finalResults = diverse;
if (confidence.shouldFallback) {
  const fallback = await retrieveWithFallback({
    query: message,
    datasetId,
    organizationId: session.user.organizationId,
    initialResults: diverse as any,
    topK: 12
  });
  finalResults = fallback.results as any;
}

// Step 7: Build contexts
const contexts = finalResults.map(r => ({
  content: r.content,
  title: r.documentTitle,
  page: r.page
}));

// Step 8: Generate prompt
const { system, user } = createPrompt(intent, message, contexts);

// Step 9: Call LLM
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ],
  temperature: 0.1,
  stream: true
});

// Step 10: Post-process output
let rawResponse = '';
for await (const chunk of completion) {
  rawResponse += chunk.choices[0]?.delta?.content || '';
}

const finalAnswer = postProcess(intent, rawResponse);
```

---

### **Step 3: Test It**

```bash
# Start server
npm run dev

# Test auth headers
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which authentication headers are required?",
    "datasetId": "eu-test-dataset"
  }'
```

**Expected:**
```markdown
**Required Authentication Headers:**

1. **Authorization**
```http
Authorization: Bearer <access_token>
```
...
```

---

### **Step 4: Run Golden Eval**

```bash
npx tsx scripts/run-golden-eval.ts
```

**Expected:** `✅ PASS - Meets 95% target!`

---

## 🎯 Intent Detection Cheat Sheet

| Query Pattern | Intent | Output Format |
|---------------|--------|---------------|
| "show JSON", "sample body" | JSON | Verbatim code block |
| "endpoint for auth", "POST /path" | ENDPOINT | METHOD /path — purpose |
| "how to setup", "integration steps" | WORKFLOW | 5-9 numbered steps |
| "contact support", "email" | CONTACT | `email@domain.com` (footer) |
| "list errors", "error codes" | ERROR_CODE | CODE — meaning — fix |
| "which headers", "what params" | ONE_LINE | Spec in code blocks |
| "comparison", "table of" | TABLE | Markdown table |

---

## 🔧 Feature Flags

```bash
# .env.local
HYBRID_RETRIEVAL=true        # Enable FTS fusion
CONFIDENCE_FALLBACK=true     # Enable auto-widen
PROMPT_ROUTER_V2=true        # Enable strict templates
DOMAIN_BOOSTING=true         # Enable pattern boosting
MMR_DIVERSITY=true           # Enable diversity constraints
```

---

## 📊 Monitoring

### Console Logs to Watch

```
🔍 [Hybrid Search] Query: "..."
⚖️ [Hybrid Search] Weights: Vector=0.7, Text=0.3
🎯 [Hybrid Search] Vector: Retrieved 40, top score=0.8542
🔑 [Hybrid Search] Text: Retrieved 32, top score=0.4231
🔀 [Hybrid Search] Fused: 58 unique candidates
🎯 [Policy] Applying ONE_LINE policy to 58 candidates
   ✅ Found 12 preferred candidates for ONE_LINE
📈 [Retrieval] Domain boost: 58 results
📊 [MMR] Selected 12/58 results | 4 sections | 7 pages
🧠 [Confidence] Initial: high (0.82) - ...
✅ [Hybrid Search] Final: 12 results
```

---

## 🐛 Troubleshooting

### No FTS Results
```sql
-- Check if FTS column exists
\d document_chunks
-- Should show: fts | tsvector

-- Test FTS query
SELECT COUNT(*) FROM document_chunks 
WHERE fts @@ plainto_tsquery('simple', 'authentication');
-- Should return > 0
```

**Fix:** Run `./scripts/add-fts-column.sh`

---

### Low Confidence Warnings
```
⚠️ [Retrieval] Low confidence (0.35) - attempting fallback
```

**This is normal!** The system will auto-recover via:
1. Query expansion (add synonyms)
2. Widen search (increase topK)
3. Multi-doc retrieval

**If confidence stays low after fallback:** Check if docs are uploaded and indexed.

---

### Wrong Intent Detection
```
🎯 [Policy] Applying DEFAULT policy (expected: ENDPOINT)
```

**Fix:** Update intent detection in `lib/retrieval/policy.ts`:
```typescript
// Add more patterns for your specific use case
if (/your-pattern/.test(q)) {
  return 'YOUR_INTENT';
}
```

---

## ✅ Verification Checklist

After integration:

- [ ] FTS column exists in database
- [ ] Hybrid search returns results
- [ ] MMR diversity applied (check logs)
- [ ] Confidence analyzed (high/medium/low)
- [ ] Intent detected correctly
- [ ] Prompt uses strict template
- [ ] Answer has proper formatting
- [ ] Source chips display
- [ ] Performance <120ms retrieval

---

## 📈 Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Retrieval speed | 500-1000ms | **50-120ms** |
| Answer accuracy | 85% | **92-95%** |
| Exact matches | 65% | **95%** |
| Confidence "high" | 45% | **70%** |
| "Refer to docs" rate | 15% | **<2%** |

---

## 🎯 Quality Examples

### Auth Headers (ONE_LINE intent)
```markdown
**Required Authentication Headers:**

1. **Authorization**
```http
Authorization: Bearer <access_token>
```
• JWT Bearer token

2. **Zs-Product-Key**
```http
Zs-Product-Key: <key>
```
• Product subscription key
```

### Endpoint (ENDPOINT intent)
```markdown
• POST /bankidse/auth — Initiate authentication
• GET /bankidse/collect/{orderRef} — Poll status
• POST /bankidse/cancel — Cancel session
```

### JSON (JSON intent)
```json
{
  "personal_number": "190001019876",
  "endUserIp": "203.0.113.10",
  "userVisibleData": "Sign agreement"
}
```

---

**🎉 That's it! Copy, paste, test, deploy.** 🚀

---

**Maintained by:** Avenai Development Team  
**Last Updated:** October 23, 2025

