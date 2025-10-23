# Deploy Phase 4 - ChatGPT-Level Intelligence
**Date:** October 23, 2025  
**Status:** Ready for deployment

---

## 🚀 Quick Deploy (Copy-Paste)

### **Step 1: Deploy FTS Column (5 min)**

```bash
cd /Users/harburt/Desktop/Avenai\ 3.0

# Add FTS column to database
npm run db:add-fts

# Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total, COUNT(fts) as with_fts FROM document_chunks;"
# Expected: total = with_fts
```

---

### **Step 2: Test FTS Works (2 min)**

```bash
# Test FTS query
psql "$DATABASE_URL" -c "
  SELECT 
    ts_rank_cd(fts, plainto_tsquery('simple', 'authentication')) as rank,
    substring(content, 1, 80) as preview
  FROM document_chunks 
  WHERE fts @@ plainto_tsquery('simple', 'authentication') 
  ORDER BY rank DESC 
  LIMIT 3;
"
```

**Expected:** 3 rows with relevance scores

---

### **Step 3: Run Smoke Tests (10 min)**

```bash
# Set environment
export BASE_URL=http://localhost:3000
export DATASET_ID=eu-test-dataset

# Run smoke tests
npm run eval:smoke
```

**Expected:**
```
✅ Passed: 15/15 (100%)
🎉 PASS - Meets 95% target!
```

---

### **Step 4: Integration (See Below)**

---

## 📝 Chat API Integration

### **File:** `app/api/chat/route.ts`

**Add these imports:**
```typescript
import { retrieve } from '@/lib/retrieval';
import { createPrompt, postProcess } from '@/lib/generation/promptRouter';
import { extractDocumentLabels } from '@/lib/retrieval/crossDoc';
```

**Replace retrieval section (line ~150-250):**
```typescript
// OLD CODE (remove):
// const chunks = await prisma.documentChunk.findMany({ ... });

// NEW CODE (Phase 4):
console.log(`\n${'='.repeat(60)}`);
console.log(`🚀 [Phase 4] Starting ChatGPT-level retrieval`);
console.log(`${'='.repeat(60)}`);

const retrievalResult = await retrieve({
  query: message,
  datasetId,
  organizationId: (session.user as any).organizationId,
  topK: 12,
  enableFallback: true,
  enableMMR: true,
  enablePolicy: true,
  enableCrossDoc: true,
  enableDomainBoost: true
});

const { results, confidence, metadata } = retrievalResult;

console.log(`\n📊 [Retrieval] Complete`);
console.log(`   Results: ${results.length}`);
console.log(`   Confidence: ${confidence.level} (${confidence.score.toFixed(2)})`);
console.log(`   Intent: ${metadata.intent}`);
console.log(`   Time: ${metadata.retrievalTimeMs}ms`);
console.log(`   Sources: ${metadata.sourceSummary}`);

// Handle no results
if (results.length === 0) {
  return NextResponse.json({
    message: "I couldn't find relevant information. Could you rephrase?",
    confidence: 'low',
    sources: []
  });
}

// Build contexts with document labels
const contexts = results.map(r => {
  const labels = extractDocumentLabels(r.documentTitle);
  return {
    content: r.content,
    title: r.documentTitle,
    page: r.page,
    sectionPath: r.sectionPath,
    docLabel: labels.label,
    docCountry: labels.country,
    docProduct: labels.product
  };
});

// Generate prompt with strict template
const { system, user } = createPrompt(
  metadata.intent,
  message,
  contexts
);

console.log(`💬 [LLM] Using ${metadata.intent} template`);

// Call LLM (existing code continues...)
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ],
  temperature: 0.1,
  stream: true
});

// ... (rest of your existing streaming code)
```

---

## 🧪 Testing

### **Local Testing**

```bash
# Start server
npm run dev

# Terminal 2: Run smoke tests
export BASE_URL=http://localhost:3000
export DATASET_ID=eu-test-dataset
npm run eval:smoke

# Terminal 2: Run golden eval
npm run eval:golden
```

### **Production Testing**

```bash
# After deploying to Vercel
export BASE_URL=https://your-app.vercel.app
export DATASET_ID=your-prod-dataset-id
export SESSION_COOKIE="next-auth.session-token=..."

npm run eval:golden
```

---

## 📊 Expected Results

### **Console Output**

```
═══════════════════════════════════════════════════════════
🚀 [Phase 4] Starting ChatGPT-level retrieval
═══════════════════════════════════════════════════════════

🔍 [Retrieval Pipeline] Query: "Which authentication headers..."
🎯 [Step 1] Intent: ONE_LINE

🔍 [Hybrid Search] Query: "Which authentication headers..."
⚖️ [Hybrid Search] Weights: Vector=0.7, Text=0.3
🎯 [Hybrid Search] Vector: Retrieved 40, top score=0.8542
🔑 [Hybrid Search] Text: Retrieved 32, top score=0.4231
🔀 [Hybrid Search] Fused: 58 unique candidates
✅ [Hybrid Search] Final: 58 results

🎯 [Policy] Applying ONE_LINE policy to 58 candidates
   ✅ Found 12 preferred candidates for ONE_LINE
📈 [Domain boost] Applied
🌍 [Cross-Doc] Balanced distribution
📊 [MMR] 12 diverse results
✅ [Confidence] high (0.85) - no fallback needed

📊 [Retrieval] Complete
   Results: 12
   Confidence: high (0.85)
   Intent: ONE_LINE
   Time: 95ms
   Sources: BankID Sweden v5 (5), BankID Norway v5.1 (4), Mobile SDK (3)

💬 [LLM] Using ONE_LINE template
```

### **Golden Eval Output**

```
📊 GOLDEN EVALUATION REPORT
═══════════════════════════════════════════════════════════

✅ Passed: 15/15 (100%)
❌ Failed: 0/15

📈 Score Breakdown:
   Exact Matches: 96.5%
   Keywords: 98.2%
   Structured: 95.0%

⏱️  Performance:
   Avg Duration: 892ms

📂 By Category:
   auth: 3/3 (100%)
   endpoints: 4/4 (100%)
   json: 2/2 (100%)
   errors: 2/2 (100%)
   workflows: 2/2 (100%)
   sdk: 2/2 (100%)

🎯 By Intent:
   ONE_LINE: 4/4 (100%)
   ENDPOINT: 4/4 (100%)
   JSON: 2/2 (100%)
   ERROR_CODE: 2/2 (100%)
   WORKFLOW: 3/3 (100%)

═══════════════════════════════════════════════════════════
🎉 PASS - Meets 95% target!
═══════════════════════════════════════════════════════════
```

---

## 🎯 Rollback Plan

If issues arise:

```bash
# Disable Phase 4 features
echo "HYBRID_RETRIEVAL=false" >> .env.local
echo "CONFIDENCE_FALLBACK=false" >> .env.local
echo "PROMPT_ROUTER_V2=false" >> .env.local

# Restart
npm run dev

# Rollback FTS (only if causing issues)
psql "$DATABASE_URL" -c "
  ALTER TABLE document_chunks DROP COLUMN IF EXISTS fts;
  DROP INDEX IF EXISTS idx_chunks_fts;
"
```

---

## 📋 Deployment Checklist

- [ ] FTS column deployed (`npm run db:add-fts`)
- [ ] FTS verified (test query returns results)
- [ ] Code integrated (retrieval + prompt router)
- [ ] Local smoke tests passed
- [ ] Golden eval passed (≥95%)
- [ ] Production deployed (Vercel)
- [ ] Production tests passed
- [ ] Monitoring enabled (SLOs)

---

## 🎉 Success Criteria

### **Quality**
- ✅ ≥95% pass rate
- ✅ No "refer to docs"
- ✅ Copy-ready code blocks
- ✅ Proper markdown formatting

### **Performance**
- ✅ Retrieval <120ms p95
- ✅ Total latency <1.8s p95
- ✅ Memory <50MB/request

### **User Experience**
- ✅ Answers match ChatGPT quality
- ✅ Source chips labeled by doc/country
- ✅ Confidence always accurate
- ✅ Beautiful formatting (Shiki)

---

**🚀 Ready to deploy? Run: `npm run db:add-fts`**

---

**Maintained by:** Avenai Development Team  
**Last Updated:** October 23, 2025

