/**
 * Prompt Router V2 - Strict Mode Enforcement
 * ChatGPT-level answer formatting with domain-aware templates
 */

import { Intent } from '@/lib/chat/intent';

export interface PromptContext {
  query: string;
  intent: Intent;
  contexts: Array<{
    content: string;
    title?: string;
    page?: number;
    sectionPath?: string | null;
    metadata?: any;
  }>;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface HeaderSchema {
  name: string;
  value: string;
  description: string;
}

/**
 * Extract header schema from contexts
 * Looks for Authorization, Zs-Product-Key, Content-Type, etc.
 */
function extractHeaderSchema(contexts: PromptContext['contexts']): HeaderSchema[] {
  const headers: HeaderSchema[] = [];
  const seen = new Set<string>();
  
  for (const ctx of contexts) {
    const content = ctx.content;
    
    // Pattern: Header: Value
    const headerMatches = content.matchAll(/(Authorization|Zs-Product-Key|Content-Type|Accept|API-Key|X-[A-Z][a-zA-Z-]*):\s*([^\r\n]+)/gi);
    
    for (const match of headerMatches) {
      const name = match[1];
      const value = match[2].trim();
      
      if (!seen.has(name)) {
        seen.add(name);
        headers.push({
          name,
          value,
          description: inferHeaderDescription(name, value)
        });
      }
    }
  }
  
  return headers;
}

function inferHeaderDescription(name: string, value: string): string {
  const descriptions: Record<string, string> = {
    'Authorization': 'JWT Bearer token obtained from OAuth 2.0 token endpoint',
    'Zs-Product-Key': 'ZignSec product subscription key identifying your account',
    'Content-Type': 'Format of the request body',
    'Accept': 'Expected response format',
    'API-Key': 'API authentication key'
  };
  
  return descriptions[name] || `HTTP header for ${name}`;
}

/**
 * Generate copy-ready header example block
 */
function generateHeaderExample(headers: HeaderSchema[]): string {
  if (headers.length === 0) return '';
  
  let example = '**Required Authentication Headers:**\n\n';
  
  for (const header of headers) {
    example += `${headers.indexOf(header) + 1}. **${header.name}**\n`;
    example += '```http\n';
    example += `${header.name}: ${header.value}\n`;
    example += '```\n';
    example += `• ${header.description}\n\n`;
  }
  
  // Add OAuth endpoint if Authorization is present
  if (headers.some(h => h.name === 'Authorization')) {
    example += '**OAuth Token Endpoint:**\n';
    example += '```http\n';
    example += 'POST https://gateway.zignsec.com/core/connect/token\n';
    example += '```\n';
  }
  
  return example;
}

/**
 * Prompt Router V2 - Strict mode templates
 */
export function generatePromptV2(context: PromptContext): string {
  const { query, intent, contexts, conversationHistory = [] } = context;
  
  // Base rules for all intents
  const baseRules = `You are a technical documentation expert. Answer based ONLY on the provided context.

**Core Rules:**
- Use exact technical terms from the documentation
- Use proper markdown formatting with code blocks
- Include specific examples when available
- Cite sources using section paths
- If information is missing, explicitly state what's not found`;

  // Build context string
  const contextStr = contexts.map((ctx, idx) => {
    let str = `[Context ${idx + 1}]`;
    if (ctx.title) str += ` from "${ctx.title}"`;
    if (ctx.page) str += ` (page ${ctx.page})`;
    if (ctx.sectionPath) str += ` - ${ctx.sectionPath}`;
    str += `:\n${ctx.content}\n`;
    return str;
  }).join('\n---\n\n');
  
  // Intent-specific templates
  switch (intent) {
    case 'JSON': {
      // Extract verbatim JSON blocks
      const verbatimBlocks = contexts
        .filter(ctx => ctx.metadata?.has_verbatim || ctx.metadata?.verbatim_blocks)
        .flatMap(ctx => ctx.metadata?.verbatim_blocks || [])
        .filter((block: any) => block.type === 'json');
      
      return `${baseRules}

**JSON Mode - Strict Rules:**
- If verbatim JSON found: Return it exactly as shown with proper formatting
- Use \`\`\`json code blocks
- Include field descriptions if mentioned in context
- If NO JSON sample available: Clearly state "No JSON sample available in the documentation"
- DO NOT fabricate or guess JSON structure

${verbatimBlocks.length > 0 ? `**Found ${verbatimBlocks.length} JSON block(s) in context**` : '**No verbatim JSON blocks found**'}

Context:
${contextStr}

Query: ${query}

${verbatimBlocks.length > 0 ? 'Return the JSON sample(s) with proper formatting and explanations.' : 'State that no JSON sample is available, but describe the structure if mentioned.'}`;
    }
    
    case 'ENDPOINT': {
      // Extract endpoints from metadata
      const allEndpoints = contexts
        .flatMap(ctx => ctx.metadata?.endpoints || []);
      
      const headerSchema = extractHeaderSchema(contexts);
      
      return `${baseRules}

**Endpoint Mode - Strict Rules:**
- ALWAYS include METHOD + path (e.g., POST /bankidse/auth)
- Include brief purpose (≤12 words)
- Show authentication headers if mentioned
- Include request/response examples if available
- Use proper HTTP syntax in code blocks
- If endpoint NOT found: List nearest related endpoints

${allEndpoints.length > 0 ? `**Found ${allEndpoints.length} endpoint(s) in context:** ${allEndpoints.map((e: any) => `${e.method} ${e.path}`).join(', ')}` : ''}

Context:
${contextStr}

Query: ${query}

Return endpoint details in this format:
**Endpoint:** \`METHOD /path\`
**Purpose:** Brief description
**Authentication:** (if mentioned)
\`\`\`http
Authorization: Bearer <token>
Zs-Product-Key: <key>
\`\`\`
**Example Request:** (if available)
\`\`\`json
{...}
\`\`\``;
    }
    
    case 'WORKFLOW': {
      return `${baseRules}

**Workflow Mode - Strict Rules:**
- Provide 5-9 numbered steps
- Each step: clear action + brief explanation
- Cite ≥2 section paths as sources
- Include code examples for technical steps
- Use sequential flow (Step 1 → Step 2 → ...)
- Mark decision points clearly

Context:
${contextStr}

Query: ${query}

Return workflow as numbered steps with code examples where applicable.`;
    }
    
    case 'CONTACT': {
      // Extract emails from metadata
      const allEmails = Array.from(new Set(
        contexts
          .flatMap(ctx => ctx.metadata?.emails || [])
      ));
      
      const footerContexts = contexts.filter(ctx => ctx.metadata?.element_type === 'footer');
      
      return `${baseRules}

**Contact Mode - Strict Rules:**
- Return email addresses VERBATIM
- Indicate where found (footer, page number)
- Include support/contact context if available
- If multiple contacts: list all with their purpose
- If NO email found: State clearly

${allEmails.length > 0 ? `**Found ${allEmails.length} email(s):** ${allEmails.join(', ')}` : '**No email addresses found in context**'}
${footerContexts.length > 0 ? `**Found ${footerContexts.length} footer section(s)**` : ''}

Context:
${contextStr}

Query: ${query}

Return contact information in this format:
**Email:** \`email@domain.com\`
**Found in:** Footer, page X
**Context:** Support/general inquiries`;
    }
    
    case 'TABLE': {
      // Extract tables from metadata
      const tables = contexts
        .filter(ctx => ctx.metadata?.table_md || ctx.metadata?.element_type === 'table')
        .map(ctx => ctx.metadata?.table_md || ctx.content);
      
      return `${baseRules}

**Table Mode - Strict Rules:**
- Return markdown table exactly as shown
- Preserve all rows and columns
- Add brief explanation above table
- If NO table found: Describe structure in bullet points
- Use proper markdown table syntax

${tables.length > 0 ? `**Found ${tables.length} table(s) in context**` : '**No tables found**'}

Context:
${contextStr}

Query: ${query}

Return table in markdown format with explanation.`;
    }
    
    case 'ONE_LINE': {
      const headerSchema = extractHeaderSchema(contexts);
      
      if (headerSchema.length > 0) {
        // Auth header question - return copy-ready format
        const headerExample = generateHeaderExample(headerSchema);
        
        return `${baseRules}

**Technical Specification Mode:**
- Extract EXACT technical details from context
- Use proper markdown formatting with code blocks
- For auth headers: Show both headers with explanations
- For endpoints: Include method, path, and example usage
- For error codes: List specific codes with meanings
- NO generic responses - extract actual specifications

Context:
${contextStr}

Query: ${query}

${headerExample}

Provide the complete technical specification with proper formatting.`;
      }
      
      return `${baseRules}

**Technical Specification Mode:**
- Extract EXACT technical details
- Use code blocks for technical values
- Provide specific examples
- NO generic descriptions
- Format as: **Label:** \`value\` with explanation

Context:
${contextStr}

Query: ${query}`;
    }
    
    case 'ERROR_CODE': {
      return `${baseRules}

**Error Code Mode - Strict Rules:**
- List error codes with exact names (e.g., ALREADY_IN_PROGRESS)
- Include error message/description
- Explain cause and resolution
- Use markdown table if multiple errors
- Format: \`ERROR_CODE\` - Description - Resolution

Context:
${contextStr}

Query: ${query}

Return error codes in this format:
| Code | Description | Resolution |
|------|-------------|------------|
| \`CODE\` | What it means | How to fix |`;
    }
    
    default: {
      return `${baseRules}

Context:
${contextStr}

${conversationHistory.length > 0 ? `\nConversation History:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n` : ''}

Query: ${query}

Provide a comprehensive answer with proper formatting and code examples where applicable.`;
    }
  }
}

/**
 * Graceful fallback when endpoint/resource not found
 */
export function generateNotFoundResponse(
  query: string,
  intent: Intent,
  nearestResults?: Array<{ title: string; score: number }>
): string {
  const relatedDocs = nearestResults?.slice(0, 2)
    .map(r => `- ${r.title} (relevance: ${(r.score * 100).toFixed(0)}%)`)
    .join('\n') || '';
  
  switch (intent) {
    case 'ENDPOINT':
      return `**Endpoint Not Found**

The specific endpoint mentioned in your query was not found in the available documentation.

${relatedDocs ? `**Related documentation:**\n${relatedDocs}\n\n` : ''}
**Suggestion:** Please verify:
- The endpoint path and method
- The API version you're using
- The product/service documentation you need

If you're looking for a specific integration, try asking about the integration guide or API reference for that product.`;
    
    case 'JSON':
      return `**JSON Sample Not Available**

No JSON sample matching your query was found in the documentation.

${relatedDocs ? `**Related sections:**\n${relatedDocs}\n\n` : ''}
**Suggestion:** The structure may be described in text format. Try asking:
- "What fields are in the [resource] object?"
- "What's the request body for [operation]?"`;
    
    case 'CONTACT':
      return `**Contact Information Not Found**

No contact information (email, support link) was found for this specific query.

${relatedDocs ? `**Related sections:**\n${relatedDocs}\n\n` : ''}
**Suggestion:** Check the footer sections or "Support" pages of the documentation.`;
    
    default:
      return `**Information Not Found**

The specific information requested was not found in the available documentation.

${relatedDocs ? `**Related documentation:**\n${relatedDocs}\n\n` : ''}
**Suggestion:** Try rephrasing your question or asking about related topics.`;
  }
}

