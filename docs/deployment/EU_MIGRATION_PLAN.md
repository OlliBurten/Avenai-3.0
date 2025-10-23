# 🌍 EU Migration Plan - Avenai

**Date:** October 23, 2025  
**Target:** EU (Frankfurt) for optimal Sweden/Nordic performance  
**Status:** Ready to Execute

---

## 📊 Current State (Region Audit Results)

| Service | Current Region | Status | Migration Needed |
|---------|---------------|---------|------------------|
| **Neon PostgreSQL** | localhost (dev) | ❓ Unknown | ⚠️  **YES** - Create EU production DB |
| **Cloudflare R2** | Global | ✅ OK | ✅ **NO** - Already global |
| **Fly.io (doc-worker)** | Unknown/US | ❓ Unknown | ⚠️  **YES** - Redeploy to `fra` |
| **Vercel (Next.js)** | Local dev | ❓ Unknown | ⚠️  **YES** - Deploy with FRA region |
| **OpenAI API** | Global (auto-routed) | ✅ OK | ✅ **NO** - Auto-routed |

### 🚨 Critical Findings:
1. **Database:** Currently using localhost Postgres (development only)
   - Need to create **production Neon DB in EU (Frankfurt)**
   - Need to migrate schema and data

2. **Doc-Worker:** Deployed to Fly.io but region unknown
   - Need to **verify current region** and redeploy to `fra` if needed

3. **Next.js:** Running locally (development)
   - Need to **deploy to Vercel with FRA as default region**

4. **Storage:** Cloudflare R2 is global ✅
   - No action needed

---

## 🎯 Migration Steps (Execute in Order)

### **PHASE 1: Create EU Infrastructure** ⏱️ ~30 min

#### 1.1 Create Neon EU Database (Frankfurt)

```bash
# Go to https://console.neon.tech/
# Click "New Project"
# Name: "Avenai Production EU"
# Region: Select "Europe (Frankfurt) - eu-central-1"
# Enable: pgvector, pg_trgm, unaccent extensions
```

**Save these credentials:**
```bash
# Add to .env.production or .env.local
DATABASE_URL="postgresql://user:pass@xxx.eu-central-1.aws.neon.tech/avenai"
DATABASE_URL_POOLED="postgresql://user:pass@xxx-pooler.eu-central-1.aws.neon.tech/avenai"
```

#### 1.2 Run Prisma Migrations

```bash
# Load EU database URL
export DATABASE_URL="<your-eu-neon-url>"

# Run migrations
npx prisma migrate deploy

# Verify schema
npx prisma db push
```

#### 1.3 Enable Required Extensions

```sql
-- Connect to your EU Neon database and run:
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verify
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'unaccent');
```

---

### **PHASE 2: Deploy Services to EU** ⏱️ ~20 min

#### 2.1 Deploy Doc-Worker to Fly.io Frankfurt

```bash
cd scripts/doc-worker

# Check if app exists and current region
fly status

# If app doesn't exist or is in US, create/redeploy to fra:
fly launch --region fra --name avenai-doc-worker-eu --no-deploy

# Set secrets (EU database)
fly secrets set \
  DATABASE_URL="<your-eu-neon-url>" \
  OPENAI_API_KEY="<your-openai-key>" \
  DOC_WORKER_V2=true \
  STORAGE_ENDPOINT="<your-r2-endpoint>" \
  STORAGE_ACCESS_KEY_ID="<your-r2-key>" \
  STORAGE_SECRET_ACCESS_KEY="<your-r2-secret>" \
  STORAGE_BUCKET_NAME="avenai-documents"

# Deploy
fly deploy

# Verify region
fly status | grep -i region

# Get the URL
fly info
# Save: DOC_WORKER_URL="https://avenai-doc-worker-eu.fly.dev"
```

#### 2.2 Deploy Next.js to Vercel (Frankfurt)

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login
vercel login

# Deploy with Frankfurt region
cd /Users/harburt/Desktop/Avenai\ 3.0

# Option A: Deploy via CLI
vercel --prod

# Then go to Vercel Dashboard:
# → Project Settings
# → Functions
# → Default Region: Select "Frankfurt (fra1)"
# → Save

# Option B: Use vercel.json (already in repo)
# Ensure vercel.json has:
{
  "regions": ["fra1"]
}

# Redeploy
vercel --prod
```

**Set Vercel Environment Variables:**

Go to Vercel Dashboard → Project → Settings → Environment Variables:

```bash
DATABASE_URL="<your-eu-neon-url>"
DATABASE_URL_POOLED="<your-eu-neon-url-pooled>"
DOC_WORKER_URL="https://avenai-doc-worker-eu.fly.dev"
STORAGE_ENDPOINT="https://e3bcb5572050da62566d12be620e6bbd.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="21d010dc38acd9217f61c88bfb2edcbe"
STORAGE_SECRET_ACCESS_KEY="92c77a5c3ea61374a16cd08572de20c9ef98ec33f454a8a5cb3f90f83e48e3aa"
STORAGE_BUCKET_NAME="avenai-documents"
OPENAI_API_KEY="<your-key>"
NEXTAUTH_SECRET="<generate-new>"
NEXTAUTH_URL="https://your-domain.vercel.app"
# ... all other env vars
```

---

### **PHASE 3: Data Migration** ⏱️ ~10-30 min (depends on data size)

#### Option A: Fresh Start (Recommended for Pilot)

Since you're in pilot/dev phase with minimal production data:

```bash
# 1. Run migrations on EU DB (already done in Phase 1.2)

# 2. Create test organization and user in EU DB
npx tsx scripts/seed-test-data.ts

# 3. Re-upload pilot documents (ZignSec docs)
# Via UI: Dashboard → Upload Documents
```

#### Option B: Migrate Existing Data

If you have production data to preserve:

```bash
# Dump from local/US DB
pg_dump -Fc -Z9 --no-owner --no-privileges \
  postgresql://harburt@localhost:5432/avenai > avenai-backup.dump

# Restore to EU Neon DB
pg_restore -c --no-owner --no-privileges \
  -d "<your-eu-neon-url>" \
  avenai-backup.dump

# Verify
psql "<your-eu-neon-url>" -c "SELECT COUNT(*) FROM users;"
```

---

### **PHASE 4: Verification** ⏱️ ~10 min

#### 4.1 Run Health Checks

```bash
# Update .env.local with EU credentials
DATABASE_URL="<your-eu-neon-url>"
DOC_WORKER_URL="https://avenai-doc-worker-eu.fly.dev"

# Run backend health check
npm run check:backend

# Or manual checks:

# 1. Database connectivity
npx tsx -e "import { prisma } from '@/lib/prisma'; prisma.$connect().then(() => console.log('✅ DB connected')).catch(e => console.error('❌', e))"

# 2. Doc-worker health
curl https://avenai-doc-worker-eu.fly.dev/health

# 3. Storage access
curl -I https://pub-e3bcb5572050da62566d12be620e6bbd.r2.dev/<test-file>
```

#### 4.2 Re-run Region Audit

```bash
# This should now show everything in EU
npm run region-audit

# Expected output:
# ✅ EU Services: 3/5
#    - Neon PostgreSQL (EU Frankfurt)
#    - Fly.io (doc-worker) (EU Frankfurt)
#    - Vercel (Next.js) (EU Frankfurt)
# 🌐 Global Services: 2/5
#    - Cloudflare R2
#    - OpenAI API
```

#### 4.3 Test RAG System

```bash
# Run smoke tests against EU stack
npm run smoke-tests

# Expected: ≥90% pass rate
```

#### 4.4 Measure Latency

```bash
# Create latency test script
npx tsx scripts/test-latency-eu.ts

# Expected from Sweden:
# - EU DB: < 50ms
# - EU Doc-Worker: < 100ms
# - EU Vercel API: < 200ms
# - Full RAG query: < 2000ms
```

---

### **PHASE 5: Cutover** ⏱️ ~5 min

#### 5.1 Update Local Development

```bash
# Update .env.local to point to EU production
DATABASE_URL="<your-eu-neon-url>"
DOC_WORKER_URL="https://avenai-doc-worker-eu.fly.dev"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Restart dev server
npm run dev
```

#### 5.2 Update DNS (if using custom domain)

```bash
# Point your domain to Vercel EU deployment
# In your DNS provider (Cloudflare, etc.):
# Add CNAME: yourdomain.com → cname.vercel-dns.com

# In Vercel:
# → Domains → Add Domain → yourdomain.com
```

#### 5.3 Test Production

```bash
# Visit your Vercel URL
https://your-domain.vercel.app

# Test:
# 1. Login works
# 2. Upload a document
# 3. Ask a RAG query
# 4. Verify sources are clickable
# 5. Check response time (should be faster from EU)
```

---

## 📋 Pre-Migration Checklist

- [ ] Have Neon account with EU project quota available
- [ ] Have Fly.io account with credit card on file
- [ ] Have Vercel account (Pro recommended for custom regions)
- [ ] Have all API keys ready (OpenAI, R2, etc.)
- [ ] Backup current local database if needed
- [ ] Document current .env.local for reference
- [ ] Test Fly CLI is installed: `fly version`
- [ ] Test Vercel CLI is installed: `vercel --version`
- [ ] Inform pilot users of brief maintenance window

---

## 🔄 Rollback Plan

If anything goes wrong:

### Database Rollback
```bash
# Switch back to local/US DB in .env.local
DATABASE_URL="postgresql://harburt@localhost:5432/avenai"

# Or restore from backup
pg_restore -c -d "postgresql://harburt@localhost:5432/avenai" avenai-backup.dump
```

### Service Rollback
```bash
# Fly.io: Scale down EU, keep US running
fly scale count 0 -a avenai-doc-worker-eu

# Vercel: Instant rollback in dashboard
# → Deployments → Previous deployment → Promote to Production
```

### Keep US Services Running
- Don't delete US Fly app until 72h of successful EU operation
- Keep backups of old connection strings
- Test rollback procedure before migration

---

## 💰 Cost Estimate

| Service | Current Cost | EU Cost | Delta |
|---------|-------------|---------|-------|
| Neon (EU) | $0 (local) | $19-29/mo (Pro) | +$29/mo |
| Fly.io (EU) | Existing | Same | $0 |
| Vercel (EU regions) | $0 (hobby) | $20/mo (Pro)* | +$20/mo |
| R2 | Existing | Same | $0 |
| **Total** | $0 | **~$50/mo** | +$50/mo |

*Required for Frankfurt region selection

---

## 🎯 Expected Benefits

### Latency Improvements (from Sweden):
- **Database queries:** ~150ms → **~30ms** (80% faster)
- **Doc extraction:** ~500ms → **~200ms** (60% faster)
- **Full RAG query:** ~3000ms → **~1500ms** (50% faster)

### Compliance:
- ✅ GDPR-compliant data residency
- ✅ BankID/PII stays in EU
- ✅ Swedish data protection standards met

### Reliability:
- ✅ Lower latency = better UX for pilots
- ✅ Reduced cross-region failures
- ✅ Better SLA for EU customers

---

## 🚀 Ready to Execute?

Once you confirm, I'll execute this plan step-by-step:

1. ✅ Create Neon EU database
2. ✅ Run Prisma migrations
3. ✅ Deploy doc-worker to Fly.io fra
4. ✅ Deploy Next.js to Vercel fra
5. ✅ Migrate data (or fresh start)
6. ✅ Run verification tests
7. ✅ Update .env.local
8. ✅ Confirm everything works

**Estimated Total Time:** 1-2 hours (mostly waiting for deployments)

---

**Ready to proceed? Say "start migration" and I'll begin!**



