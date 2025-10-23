#!/usr/bin/env tsx
/**
 * Backend Services Health Check
 * Validates all external services are properly configured and accessible
 */

import { prisma } from '../lib/prisma';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: any;
}

const results: ServiceStatus[] = [];

async function checkDatabase() {
  console.log('\n🗄️  Checking Database (Neon PostgreSQL)...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbUrl = process.env.DATABASE_URL || '';
    const isNeon = dbUrl.includes('neon.tech') || dbUrl.includes('neon.');
    
    results.push({
      name: 'Database',
      status: 'ok',
      message: isNeon ? 'Connected to Neon PostgreSQL' : 'Connected to local PostgreSQL',
      details: { provider: isNeon ? 'Neon' : 'Local' }
    });
  } catch (error: any) {
    results.push({
      name: 'Database',
      status: 'error',
      message: `Database connection failed: ${error.message}`
    });
  }
}

async function checkPgVector() {
  console.log('\n🔍 Checking pgvector extension...');
  try {
    const result = await prisma.$queryRaw<{ installed: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as installed
    `;
    
    if (result[0]?.installed) {
      const chunkCount = await prisma.documentChunk.count();
      const withEmbedding = await prisma.documentChunk.count({
        where: { embedding: { not: null } }
      });
      
      results.push({
        name: 'pgvector',
        status: 'ok',
        message: 'pgvector extension installed and working',
        details: { 
          totalChunks: chunkCount,
          withEmbeddings: withEmbedding,
          coverage: chunkCount > 0 ? `${((withEmbedding / chunkCount) * 100).toFixed(1)}%` : '0%'
        }
      });
    } else {
      results.push({
        name: 'pgvector',
        status: 'error',
        message: 'pgvector extension not installed'
      });
    }
  } catch (error: any) {
    results.push({
      name: 'pgvector',
      status: 'error',
      message: `pgvector check failed: ${error.message}`
    });
  }
}

async function checkDocWorker() {
  console.log('\n🔧 Checking Doc-Worker V2 (Fly.io)...');
  try {
    const docWorkerUrl = process.env.DOC_WORKER_URL || 'http://localhost:8000';
    const response = await fetch(`${docWorkerUrl}/health`);
    
    if (response.ok) {
      const health = await response.json();
      const isFlyio = docWorkerUrl.includes('fly.dev');
      
      results.push({
        name: 'Doc-Worker V2',
        status: 'ok',
        message: isFlyio ? 'Connected to Fly.io deployment' : 'Connected to local instance',
        details: {
          url: docWorkerUrl,
          version: health.version,
          features: health.features,
          provider: isFlyio ? 'Fly.io' : 'Local'
        }
      });
    } else {
      results.push({
        name: 'Doc-Worker V2',
        status: 'error',
        message: `Doc-Worker returned ${response.status}`
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Doc-Worker V2',
      status: 'error',
      message: `Doc-Worker unreachable: ${error.message}`
    });
  }
}

async function checkCloudflareR2() {
  console.log('\n☁️  Checking Cloudflare R2 Storage...');
  try {
    const required = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      results.push({
        name: 'Cloudflare R2',
        status: 'warning',
        message: `Missing configuration: ${missing.join(', ')}`,
      });
    } else {
      const isR2 = process.env.STORAGE_ENDPOINT?.includes('r2.cloudflarestorage.com');
      
      results.push({
        name: 'Cloudflare R2',
        status: 'ok',
        message: isR2 ? 'Configured for Cloudflare R2' : 'Configured for S3-compatible storage',
        details: {
          provider: isR2 ? 'Cloudflare R2' : 'S3-compatible',
          bucket: process.env.STORAGE_BUCKET_NAME,
          region: process.env.STORAGE_REGION
        }
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Cloudflare R2',
      status: 'error',
      message: `R2 check failed: ${error.message}`
    });
  }
}

async function checkOpenAI() {
  console.log('\n🤖 Checking OpenAI API...');
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey.length < 20) {
      results.push({
        name: 'OpenAI',
        status: 'error',
        message: 'OPENAI_API_KEY not configured'
      });
      return;
    }
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      const model = process.env.OPENAI_MODEL || 'gpt-4o';
      results.push({
        name: 'OpenAI',
        status: 'ok',
        message: 'API key valid and working',
        details: { 
          model,
          keyPrefix: `${apiKey.substring(0, 10)}...`
        }
      });
    } else if (response.status === 401) {
      results.push({
        name: 'OpenAI',
        status: 'error',
        message: 'Invalid API key'
      });
    } else {
      results.push({
        name: 'OpenAI',
        status: 'warning',
        message: `API returned ${response.status}`
      });
    }
  } catch (error: any) {
    results.push({
      name: 'OpenAI',
      status: 'error',
      message: `OpenAI check failed: ${error.message}`
    });
  }
}

async function checkAuth() {
  console.log('\n🔐 Checking Authentication (NextAuth)...');
  try {
    const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasAzure = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    
    if (!hasNextAuthSecret) {
      results.push({
        name: 'NextAuth',
        status: 'error',
        message: 'NEXTAUTH_SECRET not configured'
      });
      return;
    }
    
    const providers = [];
    if (hasGoogle) providers.push('Google');
    if (hasAzure) providers.push('Azure AD');
    
    if (providers.length === 0) {
      results.push({
        name: 'NextAuth',
        status: 'warning',
        message: 'NextAuth configured but no OAuth providers enabled',
        details: { providers: 'None' }
      });
    } else {
      results.push({
        name: 'NextAuth',
        status: 'ok',
        message: `NextAuth configured with ${providers.length} provider(s)`,
        details: { providers }
      });
    }
  } catch (error: any) {
    results.push({
      name: 'NextAuth',
      status: 'error',
      message: `NextAuth check failed: ${error.message}`
    });
  }
}

async function checkRAGFeatures() {
  console.log('\n🎯 Checking RAG Feature Flags...');
  try {
    const features = {
      'Doc-Worker V2': process.env.DOC_WORKER_V2 === 'true',
      'Hybrid Search': process.env.HYBRID_SEARCH === 'true',
      'MMR Reranking': process.env.MMR_RERANK === 'true',
      'Fallback Expansion': process.env.FALLBACK_EXPANSION === 'true',
      'Prompt Router': process.env.PROMPT_ROUTER === 'true',
    };
    
    const enabled = Object.entries(features).filter(([_, v]) => v).map(([k]) => k);
    const disabled = Object.entries(features).filter(([_, v]) => !v).map(([k]) => k);
    
    results.push({
      name: 'RAG Features',
      status: enabled.length >= 4 ? 'ok' : 'warning',
      message: `${enabled.length}/5 features enabled`,
      details: { enabled, disabled }
    });
  } catch (error: any) {
    results.push({
      name: 'RAG Features',
      status: 'error',
      message: `Feature check failed: ${error.message}`
    });
  }
}

async function printResults() {
  console.log('\n\n📊 Backend Services Health Report');
  console.log('═'.repeat(60));
  
  for (const result of results) {
    const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
    console.log(`\n${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2).split('\n').map((l, i) => i === 0 ? l : `   ${l}`).join('\n'));
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  
  const okCount = results.filter(r => r.status === 'ok').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`\nSummary: ${okCount} OK, ${warningCount} Warnings, ${errorCount} Errors`);
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('\n🎉 All backend services are healthy and ready for production!\n');
  } else if (errorCount === 0) {
    console.log('\n✅ All critical services operational (warnings can be addressed later)\n');
  } else {
    console.log('\n⚠️  Critical issues detected - please fix errors before deploying\n');
    process.exit(1);
  }
}

async function main() {
  console.log('🔍 Avenai Backend Services Health Check\n');
  
  await checkDatabase();
  await checkPgVector();
  await checkDocWorker();
  await checkCloudflareR2();
  await checkOpenAI();
  await checkAuth();
  await checkRAGFeatures();
  
  await printResults();
  
  await prisma.$disconnect();
}

main().catch(console.error);




