# 🚀 Avenai Pilot Launch Checklist

## ✅ Functional Requirements

### Upload & Processing
- [x] **Upload works for all formats**: TXT, MD, PDF (text + scanned)
- [x] **Coverage badges display correctly**: 100% for text, warning for scanned PDFs
- [x] **Embeddings exist for every uploaded doc**: All chunks have embeddings in Pinecone
- [x] **Multi-dataset retrieval works**: "All datasets" → citations span multiple docs
- [x] **Single dataset restriction works**: Selecting one dataset only retrieves its docs
- [x] **Empty retrieval is graceful**: Unrelated queries show polite fallback, no 500s
- [x] **"What docs do you have?" → returns deterministic DB list**, not RAG

### RAG Performance
- [x] **Dense vector search optimized**: topK increased from 12 to 24
- [x] **Chunking optimized**: min 450 chars, max 800 chars, ~150 token overlap
- [x] **Smoke test passes**: `npm run rag:smoke` shows `dense=55 sparse=0 fused=55 reranked=8 final=8`

## ✅ UX & Trust

### Document Processing States
- [x] **Processing states clear**: Uploading → Processing → Embedding → Ready
- [x] **Coverage badges visible**: Shows percentage with color coding (green 80%+, amber 50%+, red <50%)
- [x] **Warnings clear**: Scanned/low-quality PDF flagged but still searchable
- [x] **"Searchable" indicator**: TXT/MD files show green "Searchable" badge

### Chat Experience
- [x] **Citations visible**: Document titles and dataset IDs shown in responses
- [x] **Deterministic docs list**: "What docs do you have?" returns structured DB list
- [x] **Hero section stable**: Terminal carousel loops examples without awkward resizing

## ✅ Monitoring

### Logging
- [x] **Retrieval counts visible**: Logs show `RAG query org=... dense=60 sparse=0 fused=60 reranked=8 final=8`
- [x] **No "final=0" errors**: RAG pipeline working correctly
- [x] **Console counters available**: For debugging (pdf_text_layer_ok, pdf_ocr_used)

## 🔄 Operations (In Progress)

### Infrastructure
- [ ] **Fly.io worker running**: For PDFs/OCR processing
- [ ] **Vercel env vars set**: Pinecone keys, DOC_WORKER_URL, etc.
- [ ] **Stripe billing live**: Free / Pro / Enterprise tier gating
- [x] **Smoke test passes**: `pnpm rag:smoke` working

### Environment Check
```bash
# Check required environment variables
echo "PINECONE_API_KEY: ${PINECONE_API_KEY:+SET}"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}"
echo "DOC_WORKER_URL: ${DOC_WORKER_URL:+SET}"
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:+SET}"
```

## 📋 Go-to-Market (Pilot Readiness)

### Demo Preparation
- [ ] **Demo script ready**: 3–4 example questions that highlight value
- [ ] **Pilot orgs pre-loaded**: Mix of TXT, MD, and PDF docs
- [ ] **Support plan**: Clear path to debug (rebuild embeddings, check logs)
- [ ] **Feedback loop**: Form or email for pilots to send issues

### Demo Script Template
1. **Upload Demo**: Show TXT/MD (100% coverage) and PDF (with quality warnings)
2. **Multi-dataset Query**: "What docs do you have access to?" → structured list
3. **Semantic Search**: Ask questions phrased differently than docs
4. **Dataset Restriction**: Select specific dataset, verify isolation

## 🎯 Success Metrics

### Technical KPIs
- Upload success rate: >95%
- RAG retrieval accuracy: >90% relevant results
- Response time: <3 seconds average
- Zero "final=0" errors in logs

### User Experience KPIs
- Time to first successful query: <5 minutes
- Coverage understanding: Users recognize quality indicators
- Multi-dataset usage: >50% of queries use "All datasets"

## 🚨 Known Issues & Workarounds

### Current Limitations
- **BM25 sparse search disabled**: Dense-only retrieval (acceptable for MVP)
- **Citation format**: Shows dataset IDs instead of names (functional but not pretty)
- **Hero carousel**: May need refresh if it stops looping

### Quick Fixes Available
- Rebuild embeddings: `npm run embeddings:rebuild`
- Restart dev server: `npm run dev`
- Check logs: Look for RAG query patterns in console

## 📞 Support Escalation

### Debug Commands
```bash
# Check document status
npm run rag:smoke

# Rebuild embeddings if needed
npm run embeddings:rebuild

# Check database
npx prisma studio
```

### Log Patterns to Watch
- ✅ Good: `RAG query org=... dense=60 sparse=0 fused=60 reranked=8 final=8`
- ❌ Bad: `RAG query org=... final=0`
- ⚠️ Warning: `No embeddings found for chunks`

---

**Status**: Ready for pilot launch with dense-only RAG. BM25 sparse search can be added later for enhanced recall.

**Last Updated**: September 28, 2025
