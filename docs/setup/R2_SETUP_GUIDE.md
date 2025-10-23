# Cloudflare R2 Setup Guide for Avenai

## 🚀 Quick Setup (5 minutes)

### Step 1: Create R2 Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **"Create bucket"**
4. Name: `avenai-documents`
5. Region: **Auto** (recommended)
6. Click **"Create bucket"**

### Step 2: Get API Credentials
1. In R2, click **"Manage R2 API tokens"**
2. Click **"Create API token"**
3. Name: `Avenai Storage Access`
4. Permissions: **R2:Edit** (for your bucket)
5. Click **"Create API token"**
6. **SAVE** the Access Key ID and Secret Access Key

### Step 3: Find Your Account ID
- In Cloudflare dashboard, look at the **right sidebar**
- Copy your **Account ID**

### Step 4: Update Environment Variables
Add these to your `.env.local` file:

```bash
# Cloudflare R2 Storage Configuration
STORAGE_ENDPOINT="https://[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY_ID="[YOUR-ACCESS-KEY-ID]"
STORAGE_SECRET_ACCESS_KEY="[YOUR-SECRET-ACCESS-KEY]"
STORAGE_BUCKET_NAME="avenai-documents"
STORAGE_PUBLIC_URL="https://pub-[YOUR-ACCOUNT-ID].r2.dev"
```

**Replace:**
- `[YOUR-ACCOUNT-ID]` with your Cloudflare Account ID
- `[YOUR-ACCESS-KEY-ID]` with your R2 Access Key ID
- `[YOUR-SECRET-ACCESS-KEY]` with your R2 Secret Access Key

### Step 5: Test the Connection
Run the test script:

```bash
node scripts/test-r2-connection.js
```

If successful, you'll see:
```
🎉 All tests passed! Your R2 storage is working correctly.
```

## 📊 R2 Pricing (Very Affordable!)

### Storage:
- **$0.015 per GB per month**
- Example: 100GB = $1.50/month

### Data Transfer:
- **First 10GB egress free per month**
- After that: $0.36 per GB
- Example: 50GB transfer = $14.40/month

### API Requests:
- **No charges for API requests!**
- Unlimited PUT, GET, DELETE operations

## 🔧 Troubleshooting

### "NoSuchBucket" Error:
- Check bucket name matches exactly
- Verify bucket exists in Cloudflare dashboard

### "InvalidAccessKeyId" Error:
- Check Access Key ID is correct
- Verify API token has R2 permissions

### "SignatureDoesNotMatch" Error:
- Check Secret Access Key is correct
- Ensure no extra spaces in environment variables

### "ENOTFOUND" Error:
- Check STORAGE_ENDPOINT URL is correct
- Verify Account ID in the endpoint URL

## ✅ Verification Checklist

- [ ] R2 bucket created (`avenai-documents`)
- [ ] API token created with R2:Edit permissions
- [ ] Environment variables set in `.env.local`
- [ ] Test script runs successfully
- [ ] Can upload documents through your app

## 🎯 Next Steps

Once R2 is configured:
1. **Test file upload** in your copilot UI
2. **Verify files appear** in R2 bucket
3. **Test file download** functionality
4. **Monitor usage** in Cloudflare dashboard

## 💡 Pro Tips

- **Enable CORS** if you need browser-based uploads
- **Set up custom domain** for prettier URLs
- **Monitor usage** in Cloudflare dashboard
- **Use lifecycle rules** for automatic cleanup of old files

Your Avenai copilot now has enterprise-grade file storage! 🎉
