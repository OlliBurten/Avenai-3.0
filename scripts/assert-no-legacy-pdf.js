// scripts/assert-no-legacy-pdf.js
// Fails the build if legacy extractor symbols are present anywhere in the repo.
const { execSync } = require('node:child_process')

const BAD = [
  'extractReadableText',
  'extractWithPdfJs',
  'enhanced-regex',
  'readable-text'
  // Note: pdfjs-dist is now allowed as a fallback extractor
]

let found = false
for (const token of BAD) {
  try {
    const out = execSync(`grep -RIn "${token}" --exclude-dir=node_modules --exclude-dir=.next --exclude="*.backup" --exclude="package-lock.json" --exclude="assert-no-legacy-pdf.js" || true`, { stdio: 'pipe' }).toString().trim()
    if (out) {
      console.error(`❌ Legacy symbol detected: "${token}"\n${out}\n`)
      found = true
    }
  } catch {}
}

if (found) {
  console.error('Build aborted: remove legacy extractor references listed above.')
  process.exit(1)
} else {
  console.log('✅ No legacy PDF extractor symbols found.')
}