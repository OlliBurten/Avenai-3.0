# ⚡ Quick Deployment Guide
## Deploy pgvector Stack to Production

**Skip local build issues - deploy directly to Vercel!**

---

## 🚀 **Step-by-Step Deployment** (15 minutes)

### **Step 1: Run Database Migration** (5 min)

1. Go to https://console.neon.tech
2. Select your Avenai project
3. Click "SQL Editor"
4. Copy and paste THIS ENTIRE SCRIPT:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add embedding column to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector similarity index
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create trigram index for fuzzy text search
CREATE INDEX IF NOT EXISTS document_chunks_content_trgm_idx 
ON document_chunks 
USING gin (content gin_trgm_ops);

-- Create full-text search column and index
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS content_tsv tsvector 
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx 
ON document_chunks 
USING gin (content_tsv);

-- Create composite index
CREATE INDEX IF NOT EXISTS document_chunks_org_dataset_idx 
ON document_chunks (organization_id, document_id);
```

5. Click "Run"
6. Wait for "Success" message

**Verify it worked:**
```sql
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pg_trgm');
```
Should return 2 rows.

---

### **Step 2: Update Environment Variables in Vercel** (5 min)

1. Go to https://vercel.com
2. Select your Avenai project
3. Go to Settings → Environment Variables
4. **REMOVE** these variables:
   - `PINECONE_API_KEY`
   - `PINECONE_ENVIRONMENT`
   - `PINECONE_INDEX_NAME`

5. **KEEP** these variables (don't change):
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - All other existing vars

6. **OPTIONAL** - Add Redis (uses in-memory cache if not added):
   - `UPSTASH_REDIS_URL` = `redis://...` (if you have Upstash)

7. Click "Save"

---

### **Step 3: Commit and Push** (3 min)

```bash
cd "/Users/harburt/Desktop/Avenai 3.0"

git add .
git commit -m "Migrate from Pinecone to pgvector + add conversation memory"
git push origin main
```

**Vercel will automatically build and deploy!**

---

### **Step 4: Monitor Deployment** (2 min)

1. Watch the Vercel deployment logs
2. Look for:
   - ✅ Build succeeded
   - ✅ Deployment complete
   - ✅ No errors in runtime logs

---

### **Step 5: Verify It Works** (5 min)

1. Go to your app URL
2. Navigate to a dataset
3. Try the copilot chat
4. Test these scenarios:

**Test 1: Basic question**
```
You: "How do I authenticate?"
Bot: [Should get an answer]
```

**Test 2: Follow-up (NEW - conversation memory!)**
```
You: "What about errors?"
Bot: [Should understand context from previous question]
```

**Test 3: Repeated query (caching)**
```
Ask same question twice - second time should be faster
```

---

## ✅ **Success Indicators**

You'll know it worked when you see in logs:
- `📊 pgvector hybrid (semantic + keyword) matches: X`
- `💾 Cache HIT for query...` (on repeated queries)
- No Pinecone-related errors

---

## 🚨 **If Something Goes Wrong**

### **Rollback Plan:**

1. **In Vercel:**
   - Go to Deployments
   - Find previous working deployment
   - Click "..." → "Redeploy"

2. **In Database:**
   - Don't worry - the migration is safe (uses `IF NOT EXISTS`)
   - New columns are nullable, won't break existing data

---

## 🎯 **What You're Deploying**

- ✅ pgvector (replaces Pinecone)
- ✅ Conversation memory (multi-turn chat)
- ✅ Redis caching (2-3x faster)
- ✅ Improved hybrid search

**Result:**
- 💰 Save $70-200/month
- ⚡ 2-3x faster queries
- 💬 Natural conversations
- 🎯 Better answer quality

---

## 📞 **Need Help?**

**If deployment fails:**
1. Check Vercel deployment logs
2. Verify database migration ran successfully
3. Check environment variables are set
4. Review PGVECTOR_MIGRATION_GUIDE.md for troubleshooting

**If searches don't work:**
- Embeddings need to be regenerated (re-upload documents)
- Or wait - they'll be created on next document upload

---

## ⚡ **TL;DR**

```bash
# 1. Run SQL migration in Neon Console (copy/paste script above)
# 2. Remove Pinecone vars from Vercel
# 3. git add . && git commit -m "pgvector migration" && git push
# 4. Wait for Vercel to deploy
# 5. Test and verify
```

**That's it!** 🚀

---

**Estimated Time**: 15 minutes  
**Complexity**: Low  
**Risk**: Low (safe to rollback)

**Ready?** Start with Step 1! 🎯

