# 🇪🇺 EU Database Testing Guide

## ✅ Migration Complete

Your local environment is now connected to the **EU Production Database** in Frankfurt.

---

## 🔐 **How to Sign In**

Since Avenai uses **SSO-only authentication** (Google/Microsoft), you need to:

### Option 1: Sign in with Google OAuth ✅ **RECOMMENDED**
1. Go to http://localhost:3000
2. Click **Sign in with Google**
3. Use your Google account: `oliverharburt@gmail.com`
4. This will create a new user in the EU database automatically

### Option 2: Sign in with Microsoft OAuth
1. Go to http://localhost:3000
2. Click **Sign in with Microsoft**
3. Use your Azure AD account
4. This will create a new user in the EU database automatically

---

## 🧪 **What to Test**

Once signed in, test the following:

### 1. **Upload Documents**
- Go to **Datasets** tab
- Create a new dataset or use the existing test dataset
- Upload PDF documents (e.g., ZignSec docs)
- Verify they process successfully in EU database

### 2. **Chat with AI**
- Go to **Chat Widget** tab
- Ask questions about your uploaded documents
- Verify:
  - ✅ Answers are accurate
  - ✅ Source citations appear
  - ✅ Clickable sources open modal with full context
  - ✅ Response time is fast (EU database + Stockholm doc-worker)

### 3. **Check Infrastructure**
All services should be running in EU regions:
- **Database**: Frankfurt (Neon)
- **Doc Processing**: Stockholm (Fly.io)
- **File Storage**: EU-optimized (Cloudflare R2)

---

## 📊 **Current Database State**

### Test Data Created:
- **Organization**: `Avenai EU Test Organization` (ID: `eu-test-org`)
- **Dataset**: `EU Test Dataset` (ID: `eu-test-dataset`)
- **User**: `test@avenai.io` (placeholder - will be replaced when you sign in)

### Connection String:
```
postgresql://neondb_owner:npg_SqzZ81wMlrpU@ep-misty-haze-agl1pfbo-pooler.c-2.eu-central-1.aws.neon.tech/neondb
```

---

## 🚨 **Important Notes**

1. **No Password Login**: Avenai only supports Google/Microsoft SSO
2. **First Sign-In**: Your first Google/Microsoft sign-in will create a new user in the EU database
3. **Organization**: You may need to create an organization after first sign-in
4. **Old US Database**: Deleted - no data was migrated (fresh start)

---

## 🔍 **Verify EU Infrastructure**

Run this command to check all services:
```bash
./scripts/check-backend.sh
```

Expected results:
- ✅ PostgreSQL: Frankfurt (aws-eu-central-1)
- ✅ Doc-Worker: Stockholm (healthy)
- ✅ R2 Storage: Connected
- ✅ OpenAI: API key valid
- ✅ NextAuth: Session working

---

## 🚀 **Next Steps After Local Testing**

Once local testing is complete:
1. Deploy to Vercel with **Frankfurt region**
2. Update Vercel environment variables to use EU database
3. Test production deployment
4. Go live with EU-compliant infrastructure! 🎉

---

**Last Updated**: October 23, 2025
**Region**: EU (Frankfurt + Stockholm)
**Status**: ✅ Ready for Testing

