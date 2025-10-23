// lib/extractors.ts
export type Endpoint = { method: string; path: string; title?: string; snippet?: string }
export type ErrCode = { code: string; meaning?: string; snippet?: string }

export function extractEndpoints(text: string): Endpoint[] {
  const out: Endpoint[] = []
  
  // Match HTTP methods with paths
  const re = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([/][^\s)]+)\b/gi
  let m
  while ((m = re.exec(text))) {
    const method = m[1].toUpperCase()
    const path = m[2]
    const snippet = text.slice(Math.max(0, m.index - 140), m.index + 200)
    
    out.push({ 
      method, 
      path, 
      snippet: snippet.replace(/\s+/g, ' ').trim()
    })
  }
  
  return dedupeEndpoints(out)
}

function dedupeEndpoints(arr: Endpoint[]): Endpoint[] {
  const seen = new Set<string>()
  const result: Endpoint[] = []
  
  for (const e of arr) {
    const key = `${e.method} ${e.path}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(e)
    }
  }
  
  return result
}

export function extractErrorCodes(text: string): ErrCode[] {
  const out: ErrCode[] = []
  
  // Match error codes and status codes
  const patterns = [
    /\b(code|error|status)\s*[:=]?\s*(\d{3}|[A-Z_]{3,})\b/g,
    /\b(\d{3})\s+(error|status|code)\b/g,
    /\b([A-Z_]{3,})\s+(error|code)\b/g
  ]
  
  for (const re of patterns) {
    let m
    while ((m = re.exec(text))) {
      const code = m[2] || m[1] // Handle different capture groups
      const snippet = text.slice(Math.max(0, m.index - 80), m.index + 160)
      
      out.push({ 
        code, 
        snippet: snippet.replace(/\s+/g, ' ').trim()
      })
    }
  }
  
  return dedupeErrCodes(out)
}

function dedupeErrCodes(arr: ErrCode[]): ErrCode[] {
  const seen = new Set<string>()
  const result: ErrCode[] = []
  
  for (const e of arr) {
    if (!seen.has(e.code)) {
      seen.add(e.code)
      result.push(e)
    }
  }
  
  return result
}

export function extractApiExamples(text: string): string[] {
  const examples: string[] = []
  
  // Extract curl commands
  const curlRe = /curl\s+[^`\n]+/gi
  let m
  while ((m = curlRe.exec(text))) {
    examples.push(m[0].trim())
  }
  
  // Extract JSON examples
  const jsonRe = /\{[^{}]*"[^"]*"\s*:\s*"[^"]*"[^{}]*\}/g
  while ((m = jsonRe.exec(text))) {
    examples.push(m[0].trim())
  }
  
  return examples.slice(0, 5) // Limit to 5 examples
}
