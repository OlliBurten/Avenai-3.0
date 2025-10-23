# 🧪 Testing EU Database Locally

**Status:** Ready for testing  
**Database:** Neon EU Frankfurt  
**Date:** October 23, 2025

---

## ✅ **Current Status**

| Component | Status |
|-----------|--------|
| EU Database | ✅ Created & Seeded |
| Test User | ✅ Created |
| Test Dataset | ✅ Created |
| Local Dev | ⏳ Ready to test |

---

## 🎯 **Test Credentials**

```
Email: test@avenai.io
Password: password123
Organization: Avenai EU Test Organization
Dataset ID: eu-test-dataset
```

---

## 🚀 **Option 1: Test with EU Database (Recommended)**

### **Temporarily switch your local dev to EU database:**

```bash
# 1. Backup your current .env.local
cp .env.local .env.local.backup

# 2. Update DATABASE_URL in .env.local to EU:
# Edit .env.local and change the first line to:
DATABASE_URL="postgresql://neondb_owner:npg_SqzZ81wMlrpU@ep-misty-haze-agl1pfbo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# 3. Restart your dev server
npm run dev

# 4. Login with test credentials:
#    Email: test@avenai.io
#    Password: password123

# 5. Upload a document to test dataset
# 6. Test RAG queries
# 7. Verify everything works
```

### **When done testing, restore local database:**

```bash
# Restore your local database config
mv .env.local.backup .env.local

# Restart dev server
npm run dev
```

---

## 🧪 **Option 2: Keep Separate Environments (Safer)**

### **Keep using localhost for development:**

```bash
# Your .env.local stays the same:
DATABASE_URL="postgresql://harburt@localhost:5432/avenai"
```

### **Only use EU database for production deployment:**

When you deploy to Vercel, you'll use the EU database connection string there.

---

## 📊 **What to Test**

### **1. Authentication**
- ✅ Login with test@avenai.io / password123
- ✅ Verify you see "Avenai EU Test Organization"
- ✅ Check that dashboard loads

### **2. Document Upload**
- ✅ Upload one of your ZignSec PDFs
- ✅ Wait for processing to complete
- ✅ Verify document appears in list

### **3. RAG Queries**
- ✅ Ask: "What are BankID Sweden security considerations?"
- ✅ Verify answer is generated
- ✅ Click on source citations (test clickable sources feature!)
- ✅ Check response time (~1-2s from Sweden to Frankfurt)

### **4. Source Citations**
- ✅ Verify source chips appear
- ✅ Click a source chip
- ✅ Modal should open with full document context
- ✅ Verify you can see the original PDF text

---

## 📈 **Expected Performance**

| Metric | Local DB | EU DB (Frankfurt) |
|--------|----------|-------------------|
| DB Query | ~1ms | ~30-50ms |
| Doc Upload | Fast | Same (R2 is global) |
| RAG Query | 1-2s | 1.5-2.5s |
| UI Load | Fast | Slightly slower (acceptable) |

**Note:** Stockholm doc-worker keeps extraction fast! 🇸🇪

---

## 🔄 **Current Architecture (Local Testing)**

```
┌──────────────────────────────┐
│ YOUR LAPTOP                  │
│ npm run dev (localhost:3000) │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ NEON EU (Frankfurt)          │ ← Testing this now
│ ep-misty-haze-agl1pfbo...    │
└────────────┬─────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ↓                 ↓
┌────────┐      ┌──────────────┐
│ R2     │      │ DOC-WORKER   │
│ Global │      │ Stockholm    │
└────────┘      └──────────────┘
```

---

## ✅ **Verification Checklist**

After testing, verify:

- [ ] Can login with test@avenai.io
- [ ] Can upload a PDF document
- [ ] Document processes successfully
- [ ] Can ask RAG queries
- [ ] Source citations work and are clickable
- [ ] Modal shows full document context
- [ ] No errors in console
- [ ] Performance is acceptable

---

## 🚨 **Troubleshooting**

### **Can't connect to EU database**
```bash
# Test connection:
source .env.eu
psql "$EU_DATABASE_URL" -c "SELECT current_database(), version();"
```

### **"Role does not exist" error**
- Check that DATABASE_URL is using the pooled connection
- Verify SSL mode is included: `?sslmode=require`

### **Slow performance**
- Expected: EU database is ~30-50ms slower than localhost
- Still acceptable for production use
- Stockholm doc-worker keeps extraction fast

---

## 📝 **Next Steps**

After successful local testing:

1. **Keep local dev** using localhost database
2. **Deploy to Vercel** when ready
3. **Configure Vercel** to use EU database
4. **Test production deployment**
5. **Invite pilot users**

---

**Ready to test? Follow Option 1 or Option 2 above!** 🚀



