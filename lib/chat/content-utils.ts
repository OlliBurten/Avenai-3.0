// lib/chat/content-utils.ts
// Utility functions for content processing and validation

/**
 * Truncate content if it exceeds token limit
 * Uses rough approximation: 1 token ≈ 4 characters
 */
export function truncateContent(content: string, maxTokens: number = 800): string {
  const maxChars = maxTokens * 4; // Rough approximation
  
  if (content.length <= maxChars) {
    return content;
  }
  
  // Truncate at a sentence boundary if possible
  const truncated = content.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  // Find the best breaking point
  const breakPoint = Math.max(lastPeriod, lastNewline);
  
  if (breakPoint > maxChars * 0.8) {
    // If we found a good break point in the last 20%, use it
    return truncated.substring(0, breakPoint + 1) + '\n\n[…] (truncated for length)';
  } else {
    // Otherwise, just truncate at max length
    return truncated + '…\n\n[…] (truncated for length)';
  }
}

/**
 * Truncate structured response content
 */
export function truncateStructuredResponse(response: any, maxTokens: number = 800): any {
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  // Clone the response to avoid mutation
  const truncated = { ...response };
  
  // Truncate summary if present
  if (truncated.summary) {
    truncated.summary = truncateContent(truncated.summary, Math.floor(maxTokens * 0.2));
  }
  
  // Truncate each answer's content
  if (Array.isArray(truncated.answers)) {
    const tokensPerAnswer = Math.floor(maxTokens * 0.8 / truncated.answers.length);
    truncated.answers = truncated.answers.map((answer: any) => ({
      ...answer,
      content: truncateContent(answer.content, tokensPerAnswer)
    }));
  }
  
  return truncated;
}

/**
 * Detect if a question is ambiguous and needs clarification
 */
export function isAmbiguousQuestion(question: string, contexts: any[]): { 
  isAmbiguous: boolean; 
  reason?: string;
  suggestions?: string[];
} {
  const lowerQuestion = question.toLowerCase().trim();
  
  // Exclude greetings and simple conversational phrases from ambiguity check
  const greetingPatterns = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|how\s+are\s+you|what's\s+up|thanks?|thank\s+you|bye|goodbye)\s*(copilot|assistant|ai)?\s*[.!?]*$/i;
  if (greetingPatterns.test(lowerQuestion)) {
    return { isAmbiguous: false };
  }
  
  // Check for vague pronouns without context
  const vaguePronouns = ['it', 'this', 'that', 'these', 'those'];
  const hasVaguePronoun = vaguePronouns.some(pronoun => 
    new RegExp(`\\b${pronoun}\\b`, 'i').test(lowerQuestion)
  );
  
  // Check for questions with multiple possible interpretations
  const multipleProducts = contexts.some((c: any) => 
    c.title?.toLowerCase().includes('bankid')
  ) && contexts.some((c: any) => 
    c.title?.toLowerCase().includes('sdk')
  );
  
  // Ambiguous question patterns - ONLY flag truly vague questions
  // Don't flag questions with action verbs like "integrate", "setup", "configure"
  const ambiguousPatterns = [
    { pattern: /^(what|where|why)\s+(is|are)\s+(it|this|that)\s*\??$/i, reason: 'Question is too vague' },
    { pattern: /^(can|could|should|would)\s+(i|it|this|that)\s*\??$/i, reason: 'Question needs more context' }
  ];
  
  // Check if question is too short (< 3 words) - but only for actual questions
  const wordCount = lowerQuestion.split(/\s+/).length;
  const hasQuestionMark = lowerQuestion.includes('?');
  const startsWithQuestionWord = /^(what|how|when|where|why|who|which|can|could|should|would|is|are|do|does)\b/i.test(lowerQuestion);
  
  if (wordCount < 3 && (hasQuestionMark || startsWithQuestionWord)) {
    return {
      isAmbiguous: true,
      reason: 'Question is too brief',
      suggestions: ['Could you provide more details about what you\'re looking for?']
    };
  }
  
  // Check for ambiguous patterns
  for (const { pattern, reason } of ambiguousPatterns) {
    if (pattern.test(lowerQuestion) && hasVaguePronoun) {
      return {
        isAmbiguous: true,
        reason,
        suggestions: multipleProducts 
          ? ['Are you asking about BankID or the Mobile SDK?']
          : ['Could you be more specific about what you need?']
      };
    }
  }
  
  // Check if question mentions multiple products without clear intent
  if (multipleProducts && /\b(and|or|vs|versus|difference)\b/i.test(lowerQuestion)) {
    // This is actually a comparison question, not ambiguous
    return { isAmbiguous: false };
  }
  
  return { isAmbiguous: false };
}

/**
 * Detect contradictory information across sources
 */
export function detectContradictions(contexts: any[]): {
  hasContradictions: boolean;
  contradictions?: Array<{
    topic: string;
    sources: Array<{ document: string; statement: string }>;
  }>;
} {
  if (contexts.length < 2) {
    return { hasContradictions: false };
  }
  
  // Group contexts by document
  const byDocument = new Map<string, any[]>();
  contexts.forEach(ctx => {
    const doc = ctx.title || 'Unknown';
    if (!byDocument.has(doc)) {
      byDocument.set(doc, []);
    }
    byDocument.get(doc)!.push(ctx);
  });
  
  // If only one document, no contradictions possible
  if (byDocument.size < 2) {
    return { hasContradictions: false };
  }
  
  // Look for contradictory patterns
  const contradictionPatterns = [
    { 
      topic: 'version numbers',
      pattern: /version\s+(\d+\.\d+)/gi
    },
    {
      topic: 'URLs',
      pattern: /(https?:\/\/[^\s]+)/gi
    },
    {
      topic: 'requirements',
      pattern: /\b(must|required|mandatory|should|recommended)\b/gi
    }
  ];
  
  const contradictions: Array<{
    topic: string;
    sources: Array<{ document: string; statement: string }>;
  }> = [];
  
  // Simple heuristic: if different documents have very different content
  // about the same topic, flag it
  for (const { topic, pattern } of contradictionPatterns) {
    const matches = new Map<string, Set<string>>();
    
    byDocument.forEach((ctxs, doc) => {
      const content = ctxs.map(c => c.content).join(' ');
      const found = content.match(pattern);
      if (found) {
        matches.set(doc, new Set(found));
      }
    });
    
    // If we have matches from multiple documents and they differ
    if (matches.size >= 2) {
      const values = Array.from(matches.values());
      const firstSet = values[0];
      const hasConflict = values.some(set => {
        return Array.from(set).some(val => !firstSet.has(val));
      });
      
      if (hasConflict) {
        const sources = Array.from(matches.entries()).map(([doc, vals]) => ({
          document: doc,
          statement: Array.from(vals).join(', ')
        }));
        
        contradictions.push({ topic, sources });
      }
    }
  }
  
  return {
    hasContradictions: contradictions.length > 0,
    contradictions: contradictions.length > 0 ? contradictions : undefined
  };
}

/**
 * Format contradictory information neutrally
 */
export function formatContradictions(contradictions: Array<{
  topic: string;
  sources: Array<{ document: string; statement: string }>;
}>): string {
  if (contradictions.length === 0) {
    return '';
  }
  
  let formatted = '\n\n**Note:** Different sources provide varying information:\n\n';
  
  contradictions.forEach(({ topic, sources }) => {
    formatted += `**${topic}:**\n`;
    sources.forEach(({ document, statement }) => {
      formatted += `• ${document}: ${statement}\n`;
    });
    formatted += '\n';
  });
  
  formatted += 'Please verify which version applies to your use case.';
  
  return formatted;
}
