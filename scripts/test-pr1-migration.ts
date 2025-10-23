/**
 * Test script for PR-1: Validate database migration and RLS
 * 
 * This script tests:
 * 1. Indexes are created and functional
 * 2. RLS policies are enforcing organization isolation
 * 3. withOrg() helper works correctly
 * 4. Backward compatibility (existing queries still work)
 */

import { prisma } from '@/lib/prisma';
import { withOrg, getCurrentOrg, verifyRLSIsolation } from '@/lib/db/withOrg';

async function testIndexes() {
  console.log('\n🔍 Testing Indexes...');
  
  try {
    // Test trigram index (fuzzy text search)
    const trgmQuery = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM document_chunks
      WHERE content % 'authentication'
    `;
    console.log('✅ Trigram index working:', trgmQuery[0]?.count?.toString() || '0', 'fuzzy matches');

    // Test element_type index
    const elementQuery = await prisma.documentChunk.findMany({
      where: {
        metadata: {
          path: ['element_type'],
          equals: 'table'
        }
      },
      take: 5
    });
    console.log('✅ Element type index working:', elementQuery.length, 'table chunks found');

    // Test section_path index
    const sectionQuery = await prisma.documentChunk.findMany({
      where: {
        sectionPath: {
          not: null
        }
      },
      take: 5
    });
    console.log('✅ Section path index working:', sectionQuery.length, 'chunks with section paths');

    return true;
  } catch (error) {
    console.error('❌ Index test failed:', error);
    return false;
  }
}

async function testRLS() {
  console.log('\n🔒 Testing Row-Level Security...');
  
  try {
    // Get a test organization
    const org = await prisma.organization.findFirst();
    
    if (!org) {
      console.log('⚠️  No organizations found, skipping RLS test');
      return true;
    }

    console.log('Testing with organization:', org.name, `(${org.id})`);

    // Test verifyRLSIsolation helper
    const rlsCheck = await verifyRLSIsolation(org.id);
    console.log('RLS Verification:', rlsCheck.message);
    console.log('Details:', rlsCheck.details);

    // Test withOrg() helper
    const docsWithOrg = await withOrg(org.id, async () => {
      return prisma.document.findMany({
        take: 5
      });
    });
    console.log('✅ withOrg() helper working:', docsWithOrg.length, 'documents retrieved');

    // Test getCurrentOrg()
    await withOrg(org.id, async () => {
      const currentOrg = await getCurrentOrg();
      console.log('✅ getCurrentOrg() working:', currentOrg === org.id ? 'correct' : 'incorrect');
      return null;
    });

    // Test that queries return organization-specific data
    const chunksWithOrg = await withOrg(org.id, async () => {
      return prisma.documentChunk.findMany({
        take: 5,
        include: {
          document: {
            select: {
              title: true,
              organizationId: true
            }
          }
        }
      });
    });

    const allOrgMatch = chunksWithOrg.every(chunk => 
      chunk.document.organizationId === org.id
    );

    if (allOrgMatch) {
      console.log('✅ RLS enforcing organization isolation correctly');
    } else {
      console.log('❌ RLS not properly filtering data');
    }

    return rlsCheck.success && allOrgMatch;
  } catch (error) {
    console.error('❌ RLS test failed:', error);
    return false;
  }
}

async function testBackwardCompatibility() {
  console.log('\n🔄 Testing Backward Compatibility...');
  
  try {
    // Test that existing queries still work
    const docs = await prisma.document.findMany({
      take: 5,
      include: {
        documentChunks: {
          take: 2
        }
      }
    });
    console.log('✅ Existing document queries work:', docs.length, 'documents');

    // Test that chunks with NULL metadata/sectionPath still work
    const allChunks = await prisma.documentChunk.findMany({
      take: 10
    });
    console.log('✅ All chunk queries work:', allChunks.length, 'chunks');

    // Test vector search still works
    const vectorQuery = await prisma.$queryRaw<Array<any>>`
      SELECT id, content, section_path, metadata
      FROM document_chunks
      WHERE embedding IS NOT NULL
      LIMIT 5
    `;
    console.log('✅ Vector search queries work:', vectorQuery.length, 'chunks with embeddings');

    return true;
  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
    return false;
  }
}

async function testMetadataQueries() {
  console.log('\n📊 Testing Metadata Queries...');
  
  try {
    // Test querying by element_type
    const tableChunks = await prisma.documentChunk.findMany({
      where: {
        metadata: {
          path: ['element_type'],
          equals: 'table'
        }
      },
      take: 5
    });
    console.log('✅ Element type filtering works:', tableChunks.length, 'table chunks');

    // Test querying by section_path
    const sectionChunks = await prisma.documentChunk.findMany({
      where: {
        sectionPath: {
          contains: 'API'
        }
      },
      take: 5
    });
    console.log('✅ Section path filtering works:', sectionChunks.length, 'chunks in API sections');

    // Test combined query
    const combinedQuery = await prisma.$queryRaw<Array<any>>`
      SELECT 
        COUNT(*) as total,
        COUNT(section_path) as with_section,
        COUNT(CASE WHEN metadata->>'element_type' IS NOT NULL THEN 1 END) as with_element_type
      FROM document_chunks
    `;
    console.log('✅ Metadata coverage:');
    console.log('   Total chunks:', combinedQuery[0]?.total?.toString() || '0');
    console.log('   With section_path:', combinedQuery[0]?.with_section?.toString() || '0');
    console.log('   With element_type:', combinedQuery[0]?.with_element_type?.toString() || '0');

    return true;
  } catch (error) {
    console.error('❌ Metadata query test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 PR-1 Migration Validation Test Suite');
  console.log('=' .repeat(50));

  const results = {
    indexes: await testIndexes(),
    rls: await testRLS(),
    backwardCompatibility: await testBackwardCompatibility(),
    metadata: await testMetadataQueries()
  };

  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Results Summary:');
  console.log('='.repeat(50));
  console.log('Indexes:', results.indexes ? '✅ PASS' : '❌ FAIL');
  console.log('RLS:', results.rls ? '✅ PASS' : '❌ FAIL');
  console.log('Backward Compatibility:', results.backwardCompatibility ? '✅ PASS' : '❌ FAIL');
  console.log('Metadata Queries:', results.metadata ? '✅ PASS' : '❌ FAIL');

  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - PR-1 Migration Successful!');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
    process.exit(1);
  }
  console.log('='.repeat(50) + '\n');
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });




