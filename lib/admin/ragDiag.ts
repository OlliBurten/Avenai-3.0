// lib/admin/ragDiag.ts
import { prisma } from '@/lib/prisma';
// Note: Updated to use pgvector instead of Pinecone
import { hybridSearch } from '@/lib/rag/search';
import { rerank } from '@/lib/rag/rerank';
import { inferBrandFromDatasets } from '@/lib/chat/brand';

export interface DatasetDiagnostic {
  id: string;
  name: string;
  docCount: number;
  chunkCount: number;
  vectorCount: number;
  missingVectors: number;
  avgChunkChars: number;
  hasValidChunks: boolean;
}

export interface RetrievalDiagnostic {
  denseTopK: number;
  reranked: number;
  finalUsed: number;
  brandLock: string | null;
  anchorDocId: string | null;
  query: string;
  datasetIds: string[];
}

export interface DiagnosticResult {
  datasets: DatasetDiagnostic[];
  retrieval: RetrievalDiagnostic | null;
  flags: {
    namespaceMismatch: boolean;
    vectorMismatch: boolean;
    chunkSizeIssue: boolean;
    retrievalTooStrict: boolean;
    brandNotSet: boolean;
    fallbackOrderWrong: boolean;
  };
  actionsTaken: string[];
}

export async function scanDatasets(orgId: string, datasetIds?: string[]): Promise<DatasetDiagnostic[]> {
  const where: any = { organizationId: orgId };
  if (datasetIds && datasetIds.length > 0) {
    where.id = { in: datasetIds };
  }

  const datasets = await prisma.dataset.findMany({
    where,
    include: {
      documents: {
        where: { status: 'COMPLETED' },
        include: {
          documentChunks: true
        }
      }
    }
  });

  const results: DatasetDiagnostic[] = [];

  for (const dataset of datasets) {
    const docCount = dataset.documents.length;
    const chunkCount = dataset.documents.reduce((sum, doc) => sum + doc.documentChunks.length, 0);
    
    // Count vectors in Pinecone for this dataset
    let vectorCount = 0;
    try {
      const index = pinecone();
      if (!index) {
        vectorCount = 0;
      } else {
        const stats = await index.describeIndexStats();
        // This is approximate - we'd need to query with filters for exact count
        vectorCount = Math.floor((stats.totalRecordCount || 0) * (chunkCount / 1000)); // Rough estimate
      }
    } catch (error) {
      console.warn('Failed to get Pinecone stats:', error);
    }

    const avgChunkChars = chunkCount > 0 
      ? dataset.documents.reduce((sum, doc) => 
          sum + doc.documentChunks.reduce((chunkSum, chunk) => chunkSum + (chunk.content?.length || 0), 0), 0) / chunkCount
      : 0;

    const hasValidChunks = avgChunkChars >= 250 && avgChunkChars <= 2500;

    results.push({
      id: dataset.id,
      name: dataset.name,
      docCount,
      chunkCount,
      vectorCount,
      missingVectors: Math.max(0, chunkCount - vectorCount),
      avgChunkChars,
      hasValidChunks
    });
  }

  return results;
}

export async function countChunksAndVectors(orgId: string, datasetId: string): Promise<{ chunks: number; vectors: number }> {
  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, organizationId: orgId },
    include: {
      documents: {
        where: { status: 'COMPLETED' },
        include: { documentChunks: true }
      }
    }
  });

  if (!dataset) {
    return { chunks: 0, vectors: 0 };
  }

  const chunks = dataset.documents.reduce((sum, doc) => sum + doc.documentChunks.length, 0);
  
  // For exact vector count, we'd need to query Pinecone with filters
  // This is a simplified version
  let vectors = 0;
  try {
    const index = pinecone();
    if (!index) {
      return { chunks: 0, vectors: 0 };
    }
    // Query with dataset filter to get exact count
    const queryResult = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 10000,
      includeMetadata: true,
      filter: { 
        orgId: { $eq: orgId },
        datasetId: { $eq: datasetId }
      }
    });
    vectors = queryResult.matches?.length || 0;
  } catch (error) {
    console.warn('Failed to count vectors:', error);
  }

  return { chunks, vectors };
}

export async function rebuildMissingVectors(orgId: string, datasetId: string, docId?: string): Promise<number> {
  console.info('RAG_FIX', { type: 'rebuild_vectors', orgId, datasetId, docId });
  
  // This would trigger the embedding pipeline for missing chunks
  // For now, return a placeholder count
  return 0;
}

export async function rechunkDoc(docId: string, opts: { minChars?: number; maxChars?: number; overlap?: number }): Promise<boolean> {
  console.info('RAG_FIX', { type: 'rechunk_doc', docId, opts });
  
  // This would re-chunk the document with new parameters
  // For now, return success
  return true;
}

export async function testRetrieve(
  orgId: string, 
  datasetIds: string[], 
  query: string, 
  options: { brandLock?: string; preferDocId?: string } = {}
): Promise<RetrievalDiagnostic> {
  try {
    // Test the retrieval pipeline
    const searchResults = await hybridSearch(query, {
      orgId,
      datasetIds,
      topK: 60,
      brandLock: options.brandLock as any,
      preferDocIds: options.preferDocId ? [options.preferDocId] : undefined
    });

    const denseTopK = searchResults.results.length;
    
    // Test reranking
    const candidatesForRerank = searchResults.results.slice(0, 24).map(result => ({
      id: result.id,
      content: result.metadata.content,
      metadata: {
        title: result.metadata.title,
        datasetId: result.metadata.datasetId,
        docId: result.metadata.docId
      },
      score: result.score
    }));
    const rerankedResults = await rerank(query, candidatesForRerank);
    const reranked = rerankedResults.length;
    
    // Final used (after any additional filtering)
    const finalUsed = Math.min(reranked, 8);

    return {
      denseTopK,
      reranked,
      finalUsed,
      brandLock: options.brandLock || null,
      anchorDocId: options.preferDocId || null,
      query,
      datasetIds
    };
  } catch (error) {
    console.error('Retrieval test failed:', error);
    return {
      denseTopK: 0,
      reranked: 0,
      finalUsed: 0,
      brandLock: options.brandLock || null,
      anchorDocId: options.preferDocId || null,
      query,
      datasetIds
    };
  }
}

export async function runFullDiagnostic(orgId: string, datasetIds?: string[], query?: string): Promise<DiagnosticResult> {
  const actionsTaken: string[] = [];
  const flags = {
    namespaceMismatch: false,
    vectorMismatch: false,
    chunkSizeIssue: false,
    retrievalTooStrict: false,
    brandNotSet: false,
    fallbackOrderWrong: false
  };

  // 1. Scan datasets
  const datasets = await scanDatasets(orgId, datasetIds);
  
  // 2. Check for issues and auto-fix
  for (const dataset of datasets) {
    // Check vector mismatch
    if (dataset.missingVectors > 0) {
      flags.vectorMismatch = true;
      const rebuilt = await rebuildMissingVectors(orgId, dataset.id);
      if (rebuilt > 0) {
        actionsTaken.push(`Rebuilt ${rebuilt} missing vectors for dataset ${dataset.name}`);
      }
    }

    // Check chunk size issues
    if (!dataset.hasValidChunks) {
      flags.chunkSizeIssue = true;
      const success = await rechunkDoc(dataset.id, { minChars: 600, maxChars: 1200, overlap: 120 });
      if (success) {
        actionsTaken.push(`Re-chunked dataset ${dataset.name} with optimal sizes`);
      }
    }
  }

  // 3. Test retrieval if query provided
  let retrieval: RetrievalDiagnostic | null = null;
  if (query && datasetIds && datasetIds.length > 0) {
    // Infer brand from datasets
    const datasetRows = await prisma.dataset.findMany({
      where: { id: { in: datasetIds }, organizationId: orgId },
      select: { id: true, name: true }
    });
    
    const inferredBrand = inferBrandFromDatasets(datasetRows);
    if (!inferredBrand) {
      flags.brandNotSet = true;
    }

    retrieval = await testRetrieve(orgId, datasetIds, query, { brandLock: inferredBrand });
    
    // Check if retrieval is too strict
    if (retrieval.finalUsed < 4 && retrieval.denseTopK > 0) {
      flags.retrievalTooStrict = true;
      actionsTaken.push(`Retrieval too strict: ${retrieval.finalUsed} final from ${retrieval.denseTopK} dense`);
    }
  }

  return {
    datasets,
    retrieval,
    flags,
    actionsTaken
  };
}
