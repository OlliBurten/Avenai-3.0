# 🚀 Tuning Sprint - Status Update

## 📋 **Current Progress:**

### ✅ **Action 1: Prove Extraction (IN PROGRESS)**

#### **What We Found:**
- **Verbatim Coverage**: 0.0% (0/1632 chunks) ❌ **ROOT CAUSE**
- **Element Type Distribution**:
  - `paragraph`: 1623 (99.4%)
  - `list`: 6 (0.4%)
  - `header`: 3 (0.2%)
  - **`table`: 0** ❌
  - **`code`: 0** ❌

#### **Improvements Made to Doc-Worker V2:**

1. **✅ Better JSON/Code Detection:**
   - Improved regex to handle nested JSON objects
   - Added JSON array detection
   - Added JSON/code density check (char_density > 0.05 + quote_count >= 4)
   - Better fenced code block detection

2. **✅ Better Table Detection:**
   - Strategy 1: Pipe-delimited tables (`|` count >= 4)
   - Strategy 2: Grid/aligned data (multiple spaces between columns)
   - Strategy 3: Parameter tables (API docs pattern)
   - Strategy 4: Key-value pairs (structured format)

3. **✅ Block-Level Aggregation:**
   - Changed from span-by-span to block-by-block processing
   - Aggregates all text in a block before detection
   - This allows seeing complete JSON structures and tables

#### **Next Steps:**
1. ⏳ Restart doc-worker with improved detection
2. ⏳ Re-ingest ONE document to test improvements
3. ⏳ Verify verbatim_coverage > 0% and element_type shows 'code'/'table'
4. ⏳ If successful, re-ingest all pilot docs

---

## 🎯 **Remaining Actions:**

### **Action 2: Bulletproof JSON Mode** (Pending Action 1)
- If `intent=JSON` + `has_verbatim=true` → return `verbatim_block` directly
- Skip LLM generation

### **Action 3: Retrieval Tuning** (Pending Action 1)
- Add `+ε` boost for exact phrase matches
- Confirm `unaccent` + `pg_trgm` indexes

### **Action 4: Fair Smoke Tests** (Pending Actions 1-3)
- Canonicalize emails, URLs, whitespace
- Keep JSON/TABLE strict

### **Action 5: Final Polish** (Pending Actions 1-4)
- Tight `max_tokens` for JSON/TABLE
- Post-validator

---

## 📊 **Expected Impact:**

Once Action 1 is complete:
- **Verbatim Coverage**: 0% → 10-30% (target)
- **Element Types**: paragraph only → code, table, JSON blocks
- **JSON/Table Accuracy**: 0% → 100% (target)
- **Overall Pass Rate**: 8.3% → ≥90% (target)

---

## ⚠️ **Current Blocker:**
Doc-worker restart issues. Need to get doc-worker running with improved detection to test changes.

**Status**: Working on doc-worker restart...



