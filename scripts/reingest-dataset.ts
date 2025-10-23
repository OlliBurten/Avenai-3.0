#!/usr/bin/env tsx
/**
 * Re-ingestion Script for Dataset
 * 
 * Re-processes all documents in a dataset using doc-worker V2 to populate metadata
 * 
 * Usage:
 *   npm run reingest -- --datasetId <id> --pipeline v2 --batch 5
 *   
 * Options:
 *   --datasetId <id>   Dataset to re-ingest (required)
 *   --pipeline <v1|v2> Force V1 or V2 (default: auto)
 *   --batch <number>   Batch size (default: 100, max: 1000)
 *   --documentId <id>  Re-ingest single document only
 *   --dry-run          Show what would be done without doing it
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { prisma } from '@/lib/prisma';
import { reprocessDocument } from '@/lib/documents/reprocess';

interface ReIngestOptions {
  datasetId?: string;
  documentId?: string;
  pipeline?: 'v1' | 'v2' | 'auto';
  batch?: number;
  embeddingBatch?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

async function parseArgs(): Promise<ReIngestOptions> {
  const args = process.argv.slice(2);
  const options: ReIngestOptions = {
    pipeline: 'auto',
    batch: 5,  // Process 5 documents at a time by default
    embeddingBatch: 128,  // Batch embeddings 128 at a time (OpenAI limit is 2048)
    dryRun: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--datasetId':
      case '--dataset':
        options.datasetId = next;
        i++;
        break;
      case '--documentId':
      case '--document':
        options.documentId = next;
        i++;
        break;
      case '--pipeline':
        if (next === 'v1' || next === 'v2' || next === 'auto') {
          options.pipeline = next;
        }
        i++;
        break;
      case '--batch':
        options.batch = Math.min(1000, Math.max(1, parseInt(next, 10)));
        i++;
        break;
      case '--embedding-batch':
        options.embeddingBatch = Math.min(256, Math.max(1, parseInt(next, 10)));
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
    }
  }

  return options;
}

async function getDocumentsToReingest(options: ReIngestOptions) {
  const where: any = {
    status: 'COMPLETED'  // Only re-ingest completed documents
  };

  if (options.documentId) {
    where.id = options.documentId;
  } else if (options.datasetId) {
    where.datasetId = options.datasetId;
  } else {
    throw new Error('Either --datasetId or --documentId required');
  }

  const documents = await prisma.document.findMany({
    where,
    select: {
      id: true,
      title: true,
      organizationId: true,
      datasetId: true,
      indexedChunks: true,
      pages: true,
      contentType: true
    },
    orderBy: { createdAt: 'asc' }
  });

  return documents;
}

async function reingestDocument(documentId: string, pipeline: 'v1' | 'v2' | 'auto') {
  console.log(`  🔄 Re-ingesting: ${documentId.substring(0, 12)}...`);
  
  try {
    // Set pipeline preference via environment variable
    if (pipeline === 'v2') {
      process.env.DOC_WORKER_V2 = 'true';
    } else if (pipeline === 'v1') {
      process.env.DOC_WORKER_V2 = 'false';
    }

    await reprocessDocument(documentId);
    
    console.log(`  ✅ Success: ${documentId.substring(0, 12)}`);
    return { success: true };
  } catch (error: any) {
    console.error(`  ❌ Failed: ${documentId.substring(0, 12)} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkMetadataCoverage(documentId: string) {
  const stats = await prisma.$queryRaw<Array<{
    total: bigint;
    with_section_path: bigint;
    with_element_type: bigint;
    with_verbatim: bigint;
  }>>`
    SELECT 
      COUNT(*) as total,
      COUNT(section_path) as with_section_path,
      COUNT(CASE WHEN metadata->>'element_type' IS NOT NULL THEN 1 END) as with_element_type,
      COUNT(CASE WHEN (metadata->>'has_verbatim')::boolean = true THEN 1 END) as with_verbatim
    FROM document_chunks
    WHERE "documentId" = ${documentId}
  `;

  const row = stats[0];
  const total = Number(row?.total || 0);
  const withSection = Number(row?.with_section_path || 0);
  const withElement = Number(row?.with_element_type || 0);
  const withVerbatim = Number(row?.with_verbatim || 0);

  return {
    total,
    withSectionPath: withSection,
    withElementType: withElement,
    withVerbatim: withVerbatim,
    sectionPathCoverage: total > 0 ? ((withSection / total) * 100).toFixed(1) + '%' : '0%',
    elementTypeCoverage: total > 0 ? ((withElement / total) * 100).toFixed(1) + '%' : '0%',
    verbatimCoverage: total > 0 ? ((withVerbatim / total) * 100).toFixed(1) + '%' : '0%'
  };
}

async function main() {
  console.log('🚀 Avenai Dataset Re-Ingestion Tool');
  console.log('=' .repeat(60));

  const options = await parseArgs();

  console.log('\n📋 Configuration:');
  console.log('  Dataset ID:', options.datasetId || 'N/A');
  console.log('  Document ID:', options.documentId || 'N/A');
  console.log('  Pipeline:', options.pipeline);
  console.log('  Document batch size:', options.batch);
  console.log('  Embedding batch size:', options.embeddingBatch);
  console.log('  Dry run:', options.dryRun ? 'YES' : 'NO');
  console.log('  Verbose:', options.verbose ? 'YES' : 'NO');
  console.log('');
  
  // Set embedding batch size in environment for DocumentProcessor
  if (options.embeddingBatch) {
    process.env.EMBEDDING_BATCH_SIZE = options.embeddingBatch.toString();
  }

  // Get documents to re-ingest
  console.log('🔍 Finding documents...');
  const documents = await getDocumentsToReingest(options);

  if (documents.length === 0) {
    console.log('❌ No documents found matching criteria');
    process.exit(1);
  }

  console.log(`\n✅ Found ${documents.length} document(s) to re-ingest:`);
  documents.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.title} (${doc.indexedChunks || 0} chunks, ${doc.pages || 0} pages)`);
  });

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made');
    process.exit(0);
  }

  // Confirm before proceeding
  console.log('\n⚠️  This will delete and recreate all chunks for these documents.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Process documents in batches
  const batchSize = options.batch || 5;
  const batches = Math.ceil(documents.length / batchSize);
  
  const results = {
    total: documents.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ documentId: string; error: string }>,
    totalChunks: 0,
    totalEmbeddings: 0,
    startTime: Date.now()
  };

  console.log(`\n🔄 Processing ${documents.length} documents in ${batches} batch(es)...\n`);

  for (let batchNum = 0; batchNum < batches; batchNum++) {
    const start = batchNum * batchSize;
    const end = Math.min(start + batchSize, documents.length);
    const batch = documents.slice(start, end);
    
    const batchStartTime = Date.now();

    console.log(`📦 Batch ${batchNum + 1}/${batches} (documents ${start + 1}-${end}):`);

    for (const doc of batch) {
      const docStartTime = Date.now();
      const result = await reingestDocument(doc.id, options.pipeline || 'auto');
      const docEndTime = Date.now();
      const docDuration = ((docEndTime - docStartTime) / 1000).toFixed(1);
      
      if (result.success) {
        results.success++;
        
        // Check metadata coverage
        const coverage = await checkMetadataCoverage(doc.id);
        results.totalChunks += coverage.total;
        results.totalEmbeddings += coverage.total;  // Assume all chunks get embeddings
        
        if (options.verbose) {
          console.log(`     📊 Coverage: section_path=${coverage.sectionPathCoverage}, element_type=${coverage.elementTypeCoverage}, verbatim=${coverage.verbatimCoverage}`);
          console.log(`     ⏱️  Duration: ${docDuration}s (${coverage.total} chunks)`);
        } else {
          console.log(`     ✅ ${coverage.total} chunks | section_path=${coverage.sectionPathCoverage} | ${docDuration}s`);
        }
      } else {
        results.failed++;
        results.errors.push({
          documentId: doc.id,
          error: result.error || 'Unknown error'
        });
      }
    }
    
    const batchEndTime = Date.now();
    const batchDuration = ((batchEndTime - batchStartTime) / 1000).toFixed(1);
    
    // Calculate progress and ETA
    const processed = start + batch.length;
    const remaining = documents.length - processed;
    const avgTimePerDoc = (batchEndTime - results.startTime) / processed;
    const etaSeconds = Math.round((avgTimePerDoc * remaining) / 1000);
    const etaMinutes = Math.floor(etaSeconds / 60);
    const etaSecondsRemainder = etaSeconds % 60;
    
    console.log(`     ⏱️  Batch completed in ${batchDuration}s`);
    if (remaining > 0) {
      console.log(`     📈 Progress: ${processed}/${documents.length} (${Math.round((processed / documents.length) * 100)}%) | ETA: ${etaMinutes}m ${etaSecondsRemainder}s`);
    }
    console.log('');
  }

  // Summary
  const totalDuration = ((Date.now() - results.startTime) / 1000).toFixed(1);
  const avgTimePerDoc = results.success > 0 ? ((Date.now() - results.startTime) / results.success / 1000).toFixed(1) : '0';
  
  console.log('=' .repeat(60));
  console.log('📊 Re-Ingestion Complete');
  console.log('=' .repeat(60));
  console.log(`Total documents: ${results.total}`);
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📦 Total chunks: ${results.totalChunks.toLocaleString()}`);
  console.log(`🔢 Total embeddings: ${results.totalEmbeddings.toLocaleString()}`);
  console.log(`⏱️  Total duration: ${totalDuration}s (avg ${avgTimePerDoc}s per document)`);
  console.log(`📈 Success rate: ${results.total > 0 ? Math.round((results.success / results.total) * 100) : 0}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(err => {
      console.log(`  - ${err.documentId.substring(0, 12)}: ${err.error}`);
    });
    console.log(`\n⚠️  Error rate: ${((results.errors.length / results.total) * 100).toFixed(1)}%`);
  }

  // Overall metadata coverage
  console.log('\n📊 Overall Metadata Coverage:');
  const overallCoverage = await checkMetadataCoverage(
    options.documentId || documents[0]?.id || ''
  );
  console.log(`  Section Path: ${overallCoverage.sectionPathCoverage}`);
  console.log(`  Element Type: ${overallCoverage.elementTypeCoverage}`);
  console.log(`  Verbatim Blocks: ${overallCoverage.verbatimCoverage}`);

  console.log('\n✅ Re-ingestion complete!\n');
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });



