# 🎯 **Next Steps for Tuning Sprint**

## 📊 **Current Status:**

**Infrastructure:** ✅ 100% Complete  
**Performance:** ❌ 8.3% pass rate (target: ≥90%)  
**Root Cause:** 0% verbatim detection in extracted documents

---

## 🔴 **IMMEDIATE BLOCKER: Doc-Worker Restart**

### **What Was Done:**
I've improved the Doc-Worker V2 detection logic in `/Users/harburt/Desktop/Avenai 3.0/scripts/doc-worker/main.py`:

1. **Better JSON/Code Detection** (lines 366-408):
   - Nested JSON object matching
   - JSON array detection
   - Character density analysis for code blocks

2. **Better Table Detection** (lines 335-364):
   - 4 different strategies for finding tables
   - Parameter tables, key-value pairs, pipe-delimited, grid layouts

3. **Block-Level Aggregation** (lines 425-466):
   - Changed from span-by-span to block-by-block processing
   - Allows detection of complete JSON structures

### **What Needs to Happen:**
The doc-worker needs to be restarted with these changes:

```bash
cd /Users/harburt/Desktop/Avenai\ 3.0/scripts/doc-worker
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

Then verify it's running:
```bash
curl http://localhost:8000/health
```

---

## 📋 **Action Plan (Once Doc-Worker is Running):**

### **Step 1: Test ONE Document (5 min)**
```bash
# Re-ingest the test document
curl -X POST http://localhost:3000/api/documents/cmh1c6dsx0003d8hiz01mhh26/reingest \
  -H "Content-Type: application/json" \
  -d '{"pipeline":"v2","embeddingBatch":128}'
```

### **Step 2: Check Coverage (2 min)**
```bash
# Verify verbatim coverage improved
curl -s "http://localhost:3000/api/debug/chunks?datasetId=cmh1c687x0001d8hiq6wop6a1" | jq '.stats'
```

**Expected Result:**
- `verbatimCoverage`: 0% → **10-30%**
- `elementTypeDistribution`: Should show `code` and `table` entries

### **Step 3: Re-ingest All Docs (if Step 2 succeeds)**
```bash
npm run reingest -- --dataset cmh1c687x0001d8hiq6wop6a1 --batch 5
```

### **Step 4: Bulletproof JSON Mode (30 min)**
Edit `lib/programmatic-responses.ts` to return verbatim blocks directly for JSON intent:

```typescript
// Around line 50-60, before LLM call
if (intent === 'JSON') {
  const verbatimChunk = context.find(c => c.metadata?.has_verbatim);
  if (verbatimChunk && verbatimChunk.metadata?.verbatim_block) {
    // Return verbatim JSON directly
    return `\`\`\`json\n${verbatimChunk.metadata.verbatim_block}\n\`\`\``;
  }
}
```

### **Step 5: Run Smoke Tests (5 min)**
```bash
npm run smoke-tests
```

**Expected Result:**
- JSON/Table accuracy: 0% → **100%**
- Overall pass rate: 8.3% → **≥50%** (should improve significantly)

### **Step 6: Add Retrieval Boosts (20 min)**
Edit `lib/chat/hybrid-search.ts` to add endpoint/token boosts.

### **Step 7: Canonicalize Smoke Tests (15 min)**
Edit `scripts/smoke-tests.ts` to normalize URLs, emails, whitespace.

### **Step 8: Final Smoke Test (5 min)**
```bash
npm run smoke-tests
```

**Target Result:**
- Overall pass rate: **≥90%**
- JSON/Table accuracy: **100%**

---

## 🎯 **Expected Timeline:**

- **Immediate**: Get doc-worker running (need user help)
- **+5 min**: Test one document re-ingestion
- **+15 min**: Re-ingest all docs (if test succeeds)
- **+1 hour**: Implement Actions 2-4 (JSON mode, boosts, canonicalization)
- **+5 min**: Final validation

**Total**: ~1.5 hours to hit ≥90% pass rate

---

## 💡 **Key Insight:**

The 8.3% pass rate isn't a fundamental architecture problem—it's a data quality issue. Once we get verbatim blocks extracted properly, the existing retrieval policy will find them, and the prompt router will use them correctly.

**We're 1.5 hours away from pilot-grade performance!** 🚀


