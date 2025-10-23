# S3/R2 Storage Setup Guide

## Overview

Your Avenai copilot now includes a complete S3-compatible file storage system that:
- ✅ Stores uploaded documents permanently
- ✅ Enables file downloads
- ✅ Provides backup and recovery
- ✅ Supports audit trails
- ✅ Works with AWS S3, Cloudflare R2, and other S3-compatible services

## Quick Setup Options

### Option 1: Cloudflare R2 (Recommended - Cost Effective)

1. **Create R2 Bucket:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to R2 Object Storage
   - Create a new bucket (e.g., `avenai-documents`)

2. **Get API Credentials:**
   - Go to "Manage R2 API Tokens"
   - Create a new API token with R2 permissions
   - Note down: Access Key ID, Secret Access Key

3. **Set Environment Variables:**
   ```bash
   STORAGE_ENDPOINT="https://[your-account-id].r2.cloudflarestorage.com"
   STORAGE_REGION="auto"
   STORAGE_ACCESS_KEY_ID="your-access-key"
   STORAGE_SECRET_ACCESS_KEY="your-secret-key"
   STORAGE_BUCKET_NAME="avenai-documents"
   STORAGE_PUBLIC_URL="https://pub-[your-account-id].r2.dev"  # Optional
   ```

### Option 2: AWS S3

1. **Create S3 Bucket:**
   - Go to [AWS S3 Console](https://s3.console.aws.amazon.com)
   - Create a new bucket (e.g., `avenai-documents`)
   - Set appropriate permissions

2. **Create IAM User:**
   - Go to IAM → Users
   - Create user with S3 permissions
   - Generate access keys

3. **Set Environment Variables:**
   ```bash
   STORAGE_ENDPOINT="https://s3.amazonaws.com"
   STORAGE_REGION="us-east-1"
   STORAGE_ACCESS_KEY_ID="your-access-key"
   STORAGE_SECRET_ACCESS_KEY="your-secret-key"
   STORAGE_BUCKET_NAME="avenai-documents"
   ```

### Option 3: Other S3-Compatible Services

The system works with any S3-compatible service:
- DigitalOcean Spaces
- MinIO
- Wasabi
- Backblaze B2

Just set the appropriate `STORAGE_ENDPOINT` URL.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL | `https://s3.amazonaws.com` |
| `STORAGE_REGION` | Storage region | `us-east-1` or `auto` |
| `STORAGE_ACCESS_KEY_ID` | Access key for authentication | `AKIA...` |
| `STORAGE_SECRET_ACCESS_KEY` | Secret key for authentication | `secret...` |
| `STORAGE_BUCKET_NAME` | Bucket name for documents | `avenai-documents` |
| `STORAGE_PUBLIC_URL` | Optional public URL for direct access | `https://pub-xxx.r2.dev` |

## Features

### ✅ File Upload & Storage
- Documents are uploaded to S3/R2 storage
- Unique file paths prevent conflicts
- File metadata stored in database

### ✅ File Download
- Secure download endpoint: `/api/documents/[id]/download`
- Authentication required
- Proper content-type headers

### ✅ File Management
- Duplicate detection via file hash
- File existence checking
- Secure deletion

### ✅ Integration
- Seamless integration with document processing
- Maintains existing workflow
- No breaking changes

## Testing

1. **Upload a document** through your UI
2. **Check storage** - file should appear in your S3/R2 bucket
3. **Test download** - visit `/api/documents/[document-id]/download`
4. **Verify processing** - document should be processed and indexed

## Troubleshooting

### Common Issues:

1. **"Storage credentials not configured"**
   - Ensure all required environment variables are set
   - Check credentials are valid

2. **"Failed to upload file"**
   - Verify bucket exists and is accessible
   - Check IAM permissions for S3

3. **"File not found" on download**
   - Ensure document exists in database
   - Check storage key is correct

### Debug Mode:
Set `NODE_ENV=development` to see detailed storage logs.

## Security Notes

- All file access requires authentication
- Files are stored with organization-based paths
- No public access without proper authentication
- Signed URLs available for temporary access

## Cost Optimization

### Cloudflare R2:
- $0.015/GB/month storage
- $0.36/GB egress (first 10GB free)
- No API request charges

### AWS S3:
- $0.023/GB/month storage (Standard)
- $0.09/GB egress
- $0.0004 per 1,000 PUT requests

## Next Steps

Once storage is configured:
1. Test file uploads
2. Verify downloads work
3. Monitor storage usage
4. Set up backup policies if needed

Your copilot now has enterprise-grade file storage! 🎉
