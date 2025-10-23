# Golden Test Harness

## Purpose
Automated regression testing for the Avenai Copilot.
Ensures extractor accuracy, confidence calibration, and deterministic output.

## Quick Start

```bash
npm run golden
```

**Expected Output:**
```
🧪 Running 10 golden tests with session isolation...

=== Golden Tests Summary ===
✅ Approve merchant — exact JSON body  [high]
✅ Action reasons endpoint — method + path only  [high]
✅ Components table — markdown  [high]
...
Total: 10/10 passed
```

**Exit Codes:**
- `0` - All tests passed ✅
- `1` - One or more tests failed ❌

---

## Environment Variables

```bash
export COPILOT_BASE_URL="http://localhost:3000"
export COPILOT_DATASET_ID="cmgrhya8z0001ynm3zr7n69xl"
export COPILOT_SESSION_TOKEN="your-session-token"
```

**Defaults:**
- `BASE_URL`: `http://localhost:3000`
- `DATASET_ID`: `cmgrhya8z0001ynm3zr7n69xl`
- `SESSION_TOKEN`: Test session (configured in runner)

---

## Test Isolation Features

### **Session Isolation**
Each test runs in a **fresh session** with unique ID:
```javascript
x-session-id: golden-{timestamp}-{random}
```

### **No Conversation History**
Tests send `noHistory: true` to skip conversation context:
```javascript
{ message: "...", noHistory: true }
```

### **Deterministic Mode**
Golden tests use `x-golden-test: true` header to enable:
- ✅ Temperature: 0 (no randomness)
- ✅ Extractor-first logic (verbatim over LLM)
- ✅ Stable formatting and normalization

---

## Test File Structure

**Location:** `tests/golden-tests.json`

**Format:**
```json
{
  "name": "Test name",
  "prompt": "Query to send",
  "assert": {
    "kind": "regex|json-contains|contains-all|...",
    "pattern": "...",
    "needles": [...],
    "mustHaveKeys": [...]
  },
  "minConfidence": "high|medium|low",
  "timeoutMs": 25000  // Optional per-test timeout
}
```

### **Assertion Types:**

1. **`regex`** - Pattern matching
   ```json
   {
     "kind": "regex",
     "pattern": "^GET\\s+/v1/...",
     "flags": "i"
   }
   ```

2. **`contains-all`** - All needles must be present
   ```json
   {
     "kind": "contains-all",
     "needles": ["actionId", "reasonId", "destinationMerchantGroupId"]
   }
   ```

3. **`contains-any`** - At least one needle must be present
   ```json
   {
     "kind": "contains-any",
     "needles": ["200", "400", "401"]
   }
   ```

4. **`json-contains`** - JSON object with required keys
   ```json
   {
     "kind": "json-contains",
     "mustHaveKeys": ["actionId", "reasonId"],
     "mustHavePairs": { "status": 400 }
   }
   ```

5. **`json-array-of-objects`** - JSON array of objects with required keys
   ```json
   {
     "kind": "json-array-of-objects",
     "mustHaveKeysPerObject": ["name", "status"]
   }
   ```

---

## Confidence Tiers

### **HIGH** - Deterministic & Verified
- ✅ Verbatim extraction (JSON, endpoint, email, table)
- ✅ Pattern-matched responses (auth header, URLs)
- ✅ Structured arrays with known schemas
- ✅ Confidence: User can trust 100%

### **MEDIUM** - Correct but Contextual
- ✅ LLM-generated with solid context
- ✅ Partial extraction or synthesis
- ✅ Confidence: User should verify

### **LOW** - Uncertain or Fallback
- ✅ Weak context or out-of-scope
- ✅ Fallback responses
- ✅ Confidence: User needs to validate

---

## Adding New Tests

1. **Edit** `tests/golden-tests.json`
2. **Add test object** with prompt, assertion, confidence
3. **Run** `npm run golden` to verify
4. **Commit** if passing

**Example:**
```json
{
  "name": "New test case",
  "prompt": "Your query here",
  "assert": {
    "kind": "regex",
    "pattern": "expected pattern",
    "flags": "i"
  },
  "minConfidence": "high"
}
```

---

## CI/CD Integration

### **GitHub Actions Example:**

```yaml
- name: Run Golden Tests
  run: |
    export COPILOT_BASE_URL="http://localhost:3000"
    export COPILOT_DATASET_ID="${{ secrets.TEST_DATASET_ID }}"
    export COPILOT_SESSION_TOKEN="${{ secrets.TEST_SESSION_TOKEN }}"
    npm run golden
```

### **Pre-Deploy Validation:**

```bash
# Before merging to main
npm run golden

# Expected: 10/10 passed
# If any fail, investigate before merging
```

---

## Debugging Failed Tests

### **1. Check Test Output**
Failed tests show:
- ❌ Test name
- **Error reason** (content check failed, confidence too low, timeout)
- **Sample output** (first 220 chars)

### **2. Run Single Test Manually**
```bash
curl -X POST 'http://localhost:3000/api/chat?datasetId=cmgrhya8z0001ynm3zr7n69xl' \
  -H 'Content-Type: application/json' \
  -H 'x-golden-test: true' \
  -H 'Cookie: next-auth.session-token=...' \
  -d '{"message":"Your prompt here","noHistory":true}'
```

### **3. Check Terminal Logs**
Look for:
- `🎯 Intent detected:` - What intent was classified
- `✅ Verbatim extraction succeeded` - Extractor fired
- `🎯 Auto-uplifted confidence to HIGH` - Post-gen uplift
- `🎯 Confidence final` - Final decision

### **4. Common Issues**
- **Wrong content**: Check if extractor is firing for that intent
- **Low confidence**: Check if auto-uplift patterns match
- **Timeout**: Increase `timeoutMs` in test or optimize backend
- **Flaky**: Check if prompt is ambiguous or conversation-dependent

---

## Architecture

```
Test Runner (Node.js)
    ↓
Per-Test Session ID → API /chat?datasetId=...
    ↓
Headers: x-golden-test, x-session-id
Body: { message, noHistory: true }
    ↓
Backend: temp=0, no history, extractor-first
    ↓
Response: { response, confidenceLevel, sources }
    ↓
Assertions: content + confidence
    ↓
✅ PASS or ❌ FAIL
```

---

## Files

- **`tests/golden-tests.json`** - Test definitions
- **`scripts/run-golden-tests.mjs`** - Test runner
- **`tests/baseline.log`** - Baseline snapshot (10/10 passing)
- **`tests/README.md`** - This file

---

## Maintenance

### **When to Update Tests:**
- ✅ New extractor added
- ✅ Confidence logic changed
- ✅ New intent type added
- ✅ Output format changed

### **When to Update Baseline:**
- ✅ After intentional behavior changes
- ✅ After improving extractors
- ✅ After adding new tests

### **Baseline Snapshot:**
```bash
npm run golden > tests/baseline-$(date +%Y%m%d).log
git tag golden-baseline-v2
```

---

## Known Limitations

1. **Status Code Table** - PDF extraction quality-dependent
   - Fallback: LLM can still answer, may not be verbatim table
   - Future: Add DB recall for 100% deterministic extraction

2. **Conversation History** - `noHistory: true` required for test isolation
   - Production: Conversation history enhances UX
   - Testing: Must disable for determinism

3. **Authentication** - Tests require valid session token
   - Local: Uses default test session
   - CI: Must configure `COPILOT_SESSION_TOKEN` secret

---

## Contributing

### **Adding a Test:**
1. Identify a canonical query pattern
2. Define expected content (regex or contains)
3. Set minimum confidence tier
4. Run `npm run golden` to verify
5. Commit if passing

### **Fixing a Failing Test:**
1. Run test manually with verbose logging
2. Check if intent detection is correct
3. Check if extractor is firing
4. Check if confidence uplift is working
5. Adjust extractor/test as needed

---

## Support

For questions or issues:
- Check terminal logs for detailed execution trace
- Review test assertion types above
- Check extractor implementations in `lib/chat/extractors.ts`
- Review confidence logic in `app/api/chat/route.ts`

---

**Status: 10/10 Passing ✅**
**Last Updated: October 2025**
**Version: 1.0**








