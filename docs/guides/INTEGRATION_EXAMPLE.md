# Integration Example - Complete Code
**Date:** October 23, 2025  
**Purpose:** Copy-paste ready integration code for Phase 4

---

## 🎯 Complete Chat API Integration

### **File:** `app/api/chat/route.ts`

**Replace the retrieval section with this:**

```typescript
import { retrieve } from '@/lib/retrieval';
import { createPrompt, postProcess, validateResponse } from '@/lib/generation/promptRouter';

// Inside your POST handler:

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, datasetId } = await request.json();
    
    // PHASE 4: Complete retrieval pipeline
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 [Chat API] Starting Phase 4 retrieval pipeline`);
    console.log(`${'='.repeat(60)}`);
    
    const retrievalResult = await retrieve({
      query: message,
      datasetId,
      organizationId: (session.user as any).organizationId,
      topK: 12,
      enableFallback: true,
      enableMMR: true,
      enablePolicy: true,
      enableCrossDoc: true,
      enableDomainBoost: true
    });

    const { results, confidence, metadata } = retrievalResult;

    console.log(`\n📊 [Retrieval Complete]`);
    console.log(`   Results: ${results.length}`);
    console.log(`   Confidence: ${confidence.level} (${confidence.score.toFixed(2)})`);
    console.log(`   Intent: ${metadata.intent}`);
    console.log(`   Sources: ${metadata.sourceSummary}`);
    console.log(`   Time: ${metadata.retrievalTimeMs}ms`);
    console.log(`   Fallback attempts: ${metadata.attempts}`);

    // Handle no results
    if (results.length === 0) {
      return NextResponse.json({
        message: "I couldn't find relevant information in the documentation. Could you rephrase your question?",
        confidence: 'low',
        sources: []
      });
    }

    // Build contexts with document labels
    const contexts = results.map(r => {
      const labels = extractDocumentLabels(r.documentTitle);
      return {
        content: r.content,
        title: r.documentTitle,
        page: r.page,
        sectionPath: r.sectionPath,
        docLabel: labels.label,
        docCountry: labels.country,
        docProduct: labels.product
      };
    });

    // Generate prompt with strict template
    const { system, user } = createPrompt(
      metadata.intent,
      message,
      contexts
    );

    console.log(`\n💬 [LLM] Calling with ${metadata.intent} template`);

    // Call LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.1,
      stream: true
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullResponse += content;
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              content,
              confidence: confidence.level 
            })}\n\n`));
          }

          // Post-process response
          const processedResponse = postProcess(metadata.intent, fullResponse);
          
          // Validate response quality
          const validation = validateResponse(metadata.intent, processedResponse);
          if (!validation.valid) {
            console.warn(`⚠️ [Validation] Warnings:`, validation.warnings);
          }

          // Build sources for frontend
          const sources = results.map(r => {
            const labels = extractDocumentLabels(r.documentTitle);
            return {
              title: r.documentTitle,
              page: r.page,
              chunkId: r.id,
              sectionPath: r.sectionPath,
              sourceParagraph: r.content.substring(0, 200),
              docLabel: labels.label,
              docCountry: labels.country,
              docProduct: labels.product
            };
          });

          // Send final metadata
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            confidence: confidence.level,
            sources,
            metadata: {
              intent: metadata.intent,
              retrievalTimeMs: metadata.retrievalTimeMs,
              documentCount: metadata.documentCount,
              sourceSummary: metadata.sourceSummary
            }
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('❌ [LLM] Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('❌ [Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🎯 What This Does

### **Pipeline Stages:**

1. **Intent Detection** → `ONE_LINE`, `ENDPOINT`, `JSON`, etc.
2. **Hybrid Search** → Vector (70%) + FTS (30%)
3. **Soft-Filter Policy** → Intent-aware boosting
4. **Domain Boost** → +30% for headers/endpoints
5. **Cross-Doc Merge** → Max 5 per doc, balanced
6. **Conflict Resolution** → Prefer matching country/product
7. **MMR Diversity** → Max 2/page, min 3 sections
8. **Confidence Check** → Auto-widen if <0.4
9. **Prompt Router** → Strict template for intent
10. **Post-Process** → Format validation

---

## 📊 Console Output Example

```
============================================================
🚀 [Chat API] Starting Phase 4 retrieval pipeline
============================================================

🔍 [Retrieval Pipeline] Query: "Which authentication headers are required?"
🎯 [Step 1] Intent: ONE_LINE

🔍 [Hybrid Search] Query: "Which authentication headers are required?"
⚖️ [Hybrid Search] Weights: Vector=0.7, Text=0.3
🎯 [Hybrid Search] Vector: Retrieved 40, top score=0.8542
🔑 [Hybrid Search] Text: Retrieved 32, top score=0.4231
🔀 [Hybrid Search] Fused: 58 unique candidates
✅ [Hybrid Search] Final: 58 results (minScore=0.0)
   1. Chunk 45 | Fused=0.7124 (V=0.8542 T=0.4231)
   2. Chunk 67 | Fused=0.6892 (V=0.8102 T=0.3845)
   3. Chunk 23 | Fused=0.6534 (V=0.7654 T=0.3912)

🔀 [Step 2] Hybrid: 58 results (vector: 40, text: 32)

🎯 [Policy] Applying ONE_LINE policy to 58 candidates
   ✅ Found 12 preferred candidates for ONE_LINE
   📊 Before policy: [{"id":"chunk-45","score":"0.7124"}, ...]
   📊 After policy:  [{"id":"chunk-45","score":"0.8624"}, ...]
🎯 [Step 3] Policy (ONE_LINE): 58 results after boosting

📈 [Step 4] Domain boost: 58 results

🌍 [Cross-Doc] Processing 58 candidates
📚 [Cross-Doc] Documents: 2, per-doc limit: 5
   BankID Sweden v5: 5 chunks (scores: 0.862-0.654)
   BankID Norway v5.1: 5 chunks (scores: 0.601-0.442)
✅ [Cross-Doc] Merged: 10/58 candidates from 2 documents
🌍 [Conflict Resolver] Query specific: country=undefined, product=undefined
🌍 [Conflict Resolver] Query generic - no country/product preference
✅ [Cross-Doc] Final: 10 candidates
🌍 [Step 5] Cross-Doc: 10 results from 2 documents

📊 [MMR] Selected 10/10 results | 4 sections | 7 pages
📊 [Step 6] MMR: 10 diverse results

🧠 [Confidence] Initial: high (0.85) - Strong top match (0.862), Good result diversity (gap=0.061), Good keyword coverage (avg 3.2 terms)
✅ [Step 7] Confidence: high (0.85) - no fallback needed

📊 [Summary] 10 results from 2 doc(s) in 145ms
   Sources: BankID Sweden v5 (5), BankID Norway v5.1 (5)
   Confidence: high (0.85)

📊 [Retrieval Complete]
   Results: 10
   Confidence: high (0.85)
   Intent: ONE_LINE
   Sources: BankID Sweden v5 (5), BankID Norway v5.1 (5)
   Time: 145ms
   Fallback attempts: 1

💬 [LLM] Calling with ONE_LINE template
```

---

## 🎨 Source Chip Labels

### **Before (Confusing):**
```
📄 BankID Sweden v5 Implementation Guidelines (Page 12)
📄 BankID Norway v5.1 API Reference (Page 8)
```

### **After (Clear):**
```
🇸🇪 Sweden: BankID Sweden v5 (p12)
🇳🇴 Norway: BankID Norway v5.1 (p8)
```

**Implementation in SourceChips.tsx:**
```typescript
import { formatSourceChip } from '@/lib/retrieval/crossDoc';

const { displayText, tooltip } = formatSourceChip({
  title: source.title,
  page: source.page,
  docLabel: source.docLabel,
  docCountry: source.docCountry,
  docProduct: source.docProduct,
  sourceParagraph: source.sourceParagraph
});

return (
  <button className="source-chip" title={tooltip}>
    {displayText}
  </button>
);
```

---

## ✅ Feature Flags

```bash
# .env.local
HYBRID_RETRIEVAL=true        # Enable FTS fusion (default: true)
CONFIDENCE_FALLBACK=true     # Enable auto-widen (default: true)
PROMPT_ROUTER_V2=true        # Enable strict templates (default: true)
DOMAIN_BOOSTING=true         # Enable pattern boosting (default: true)
MMR_DIVERSITY=true           # Enable diversity (default: true)
CROSS_DOC_MERGE=true         # Enable cross-doc (default: true)
```

**Gradual rollout:**
```typescript
const phase4Enabled = process.env.HYBRID_RETRIEVAL === 'true';

if (phase4Enabled) {
  const result = await retrieve({ /* Phase 4 */ });
} else {
  const chunks = await prisma.documentChunk.findMany({ /* Old */ });
}
```

---

## 🧪 Testing Checklist

After integration:

```bash
# 1. Test auth headers (ONE_LINE)
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "Which authentication headers are required?", "datasetId": "..."}'

# Expected: Copy-ready header blocks

# 2. Test endpoint (ENDPOINT)
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "Endpoint for starting BankID auth in Sweden?", "datasetId": "..."}'

# Expected: POST /bankidse/auth — purpose

# 3. Test JSON (JSON)
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "Show me sample JSON for sign request", "datasetId": "..."}'

# Expected: ```json { ... } ```

# 4. Test contact (CONTACT)
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "How do I contact support?", "datasetId": "..."}'

# Expected: `email@domain.com` (found in footer)

# 5. Test workflow (WORKFLOW)
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "How do I integrate BankID?", "datasetId": "..."}'

# Expected: 5-9 numbered steps with section citations
```

---

## 📈 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Retrieval Time | <120ms | Check `retrievalTimeMs` in logs |
| Total Latency | <1.8s | Measure end-to-end request time |
| Confidence "high" | >70% | Track `confidence.level` distribution |
| Fallback Rate | <15% | Track `metadata.attempts > 1` |
| Pass Rate (Eval) | ≥95% | Run golden eval |

---

## 🎉 Result

After integration, you'll see:

**Before:**
```
Query: "Which authentication headers are required?"
Answer: "You need authorization headers. Please refer to the documentation for details."
Confidence: Medium
Sources: 📄 Document 1 (p5)
```

**After:**
```
Query: "Which authentication headers are required?"
Answer:
**Required Authentication Headers:**

1. **Authorization**
```http
Authorization: Bearer <access_token>
```
• JWT Bearer token obtained from ZignSec's OAuth 2.0 token endpoint

2. **Zs-Product-Key**
```http
Zs-Product-Key: <your_product_subscription_key>
```
• ZignSec-issued key identifying your product subscription

**OAuth Token Endpoint:**
```http
POST https://gateway.zignsec.com/core/connect/token
```

Confidence: High
Sources: 🇸🇪 Sweden: BankID Sweden v5 (p12), 🇸🇪 Sweden: BankID Sweden v5 (p34)
```

---

**🚀 ChatGPT-level quality achieved!** 🎉

---

**Maintained by:** Avenai Development Team  
**Last Updated:** October 23, 2025

