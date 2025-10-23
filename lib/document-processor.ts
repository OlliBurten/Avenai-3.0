import { prisma } from '@/lib/prisma'
import { getEmbeddings } from '@/lib/embeddings'
import { storeEmbedding, batchStoreEmbeddings } from '@/lib/pgvector'
import { log } from './log'

// Chunking
const CHARS_PER_CHUNK = 1200
const CHARS_OVERLAP = 200

/**
 * Extract section path from text (hierarchy detection)
 */
function extractSectionPath(text: string, previousPath?: string): string | undefined {
  // Look for heading patterns
  const headingPatterns = [
    /^#{1,6}\s+(.+)$/m,  // Markdown headings
    /^([A-Z][A-Z\s]+):?\s*$/m,  // ALL CAPS headings
    /^(\d+\.\s+[A-Z].+)$/m,  // Numbered sections
  ];
  
  for (const pattern of headingPatterns) {
    const match = text.match(pattern);
    if (match) {
      const heading = match[1].trim();
      // Build hierarchical path
      let path: string;
      if (previousPath) {
        path = `${previousPath} > ${heading}`;
      } else {
        path = heading;
      }
      
      // Truncate to avoid database index size limit (2704 bytes max)
      if (path.length > 2000) {
        path = path.substring(0, 2000) + "...";
      }
      
      return path;
    }
  }
  
  return previousPath; // Inherit from previous chunk
}

function splitIntoChunks(text: string, size = CHARS_PER_CHUNK, overlap = CHARS_OVERLAP) {
  const chunks: { index: number; text: string; pageStart?: number; pageEnd?: number; forcedSafeChunk?: boolean; sectionPath?: string; elementType?: string; heading?: string }[] = []
  if (!text) return chunks
  
  let i = 0
  let start = 0
  let currentSectionPath: string | undefined = undefined
  let currentHeading: string | undefined = undefined
  
  while (start < text.length) {
    const end = Math.min(text.length, start + size)
    const chunkText = text.slice(start, end).replace(/\s+/g, ' ').trim()
    
    if (chunkText.length > 0) {
      // Extract section path and heading
      const sectionPath = extractSectionPath(chunkText, currentSectionPath);
      if (sectionPath && sectionPath !== currentSectionPath) {
        currentSectionPath = sectionPath;
        currentHeading = sectionPath.split(' > ').pop();
      }
      
      chunks.push({ 
        index: i++, 
        text: chunkText,
        sectionPath: currentSectionPath,
        heading: currentHeading
      });
    }
    
    if (end === text.length) break
    start = Math.max(start + size - overlap, end)
  }
  
  return chunks
}

/**
 * Insert chunks into prisma.documentChunk using whatever text field your schema has.
 * We try in order: 'content', 'text', 'body'. First one that works wins.
 */
function sanitizeText(text: string): string {
  // Remove null bytes and other invalid UTF-8 sequences
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .replace(/\uFFFD/g, '') // Remove replacement characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Detect element type from content
 */
function detectElementType(content: string): string {
  // Check for JSON blocks
  if (/\{\s*["']?\w+["']?\s*:/.test(content) && content.includes('}')) {
    return 'json';
  }
  
  // Check for tables (pipe-separated or multiple columns)
  if (/\|.*\|.*\|/.test(content) || /^(GET|POST|PUT|DELETE)\s+\/v\d+/m.test(content)) {
    return 'table';
  }
  
  // Check for code blocks
  if (/```|`\w+`|function\s+\w+\(|class\s+\w+/.test(content)) {
    return 'code';
  }
  
  // Check for lists
  if (/^\s*[-•*]\s+/m.test(content) || /^\s*\d+\.\s+/m.test(content)) {
    return 'list';
  }
  
  // Check for headings
  if (/^#{1,6}\s+/m.test(content) || /^[A-Z][A-Z\s]+:?\s*$/m.test(content)) {
    return 'heading';
  }
  
  // Default to paragraph
  return 'paragraph';
}

async function insertChunks(
  documentId: string, 
  chunks: { 
    index: number; 
    text: string; 
    pageStart?: number; 
    pageEnd?: number; 
    forcedSafeChunk?: boolean; 
    sectionPath?: string; 
    elementType?: string; 
    heading?: string;
    hasVerbatim?: boolean;
    verbatimBlock?: string;
  }[], 
  organizationId: string, 
  datasetId?: string
) {
  // Enhanced chunk insertion with section_path and enriched metadata
  try {
    const data = chunks.map((c) => {
      const content = sanitizeText(c.text);
      
      // Use provided element type (from doc-worker V2) or detect from content
      const elementType = c.elementType || detectElementType(content);
      
      // Use provided verbatim info (from doc-worker V2) or detect from content
      const hasVerbatim = c.hasVerbatim !== undefined ? c.hasVerbatim : false;
      const verbatimBlock = c.verbatimBlock || null;
      
      // Fallback: detect if chunk contains JSON (for V1 compatibility)
      const hasJson = hasVerbatim || (/\{\s*["']?\w+["']?\s*:/.test(content) && content.length > 100);
      
      // Calculate page number
      const page = c.pageStart || c.index + 1;
      
      // Fallback: Extract verbatim block if present (for V1 compatibility)
      const detectedVerbatimMatch = !verbatimBlock ? content.match(/\{[\s\S]{50,32768}\}/) : null;
      let finalVerbatimBlock = verbatimBlock || (detectedVerbatimMatch ? detectedVerbatimMatch[0].substring(0, 32768) : null);
      
      // Truncate verbatim_block to avoid database size limits
      if (finalVerbatimBlock && finalVerbatimBlock.length > 2000) {
        finalVerbatimBlock = finalVerbatimBlock.substring(0, 2000) + "...";
      }
      
      const verbatimHash = finalVerbatimBlock 
        ? require('crypto').createHash('sha1').update(finalVerbatimBlock).digest('hex').substring(0, 16)
        : null;
      
      // Truncate sectionPath to avoid database index size limit (2704 bytes max)
      const truncatedSectionPath = c.sectionPath && c.sectionPath.length > 2000 
        ? c.sectionPath.substring(0, 2000) + "..." 
        : c.sectionPath || null;

      return {
        documentId,
        organizationId,
        chunkIndex: c.index,
        content,
        sectionPath: truncatedSectionPath,  // Truncated hierarchy path from V2
        metadata: {
          element_type: elementType,  // From V2 or detected
          page,
          has_verbatim: hasVerbatim || hasJson,  // From V2 or detected
          ...(finalVerbatimBlock ? { verbatim_block: finalVerbatimBlock } : {}),
          ...(verbatimHash ? { verbatim_hash: verbatimHash } : {}),
          ...(c.heading ? { heading: c.heading } : {}),
          ...(c.pageStart ? { pageStart: c.pageStart } : {}),
          ...(c.pageEnd ? { pageEnd: c.pageEnd } : {}),
          ...(c.forcedSafeChunk ? { forcedSafeChunk: c.forcedSafeChunk } : {}),
          ...(datasetId ? { datasetId } : {})
        },
      };
    });

    console.log(`[insertChunks] Attempting to insert ${chunks.length} chunks for document ${documentId}`)
    console.log(`[insertChunks] Sample chunk content length:`, data[0]?.content?.length || 0)

    await prisma.documentChunk.deleteMany({ where: { documentId } })
    const result = await prisma.documentChunk.createMany({ data })
    
    console.log(`[insertChunks] Successfully inserted ${result.count} chunks`)
    return { usedField: 'content', count: chunks.length }
  } catch (e: any) {
    console.error(`[insertChunks] Failed to insert chunks:`, e)
    console.error(`[insertChunks] Error message:`, e?.message)
    console.error(`[insertChunks] Error code:`, e?.code)
    throw new Error(`Chunk insert failed: ${e?.message || String(e)}`)
  }
}

export class DocumentProcessor {
  /**
   * Process a document from doc-worker V2 structured items (metadata-rich)
   * Returns chunkCount and embedded vector count.
   */
  async processDocumentV2(
    documentId: string,
    items: Array<{
      text: string;
      page: number;
      section_path?: string;
      element_type?: 'table' | 'code' | 'header' | 'paragraph' | 'footer' | 'list';
      has_verbatim?: boolean;
      verbatim_block?: string;
    }>,
    organizationId: string,
    datasetId?: string,
    title?: string
  ): Promise<{ chunkCount: number; embedded: number; field: string; method?: string; version: 'v2' }> {
    const startTime = Date.now();
    log.proc('start:v2', { documentId, items: items.length, organizationId, datasetId });

    if (!items || items.length === 0) {
      throw new Error('No items provided from doc-worker V2');
    }

    // Get document metadata
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, organizationId: true, datasetId: true }
    });
    if (!doc) throw new Error('Document not found');

    // Convert V2 items to chunks format
    const chunks = items.map((item, index) => ({
      index,
      text: sanitizeText(item.text),
      pageStart: item.page,
      pageEnd: item.page,
      sectionPath: item.section_path,
      elementType: item.element_type,
      hasVerbatim: item.has_verbatim,
      verbatimBlock: item.verbatim_block
    }));

    console.log('📄 DocumentProcessor V2: Processing chunks:', {
      documentId,
      totalChunks: chunks.length,
      withSectionPath: chunks.filter(c => c.sectionPath).length,
      withElementType: chunks.filter(c => c.elementType).length,
      withVerbatim: chunks.filter(c => c.hasVerbatim).length
    });

    // Insert chunks with V2 metadata
    const insertResult = await insertChunks(doc.id, chunks as any, doc.organizationId, doc.datasetId || undefined);
    console.log('📄 DocumentProcessor V2: Chunks inserted:', {
      documentId,
      usedField: insertResult.usedField,
      chunkCount: insertResult.count
    });

    // Get chunk IDs from database
    const dbChunks = await prisma.documentChunk.findMany({
      where: { documentId: doc.id },
      select: { id: true, chunkIndex: true, content: true },
      orderBy: { chunkIndex: 'asc' }
    });

    console.log('📄 DocumentProcessor V2: Retrieved chunk IDs:', {
      documentId,
      dbChunkCount: dbChunks.length
    });

    // Generate embeddings
    let embedded = 0;
    try {
      console.log('📄 DocumentProcessor V2: Starting embedding generation');
      const texts = dbChunks.map(c => c.content);
      const embeddings = await getEmbeddings(texts);
      
      console.log('📄 DocumentProcessor V2: Embeddings generated:', {
        documentId,
        embeddingCount: embeddings.length
      });

      // Store embeddings in pgvector
      await batchStoreEmbeddings(
        dbChunks.map((chunk, idx) => ({
          chunkId: chunk.id,
          embedding: embeddings[idx]
        }))
      );

      embedded = embeddings.length;
      console.log('📄 DocumentProcessor V2: Embeddings stored in pgvector:', {
        documentId,
        embedded
      });
    } catch (embErr) {
      console.error('📄 DocumentProcessor V2: Embedding failed:', embErr);
      // Non-fatal: document still created, just without embeddings
    }

    const elapsed = Date.now() - startTime;
    console.log('✅ DocumentProcessor V2: Processing complete:', {
      documentId,
      chunks: chunks.length,
      embedded,
      elapsedMs: elapsed
    });

    return {
      chunkCount: chunks.length,
      embedded,
      field: 'content',
      method: 'v2',
      version: 'v2'
    };
  }

  /**
   * Process a document from rawText (extracted in the upload route).
   * Returns chunkCount and embedded vector count.
   */
  async processDocument(documentId: string, rawText: string, organizationId: string, datasetId?: string, title?: string): Promise<{ chunkCount: number; embedded: number; field: string; method?: string; textLen?: number; printable?: number; detail?: string }> {
    const startTime = Date.now();
    log.proc('start', { documentId, rawLen: rawText?.length, organizationId, datasetId })
    
    if (!rawText || rawText.trim().length < 10) {
      throw new Error('No text provided to process (extraction likely failed)')
    }

    // Get minimal document metadata
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, organizationId: true, datasetId: true }
    })
    if (!doc) throw new Error('Document not found')

    const chunks = splitIntoChunks(rawText)
    console.log('📄 DocumentProcessor: Initial chunks created:', { 
      documentId, 
      totalChunks: chunks.length,
      avgChunkSize: chunks.length > 0 ? Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length) : 0
    });
    
    if (chunks.length === 0) throw new Error('No chunks produced')

    // --- QUALITY FILTERS (more forgiving, but still block garbage) ---
    const API_HINTS = /\b(bankid|endpoint|authenticate|authorization|token|initiate|collect|redirect|callback|status|error|zignsec|norway)\b/i

    function printableRatio(s: string) {
      if (!s) return 0
      const printable = (s.match(/[ -~]/g) || []).length
      return printable / Math.max(1, s.length)
    }

    function passesSoftFilters(t: string) {
      const lenOK = t.length >= 120 // was 200; allow shorter, real sentences
      const alpha = (t.match(/[A-Za-z]/g) || []).length
      const alphaOK = alpha >= 60 // was 100
      const prOK = printableRatio(t) >= 0.6 // was 0.75
      const hintsOK = API_HINTS.test(t)
      return (lenOK && alphaOK && prOK) || hintsOK
    }

    const filtered = chunks.filter(c => passesSoftFilters(c.text || ''))
    console.log('📄 DocumentProcessor: Quality filtering applied:', { 
      documentId, 
      originalChunks: chunks.length,
      filteredChunks: filtered.length,
      filteredOut: chunks.length - filtered.length
    });

    // If filtering got too aggressive, keep the top-N original chunks by length (fallback)
    if (filtered.length < 8) {
      const topByLength = [...chunks].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0)).slice(0, 12)
      // Merge unique
      const seen = new Set<string>()
      for (const c of [...filtered, ...topByLength]) {
        const k = (c.text || '').slice(0, 100)
        if (!seen.has(k) && (c.text || '').trim().length > 0) {
          seen.add(k)
          filtered.push(c)
          if (filtered.length >= 12) break
        }
      }
    }

    let finalChunks = filtered

    // ---------- SAFE INGEST MODE ----------
    const SAFE_MODE = process.env.AVENAI_INGEST_SAFE === '1'
    const MIN_CHUNKS = Math.max(1, Number(process.env.AVENAI_MIN_CHUNKS || '1'))
    const FIRST_CHARS = Math.max(2000, Number(process.env.AVENAI_FIRST_CHARS || '8000'))

    // If filtering was too strict or we somehow lost everything, force a minimal chunk.
    if (SAFE_MODE && finalChunks.length < MIN_CHUNKS) {
      log.proc('SAFE MODE: forcing minimal chunk')
      const raw = (rawText || '').replace(/\s+/g, ' ').trim()
      const sample = raw.slice(0, FIRST_CHARS)
      if (sample.length >= 200) {
        finalChunks = [{
          index: 0,
          text: sample,
          // keep any fields your code expects (e.g., pageStart/pageEnd)
          pageStart: 1,
          pageEnd: 1,
          forcedSafeChunk: true
        }]
      }
    }

    // Quality gate: ensure we have chunks after processing
    if (finalChunks.length === 0) {
      throw new Error('NO_CHUNKS_AFTER_PROCESSING')
    }

    // Insert chunks with automatic field detection
    console.log('📄 DocumentProcessor: Inserting chunks to database:', { 
      documentId, 
      finalChunks: finalChunks.length,
      organizationId: doc.organizationId,
      datasetId: doc.datasetId
    });
    
    let insertResult;
    try {
      insertResult = await insertChunks(doc.id, finalChunks, doc.organizationId, doc.datasetId || undefined);
      console.log('📄 DocumentProcessor: Chunks inserted successfully:', { 
        documentId, 
        usedField: insertResult.usedField,
        chunkCount: insertResult.count
      });
    } catch (error) {
      console.error('📄 DocumentProcessor: Failed to insert chunks to database:', error);
      throw error; // Re-throw to prevent marking as completed
    }

    // Get the actual chunk IDs from the database for Pinecone
    const dbChunks = await prisma.documentChunk.findMany({
      where: { documentId: doc.id },
      select: { id: true, chunkIndex: true },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log('📄 DocumentProcessor: Retrieved chunk IDs from database:', { 
      documentId, 
      dbChunkCount: dbChunks.length
    });

    // pgvector embedding storage (replaces Pinecone)
    let embedded = 0
    try {
      console.log('📄 DocumentProcessor: Starting pgvector embedding process:', { 
        documentId, 
        orgId: doc.organizationId,
        datasetId: doc.datasetId,
        totalChunks: finalChunks.length
      });
      
      // --- PGVECTOR STORAGE (skip small chunks; do not throw) ---
      const VECTOR_MIN = 80 // accept shorter vectors now
      const textsToEmbed = []
      const chunksToEmbed = []

      // First, collect texts that meet the minimum length requirement
      for (let i = 0; i < finalChunks.length; i++) {
        const chunkText = finalChunks[i].text || ''
        if (chunkText.length >= VECTOR_MIN) {
          const dbChunk = dbChunks.find(c => c.chunkIndex === i);
          if (dbChunk) {
            textsToEmbed.push(chunkText)
            chunksToEmbed.push({ chunkId: dbChunk.id, chunkIndex: i })
          }
        }
      }

      // Only proceed if we have texts to embed
      if (textsToEmbed.length > 0) {
        console.log('📄 DocumentProcessor: Generating embeddings:', { 
          documentId, 
          textsToEmbed: textsToEmbed.length,
          totalTextLength: textsToEmbed.reduce((sum, text) => sum + text.length, 0)
        });
        
        const embeddingStartTime = Date.now();
        const embeddings = await getEmbeddings(textsToEmbed)
        const embeddingTime = Date.now() - embeddingStartTime;
        
        // Console counter for embedding job time
        console.log(`📊 embedding_job_time_ms: ${embeddingTime}`);
        
        console.log('📄 DocumentProcessor: Embeddings generated:', { 
          documentId, 
          embeddingCount: embeddings.length,
          embeddingTime: `${embeddingTime}ms`
        });

        try {
          // Store embeddings in pgvector (batch operation for speed)
          const embeddingsToStore = chunksToEmbed.map((chunk, idx) => ({
            chunkId: chunk.chunkId,
            embedding: embeddings[idx]
          }));
          
          if (embeddingsToStore.length > 0) {
            const pgvectorStartTime = Date.now();
            
            console.log('📄 DocumentProcessor: Storing embeddings in pgvector:', { 
              documentId, 
              totalEmbeddings: embeddingsToStore.length
            });
            
            // Store embeddings in pgvector
            await batchStoreEmbeddings(embeddingsToStore);
            
            const pgvectorTime = Date.now() - pgvectorStartTime;
            embedded = embeddingsToStore.length;
            
            console.log('📄 DocumentProcessor: pgvector storage completed:', { 
              documentId, 
              storedEmbeddings: embedded,
              pgvectorTime: `${pgvectorTime}ms`
            });
          } else {
            console.warn('📄 DocumentProcessor: No embeddings to store');
          }
        } catch (e) {
          console.warn('📄 DocumentProcessor: pgvector storage failed, continuing:', e)
        }
      } else {
        console.warn('📄 DocumentProcessor: No texts to embed (all too small). Proceeding without embeddings.');
      }
    } catch (e) {
      log.warn('pgvector embedding storage failed (continuing):', e)
    }

    const totalTime = Date.now() - startTime;
    console.log('📄 DocumentProcessor: Processing completed:', { 
      documentId, 
      totalTime: `${totalTime}ms`,
      chunks: finalChunks.length, 
      embedded, 
      safeMode: SAFE_MODE && finalChunks.length === 1
    });
    
    log.proc('done', { created: finalChunks.length, embedded, safeMode: SAFE_MODE && finalChunks.length === 1 })
    
    return { 
      chunkCount: finalChunks.length, 
      embedded, 
      field: insertResult.usedField,
      method: 'document-processor',
      textLen: rawText.length,
      printable: printableRatio(rawText),
      detail: SAFE_MODE && finalChunks.length === 1 ? 'Used safe mode to create minimal chunk' : undefined
    }
  }
}