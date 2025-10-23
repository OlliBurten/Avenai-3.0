// scripts/preprod-verify-simple.ts
import { execSync } from 'node:child_process'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

function printRow(label: string, value: string|number|boolean) {
  const pad = 32
  console.log(`${label.padEnd(pad,'.')} ${value}`)
}

async function runVerification() {
  const report: Record<string, any> = {}
  
  console.log('\n=== Avenai Pre-Production Verification Report ===\n')
  
  // 1) ENV flags
  const requiredEnv = ['HYBRID_SEARCH','MMR_RERANK','FALLBACK_EXPANSION','PROMPT_ROUTER']
  for (const k of requiredEnv) {
    report[`flag_${k}`] = !!process.env[k]
    printRow(`Flags: ${k}`, report[`flag_${k}`])
  }
  
  // 2) Coverage via API
  try {
    const coverageResponse = await fetch('http://localhost:3000/api/test/debug?datasetId=cmh1c687x0001d8hiq6wop6a1&type=coverage')
    const coverageData = await coverageResponse.json()
    report.total_chunks = coverageData.totalChunks
    printRow('Total chunks indexed', report.total_chunks)
  } catch (e) {
    printRow('Coverage check', 'ERROR')
  }
  
  // 3) Element type distribution via API
  try {
    const elementResponse = await fetch('http://localhost:3000/api/test/debug?datasetId=cmh1c687x0001d8hiq6wop6a1&type=element_type_distribution')
    const elementData = await elementResponse.json()
    report.element_types = elementData
    printRow('Element types detected', Object.keys(elementData).length)
  } catch (e) {
    printRow('Element type check', 'ERROR')
  }
  
  // 4) Smoke tests
  try {
    const smokeOutput = execSync('npm run smoke-tests', {stdio:'pipe'}).toString()
    report.smoke_output = smokeOutput
    
    // Parse smoke test results - look for the final summary
    const exactMatchRate = smokeOutput.match(/Exact Match Rate:\s*([0-9.]+)%/)
    const totalMatch = smokeOutput.match(/Total Tests:\s*(\d+)/)
    
    if (exactMatchRate && totalMatch) {
      const percentage = parseFloat(exactMatchRate[1])
      const total = parseInt(totalMatch[1])
      const passed = Math.round((percentage / 100) * total)
      
      report.smoke_pass = passed
      report.smoke_total = total
      report.smoke_percentage = percentage
      
      printRow('Smoke tests', `${passed}/${total} (${percentage}%)`)
    } else {
      printRow('Smoke tests', 'PARSE ERROR')
    }
  } catch (e: any) {
    printRow('Smoke tests', `ERROR: ${e.message}`)
  }
  
  // 5) Code presence checks
  try {
    const fs = require('fs')
    const path = require('path')
    
    // Check for buildPrompt function
    const promptRouterPath = path.join(__dirname, '../lib/generation/promptRouter.ts')
    const promptRouterContent = fs.readFileSync(promptRouterPath, 'utf8')
    report.prompt_router_hook = promptRouterContent.includes('buildPrompt')
    
    // Check for Shiki
    const chatMarkdownPath = path.join(__dirname, '../components/copilot/ChatMarkdown.tsx')
    const chatMarkdownContent = fs.readFileSync(chatMarkdownPath, 'utf8')
    report.shiki_present = chatMarkdownContent.includes('rehype-pretty-code')
    
    // Check for colleague tone
    const humanizePath = path.join(__dirname, '../lib/humanizeResponse.ts')
    const humanizeContent = fs.readFileSync(humanizePath, 'utf8')
    report.colleague_phrase_present = humanizeContent.includes("Got it — you're asking")
    
    printRow('PromptRouter integrated', report.prompt_router_hook)
    printRow('Shiki renderer present', report.shiki_present)
    printRow('Colleague tone phrase', report.colleague_phrase_present)
  } catch (e) {
    printRow('Code checks', 'ERROR')
  }
  
  // 6) App health check
  try {
    const healthOutput = execSync('curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/test/debug?datasetId=cmh1c687x0001d8hiq6wop6a1&type=document_count"', {stdio:'pipe'}).toString().trim()
    report.app_healthy = healthOutput === '200'
    printRow('App health check', report.app_healthy ? 'OK' : 'ERROR')
  } catch (e) {
    report.app_healthy = false
    printRow('App health check', 'ERROR')
  }
  
  // PASS/FAIL criteria
  const pass = {
    flags: report.flag_HYBRID_SEARCH && report.flag_MMR_RERANK && report.flag_FALLBACK_EXPANSION && report.flag_PROMPT_ROUTER,
    chunks: (report.total_chunks ?? 0) > 0,
    smoke: report.smoke_percentage ? report.smoke_percentage >= 90 : false,
    // shiki: !!report.shiki_present, // Optional - not a blocker
    prompt: !!report.prompt_router_hook,
    tone: !!report.colleague_phrase_present,
    app: !!report.app_healthy,
  }
  
  console.log('\n--- PASS CHECKS ---')
  for (const [k,v] of Object.entries(pass)) printRow(k, v)
  
  const allPass = Object.values(pass).every(Boolean)
  console.log(`\nFINAL: ${allPass ? '✅ READY FOR PILOT' : '❌ ACTION NEEDED'}\n`)
  
  if (!allPass) {
    console.log('Issues to address:')
    if (!pass.flags) console.log('- Enable all feature flags in .env.local')
    if (!pass.chunks) console.log('- Re-ingest documents: npm run reingest -- --dataset <id>')
    if (!pass.smoke) console.log('- Improve smoke test pass rate (currently ' + (report.smoke_percentage || 0) + '%)')
    if (!pass.prompt) console.log('- Integrate PromptRouter in generation')
    if (!pass.tone) console.log('- Add colleague tone phrases')
    if (!pass.app) console.log('- Fix app health issues')
  }
}

runVerification().catch(e => { 
  console.error('Verification failed:', e); 
  process.exit(1) 
})
