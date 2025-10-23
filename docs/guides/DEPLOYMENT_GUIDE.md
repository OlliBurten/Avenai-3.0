# UDoc Pipeline Deployment Guide

## Step 1: Deploy Python Worker

### Option A: Render (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `avenai-doc-worker`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/docs`
5. Deploy

### Option B: Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `flyctl auth login`
3. Deploy: `cd doc-worker && flyctl launch && flyctl deploy`

### Option C: Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create avenai-doc-worker`
4. Deploy: `git subtree push --prefix doc-worker heroku main`

## Step 2: Set Environment Variables

### Vercel Environment Variables
Go to Vercel Dashboard → Project → Settings → Environment Variables

**Required Variables:**
```
DOC_WORKER_URL=https://your-worker-url.onrender.com
OPENAI_API_KEY=sk-your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=avenai-docs
```

### Local Development
Create `.env.local`:
```
DOC_WORKER_URL=http://localhost:8000
OPENAI_API_KEY=sk-your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=avenai-docs
```

## Step 3: Test the Deployment

### Run Sanity Tests
```bash
# Start development server
npm run dev

# In another terminal, run tests
./scripts/run-udoc-tests.sh
```

### Expected Results
- ✅ Text PDFs: `extractor="pdf-text"`, `coverage > 80%`
- ✅ Scanned PDFs: `extractor="pdf-ocr"`, `suspectedScanned=true`
- ✅ DOCX: Proper headings, clean markdown
- ✅ TXT/MD: Pass-through
- ✅ OpenAPI: Endpoints render

## Troubleshooting

### Worker Service Issues
- Check worker logs in Render/Fly.io dashboard
- Test worker directly: `curl https://your-worker-url.onrender.com/docs`
- Verify Python dependencies are installed

### Environment Variable Issues
- Check Vercel environment variables are set
- Verify variable names match exactly
- Restart Vercel deployment after setting variables

### Test Failures
- Ensure development server is running
- Check worker service is accessible
- Verify all UDoc pipeline files are present
- Review test results in `test-results/` directory

## Production Checklist

- [ ] Python worker deployed and accessible
- [ ] Environment variables set in Vercel
- [ ] All UDoc pipeline files committed
- [ ] Sanity tests passing
- [ ] Upload flow updated to use new endpoint
- [ ] Database schema updated for UDoc storage
- [ ] Embeddings integration working
- [ ] Quality UI component displaying
