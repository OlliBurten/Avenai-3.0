"use client"

import { useState, useRef, useEffect } from 'react'
import { Copy, Expand, ChevronDown, ChevronUp, Download, MoreHorizontal } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'

// Transparent light theme so the code surface inherits the card's white
const transparentLightTheme = {
  plain: { 
    color: "#0f172a", // slate-900
    backgroundColor: "transparent" 
  },
  styles: [] as any[]
};

interface CodeBlockProProps {
  code: string
  language?: 'python' | 'javascript' | 'ts' | 'curl' | 'json' | 'bash' | 'http' | string
  collapsible?: boolean
  initiallyCollapsed?: boolean
  onCopy?: (lang: string, bytes: number) => void
  onExpand?: (lang: string, lines: number) => void
  onExport?: (type: 'curl' | 'postman', bytes: number) => void
}

// Language detection helper
function detectLang(code: string, hint?: string): string {
  if (hint) return hint.toLowerCase()
  
  // Simple heuristics
  if (code.includes('import requests') || code.includes('from requests')) return 'python'
  if (code.includes('fetch(') || code.includes('axios.')) return 'javascript'
  if (code.includes('curl ') || code.includes('httpie')) return 'bash'
  if (code.startsWith('{') && code.endsWith('}')) return 'json'
  if (code.includes('GET ') || code.includes('POST ')) return 'http'
  
  return 'text'
}

// HTTP request detection
function looksLikeHttpRequest(code: string): boolean {
  const lines = code.split('\n')
  const firstLine = lines[0]?.trim()
  return /^(GET|POST|PUT|DELETE|PATCH)\s+/.test(firstLine || '')
}

// Convert to cURL
function toCurl(code: string): string {
  if (code.includes('curl ')) return code
  
  const lines = code.split('\n')
  const firstLine = lines[0]?.trim()
  const match = firstLine?.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+?)(?:\s+HTTP\/\d\.\d)?$/i)
  
  if (!match) return code
  
  const [, method, url] = match
  let curl = `curl -X ${method.toUpperCase()} "${url}"`
  
  // Parse headers
  let inHeaders = false
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line) {
      inHeaders = false
      continue
    }
    if (inHeaders && line.includes(':')) {
      const [key, value] = line.split(':', 2)
      curl += ` \\\n  -H "${key.trim()}: ${value.trim()}"`
    }
    if (line.toLowerCase().includes('content-type') || line.toLowerCase().includes('authorization')) {
      inHeaders = true
    }
  }
  
  return curl
}

// Convert to Postman collection
function toPostmanJson(code: string): string {
  const lines = code.split('\n')
  const firstLine = lines[0]?.trim()
  const match = firstLine?.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+?)(?:\s+HTTP\/\d\.\d)?$/i)
  
  if (!match) return JSON.stringify({ error: 'Invalid HTTP request' }, null, 2)
  
  const [, method, url] = match
  const headers: Array<{ key: string; value: string }> = []
  let body = ''
  let inBody = false
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line) {
      inBody = true
      continue
    }
    if (!inBody && line.includes(':')) {
      const [key, value] = line.split(':', 2)
      headers.push({ key: key.trim(), value: value.trim() })
    }
    if (inBody) {
      body += line + '\n'
    }
  }
  
  const collection = {
    info: {
      name: 'API Request',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: `${method.toUpperCase()} Request`,
        request: {
          method: method.toUpperCase(),
          header: headers,
          url: {
            raw: url,
            protocol: url.startsWith('https') ? 'https' : 'http',
            host: url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0],
            path: url.replace(/^https?:\/\/[^\/]+/, '').split('?')[0].split('/').filter(Boolean)
          },
          body: body.trim() ? {
            mode: 'raw',
            raw: body.trim(),
            options: {
              raw: {
                language: 'json'
              }
            }
          } : undefined
        }
      }
    ]
  }
  
  return JSON.stringify(collection, null, 2)
}

export default function CodeBlockPro({
  code,
  language: hint,
  collapsible = true,
  initiallyCollapsed = false,
  onCopy,
  onExpand,
  onExport
}: CodeBlockProProps) {
  const [isExpanded, setIsExpanded] = useState(!initiallyCollapsed)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  
  const detectedLang = detectLang(code, hint)
  const lines = code.split('\n')
  const isLongCode = lines.length > 80 || code.length > 6000
  const shouldCollapse = collapsible && isLongCode
  const isHttpRequest = looksLikeHttpRequest(code)
  
  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      onCopy?.(detectedLang, code.length)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  // Toggle expand/collapse
  const handleToggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    if (newExpanded) {
      onExpand?.(detectedLang, lines.length)
    }
  }
  
  // Export functions
  const handleExportCurl = async () => {
    const curlCode = toCurl(code)
    try {
      await navigator.clipboard.writeText(curlCode)
      onExport?.('curl', curlCode.length)
      setShowMenu(false)
    } catch (err) {
      console.error('Failed to copy cURL:', err)
    }
  }
  
  const handleExportPostman = async () => {
    const postmanJson = toPostmanJson(code)
    const blob = new Blob([postmanJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'api-request.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onExport?.('postman', postmanJson.length)
    setShowMenu(false)
  }
  
  return (
    <div className="bg-gray-900 text-gray-100 rounded-xl overflow-hidden border border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-300 bg-gray-700 px-2 py-1 rounded">
            {detectedLang.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            aria-label="Copy code"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          
          {/* Expand/Collapse */}
          {shouldCollapse && (
            <button
              onClick={handleToggle}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          
          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                {isHttpRequest && (
                  <button
                    onClick={handleExportCurl}
                    className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Copy as cURL</span>
                  </button>
                )}
                <button
                  onClick={handleExportPostman}
                  className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Postman</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="relative">
        <div
          ref={codeRef}
          className={`overflow-auto p-3 ${shouldCollapse && !isExpanded ? 'max-h-[18rem]' : ''}`}
        >
          <Highlight
            code={code}
            language={detectedLang}
            theme={transparentLightTheme}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre 
                className={`${className} text-sm overflow-x-auto bg-transparent`} 
                style={{ ...style, background: "transparent !important" }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
        
        {/* Collapse Gradient */}
        {shouldCollapse && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
      
      {/* Copy Feedback */}
      {copied && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
          Copied!
        </div>
      )}
    </div>
  )
}

