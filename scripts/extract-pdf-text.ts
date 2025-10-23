#!/usr/bin/env tsx
/**
 * Extract text from downloaded PDFs for validation
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

async function extractPdfText() {
  const downloadDir = path.join(process.cwd(), 'downloaded-docs')
  const outputDir = path.join(process.cwd(), 'extracted-text')
  await fs.mkdir(outputDir, { recursive: true })

  const files = await fs.readdir(downloadDir)
  const pdfFiles = files.filter(f => f.endsWith('.pdf'))

  console.log(`Found ${pdfFiles.length} PDFs to extract`)

  const docWorkerUrl = process.env.DOC_WORKER_URL || 'http://localhost:8000'

  for (const pdfFile of pdfFiles) {
    try {
      console.log(`\n📄 Extracting: ${pdfFile}`)
      
      const pdfPath = path.join(downloadDir, pdfFile)
      const fileBuffer = await fs.readFile(pdfPath)
      
      // Call doc-worker V2
      const formData = new FormData()
      formData.append('file', fileBuffer, {
        filename: pdfFile,
        contentType: 'application/pdf',
      })

      const response = await fetch(`${docWorkerUrl}/extract/v2`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Doc-worker returned ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      
      // Save full extraction JSON
      const jsonPath = path.join(outputDir, pdfFile.replace('.pdf', '.json'))
      await fs.writeFile(jsonPath, JSON.stringify(result, null, 2))
      
      // Save plain text
      const textPath = path.join(outputDir, pdfFile.replace('.pdf', '.txt'))
      const fullText = result.items
        .map((item: any) => {
          const header = `\n=== Page ${item.page} | ${item.element_type} | ${item.section_path || 'no-section'} ===\n`
          let content = item.text
          if (item.has_verbatim && item.verbatim_block) {
            content += `\n\n[VERBATIM BLOCK]:\n${item.verbatim_block}\n`
          }
          return header + content
        })
        .join('\n\n')
      
      await fs.writeFile(textPath, fullText)
      
      console.log(`✅ Extracted ${result.items.length} blocks → ${textPath}`)
      console.log(`   📊 Verbatim blocks: ${result.items.filter((i: any) => i.has_verbatim).length}`)
    } catch (err) {
      console.error(`❌ Failed to extract ${pdfFile}:`, err)
    }
  }

  console.log(`\n✅ All extractions complete in: ${outputDir}`)
}

extractPdfText().catch(console.error)



