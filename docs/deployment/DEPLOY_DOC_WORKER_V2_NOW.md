# ⚡ Deploy Doc-Worker V2 - READY NOW

**Status:** ✅ **All code ready - just need to deploy**  
**Time:** ⏱️ **5-10 minutes**

---

## 🎯 **What's Ready**

- ✅ V2 code implemented in `/scripts/doc-worker/main.py`
- ✅ All dependencies listed in `requirements.txt`
- ✅ Dockerfile configured
- ✅ `fly.toml` configured for Fly.dev
- ✅ Feature flag ready (`DOC_WORKER_V2=true`)

---

## 🚀 **DEPLOY NOW (Choose One Option)**

### **Option 1: Fly.dev (RECOMMENDED)** ⭐

**Step 1: Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh

# Add to PATH (if needed)
export PATH="$HOME/.fly/bin:$PATH"
```

**Step 2: Login**
```bash
fly auth login
```

**Step 3: Deploy**
```bash
cd "/Users/harburt/Desktop/Avenai 3.0/scripts/doc-worker"
fly deploy
```

**Step 4: Enable V2**
```bash
fly secrets set DOC_WORKER_V2=true
```

**Step 5: Test**
```bash
curl https://avenai-doc-worker.fly.dev/health

# Should return:
{
  "status": "ok",
  "version": "2.0",
  "endpoints": {
    "/extract/v2": "v2 (metadata-rich)"
  }
}
```

**Step 6: Update Avenai**
```bash
# Already in .env.local:
# DOC_WORKER_URL=https://avenai-doc-worker.fly.dev
# DOC_WORKER_V2=true

# Just restart Avenai dev server
npm run dev
```

**Done!** ✅

---

### **Option 2: Manual Python Setup (Local Testing)**

**Step 1: Install Dependencies Globally**
```bash
pip3 install --user fastapi "uvicorn[standard]" pymupdf pydantic python-dotenv
```

**Step 2: Start Doc-Worker**
```bash
cd "/Users/harburt/Desktop/Avenai 3.0/scripts/doc-worker"
export DOC_WORKER_V2=true
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Step 3: Test**
```bash
# In another terminal
curl http://localhost:8000/health

# Should return version: "2.0"
```

**Step 4: Update Avenai .env.local**
```bash
# Change to:
DOC_WORKER_URL=http://localhost:8000
DOC_WORKER_V2=true
```

**Step 5: Restart Avenai**
```bash
npm run dev
```

---

### **Option 3: Docker (If Docker Installed)**

```bash
cd "/Users/harburt/Desktop/Avenai 3.0/scripts/doc-worker"

# Build
docker build -t avenai-doc-worker:v2 .

# Run
docker run -d -p 8000:8000 -e DOC_WORKER_V2=true avenai-doc-worker:v2

# Test
curl http://localhost:8000/health
```

---

## ✅ **After Deployment - Validate Phase 1**

### **Step 1: Upload a PDF**
```bash
# Via UI at http://localhost:3000
# Go to Datasets → Upload Document
```

### **Step 2: Check Logs**
Look for in Avenai terminal:
```
📄 PDF extraction (doc-worker V2): items: 150, pages: 10
📄 Using DocumentProcessor V2 (metadata-rich)
✅ [HybridSearch] Hybrid search returned 50 candidates
✅ [MMR] Re-ranking complete
```

### **Step 3: Verify Metadata**
```bash
# Get the document ID from UI, then:
curl "http://localhost:3000/api/debug/chunks?documentId=<YOUR_DOC_ID>&limit=5" | jq

# Should show:
{
  "stats": {
    "sectionPathCoverage": "≥80%",
    "elementTypeCoverage": "100%"
  },
  "chunks": [
    {
      "section_path": "API Reference > Authentication",
      "element_type": "header",
      "has_verbatim": false
    }
  ]
}
```

### **Step 4: Run Intent Tests**
Test via chat at http://localhost:3000/datasets/<id>:

1. "show me the components table" (TABLE intent)
2. "give me the terminated reasons JSON" (JSON intent)
3. "what's the support email?" (CONTACT intent)
4. "list the endpoints" (ENDPOINT intent)
5. "how do I approve a merchant? steps please" (WORKFLOW intent)

Check logs for:
- `[RetrieverPolicy] filter=element:table` (for TABLE)
- `[RetrieverPolicy] filter=has_verbatim` (for JSON)
- `[RetrieverPolicy] boost=footer|email` (for CONTACT)

---

## 🎯 **Recommended: Deploy to Fly.dev**

**Why:**
- ✅ Production-ready
- ✅ Already configured
- ✅ Fastest (5-10 min)
- ✅ No local Python setup needed

**Commands:**
```bash
# Install Fly CLI (one-time)
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# Login
fly auth login

# Deploy
cd "/Users/harburt/Desktop/Avenai 3.0/scripts/doc-worker"
fly deploy

# Enable V2
fly secrets set DOC_WORKER_V2=true

# Test
curl https://avenai-doc-worker.fly.dev/health
```

**That's it!** Then upload a PDF and validate. ✅

---

## 📊 **Summary**

**Code Complete:** ✅ **100%** (5/5 PRs)  
**Ready to Deploy:** ✅ **YES** (all files ready)  
**Deployment Time:** ⏱️ **5-10 minutes** (Fly.dev)  
**Validation Time:** ⏱️ **30 minutes** (after deploy)  

**Total:** ⏱️ **35-40 minutes to Phase 1 complete** 🚀

---

**Next command to run:**
```bash
curl -L https://fly.io/install.sh | sh
```

Then deploy! 🚀




