#!/usr/bin/env tsx
/**
 * Region Audit: Check where all services are deployed
 * Verifies if everything is EU-located or needs migration
 */
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

interface RegionReport {
  service: string
  region: string
  status: '✅ EU' | '⚠️ US' | '❓ Unknown' | '🌐 Global'
  details: string
  needsMigration: boolean
}

async function auditRegions() {
  const report: RegionReport[] = []
  
  console.log('🌍 AVENAI REGION AUDIT')
  console.log('=' .repeat(80))
  console.log('')

  // 1. Check Neon Database
  console.log('📊 Checking Neon Database...')
  try {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      report.push({
        service: 'Neon PostgreSQL',
        region: 'Unknown',
        status: '❓ Unknown',
        details: 'DATABASE_URL not configured',
        needsMigration: true
      })
    } else {
      // Extract hostname from connection string
      const match = dbUrl.match(/@([^:\/]+)/)
      const hostname = match ? match[1] : 'unknown'
      
      // Neon hostnames contain region info
      let region = 'Unknown'
      let status: '✅ EU' | '⚠️ US' | '❓ Unknown' = '❓ Unknown'
      let needsMigration = true
      
      if (hostname.includes('eu-central') || hostname.includes('frankfurt') || hostname.includes('fra')) {
        region = 'EU (Frankfurt)'
        status = '✅ EU'
        needsMigration = false
      } else if (hostname.includes('eu-west')) {
        region = 'EU (Ireland)'
        status = '✅ EU'
        needsMigration = false
      } else if (hostname.includes('eu-north') || hostname.includes('stockholm')) {
        region = 'EU (Stockholm)'
        status = '✅ EU'
        needsMigration = false
      } else if (hostname.includes('us-east') || hostname.includes('virginia')) {
        region = 'US East (Virginia)'
        status = '⚠️ US'
        needsMigration = true
      } else if (hostname.includes('us-west') || hostname.includes('oregon') || hostname.includes('california')) {
        region = 'US West'
        status = '⚠️ US'
        needsMigration = true
      } else {
        region = `Unknown (${hostname})`
        status = '❓ Unknown'
        needsMigration = true
      }
      
      report.push({
        service: 'Neon PostgreSQL',
        region,
        status,
        details: `Host: ${hostname}`,
        needsMigration
      })
    }
  } catch (err) {
    report.push({
      service: 'Neon PostgreSQL',
      region: 'Error',
      status: '❓ Unknown',
      details: `Error: ${err}`,
      needsMigration: true
    })
  }

  // 2. Check Cloudflare R2
  console.log('☁️  Checking Cloudflare R2...')
  try {
    const r2Endpoint = process.env.STORAGE_ENDPOINT
    const r2Bucket = process.env.STORAGE_BUCKET_NAME
    
    if (!r2Endpoint || !r2Bucket) {
      report.push({
        service: 'Cloudflare R2',
        region: 'Not Configured',
        status: '❓ Unknown',
        details: 'STORAGE_ENDPOINT or STORAGE_BUCKET_NAME not set',
        needsMigration: false
      })
    } else {
      // R2 is globally distributed, but we can check the account region
      report.push({
        service: 'Cloudflare R2',
        region: 'Global (with EU egress)',
        status: '🌐 Global',
        details: `Bucket: ${r2Bucket}, Endpoint: ${r2Endpoint}`,
        needsMigration: false // R2 is acceptable as-is
      })
    }
  } catch (err) {
    report.push({
      service: 'Cloudflare R2',
      region: 'Error',
      status: '❓ Unknown',
      details: `Error: ${err}`,
      needsMigration: false
    })
  }

  // 3. Check Fly.io Doc-Worker
  console.log('🪰 Checking Fly.io Doc-Worker...')
  try {
    const docWorkerUrl = process.env.DOC_WORKER_URL
    
    if (!docWorkerUrl) {
      report.push({
        service: 'Fly.io (doc-worker)',
        region: 'Not Configured',
        status: '❓ Unknown',
        details: 'DOC_WORKER_URL not set',
        needsMigration: true
      })
    } else {
      // Try to hit the health endpoint
      try {
        const response = await fetch(`${docWorkerUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        
        // Check URL for region hints
        let region = 'Unknown'
        let status: '✅ EU' | '⚠️ US' | '❓ Unknown' = '❓ Unknown'
        let needsMigration = true
        
        if (docWorkerUrl.includes('fra') || docWorkerUrl.includes('frankfurt')) {
          region = 'EU (Frankfurt)'
          status = '✅ EU'
          needsMigration = false
        } else if (docWorkerUrl.includes('ams') || docWorkerUrl.includes('amsterdam')) {
          region = 'EU (Amsterdam)'
          status = '✅ EU'
          needsMigration = false
        } else if (docWorkerUrl.includes('lhr') || docWorkerUrl.includes('london')) {
          region = 'EU (London)'
          status = '✅ EU'
          needsMigration = false
        } else if (docWorkerUrl.includes('iad') || docWorkerUrl.includes('ashburn')) {
          region = 'US East (Ashburn)'
          status = '⚠️ US'
          needsMigration = true
        } else if (docWorkerUrl.includes('sjc') || docWorkerUrl.includes('sunnyvale')) {
          region = 'US West (San Jose)'
          status = '⚠️ US'
          needsMigration = true
        } else {
          region = 'Unknown'
          status = '❓ Unknown'
          needsMigration = true
        }
        
        report.push({
          service: 'Fly.io (doc-worker)',
          region,
          status,
          details: `URL: ${docWorkerUrl}, Health: ${response.ok ? '✅' : '❌'}`,
          needsMigration
        })
      } catch (fetchErr) {
        report.push({
          service: 'Fly.io (doc-worker)',
          region: 'Unknown (unreachable)',
          status: '❓ Unknown',
          details: `URL: ${docWorkerUrl}, Error: ${fetchErr}`,
          needsMigration: true
        })
      }
    }
  } catch (err) {
    report.push({
      service: 'Fly.io (doc-worker)',
      region: 'Error',
      status: '❓ Unknown',
      details: `Error: ${err}`,
      needsMigration: true
    })
  }

  // 4. Check Vercel (Next.js deployment)
  console.log('▲ Checking Vercel Deployment...')
  try {
    const vercelUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    
    if (!vercelUrl) {
      report.push({
        service: 'Vercel (Next.js)',
        region: 'Local Development',
        status: '❓ Unknown',
        details: 'Running on localhost, not deployed',
        needsMigration: false // Not applicable for local dev
      })
    } else if (vercelUrl.includes('localhost') || vercelUrl.includes('127.0.0.1')) {
      report.push({
        service: 'Vercel (Next.js)',
        region: 'Local Development',
        status: '❓ Unknown',
        details: 'Running on localhost, deploy to Vercel with FRA region',
        needsMigration: false // Not applicable for local dev
      })
    } else {
      // Production Vercel deployment
      // Default region is determined in Vercel settings, not detectable via env vars
      report.push({
        service: 'Vercel (Next.js)',
        region: 'Check Vercel Dashboard',
        status: '❓ Unknown',
        details: 'Go to Vercel → Project Settings → Functions → Default Region',
        needsMigration: true // Assume needs migration until confirmed
      })
    }
  } catch (err) {
    report.push({
      service: 'Vercel (Next.js)',
      region: 'Error',
      status: '❓ Unknown',
      details: `Error: ${err}`,
      needsMigration: true
    })
  }

  // 5. Check OpenAI API (for reference)
  console.log('🤖 Checking OpenAI API...')
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!openaiKey) {
      report.push({
        service: 'OpenAI API',
        region: 'Not Configured',
        status: '❓ Unknown',
        details: 'OPENAI_API_KEY not set',
        needsMigration: false
      })
    } else {
      // OpenAI routes requests automatically, but we can note it
      report.push({
        service: 'OpenAI API',
        region: 'Global (auto-routed)',
        status: '🌐 Global',
        details: 'OpenAI automatically routes to nearest region',
        needsMigration: false // No action needed
      })
    }
  } catch (err) {
    report.push({
      service: 'OpenAI API',
      region: 'Error',
      status: '❓ Unknown',
      details: `Error: ${err}`,
      needsMigration: false
    })
  }

  // Print Report
  console.log('')
  console.log('📋 REGION AUDIT REPORT')
  console.log('=' .repeat(80))
  console.log('')

  // Table header
  console.log(
    padRight('Service', 25) + 
    padRight('Region', 30) + 
    padRight('Status', 15) + 
    'Migration Needed'
  )
  console.log('-'.repeat(80))

  // Table rows
  for (const item of report) {
    console.log(
      padRight(item.service, 25) +
      padRight(item.region, 30) +
      padRight(item.status, 15) +
      (item.needsMigration ? '⚠️  YES' : '✅ NO')
    )
  }

  console.log('')
  console.log('📝 DETAILS')
  console.log('=' .repeat(80))
  for (const item of report) {
    console.log(`\n${item.service}:`)
    console.log(`  ${item.details}`)
  }

  // Summary
  console.log('')
  console.log('📊 SUMMARY')
  console.log('=' .repeat(80))
  
  const needsMigration = report.filter(r => r.needsMigration)
  const inEU = report.filter(r => r.status === '✅ EU')
  const inUS = report.filter(r => r.status === '⚠️ US')
  const global = report.filter(r => r.status === '🌐 Global')
  const unknown = report.filter(r => r.status === '❓ Unknown')

  console.log(`\n✅ EU Services: ${inEU.length}/${report.length}`)
  inEU.forEach(s => console.log(`   - ${s.service}`))
  
  console.log(`\n⚠️  US Services: ${inUS.length}/${report.length}`)
  inUS.forEach(s => console.log(`   - ${s.service}`))
  
  console.log(`\n🌐 Global Services: ${global.length}/${report.length}`)
  global.forEach(s => console.log(`   - ${s.service}`))
  
  console.log(`\n❓ Unknown/Unconfigured: ${unknown.length}/${report.length}`)
  unknown.forEach(s => console.log(`   - ${s.service}`))

  console.log(`\n🚨 MIGRATION REQUIRED: ${needsMigration.length} service(s)`)
  needsMigration.forEach(s => console.log(`   - ${s.service} (${s.region})`))

  if (needsMigration.length > 0) {
    console.log('\n⚠️  RECOMMENDATION: Proceed with EU migration to co-locate services')
    console.log('   Target: EU (Frankfurt) for optimal Sweden/Nordic latency')
  } else {
    console.log('\n✅ All services are EU-located or global. No migration needed!')
  }

  console.log('')
  
  await prisma.$disconnect()
  
  return {
    report,
    needsMigration: needsMigration.length > 0,
    migrationCount: needsMigration.length
  }
}

function padRight(str: string, width: number): string {
  return str + ' '.repeat(Math.max(0, width - str.length))
}

// Run the audit
auditRegions()
  .then(result => {
    process.exit(result.needsMigration ? 1 : 0)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(2)
  })



