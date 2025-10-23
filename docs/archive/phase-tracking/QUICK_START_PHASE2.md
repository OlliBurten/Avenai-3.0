# 🚀 Quick Start: Phase 2 Implementation

**Last Updated:** January 21, 2025  
**Prerequisites:** ✅ Phase 1 Complete  
**Time to Complete:** 2 weeks

---

## 📋 Phase 2 Overview

Implement ingestion pipeline and intent-aware retrieval system.

**PRs:** PR-3, PR-4, PR-5  
**Goal:** Enable metadata-based intelligent retrieval  
**Outcome:** 90%+ accuracy with intent routing

---

## ⚡ Quick Commands

### Check Phase 1 Status
```bash
# Verify indexes exist
psql $DATABASE_URL -c "\d document_chunks" | grep idx_

# Check RLS policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename IN ('documents', 'document_chunks');"

# Test withOrg helper
DATABASE_URL="..." npx tsx scripts/test-pr1-migration.ts
```

### Start Phase 2
```bash
# 1. Verify doc-worker V2 is deployed
curl https://avenai-doc-worker.fly.dev/health

# 2. Test V2 endpoint
curl -X POST https://avenai-doc-worker.fly.dev/extract/v2 \
  -F "file=@test.pdf" | jq '.items[0]'

# 3. If ready, start PR-3
# See PR3_CHECKLIST.md (to be created)
```

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `/PR1_COMPLETE_SUMMARY.md` | PR-1 implementation details |
| `/PR2_IMPLEMENTATION_GUIDE.md` | Doc-worker V2 specification |
| `/PHASE1_COMPLETE.md` | Phase 1 overview & metrics |
| `/REFACTOR_IMPLEMENTATION_SUMMARY.md` | Complete status report |
| `/lib/db/withOrg.ts` | RLS helper functions |
| `/scripts/test-pr1-migration.ts` | Validation test suite |

---

## 🎯 PR-3: Ingestion Update

### Goal
Update Avenai backend to use doc-worker V2 and store metadata.

### Checklist
- [ ] Update `lib/rag/embeddings.ts` to call `/extract/v2`
- [ ] Parse new fields (`section_path`, `element_type`, `has_verbatim`)
- [ ] Store metadata in `document_chunks.metadata` JSON field
- [ ] Add fallback to V1 if V2 fails
- [ ] Test with sample document
- [ ] Verify metadata stored correctly

### Implementation
```typescript
// lib/rag/embeddings.ts

interface DocWorkerChunkV2 {
  text: string;
  page: number;
  section_path?: string;
  element_type?: 'table' | 'code' | 'header' | 'paragraph' | 'footer' | 'list';
  has_verbatim?: boolean;
  verbatim_block?: string;
}

async function extractWithV2(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${DOC_WORKER_URL}/extract/v2`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('V2 failed');
    
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.warn('V2 failed, falling back to V1');
    return extractWithV1(file);
  }
}

async function storeChunksWithMetadata(chunks: DocWorkerChunkV2[], documentId: string, orgId: string) {
  for (const chunk of chunks) {
    await prisma.documentChunk.create({
      data: {
        documentId,
        organizationId: orgId,
        content: chunk.text,
        sectionPath: chunk.section_path,
        metadata: {
          element_type: chunk.element_type,
          has_verbatim: chunk.has_verbatim,
          verbatim_block: chunk.verbatim_block,
          page: chunk.page
        },
        // ... embedding, etc.
      }
    });
  }
}
```

### Testing
```bash
# Upload test document via UI
# Check metadata stored
psql $DATABASE_URL -c "
  SELECT 
    id, 
    section_path, 
    metadata->>'element_type' as type,
    LEFT(content, 50) as preview
  FROM document_chunks 
  WHERE section_path IS NOT NULL 
  LIMIT 5;
"
```

---

## 🎯 PR-4: RetrieverPolicy

### Goal
Implement intent-aware retrieval with metadata filtering.

### Checklist
- [ ] Create `lib/rag/retrieverPolicy.ts`
- [ ] Implement intent detection (TABLE, JSON, CONTACT, WORKFLOW)
- [ ] Add element_type filtering
- [ ] Implement hybrid scoring (0.7 vector + 0.3 keyword)
- [ ] Add confidence gap detection
- [ ] Implement fallback logic
- [ ] Create unit tests

### Implementation
```typescript
// lib/rag/retrieverPolicy.ts

export type Intent = 'TABLE' | 'JSON' | 'CONTACT' | 'WORKFLOW' | 'GENERAL';

export function detectIntent(query: string): Intent {
  const lower = query.toLowerCase();
  
  if (/(table|list|compare|versus)/i.test(query)) return 'TABLE';
  if (/(json|payload|request|response body)/i.test(query)) return 'JSON';
  if (/(contact|email|phone|support)/i.test(query)) return 'CONTACT';
  if (/(how to|steps|process|workflow)/i.test(query)) return 'WORKFLOW';
  
  return 'GENERAL';
}

export async function retrieveWithIntent(
  query: string,
  orgId: string,
  datasetId?: string
): Promise<RetrievalResult> {
  const intent = detectIntent(query);
  
  // Build metadata filters based on intent
  const filters: any = { organizationId: orgId };
  
  if (intent === 'TABLE') {
    filters.metadata = {
      path: ['element_type'],
      equals: 'table'
    };
  } else if (intent === 'JSON') {
    filters.metadata = {
      path: ['has_verbatim'],
      equals: true
    };
  } else if (intent === 'CONTACT') {
    filters.metadata = {
      path: ['element_type'],
      equals: 'footer'
    };
  }
  
  // Vector search with filters
  const chunks = await withOrg(orgId, async () => {
    return prisma.documentChunk.findMany({
      where: filters,
      take: 10
    });
  });
  
  // Hybrid scoring
  const scored = chunks.map(chunk => ({
    ...chunk,
    score: 0.7 * chunk.vectorScore + 0.3 * chunk.keywordScore
  }));
  
  // Confidence gap detection
  const topScore = scored[0]?.score || 0;
  const secondScore = scored[1]?.score || 0;
  const gap = topScore - secondScore;
  
  if (gap < 0.15) {
    // Low confidence, expand search
    return retrieveWithFallback(query, orgId, datasetId);
  }
  
  return {
    chunks: scored,
    intent,
    confidence: gap > 0.3 ? 'HIGH' : gap > 0.15 ? 'MEDIUM' : 'LOW'
  };
}
```

### Testing
```typescript
// Test intent detection
expect(detectIntent("show me the API endpoints table")).toBe('TABLE');
expect(detectIntent("what's the JSON request format?")).toBe('JSON');
expect(detectIntent("how do I contact support?")).toBe('CONTACT');
expect(detectIntent("walk me through the auth flow")).toBe('WORKFLOW');
```

---

## 🎯 PR-5: Prompt Router

### Goal
Different prompt templates per intent type.

### Checklist
- [ ] Create `lib/chat/promptRouter.ts`
- [ ] Define templates for each intent
- [ ] Extract hardcoded patterns from `/api/chat/route.ts`
- [ ] Move greetings to `lib/chat/templates.ts`
- [ ] Add tests

### Implementation
```typescript
// lib/chat/promptRouter.ts

export const promptTemplates = {
  JSON: `
    Return the exact JSON code block without modifications.
    Use code fencing with json language identifier.
    Do not paraphrase or restructure the JSON.
  `,
  
  TABLE: `
    Present the information in a clear markdown table.
    Include all columns and rows from the source.
    Maintain the original structure and order.
  `,
  
  WORKFLOW: `
    Explain the process step by step.
    Use numbered lists for sequential steps.
    Include context and prerequisites.
  `,
  
  CONTACT: `
    Provide the contact information directly.
    Include email, phone, and any relevant links.
    Format clearly with markdown.
  `,
  
  GENERAL: `
    Provide a grounded, professional answer.
    Use markdown for structure.
    Stay concise but complete.
  `
};

export function getPromptForIntent(intent: Intent): string {
  return promptTemplates[intent] || promptTemplates.GENERAL;
}
```

---

## 📊 Success Metrics

### After PR-3
- [ ] Metadata coverage >80%
- [ ] All new docs have `element_type`
- [ ] Section paths populated

### After PR-4
- [ ] Intent detection >85% accurate
- [ ] TABLE queries return tables
- [ ] JSON queries return verbatim
- [ ] Confidence calibration working

### After PR-5
- [ ] JSON responses are code blocks
- [ ] TABLE responses are markdown tables
- [ ] WORKFLOW responses are numbered lists
- [ ] Route handler <200 lines

---

## ⚡ Quick Commands Reference

### Database Queries
```sql
-- Check metadata coverage
SELECT 
  COUNT(*) as total,
  COUNT(section_path) as with_section,
  COUNT(CASE WHEN metadata->>'element_type' IS NOT NULL THEN 1 END) as with_type
FROM document_chunks;

-- Find table chunks
SELECT id, section_path, LEFT(content, 50)
FROM document_chunks
WHERE metadata->>'element_type' = 'table'
LIMIT 5;

-- Find verbatim chunks
SELECT id, metadata->>'verbatim_block'
FROM document_chunks
WHERE (metadata->>'has_verbatim')::boolean = true
LIMIT 5;
```

### TypeScript Usage
```typescript
import { withOrg } from '@/lib/db/withOrg';
import { retrieveWithIntent } from '@/lib/rag/retrieverPolicy';
import { getPromptForIntent } from '@/lib/chat/promptRouter';

// Retrieve with intent
const result = await retrieveWithIntent(query, orgId, datasetId);

// Get appropriate prompt
const systemPrompt = getPromptForIntent(result.intent);

// Query with org context
const chunks = await withOrg(orgId, async () => {
  return prisma.documentChunk.findMany({ ... });
});
```

---

## 🚨 Common Issues & Solutions

### Issue: V2 extraction fails
**Solution:** Fallback to V1 automatically. Check doc-worker logs.

### Issue: No metadata stored
**Solution:** Verify V2 endpoint is being called. Check `element_type` field.

### Issue: Intent detection wrong
**Solution:** Review regex patterns in `detectIntent()`. Add test cases.

### Issue: RLS blocking queries
**Solution:** Ensure `withOrg()` is used for all org-scoped queries.

---

## 📞 Need Help?

**Documentation:**
- `/PR2_IMPLEMENTATION_GUIDE.md` - Doc-worker spec
- `/PHASE1_COMPLETE.md` - Phase 1 details
- `/REFACTOR_IMPLEMENTATION_SUMMARY.md` - Overall status

**Code Examples:**
- `/lib/db/withOrg.ts` - RLS helpers
- `/scripts/test-pr1-migration.ts` - Test patterns

**Testing:**
```bash
# Run validation
DATABASE_URL="..." npx tsx scripts/test-pr1-migration.ts

# Check database state
psql $DATABASE_URL -c "\d document_chunks"
```

---

## ✅ Phase 2 Completion Criteria

- [ ] PR-3: Ingestion using V2 endpoint
- [ ] PR-4: Intent-aware retrieval working
- [ ] PR-5: Prompt routing by intent
- [ ] Metadata coverage >80%
- [ ] Intent detection >85% accurate
- [ ] All tests passing
- [ ] Documentation updated

**When complete:** Proceed to Phase 3 (Re-Ingestion & Testing)

---

**Quick Start Guide Updated:** January 21, 2025  
**Next Update:** After PR-3 complete




