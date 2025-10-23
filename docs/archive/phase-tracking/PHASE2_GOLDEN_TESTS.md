# 🧪 Phase 2: Golden Test Validation

**Date:** October 22, 2025  
**Purpose:** Validate PR-4 + PR-5 with format compliance checks  
**Status:** ✅ **READY FOR VALIDATION**

---

## 📋 Test Plan

Run these 5 queries in the **AI Copilot page** with **Debug Mode enabled**.

For each test, verify:
1. ✅ Intent detected correctly
2. ✅ Response format matches intent expectations
3. ✅ Debug metadata shows Phase 2 features active
4. ✅ Confidence level appropriate
5. ✅ Response quality high

---

## 🧪 Golden Tests

### **Test 1: WORKFLOW Intent**

**Query:** `"How do I integrate BankID Sweden?"`

**Expected Intent:** `WORKFLOW`

**Expected Format:**
- 5-9 numbered steps
- Each step actionable and clear
- Cites at least 2 distinct sections
- Total ≤200 words
- Colleague Mode tone ("Got it — you're asking about...")

**Expected Debug Metadata:**
```
Intent: WORKFLOW
Policy Notes: ['diversity=minSections:3, capPerSection:2']
Hybrid Enabled: true
MMR Enabled: true
Unique Sections: ≥2
```

**Pass Criteria:**
- [ ] Intent: WORKFLOW
- [ ] Format: Numbered list (1. 2. 3. etc.)
- [ ] Steps: 5-9 total
- [ ] Tone: Colleague Mode active
- [ ] Confidence: MEDIUM or HIGH
- [ ] PromptRouter: Log shows "Building intent-specific prompt for: WORKFLOW"

---

### **Test 2: TABLE Intent**

**Query:** `"What are the components in the GET response?"`

**Expected Intent:** `TABLE`

**Expected Format:**
- Markdown table with `|` separators
- Header row with column names
- All rows and columns from source
- Clean table structure

**Expected Debug Metadata:**
```
Intent: TABLE
Policy Notes: ['filter=element:table']
Element Type: table chunks selected
```

**Pass Criteria:**
- [ ] Intent: TABLE
- [ ] Format: Markdown table (| Column 1 | Column 2 |)
- [ ] Structure: Header + rows
- [ ] Confidence: MEDIUM or HIGH
- [ ] PromptRouter: Log shows "Building intent-specific prompt for: TABLE"

---

### **Test 3: JSON Intent**

**Query:** `"Show me the error response JSON"`

**Expected Intent:** `JSON`

**Expected Format:**
- JSON code block with ` ```json ` fencing
- Verbatim content (no summarization)
- No extra explanatory text before/after
- All fields, values, formatting preserved

**Expected Debug Metadata:**
```
Intent: JSON
Policy Notes: ['filter=has_verbatim']
has_verbatim: true chunks selected
```

**Pass Criteria:**
- [ ] Intent: JSON
- [ ] Format: Code block with json fencing
- [ ] Content: Verbatim (exact match from docs)
- [ ] No prose: Minimal or no explanation
- [ ] Confidence: HIGH
- [ ] PromptRouter: Log shows "Building intent-specific prompt for: JSON"

---

### **Test 4: CONTACT Intent**

**Query:** `"What's the support email?"`

**Expected Intent:** `CONTACT`

**Expected Format:**
- Email verbatim (no paraphrasing)
- ≤50 words total
- Optional: Phone, URL if available
- Source citation

**Expected Debug Metadata:**
```
Intent: CONTACT
Policy Notes: ['boost=footer|email']
Footer chunks: Boosted +0.15
```

**Pass Criteria:**
- [ ] Intent: CONTACT
- [ ] Format: Email verbatim
- [ ] Length: ≤50 words
- [ ] Citation: Source document + page
- [ ] Confidence: MEDIUM or HIGH
- [ ] PromptRouter: Log shows "Building intent-specific prompt for: CONTACT"

---

### **Test 5: ENDPOINT Intent**

**Query:** `"What endpoints are available?"`

**Expected Intent:** `ENDPOINT`

**Expected Format:**
- Bullet list (- or *)
- Each line: `**METHOD /path** - Brief description`
- ≤150 words total
- 3-5 lines per endpoint max
- No lengthy explanations

**Expected Debug Metadata:**
```
Intent: ENDPOINT
Policy Notes: ['boost=endpoint_patterns', 'boosted: endpoint patterns +0.12']
Endpoint patterns: Detected and boosted
```

**Pass Criteria:**
- [ ] Intent: ENDPOINT
- [ ] Format: Bullets with **METHOD /path**
- [ ] Length: ≤150 words
- [ ] Concise: 3-5 lines per endpoint
- [ ] Confidence: MEDIUM or HIGH
- [ ] PromptRouter: Log shows "Building intent-specific prompt for: ENDPOINT"

---

## 📊 Validation Checklist

### **Overall System Checks:**

**For ALL 5 tests, verify in terminal logs:**

- [ ] `🎯 [PromptRouter] Feature flag check: { envValue: 'true', isEnabled: true }`
- [ ] `🎯 [PromptRouter] Building intent-specific prompt for: [INTENT]`
- [ ] `✅ [PromptRouter] Prompt built (XXXX chars)`
- [ ] `🔍 [HybridSearch] Starting vector + text fusion...`
- [ ] `✅ [HybridSearch] Retrieved X candidates (vector + text)`
- [ ] `🎯 [RetrieverPolicy] Applying policy for intent: [INTENT]`
- [ ] `✅ [RetrievalSimple] Complete in XXXms`

**Feature Flags Active:**
- [ ] `HYBRID_SEARCH=true`
- [ ] `MMR_RERANK=true`
- [ ] `FALLBACK_EXPANSION=true`
- [ ] `PROMPT_ROUTER=true`

---

## 🎯 Test Results Template

### **Test 1: WORKFLOW**
- **Intent Detected:** ____________
- **Format:** Pass ☐ / Fail ☐
- **Confidence:** ____________
- **Response Time:** ______ ms
- **Grade:** ______
- **Notes:** ________________________________

### **Test 2: TABLE**
- **Intent Detected:** ____________
- **Format:** Pass ☐ / Fail ☐
- **Confidence:** ____________
- **Response Time:** ______ ms
- **Grade:** ______
- **Notes:** ________________________________

### **Test 3: JSON**
- **Intent Detected:** ____________
- **Format:** Pass ☐ / Fail ☐
- **Confidence:** ____________
- **Response Time:** ______ ms
- **Grade:** ______
- **Notes:** ________________________________

### **Test 4: CONTACT**
- **Intent Detected:** ____________
- **Format:** Pass ☐ / Fail ☐
- **Confidence:** ____________
- **Response Time:** ______ ms
- **Grade:** ______
- **Notes:** ________________________________

### **Test 5: ENDPOINT**
- **Intent Detected:** ____________
- **Format:** Pass ☐ / Fail ☐
- **Confidence:** ____________
- **Response Time:** ______ ms
- **Grade:** ______
- **Notes:** ________________________________

---

## ✅ Pass Criteria

**Phase 2 (PR-5.1) is COMPLETE when:**

- [ ] 5/5 tests detect correct intent
- [ ] 4/5 tests return correct format (80%+ pass rate)
- [ ] 4/5 tests achieve MEDIUM or HIGH confidence
- [ ] PromptRouter logs appear for all 5 tests
- [ ] Hybrid search logs appear for all 5 tests
- [ ] Average response time ≤ 10s

**Target Accuracy:** ≥80% format compliance, ≥90% content accuracy

---

## 🚀 How to Run

### **1. Reset Chat**
Click "Reset Chat" button to start fresh (clear conversation history)

### **2. Enable Debug Mode**
Toggle "Debug Mode" in chat interface

### **3. Run Tests**
Copy/paste each query one by one:
1. "How do I integrate BankID Sweden?"
2. "What are the components in the GET response?"
3. "Show me the error response JSON"
4. "What's the support email?"
5. "What endpoints are available?"

### **4. Check Terminal**
For each query, check terminal logs for:
- Intent detection
- PromptRouter activation
- Hybrid search
- Policy application

### **5. Document Results**
Fill in the results template above

---

## 📝 Expected Issues & Solutions

### **Issue 1: Intent Detected as DEFAULT instead of TABLE/JSON**
**Solution:** Intent detection regex needs tuning (already fixed in PR-5.1)

### **Issue 2: Format doesn't match (e.g., narrative instead of table)**
**Solution:** PromptRouter might not be active, check feature flag

### **Issue 3: Low confidence despite good content**
**Solution:** Diversity constraint too strict, or not enough sections in docs

### **Issue 4: No PromptRouter logs**
**Solution:** Server needs restart to pick up `.env.local` changes

---

## 🎉 Success Indicators

**Phase 2 is VALIDATED when you see:**

✅ **Terminal logs consistently show:**
```
🎯 Intent detected: [CORRECT_INTENT]
🔍 [HybridSearch] Retrieved 50 candidates
🎯 [RetrieverPolicy] Applying policy for intent: [INTENT]
🎯 [PromptRouter] Building intent-specific prompt for: [INTENT]
✅ [PromptRouter] Prompt built
```

✅ **Responses consistently show:**
- WORKFLOW: 5-9 numbered steps
- TABLE: Markdown tables
- JSON: Verbatim code blocks
- CONTACT: Email verbatim, ≤50 words
- ENDPOINT: **METHOD /path** bullets

✅ **Quality metrics:**
- 4/5 correct formats
- 4/5 MEDIUM or HIGH confidence
- Average response time ≤10s

---

**Created:** October 22, 2025  
**Status:** ✅ **READY FOR VALIDATION**  
**Next:** Run the 5 golden tests and fill in results




