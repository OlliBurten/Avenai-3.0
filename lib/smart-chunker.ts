// Smart Chunking with Semantic Boundaries for Avenai
// Intelligently splits documents based on semantic structure rather than fixed sizes

export interface SemanticChunk {
  id: string
  content: string
  type: 'paragraph' | 'section' | 'code-block' | 'list' | 'table' | 'heading' | 'api-endpoint' | 'error-code'
  metadata: {
    title?: string
    level?: number
    language?: string
    startLine?: number
    endLine?: number
    semanticScore?: number
    keywords?: string[]
    chunkSize?: number
    granularChunk?: boolean
    chunkIndex?: number
    documentType?: string
    structure?: string
    [key: string]: any // Allow additional properties
  }
  parentChunkId?: string
  childChunkIds?: string[]
}

export interface ChunkingContext {
  documentType: 'api-docs' | 'technical-guide' | 'tutorial' | 'reference' | 'mixed'
  language: string
  structure: 'hierarchical' | 'linear' | 'modular'
}

export class SmartChunker {
  private static instance: SmartChunker
  private semanticPatterns: Map<string, RegExp[]> = new Map()
  private apiPatterns: RegExp[] = []
  private codePatterns: RegExp[] = []

  constructor() {
    if (!SmartChunker.instance) {
      SmartChunker.instance = this
      this.initializePatterns()
    }
    return SmartChunker.instance
  }

  static getInstance(): SmartChunker {
    if (!SmartChunker.instance) {
      SmartChunker.instance = new SmartChunker()
    }
    return SmartChunker.instance
  }

  private initializePatterns() {
    // API documentation patterns
    this.apiPatterns = [
      // REST API endpoints
      /(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)\s*$/gm,
      // API parameters
      /(?:@param|@query|@body|@header)\s+([^\s]+)/g,
      // Response codes
      /(?:@response|@returns?)\s+(\d{3})/g,
      // API examples
      /```(?:javascript|typescript|python|curl|json|yaml)\s*\n([\s\S]*?)\n```/g
    ]

    // Code block patterns
    this.codePatterns = [
      /```(\w+)?\s*\n([\s\S]*?)\n```/g,
      /`([^`]+)`/g,
      /<code[^>]*>([\s\S]*?)<\/code>/g,
      /<pre[^>]*>([\s\S]*?)<\/pre>/g
    ]

    // Semantic patterns for different content types
    this.semanticPatterns = new Map([
      ['api-docs', [
        /^##\s+(.+)$/gm,  // API sections
        /^###\s+(.+)$/gm, // Endpoint groups
        /^####\s+(.+)$/gm, // Individual endpoints
        /^###\s+(?:Request|Response|Parameters|Examples?)/gmi
      ]],
      ['technical-guide', [
        /^#\s+(.+)$/gm,   // Main sections
        /^##\s+(.+)$/gm,  // Subsections
        /^###\s+(.+)$/gm, // Sub-subsections
        /^####\s+(.+)$/gm // Details
      ]],
      ['tutorial', [
        /^##\s+(?:Step\s+\d+|Part\s+\d+)/gmi,
        /^###\s+(?:Prerequisites|Requirements|Installation|Configuration)/gmi,
        /^##\s+(?:Next Steps|Conclusion|Summary)/gmi
      ]],
      ['reference', [
        /^##\s+(.+)$/gm,  // Reference sections
        /^###\s+(.+)$/gm, // Reference subsections
        /^####\s+(.+)$/gm // Reference details
      ]]
    ])
  }

  async chunkDocument(content: string, context?: ChunkingContext): Promise<SemanticChunk[]> {
    const detectedContext = context || this.detectContext(content)
    console.log(`🧠 Smart chunking with context: ${detectedContext.documentType}`)
    console.log(`📄 Content length: ${content.length} characters`)

    // Special handling for large content to ensure granular chunking
    if (content.length > 10000) {
      console.log('📚 Large content detected - using granular chunking for better search')
      return this.createGranularChunks(content, {
        documentType: detectedContext.documentType,
        language: detectedContext.language,
        structure: detectedContext.structure
      })
    }

    // Step 1: Identify semantic boundaries
    const boundaries = this.identifySemanticBoundaries(content, detectedContext)
    console.log(`🔍 Found ${boundaries.length} boundaries:`, boundaries.slice(0, 10)) // Log first 10 boundaries
    
    // Step 2: Extract structured content
    const structuredContent = this.extractStructuredContent(content, boundaries)
    console.log(`📦 Extracted ${structuredContent.length} structured content pieces`)
    
    // Step 3: Create semantic chunks
    const chunks = this.createSemanticChunks(structuredContent, detectedContext)
    console.log(`🧩 Created ${chunks.length} semantic chunks`)
    
    // Step 4: Optimize chunk sizes and relationships
    const optimizedChunks = this.optimizeChunks(chunks)
    console.log(`✅ Final optimized chunks: ${optimizedChunks.length}`)
    
    // Log chunk sizes for debugging
    optimizedChunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}: ${chunk.content.length} chars, type: ${chunk.type}`)
    })
    
    return optimizedChunks
  }

  private detectContext(content: string): ChunkingContext {
    const lowerContent = content.toLowerCase()
    
    // Detect document type
    let documentType: ChunkingContext['documentType'] = 'mixed'
    if (lowerContent.includes('api') && (lowerContent.includes('endpoint') || lowerContent.includes('request'))) {
      documentType = 'api-docs'
    } else if (lowerContent.includes('step') || lowerContent.includes('tutorial') || lowerContent.includes('guide')) {
      documentType = 'tutorial'
    } else if (lowerContent.includes('reference') || lowerContent.includes('documentation')) {
      documentType = 'reference'
    } else if (lowerContent.includes('technical') || lowerContent.includes('implementation')) {
      documentType = 'technical-guide'
    }

    // Detect language
    let language = 'markdown'
    if (content.includes('```javascript') || content.includes('```js')) {
      language = 'javascript'
    } else if (content.includes('```typescript') || content.includes('```ts')) {
      language = 'typescript'
    } else if (content.includes('```python') || content.includes('```py')) {
      language = 'python'
    }

    // Detect structure
    let structure: ChunkingContext['structure'] = 'linear'
    if (content.match(/^#{1,6}\s+/gm)) {
      structure = 'hierarchical'
    } else if (content.includes('---') || content.includes('===')) {
      structure = 'modular'
    }

    return { documentType, language, structure }
  }

  private identifySemanticBoundaries(content: string, context: ChunkingContext): number[] {
    const boundaries = new Set<number>()
    
    // Add start and end boundaries
    boundaries.add(0)
    boundaries.add(content.length)

    // Identify heading boundaries
    const headingPatterns = this.semanticPatterns.get(context.documentType) || []
    headingPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        boundaries.add(match.index)
      }
    })

    // Identify code block boundaries
    this.codePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        boundaries.add(match.index)
        boundaries.add(match.index + match[0].length)
      }
    })

    // Identify API-specific boundaries
    if (context.documentType === 'api-docs') {
      this.apiPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(content)) !== null) {
          boundaries.add(match.index)
        }
      })
    }

    // Identify paragraph boundaries
    const paragraphPattern = /\n\s*\n/g
    let match
    while ((match = paragraphPattern.exec(content)) !== null) {
      boundaries.add(match.index)
    }

    // Add sentence boundaries for better chunking (especially for PDFs)
    const sentencePattern = /[.!?]+\s+/g
    let sentenceMatch
    while ((sentenceMatch = sentencePattern.exec(content)) !== null) {
      boundaries.add(sentenceMatch.index + sentenceMatch[0].length)
    }

    // Add word boundaries every ~40 words for better granularity with overlap
    const words = content.split(/\s+/)
    let wordCount = 0
    let currentPosition = 0
    
    for (let i = 0; i < words.length; i++) {
      wordCount++
      currentPosition += words[i].length + 1 // +1 for space
      
      // Add boundary every 40 words for granular chunking with ~150 token overlap
      if (wordCount >= 40 && currentPosition < content.length - 150) {
        boundaries.add(currentPosition)
        wordCount = 0
      }
    }

    // Ensure we have at least some boundaries for very long content
    if (boundaries.size < 3 && content.length > 1000) {
      const chunkSize = Math.max(500, Math.floor(content.length / 5))
      for (let i = chunkSize; i < content.length - 100; i += chunkSize) {
        boundaries.add(i)
      }
    }

    // Fallback: If we still don't have enough boundaries, force some
    if (boundaries.size < 10) { // Changed from 3 to 10 for more granular chunks
      console.log('⚠️ Using fallback chunking - not enough semantic boundaries found')
      const fallbackChunkSize = Math.max(150, Math.floor(content.length / 20)) // Much smaller chunks
      for (let i = fallbackChunkSize; i < content.length - 50; i += fallbackChunkSize) {
        boundaries.add(i)
      }
    }

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)
    console.log(`📍 Final boundaries: ${sortedBoundaries.length} total`)
    return sortedBoundaries
  }

  private extractStructuredContent(content: string, boundaries: number[]): any[] {
    const structuredContent = []
    
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i]
      const end = boundaries[i + 1]
      const chunk = content.slice(start, end).trim()
      
      if (chunk.length === 0) continue
      
      const structure = this.analyzeStructure(chunk)
      structuredContent.push({
        content: chunk,
        start,
        end,
        ...structure
      })
    }
    
    return structuredContent
  }

  private analyzeStructure(chunk: string): any {
    const structure = {
      type: 'paragraph' as SemanticChunk['type'],
      metadata: {
        semanticScore: 0,
        keywords: [] as string[],
        level: 1,
        title: '',
        language: ''
      }
    }

    // Detect chunk type
    if (chunk.match(/^#{1,6}\s+/)) {
      structure.type = 'heading'
      const level = chunk.match(/^(#{1,6})/)?.[1].length || 1
      structure.metadata.level = level
      structure.metadata.title = chunk.replace(/^#{1,6}\s+/, '').trim()
    } else if (chunk.match(/^```/)) {
      structure.type = 'code-block'
      const languageMatch = chunk.match(/^```(\w+)/)
      structure.metadata.language = languageMatch?.[1] || 'text'
    } else if (chunk.match(/^\s*[-*+]\s+/) || chunk.match(/^\s*\d+\.\s+/)) {
      structure.type = 'list'
    } else if (chunk.match(/^\s*\|.*\|/)) {
      structure.type = 'table'
    } else if (this.apiPatterns.some(pattern => pattern.test(chunk))) {
      structure.type = 'api-endpoint'
    } else if (chunk.match(/\d{3}\s+(?:error|status)/i)) {
      structure.type = 'error-code'
    }

    // Extract keywords
    structure.metadata.keywords = this.extractKeywords(chunk)
    
    // Calculate semantic score
    structure.metadata.semanticScore = this.calculateSemanticScore(chunk, structure.type)

    return structure
  }

  private extractKeywords(chunk: string): string[] {
    const keywords = new Set<string>()
    
    // Extract technical terms
    const technicalTerms = chunk.match(/\b(?:API|endpoint|request|response|authentication|authorization|token|key|parameter|header|body|status|error|success|failure)\b/gi)
    if (technicalTerms) {
      technicalTerms.forEach(term => keywords.add(term.toLowerCase()))
    }

    // Extract code-related terms
    const codeTerms = chunk.match(/\b(?:function|class|method|variable|constant|import|export|require|module|package|library|framework)\b/gi)
    if (codeTerms) {
      codeTerms.forEach(term => keywords.add(term.toLowerCase()))
    }

    // Extract HTTP methods
    const httpMethods = chunk.match(/\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/gi)
    if (httpMethods) {
      httpMethods.forEach(method => keywords.add(method.toLowerCase()))
    }

    return Array.from(keywords)
  }

  private calculateSemanticScore(chunk: string, type: SemanticChunk['type']): number {
    let score = 0
    
    // Base score by type
    const typeScores = {
      'heading': 0.9,
      'api-endpoint': 0.8,
      'code-block': 0.7,
      'error-code': 0.6,
      'list': 0.5,
      'table': 0.4,
      'section': 0.3,
      'paragraph': 0.2
    }
    
    score += typeScores[type] || 0.1
    
    // Boost score for technical content
    const technicalKeywords = ['api', 'endpoint', 'request', 'response', 'authentication', 'error']
    const technicalCount = technicalKeywords.filter(keyword => 
      chunk.toLowerCase().includes(keyword)
    ).length
    
    score += technicalCount * 0.1
    
    // Boost score for code examples
    if (chunk.includes('```') || chunk.includes('`')) {
      score += 0.2
    }
    
    // Boost score for structured content
    if (chunk.match(/^#{1,6}\s+/) || chunk.match(/^\s*[-*+]\s+/) || chunk.match(/^\s*\d+\.\s+/)) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }

  private createSemanticChunks(structuredContent: any[], context: ChunkingContext): SemanticChunk[] {
    const chunks: SemanticChunk[] = []
    
    structuredContent.forEach((item, index) => {
      const chunk: SemanticChunk = {
        id: `chunk-${index}`,
        content: item.content,
        type: item.type,
        metadata: {
          ...item.metadata,
          startLine: this.getLineNumber(item.start),
          endLine: this.getLineNumber(item.end)
        }
      }
      
      chunks.push(chunk)
    })
    
    // Establish parent-child relationships
    this.establishRelationships(chunks)
    
    return chunks
  }

  private getLineNumber(position: number): number {
    // This is a simplified implementation
    // In a real implementation, you'd track line numbers during parsing
    return Math.floor(position / 80) + 1
  }

  private establishRelationships(chunks: SemanticChunk[]): void {
    let currentHeading: SemanticChunk | null = null
    
    chunks.forEach((chunk, index) => {
      if (chunk.type === 'heading') {
        currentHeading = chunk
        chunk.childChunkIds = []
      } else if (currentHeading) {
        chunk.parentChunkId = currentHeading.id
        currentHeading.childChunkIds!.push(chunk.id)
      }
    })
  }

  private optimizeChunks(chunks: SemanticChunk[]): SemanticChunk[] {
    const optimized: SemanticChunk[] = []
    const minChunkSize = 450   // Increased minimum size for meaningful content (450+ chars)
    const maxChunkSize = 800   // Increased max size for better context (~1600 tokens max)
    const maxMergeSize = 600   // Increased merge size for better chunks
    
    let currentChunk: SemanticChunk | null = null
    
    chunks.forEach(chunk => {
      // Only merge small chunks (< minChunkSize) and only if the result is still reasonable
      if (chunk.content.length < minChunkSize) {
        if (currentChunk && (currentChunk.content.length + chunk.content.length) < maxMergeSize) {
          currentChunk.content += '\n\n' + chunk.content
          currentChunk.metadata.keywords = [
            ...(currentChunk.metadata.keywords || []),
            ...(chunk.metadata.keywords || [])
          ]
        } else {
          // Add current chunk if exists
          if (currentChunk) {
            optimized.push(currentChunk)
          }
          currentChunk = chunk
        }
      } else if (chunk.content.length > maxChunkSize) {
        // Split large chunks into smaller pieces
        const subChunks = this.splitLargeChunk(chunk)
        optimized.push(...subChunks)
        currentChunk = null
      } else {
        // Add current chunk if exists
        if (currentChunk) {
          optimized.push(currentChunk)
        }
        currentChunk = chunk
      }
    })
    
    // Add final chunk
    if (currentChunk) {
      optimized.push(currentChunk)
    }
    
    // For very long content, ensure we have many chunks (like the original 530)
    if (optimized.length < 10) {
      const totalContent = optimized.map(c => c.content).join('\n\n')
      if (totalContent.length > 5000) {
        console.log('🔄 Re-chunking for better granularity...')
        return this.createGranularChunks(totalContent, optimized[0]?.metadata || {})
      }
    }
    
    return optimized
  }

  private createGranularChunks(content: string, baseMetadata: any): SemanticChunk[] {
    console.log('🔬 Creating granular chunks for better search...')
    
    // Split by sentences first
    const sentences = content.split(/[.!?]+\s+/).filter(s => s.trim().length > 10)
    const chunks: SemanticChunk[] = []
    
    let currentChunk = ''
    let chunkIndex = 0
    const targetChunkSize = 500 // Target ~500 chars per chunk for better context (increased from 200)
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      
      // If adding this sentence would make chunk too large, start a new chunk
      if (currentChunk.length + sentence.length > targetChunkSize && currentChunk.length > 0) {
        chunks.push({
          id: `granular-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          type: 'paragraph',
          metadata: {
            ...baseMetadata,
            chunkSize: currentChunk.length,
            granularChunk: true,
            chunkIndex: chunkIndex
          }
        })
        currentChunk = sentence
        chunkIndex++
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      }
    }
    
    // Add the final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `granular-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        type: 'paragraph',
        metadata: {
          ...baseMetadata,
          chunkSize: currentChunk.length,
          granularChunk: true,
          chunkIndex: chunkIndex
        }
      })
    }
    
    console.log(`✅ Created ${chunks.length} granular chunks`)
    return chunks
  }

  private splitLargeChunk(chunk: SemanticChunk): SemanticChunk[] {
    const subChunks: SemanticChunk[] = []
    const sentences = chunk.content.split(/[.!?]+/)
    const chunkSize = 150 // Very small chunk size to stay within token limits
    
    let currentContent = ''
    let sentenceIndex = 0
    
    sentences.forEach(sentence => {
      if (currentContent.length + sentence.length > chunkSize && currentContent.length > 0) {
        subChunks.push({
          ...chunk,
          id: `${chunk.id}-${subChunks.length}`,
          content: currentContent.trim(),
          metadata: {
            ...chunk.metadata,
            startLine: chunk.metadata.startLine! + sentenceIndex
          }
        })
        currentContent = sentence
        sentenceIndex++
      } else {
        currentContent += sentence + '.'
      }
    })
    
    if (currentContent.trim()) {
      subChunks.push({
        ...chunk,
        id: `${chunk.id}-${subChunks.length}`,
        content: currentContent.trim()
      })
    }
    
    return subChunks
  }

  // Generate chunk summary for better search
  generateChunkSummary(chunk: SemanticChunk): string {
    const { content, type, metadata } = chunk
    
    let summary = ''
    
    switch (type) {
      case 'heading':
        summary = `Heading: ${metadata.title}`
        break
      case 'api-endpoint':
        const methodMatch = content.match(/(GET|POST|PUT|DELETE|PATCH)/i)
        const urlMatch = content.match(/https?:\/\/[^\s]+/)
        summary = `API Endpoint: ${methodMatch?.[1] || 'HTTP'} ${urlMatch?.[0] || 'URL'}`
        break
      case 'code-block':
        summary = `Code Example (${metadata.language}): ${content.slice(0, 100)}...`
        break
      case 'error-code':
        const errorMatch = content.match(/(\d{3})\s+(.+)/)
        summary = `Error Code: ${errorMatch?.[1] || 'Unknown'} - ${errorMatch?.[2] || 'Description'}`
        break
      default:
        summary = content.slice(0, 150) + (content.length > 150 ? '...' : '')
    }
    
    return summary
  }
}

// Export convenience functions
export function chunkDocumentSmart(content: string, context?: ChunkingContext): Promise<SemanticChunk[]> {
  const chunker = SmartChunker.getInstance()
  return chunker.chunkDocument(content, context)
}

export function generateChunkSummary(chunk: SemanticChunk): string {
  const chunker = SmartChunker.getInstance()
  return chunker.generateChunkSummary(chunk)
}
