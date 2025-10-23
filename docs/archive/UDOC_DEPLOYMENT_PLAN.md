# UDoc Pipeline Deployment Plan

## Overview
This document outlines the minimal steps to deploy the Universal Document Processing (UDoc) pipeline to production.

## Prerequisites
- All UDoc pipeline files are implemented
- Python worker service is ready for deployment
- Vercel project is configured
- Pinecone account and index are set up

## Deployment Steps

### 1. Deploy the /doc-worker container
**Target**: Fly.io, Render, EC2, or Heroku

**Files to deploy**:
- `/doc-worker/main.py` - FastAPI application
- `/doc-worker/requirements.txt` - Python dependencies
- `/doc-worker/Dockerfile` - Container configuration

**Deployment options**:

#### Option A: Fly.io (Recommended)
```bash
cd doc-worker
fly launch
fly deploy
```

#### Option B: Render
1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Option C: EC2 with Docker
```bash
cd doc-worker
docker build -t doc-worker .
docker run -p 8000:8000 doc-worker
```

**Expected result**: Worker service accessible at `https://your-worker.herokuapp.com`

### 2. Set DOC_WORKER_URL in Vercel
**Target**: Vercel Environment Variables

**Steps**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add new variable:
   - Name: `DOC_WORKER_URL`
   - Value: `https://your-worker.herokuapp.com`
   - Environment: Production, Preview, Development

**Expected result**: Environment variable available in production

### 3. Add UDoc files and push
**Target**: Git repository

**Files to add**:
- `/lib/udoc.ts` - Core UDoc types and interfaces
- `/lib/pipeline.ts` - Main processing pipeline
- `/lib/processors/pdf.ts` - PDF processor
- `/lib/processors/docx.ts` - DOCX processor
- `/lib/processors/ocr.ts` - OCR processor
- `/lib/processors/openapi.ts` - OpenAPI processor
- `/lib/rag/chunking.ts` - Semantic chunking
- `/lib/rag/embeddings.ts` - Embeddings integration
- `/app/api/uploads/ingest/route.ts` - Ingestion API
- `/components/UploadQuality.tsx` - Quality UI component

**Steps**:
```bash
git add .
git commit -m "Add UDoc pipeline implementation"
git push origin main
```

**Expected result**: All files deployed to Vercel

### 4. Update upload flow
**Target**: Existing document upload functionality

**Changes needed**:
- Replace current upload endpoint with `/api/uploads/ingest`
- Handle UDoc response format
- Update error handling

**Example integration**:
```typescript
// In your upload component
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/uploads/ingest', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  if (result.ok) {
    const udoc = result.udoc;
    // Process UDoc response
  }
};
```

**Expected result**: Files processed through UDoc pipeline

### 5. Persist UDoc JSON
**Target**: Database schema and API

**Changes needed**:
- Add `udoc` field to Document model
- Update document creation API
- Store UDoc metadata

**Database schema update**:
```prisma
model Document {
  id          String   @id @default(cuid())
  // ... existing fields
  udoc        Json?    // Store UDoc JSON
  // ... rest of fields
}
```

**API update**:
```typescript
// In document creation API
const document = await prisma.document.create({
  data: {
    // ... existing fields
    udoc: udoc, // Store UDoc JSON
  },
});
```

**Expected result**: UDoc data persisted with documents

### 6. Hook into embeddings queue
**Target**: Existing embedding/processing queue

**Changes needed**:
- Import `indexUDoc` function
- Call after document creation
- Handle errors gracefully

**Integration example**:
```typescript
import { indexUDoc } from '@/lib/rag/embeddings';

// In your document processing queue
const processDocument = async (documentId: string, udoc: any) => {
  try {
    const chunkCount = await indexUDoc(documentId, udoc);
    console.log(`Indexed ${chunkCount} chunks for document ${documentId}`);
  } catch (error) {
    console.error('Failed to index document:', error);
    // Handle error (retry, mark as failed, etc.)
  }
};
```

**Expected result**: Documents automatically embedded and chunked

### 7. Show UploadQuality component
**Target**: Dataset/document detail screens

**Changes needed**:
- Import `UploadQuality` component
- Display quality metrics
- Show warnings and coverage

**Integration example**:
```tsx
import UploadQuality from '@/components/UploadQuality';

// In your document detail component
const DocumentDetail = ({ document }) => {
  const udoc = document.udoc;
  
  return (
    <div>
      {/* Existing document details */}
      
      {udoc && (
        <UploadQuality
          quality={udoc.meta.quality}
          extractor={udoc.meta.extractor}
        />
      )}
    </div>
  );
};
```

**Expected result**: Quality metrics visible to users

## Testing Checklist

### Pre-deployment
- [ ] Python worker service is accessible
- [ ] All UDoc files are implemented
- [ ] Environment variables are set
- [ ] Database schema is updated

### Post-deployment
- [ ] Upload flow works with new endpoint
- [ ] Documents are processed correctly
- [ ] UDoc data is persisted
- [ ] Embeddings are generated
- [ ] Quality UI is displayed
- [ ] Error handling works

## Rollback Plan

If issues occur:
1. Revert to previous upload endpoint
2. Disable UDoc processing
3. Use fallback document processing
4. Monitor error logs

## Monitoring

### Key Metrics
- Document processing success rate
- Average processing time
- Embedding generation success rate
- User satisfaction with quality metrics

### Alerts
- Worker service downtime
- High error rates
- Processing timeouts
- Embedding failures

## Success Criteria

- [ ] Documents upload successfully
- [ ] UDoc processing works for all formats
- [ ] Quality metrics are accurate
- [ ] Embeddings are generated
- [ ] Search functionality works
- [ ] No performance degradation
- [ ] User experience is improved

## Timeline

- **Day 1**: Deploy worker service
- **Day 2**: Update Vercel environment
- **Day 3**: Deploy UDoc files
- **Day 4**: Update upload flow
- **Day 5**: Test and monitor
- **Day 6**: Full rollout

## Support

For issues or questions:
- Check Vercel logs
- Monitor worker service logs
- Review Pinecone index status
- Test with sample documents
