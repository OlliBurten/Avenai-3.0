# 🌍 EU Migration Status

**Updated:** October 23, 2025  
**Target Region:** EU (Sweden/Frankfurt optimized)

---

## ✅ **COMPLETED PHASES**

### **Phase 1: Neon Database (EU Frankfurt)** ✅
- **Status:** Complete
- **Region:** `eu-central-1` (Frankfurt, Germany)
- **Host:** `ep-misty-haze-agl1pfbo.c-2.eu-central-1.aws.neon.tech`
- **Postgres Version:** 17
- **Extensions:** pgvector 0.8.0, pg_trgm 1.6, unaccent 1.1
- **Tables:** 20 tables created
- **Connection:**
  - Direct: `postgresql://neondb_owner:***@ep-misty-haze-agl1pfbo.c-2.eu-central-1.aws.neon.tech/neondb`
  - Pooled: `postgresql://neondb_owner:***@ep-misty-haze-agl1pfbo-pooler.c-2.eu-central-1.aws.neon.tech/neondb`

### **Phase 2: Fly.io Doc-Worker (EU Stockholm)** ✅
- **Status:** Already deployed! (No action needed)
- **Region:** `arn` (Stockholm, Sweden) 🇸🇪
- **URL:** `https://avenai-doc-worker.fly.dev`
- **Version:** 2.1-enhanced
- **Features:** All V2 features enabled (footer extraction, JSON detection, table detection, verbatim blocks)
- **Health:** ✅ Operational
- **Note:** Stockholm is BETTER than Frankfurt for Swedish pilots!

---

## 🚧 **PENDING PHASES**

### **Phase 3: Vercel Deployment (EU Frankfurt)** 🔄
- **Status:** Ready to deploy
- **Action Required:** Deploy Next.js to Vercel with Frankfurt region

#### Steps:
1. Install Vercel CLI (if needed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to production:
   ```bash
   cd /Users/harburt/Desktop/Avenai\ 3.0
   vercel --prod
   ```

4. Configure Vercel project:
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Functions → Default Region: **Frankfurt (fra1)**
   - Settings → Environment Variables → Add production variables

#### Required Environment Variables for Vercel:

```bash
# Database (EU Frankfurt)
DATABASE_URL="postgresql://neondb_owner:npg_SqzZ81wMlrpU@ep-misty-haze-agl1pfbo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Doc-Worker (EU Stockholm)
DOC_WORKER_URL="https://avenai-doc-worker.fly.dev"
DOC_WORKER_V2=true

# Storage (Global R2)
STORAGE_ENDPOINT="https://e3bcb5572050da62566d12be620e6bbd.r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY_ID="21d010dc38acd9217f61c88bfb2edcbe"
STORAGE_SECRET_ACCESS_KEY="92c77a5c3ea61374a16cd08572de20c9ef98ec33f454a8a5cb3f90f83e48e3aa"
STORAGE_BUCKET_NAME="avenai-documents"
STORAGE_PUBLIC_URL="https://pub-e3bcb5572050da62566d12be620e6bbd.r2.dev"

# OpenAI
OPENAI_API_KEY="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"
OPENAI_MODEL="gpt-4o"

# Auth (Generate new secret!)
NEXTAUTH_SECRET="<generate-new-with-openssl-rand-base64-32>"
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
AUTH_TRUST_HOST=true
NEXTAUTH_DEBUG=false

# RAG Features
HYBRID_SEARCH=true
MMR_RERANK=true
FALLBACK_EXPANSION=true
PROMPT_ROUTER=true

# Google OAuth
GOOGLE_CLIENT_ID="663686456901-iau6kphnhqr4k9qr5jjh82druf3glcve.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Microsoft SSO
AZURE_AD_CLIENT_ID="21852867-f09b-4080-bb68-226203356631"
AZURE_AD_CLIENT_SECRET="743c7a74-0ed6-4a19-9fbd-5e90d350789b"
AZURE_AD_TENANT_ID="1b31aac9-cddc-48c8-a336-42295d9883b6"

# Stripe
STRIPE_SECRET_KEY="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"
STRIPE_PRO_PRICE_ID="price_1S4iiSBtqKEIPtHzAcpSQHnr"
STRIPE_PRO_ANNUAL_PRICE_ID="price_1S7vVuBtqKEIPtHzleveYasN"
STRIPE_WEBHOOK_SECRET="we_1S6h4jBtqKEIPtHz6St5tE4G"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Email
RESEND_API_KEY="re_2VMigLHr_2nsNoM6Ldu3yo4HEti8ZKYff"
RESEND_FROM_EMAIL="hello@avenai.io"

# Feature Flags
UNIFIED_WORKSPACE=true
```

---

## 📊 **CURRENT ARCHITECTURE**

```
┌─────────────────────────────────────────────────┐
│  USER (Sweden/EU)                               │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  VERCEL (Next.js)                               │
│  Region: TBD → Will be Frankfurt (fra1)        │
│  Status: ⏳ Pending deployment                  │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ↓                 ↓
┌──────────────┐   ┌─────────────────┐
│ NEON DB      │   │ DOC-WORKER      │
│ Frankfurt    │   │ Stockholm 🇸🇪   │
│ ✅ Active    │   │ ✅ Active       │
└──────────────┘   └─────────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ↓
         ┌──────────────┐
         │ CLOUDFLARE   │
         │ R2 (Global)  │
         │ ✅ Active    │
         └──────────────┘
```

---

## 🎯 **LATENCY EXPECTATIONS**

From Sweden to:
- **Neon Frankfurt:** ~30-50ms (excellent)
- **Doc-Worker Stockholm:** ~5-15ms (LOCAL! ⚡)
- **Vercel Frankfurt:** ~30-50ms (excellent)
- **Full RAG Query:** ~1000-1500ms (fast)

**Stockholm proximity gives us a HUGE advantage!** 🚀

---

## ✅ **NEXT STEPS**

1. **Deploy to Vercel** (manual step required)
2. **Set environment variables in Vercel Dashboard**
3. **Test production deployment**
4. **Run final verification**

---

## 🔒 **SECURITY NOTES**

- All credentials stored in `.env.eu` (gitignored)
- Production database in EU for GDPR compliance
- All services EU-located or global (compliant)
- Ready for BankID/PII data handling

---

## 📝 **ROLLBACK PLAN**

If issues arise:
- Keep local database for development (no change)
- Neon EU database is separate (no impact on local dev)
- Can switch back DATABASE_URL in Vercel if needed
- Doc-worker stays in Stockholm (already optimal)

---

**Status: 2/3 Phases Complete** ✅✅⏳



