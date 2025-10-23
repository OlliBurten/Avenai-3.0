// lib/programmatic-responses.ts
import { openai } from '@/lib/openai'
import { detectIntent } from '@/lib/chat/intent'
import { extractVerbatim } from '@/lib/chat/extractors'
import type { Intent } from '@/lib/chat/intent'
import { buildPrompt } from '@/lib/generation/promptRouter'
import {
  httpBlock, jsonBlock, curlBlock, endpointList, tableMd, bullets, note, contactLine
} from '@/lib/generation/structuredAnswer';

type NormalizedContext = {
  title: string
  chunkIndex: number
  content: string
  metadata?: Record<string, any>
}

function sanitizeSnippet(s: string, max = 1200): string {
  if (!s) return ''
  // avoid breaking code fences in chat UI
  const cleaned = s.replace(/```/g, '`').replace(/\u0000/g, '')
  return cleaned.slice(0, max)
}

// Global variable to store confidence tier from extraction
let globalConfidenceTier: 'high' | 'medium' | 'low' | null = null;

export function getExtractorConfidenceTier(): 'high' | 'medium' | 'low' | null {
  return globalConfidenceTier;
}

export async function generateProgrammaticResponse(
  message: string,
  context: NormalizedContext[],
  options?: { isPartialConfidence?: boolean; topScore?: number; conversationHistory?: Array<{ role: string; content: string }>; intent?: Intent; deterministic?: boolean }
): Promise<string> {
  console.log('generateProgrammaticResponse called with:', { message, contextLength: context?.length })
  
  // Reset global confidence tier
  globalConfidenceTier = null;
  
  // Check if OpenAI API key is configured
  const apiKey = process.env.OPENAI_API_KEY
  console.log('OpenAI API key check:', { 
    hasApiKey: !!apiKey, 
    isPlaceholder: apiKey === 'sk-placeholder' || apiKey === 'sk-proj-placeholder',
    keyStart: apiKey?.substring(0, 10)
  })
  
  if (!apiKey || apiKey === 'sk-placeholder' || apiKey === 'sk-proj-placeholder') {
    console.log('Using fallback response')
    return generateFallbackResponse(message, context)
  }

  // Special handling for questions about Avenai itself
  const messageLower = message.toLowerCase();
  if (messageLower.includes('what is avenai') || messageLower.includes('who is avenai') || 
      messageLower.includes('what are you') || messageLower.includes('who are you')) {
    return [
      `Hi! I'm your Avenai Copilot, here to help with API documentation and SDK integration.`,
      ``,
      `**What I do:**`,
      `- Help you understand APIs, SDKs, and technical documentation`,
      `- Answer questions about implementation, setup, and troubleshooting`,
      `- Provide practical guidance based on your uploaded documentation`,
      `- Make complex technical concepts easier to understand`,
      ``,
      `**How I work:**`,
      `- I only answer from your uploaded documents - no hallucinations`,
      `- When information isn't in your docs, I'll use the safe template and direct you to support`,
      `- I cite my sources so you can verify everything`,
      `- I'm honest about what I know and what I don't`,
      ``,
      `What would you like to know about your APIs or SDKs?`,
    ].join('\n');
  }

  // CRITICAL: Try deterministic extraction first (short-circuit before LLM)
  const intent = options?.intent || detectIntent(message);
  console.log(`🎯 Detected intent: ${intent} for query: "${message.substring(0, 60)}..."`);

  console.log(`🔍 About to call extractVerbatim with intent: ${intent}, message: "${message.substring(0, 50)}...", contexts: ${context.length}`);
  const verbatimResult = extractVerbatim(intent, message, context);
  console.log(`🔍 extractVerbatim returned:`, verbatimResult ? `ok: ${verbatimResult.ok}, confidenceTier: ${verbatimResult.confidenceTier}` : 'null');
  if (verbatimResult === null) {
    console.log(`❌ Verbatim extraction returned null for intent: ${intent}`);
  }
  if (verbatimResult && verbatimResult.ok) {
    console.log(`✅ Verbatim extraction succeeded for intent: ${intent}, confidence: ${verbatimResult.confidenceTier || 'high'}`);
    
    // Store the confidence tier globally so chat route can access it
    globalConfidenceTier = verbatimResult.confidenceTier || 'high';
    
    // Return the content directly - NO LLM wrapping, NO narration
    return verbatimResult.content;
  }

  // ---- Fast-path: structured emit without overloading the LLM when possible ----
  const ctxHas = (pred: (m: any) => boolean) => context.some(pred);
  const findVerbatim = () => context.find(c => c?.metadata?.has_verbatim && c?.metadata?.verbatim_block);
  const emailFromFooter = () =>
    context.find(c => (c?.metadata?.element_type === 'footer') && /@/.test(c.content))?.content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];

  if (intent === 'JSON') {
    const vb = findVerbatim();
    if (vb?.metadata?.verbatim_block) {
      console.log('[Fast-path] Returning verbatim JSON from metadata');
      return jsonBlock(vb.metadata.verbatim_block) + '\n\n' + note('Returning exact payload from docs.');
    }
  }

  if (intent === 'ENDPOINT') {
    const endpoints = context.filter(c => c?.metadata?.endpoint).map(c => ({
      method: c.metadata.endpoint.split(' ')[0] || 'GET',
      path: c.metadata.endpoint.split(' ').slice(1).join(' ') || c.metadata.endpoint,
      note: c.metadata.note || undefined
    }));
    if (endpoints.length > 0) {
      console.log('[Fast-path] Returning endpoint list from metadata');
      return endpointList(endpoints) + '\n\n' + note('Extracted from documentation.');
    }
  }

  if (intent === 'CONTACT') {
    const email = emailFromFooter();
    if (email) {
      console.log('[Fast-path] Returning contact from footer');
      return contactLine(email);
    }
  }

  if (intent === 'TABLE') {
    const tables = context.filter(c => c?.metadata?.element_type === 'table');
    if (tables.length > 0) {
      console.log('[Fast-path] Returning table from metadata');
      const t = tables[0];
      return tableMd({
        headers: t.metadata.headers || ['Field', 'Type', 'Description'],
        rows: t.metadata.rows || []
      });
    }
  }

  if (intent === 'WORKFLOW') {
    const steps = context.filter(c => c?.metadata?.step).map(c => c.metadata.step);
    if (steps.length > 0) {
      console.log('[Fast-path] Returning workflow steps from metadata');
      return bullets(steps) + '\n\n' + note('Step-by-step process from docs.');
    }
  }
  
  console.log(`⏭️ No verbatim match, falling back to LLM for intent: ${intent}`);

  // If we truly have no usable context, guide the user.
  if (!context || context.length === 0) {
    return [
      `Hi there! I'd love to help you with your API documentation questions, but I don't have any content to work with yet.`,
      ``,
      `**Here's what I can do once you upload some docs:**`,
      `- Answer questions about APIs, SDKs, and implementation`,
      `- Help with setup, configuration, and troubleshooting`,
      `- Provide code examples and best practices`,
      `- Explain complex concepts in simple terms`,
      ``,
      `**To get started:**`,
      `- Upload PDF or Markdown files with your documentation`,
      `- Make sure the text is selectable (not scanned images)`,
      `- Once uploaded, I'll be able to help you with specific questions!`,
      ``,
      `I'm here to make your development experience smoother. What would you like to know about your APIs?`,
    ].join('\n');
  }

  // Add guarded preamble for partial confidence matches
  const guardedPreamble = options?.isPartialConfidence 
    ? `\n\n**IMPORTANT:** The retrieved content has moderate relevance (similarity: ${options.topScore?.toFixed(2)}). Provide a guarded answer: "The documentation doesn't explicitly mention this, but based on the API structure..." Only answer if you can make reasonable inferences from the context. If not, say "The documentation doesn't cover this topic."`
    : '';

  // Check if context contains JSON blocks
  const hasJsonBlock = context.some(c => 
    c.content.includes('{') && c.content.includes('"') && c.content.includes(':')
  );

  // PR-5: PromptRouter Integration — Use intent-specific prompt templates
  const USE_PROMPT_ROUTER = process.env.PROMPT_ROUTER !== 'false';  // Default: ON
  console.log(`🎯 [PromptRouter] Feature flag check:`, {
    envValue: process.env.PROMPT_ROUTER,
    isEnabled: USE_PROMPT_ROUTER
  });
  
  let sys: string;
  
  if (USE_PROMPT_ROUTER) {
    // Build formatted context string for prompt router
    const contextText = context
      .map((c, i) => {
        const pageInfo = c.metadata?.page ? ` (Page ${c.metadata.page})` : '';
        const sectionInfo = c.metadata?.section_path ? ` [${c.metadata.section_path}]` : '';
        return `### [Chunk ${i + 1}] ${c.title}${pageInfo}${sectionInfo}\n\n${c.content}`;
      })
      .join('\n\n---\n\n');
    
    console.log(`🎯 [PromptRouter] Building intent-specific prompt for: ${intent}`);
    
    // Use PR-5 intent-optimized prompt templates
    sys = buildPrompt(intent, contextText, message);
    
    console.log(`✅ [PromptRouter] Prompt built (${sys.length} chars)`);
  } else {
    // Legacy system prompt (fallback if feature flag disabled)
    console.log(`⚠️ [PromptRouter] Feature disabled, using legacy prompt`);
    
    // Get intent-specific prompt guidance (partial integration)
    const intentGuidelines = getResponseGuidelines(intent);
    console.log(`🎯 [PromptRouter] Using guidelines for intent ${intent}:`, intentGuidelines);

    sys = [
    `You are an API documentation assistant. Your job is to help developers understand their technical documentation.`,
    ``,
    `**Core Rules:**`,
    `1. Answer ONLY from the provided documentation chunks below`,
    `2. Never use external knowledge or make assumptions`,
    `3. If information isn't in the docs, say so clearly: "The documentation doesn't specify..."`,
    `4. Be concise - answer questions directly and simply. For simple questions (e.g., "when was it last updated?"), provide a brief, direct answer. For complex questions, you can provide more detail.`,
    `5. Cite sources when possible`,
    `6. Format responses for readability with clear structure`,
    `7. **CRITICAL - DO NOT IGNORE THIS**: For simple factual questions ("when?", "what version?"), give ONLY the requested fact in 1 sentence. DO NOT add extra context, background, or descriptions. Answer the specific question asked, nothing more.`,
    `8. **CRITICAL**: For general questions like "What is X?" or "Tell me about X?", create a SINGLE unified answer that synthesizes information from all relevant documents. Do NOT list documents separately. NEVER use bullet points with document names.`,
    `9. **CRITICAL**: Do NOT include a "summary" field unless the content is extremely long (>200 words). The content should be self-contained and well-structured without needing a separate summary.`,
    guardedPreamble,
    ``,
    `**Response Guidelines for ${intent} Intent:**`,
    `- Format: ${intentGuidelines.format}`,
    `- Max length: ${intentGuidelines.maxWords} words`,
    `- Tone: ${intentGuidelines.tone}`,
    ``,
    `**JSON & CODE SAMPLES (CRITICAL - HIGHEST PRIORITY):**`,
    hasJsonBlock ? `⚠️ JSON DETECTED IN CONTEXT - VERBATIM MODE ENFORCED ⚠️` : '',
    `- If the context contains JSON examples, sample responses, or code snippets, return them VERBATIM - copy-paste exactly`,
    `- Do NOT summarize, paraphrase, or describe JSON structures - show the COMPLETE example from the docs`,
    `- Do NOT fabricate or invent JSON keys/values - only use what's in the context`,
    `- Preserve all fields, values, formatting, and indentation from the original`,
    `- If a JSON example is >300 tokens, still include it in full - accuracy matters more than brevity`,
    `- For "sample response", "example", "full JSON", or "paste" queries, ALWAYS show the complete JSON/code block`,
    `- If you see { followed by " and : in the context, that's JSON - return it exactly as written`,
    `- NEVER say "here's an example structure" or "the format looks like" - paste the actual JSON`,
    `- If you cannot find the exact JSON in the context, say "The documentation doesn't include a complete JSON example for this" - DO NOT make one up`,
    ``,
    `**Special Cases:**`,
    `- If asked to "describe" or "tell me about" the documents themselves (not their content), provide a brief overview of what each document covers based on the chunks provided`,
    `- For casual/conversational questions, respond naturally and helpfully`,
    `- For technical questions, dive into specifics with citations`,
    `- For "how do I integrate" or "getting started" questions, provide step-by-step instructions from the documentation`,
    `- If asked to "recreate", "reformat", "convert to table", or "make a markdown table" of content, find the relevant information in the chunks and format it as requested`,
    `- For comparison tables, use proper markdown table syntax with | separators and header rows`,
    `- When comparing features (e.g., "Passive vs Active Liveness"), create a clear table with Feature column and comparison columns`,
    `- When describing processes or flows, use numbered markdown lists (1. 2. 3.) for sequential steps`,
    `- Preserve ordered lists from the documentation as numbered lists in your response`,
    `- **CRITICAL**: When the context contains structured data fields (like field names, descriptions, requirements), format them as markdown tables`,
    `- For data field specifications, create tables with columns like "Field Name", "Description", "Required/Optional", "Format", "Length", "Examples"`,
    `- Always use proper markdown table syntax: | Column 1 | Column 2 | Column 3 |`,
    `- Include header rows with | --- | --- | --- | separators for proper table rendering`,
    ``,
    `**TYPO CORRECTION:**`,
    `- If the user's query contains obvious typos (e.g., "destinashunMerchantGroupId"), correct them and mention it`,
    `- Example: "I think you meant 'destinationMerchantGroupId'. Here's what I found..."`,
    `- Common typos: destinashun→destination, merchent→merchant, onbording→onboarding, evaluatin→evaluation`,
    `- When showing URLs, always label environments clearly: "TEST: https://test-gateway..." or "PROD: https://gateway..." on separate lines`,
    ``,
    `**Response Style & Formatting:**`,
    `- **Match response length to question complexity**:`,
    `  * Simple factual questions (e.g., "when was it last updated?", "what version?") → 1-2 sentences maximum, no summary needed`,
    `  * Moderate questions (e.g., "how do I...?") → 2-3 sentences with key steps`,
    `  * Complex questions (e.g., "explain the architecture", "tell me about X") → Multiple short paragraphs (3-4 sentences each) separated by blank lines (\\n\\n)`,
    `- **CRITICAL**: Break long responses into 2-3 short paragraphs with blank lines between them. NEVER write a single massive paragraph.`,
    `- Professional and clear`,
    `- No hedging language ("likely", "probably", "might be")`,
    `- Use definitive statements when info is present`,
    `- Be honest when info is missing`,
    `- Use **bold** for key concepts and important terms`,
    `- Use bullet points (-) or numbered lists (1. 2. 3.) for multiple items`,
    `- Use code blocks (\`\`\`) for URLs, endpoints, and technical terms`,
    `- For general questions, synthesize information into a unified, flowing response`,
    `- For specific questions, organize information clearly with appropriate structure`,
    ``,
    `**LANGUAGE RULES:**`,
    `- Use definitive language when info IS in docs: "The SDK provides...", "According to the documentation..."`,
    `- Use honest language when info is NOT in docs: "The documentation doesn't specify...", "This isn't mentioned in the current docs..."`,
    `- **CRITICAL - TABLE OF CONTENTS**: If asked for "table of contents", look for actual TOC structure in the context (numbered sections, page listings, etc.). If you don't see an explicit table of contents, say "The documentation excerpt I have doesn't include a table of contents section. I can see sections on [list the actual sections you found]." DO NOT make up or infer a TOC from other documents.`,
    `- **CRITICAL**: If asked for specific content (like specific sections or lists) and you don't see it in the context, say "The documentation excerpt I have doesn't include [requested content]." DO NOT make up or infer content.`,
    `- NEVER use: "likely", "probably", "might be", "could be", "seems to", "appears to"`,
    `- ALWAYS quote or paraphrase the actual document text when available`,
    ``,
    `**HANDLING AMBIGUOUS QUESTIONS & CONVERSATION CONTEXT:**`,
    `- Use conversation history to resolve pronouns like "it", "this", "that"`,
    `- If user asks "How do I integrate it?" after asking about "Avenai Identity API", understand "it" refers to the API`,
    `- If user asks "tell me more" or "how do I use it?", refer to the previous topic discussed`,
    `- When a question could have multiple interpretations (e.g., "these two APIs" could mean features OR documents):`,
    `  1. Acknowledge the ambiguity briefly: "I found information about two things..."`,
    `  2. Cover both interpretations with clear headings`,
    `  3. Keep each interpretation concise (2-3 sentences)`,
    `  4. Let user ask follow-up for details`,
    `- For general questions (e.g., "What is WebID?"), synthesize information from all relevant documents into a unified answer`,
    `- For specific questions about individual documents, you can reference specific documents`,
    ``,
    `**RESPONSE FORMAT - CRITICAL:**`,
    `Respond strictly in JSON using the schema below:`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "Document title",`,
    `      "content": "Answer text from that document"`,
    `    }`,
    `  ],`,
    `  "summary": "Optional overall summary"`,
    `  "coverage": "full" | "partial" | "out_of_scope",`,
    `  "evidence": [`,
    `    {`,
    `      "doc": "Document title",`,
    `      "page": 5,`,
    `      "snippet": "Short 20-30 word excerpt"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `**JSON SCHEMA RULES:**`,
    `- Each "answers" entry represents one document's contribution`,
    `- "document" should be the exact document title from the context`,
    `- "content" should be the answer text for that document (can include markdown like lists, code blocks)`,
    `- "summary" is optional - ONLY include if the content is very long (>150 words). For most questions, omit the summary to avoid redundancy.`,
    `- "coverage": Set to "full" if all requested information is found (including multi-document answers that provide complete context), "partial" if some is missing, "out_of_scope" if none is relevant`,
    `- "evidence": Array of source citations with doc title, page number, and short snippet (20-30 words)`,
    `- Do NOT include any markdown formatting in the JSON structure itself`,
    `- Do NOT wrap the entire response in markdown code blocks`,
    ``,
    `**RELEVANCE RULE (CRITICAL):**`,
    `- Only include documents in "answers" that contain RELEVANT information for the user's question`,
    `- If a document doesn't have relevant information, DO NOT include it in the response`,
    `- Do NOT say "This document does not mention..." - just omit that document entirely`,
    `- For specific questions (e.g., "What is the Mobile SDK?"), only include the document(s) that discuss that topic`,
    `- For general questions (e.g., "What is this platform?"), include all relevant documents`,
    ``,
    `**ANSWER STYLE RULE (CRITICAL):**`,
    ``,
    `Use UNIFIED ANSWER (single "answers" entry with generic document name) when:`,
    `- Question asks "What is X?" or "Tell me about X?" (general concept questions)`,
    `- Question asks about relationships, comparisons, or how things work together`,
    `- Question asks about general concepts, audiences, or use cases (e.g., "What developers?", "Who uses this?")`,
    `- Question requires synthesizing information across multiple sources`,
    `- Breaking by document would create awkward repetition or redundancy`,
    ``,
    `Use SPECIFIC DOCUMENT NAME (single "answers" entry with the EXACT document title from context) when:`,
    `- User explicitly asks about a specific document by name (e.g., "tell me about the WebID Merchant Group Setup document")`,
    `- Question is clearly about ONE specific document`,
    `- **CRITICAL**: Use the EXACT document title from the context (e.g., "G2RS WebID MG Setup and Configurations.pdf"), NOT "Cross-Document Summary"`,
    `- This is important for conversation memory - follow-up questions need to reference the same document`,
    ``,
    `Use DOCUMENT SECTIONS (separate "answers" entries with actual doc names) when:`,
    `- User wants to see multiple documents' perspectives separately`,
    `- Each document provides substantially different information that should be separated`,
    `- Question asks for specific details from individual documents`,
    ``,
    `Examples of questions requiring UNIFIED answers:`,
    `- "What is WebID?" (general concept question)`,
    `- "How do these products relate?"`,
    `- "What developers integrate these?"`,
    `- "What are the use cases?"`,
    `- "How do I authenticate?"`,
    `- "What's the difference between X and Y?"`,
    ``,
    `For unified answers spanning multiple documents, use: "Cross-Document Summary" or list the actual document names (e.g., "Mobile SDK + BankID Integration").`,
    ``,
    `**CONTENT GUIDELINES:**`,
    `- For general questions, create a single unified answer that synthesizes information from all relevant documents`,
    `- For specific questions about individual documents, create separate "answers" entries for each document`,
    `- Use clear, natural language in the "content" field`,
    `- Include code examples, lists, and formatting within the content as needed`,
    `- Keep content focused and relevant to the question`,
    `- If information is missing, be explicit about what's not available`,
    `- **NEVER use horizontal rules (---, ***, or <hr>) in your responses** - they create ugly visual separators`,
    ``,
    `**GPT-5 STYLE FORMATTING RULES:**`,
    `- **Summary**: Include a concise one-line TL;DR in the "summary" ONLY if it adds new information not repeated verbatim in document sections`,
    `- **Document Sections**: Use clear, indented paragraphs with comfortable spacing`,
    `- **In Practice Section**: Do NOT include any generic "In Practice" section. If synthesizing across docs, keep it in the summary only.`,
    `- **Source List**: Clean bullet list, no .pdf extensions, with optional page numbers`,
    `- **Consistent Spacing**: One blank line between all major sections`,
    `- **Typography Polish**: Use prose, leading-relaxed, and good line spacing`,
    `- **No Bold Body Text**: Only use bold for emphasis or the summary, never for full paragraphs`,
    `- **Professional Tone**: Write in a clear, authoritative style that matches enterprise documentation`,
    ``,
    `**ENDPOINT SAFETY RULE:**`,
    `- If an endpoint or URL is not explicitly in the context, DO NOT provide it`,
    `- Instead say: "I don't see this specific endpoint in the documentation. Please check the API reference or contact support."`,
    `- Use the safe template format when information is missing`,
    `- Better to say "I don't know" than to hallucinate an incorrect endpoint`,
    ``,
    `**EXAMPLES OF PERFECT RESPONSES:**`,
    ``,
    `Example 1 - Specific Question (Only ONE relevant document):`,
    `Q: "Tell me about the WebID Merchant Group Setup document"`,
    `Context includes document: "G2RS WebID MG Setup and Configurations.pdf"`,
    `CORRECT Response:`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",  ← Use EXACT title from context for conversation memory`,
    `      "content": "The G2RS WebID MG Setup and Configurations document provides a guide for setting up and configuring WebID merchant groups (MGs). It covers product setup, organization configuration, MG types, and service tiers like E-commerce Detection and Payment Service Recording."`,
    `    }`,
    `  ],`,
    `  "coverage": "full"`,
    `}`,
    ``,
    `WRONG Response (breaks conversation memory):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "Cross-Document Summary",  ← WRONG! This breaks follow-up questions`,
    `      "content": "..."`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 2 - General Question (Multiple relevant documents with SECTIONS):`,
    `Q: "What is this platform?"`,
    `{`,
    `  "summary": "This platform provides digital identity-verification solutions with multiple offerings for secure user onboarding.",`,
    `  "answers": [`,
    `    {`,
    `      "document": "Mobile SDK Guide.pdf",`,
    `      "content": "The Mobile SDK enables identity verification through mobile devices by capturing and analyzing ID documents and performing biometric checks."`,
    `    },`,
    `    {`,
    `      "document": "API Integration Guide.pdf",`,
    `      "content": "The API allows merchants to authenticate users through electronic identification systems, explaining authentication sessions, callbacks, and user data retrieval."`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 3 - Synthesis Question (UNIFIED answer, no document sections):`,
    `Q: "How do these two products relate to each other?"`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "Cross-Document Summary",`,
    `      "content": "Both solutions focus on identity verification but serve different use cases. The Mobile SDK uses biometric and document scanning for in-app identity verification, making it ideal for onboarding flows and document validation. BankID integration provides authentication through Norway's national digital identity system, which is useful for secure login and transaction signing. Many organizations use both: the Mobile SDK for initial identity verification during onboarding, and BankID for ongoing secure authentication."`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 4 - Simple Factual Question (SHORT, DIRECT answer):`,
    `Q: "When was the WebID document last updated?"`,
    `CORRECT Response:`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",`,
    `      "content": "The document was last updated in May 2025."`,
    `    }`,
    `  ],`,
    `  "coverage": "full"`,
    `}`,
    ``,
    `INCORRECT Response for Simple Question (TOO VERBOSE - Do NOT do this):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",`,
    `      "content": "The WebID document, specifically the G2RS WebID MG Setup and Configurations guide, was last updated in May 2025. This document provides a comprehensive overview for setting up and configuring WebID merchant groups..."  ← WRONG! Too verbose for a simple date question!`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 6 - Table of Contents Request (HONEST when not found):`,
    `Q: "What are the table of contents for the WebID document?"`,
    `CORRECT Response (when TOC not in context):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",`,
    `      "content": "The documentation excerpt I have doesn't include a formal table of contents section. However, I can see the document covers these main topics: WebID product setup, organization configuration, merchant group (MG) setup, tier options (E-commerce Detection, Payment Service Recording), and approval workflows."`,
    `    }`,
    `  ],`,
    `  "coverage": "partial"`,
    `}`,
    ``,
    `INCORRECT Response (Do NOT make up TOC from other documents):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",`,
    `      "content": "The table of contents includes sections on introduction, basic navigation, dashboard analytics, content compliance..."  ← WRONG! These sections are from a different document!`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 5 - General Concept Question (UNIFIED answer, NO SUMMARY):`,
    `Q: "What is WebID?"`,
    `CORRECT Response:`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "Cross-Document Summary",`,
    `      "content": "WebID is a comprehensive solution for managing and verifying merchant identities across various platforms. It helps organizations identify unverified business websites within merchant portfolios to reduce fraud risks and create opportunities for cross-selling and upselling.\\n\\nThe system includes setup and configuration tools for merchant groups, integration with client portals for case management, data upload capabilities for merchant information, and API support for backend verification processes."`,
    `    }`,
    `  ],`,
    `  "coverage": "full"`,
    `}`,
    ``,
    `Note: No "summary" field included because the content is already concise and well-structured.`,
    ``,
    `INCORRECT Response (Do NOT do this):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "G2RS WebID MG Setup and Configurations.pdf",`,
    `      "content": "**G2RS WebID MG Setup and Configurations.pdf:** This document provides..."`,
    `    },`,
    `    {`,
    `      "document": "G2RS Client Portal User Guide.pdf",`,
    `      "content": "**G2RS Client Portal User Guide.pdf:** Describes integration..."`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `WRONG Response (Do NOT do this):`,
    `{`,
    `  "answers": [`,
    `    {`,
    `      "document": "Zignsec ID & Bio Verification Mobile SDK - confidential.pdf",`,
    `      "content": "Developers integrating the Mobile SDK are mobile app developers..."  ← WRONG! This creates awkward repetition!`,
    `    },`,
    `    {`,
    `      "document": "ZignSec - BankID Norway Integration Guidelines.pdf",`,
    `      "content": "Developers integrating BankID are backend engineers..."  ← WRONG! Just write ONE unified answer!`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Example 3 - Guarded Response for Missing Literals:`,
    `Q: "What are the required headers for BankID requests?"`,
    `CORRECT Response (when headers not explicitly listed):`,
    `{`,
    `  "summary": "The BankID PDF doesn't explicitly list required headers, but ZignSec gateway APIs typically use standard authentication headers.",`,
    `  "coverage": "partial",`,
    `  "answers": [`,
    `    {`,
    `      "document": "ZignSec - BankID Norway v5.1 - Integration Guidelines.pdf",`,
    `      "content": "The BankID PDF doesn't list specific headers. For ZignSec gateway APIs in our other docs, requests typically include Authorization: Bearer <token> and Zs-Product-Key: <key>. Please confirm with your ZignSec product docs or support."`,
    `    }`,
    `  ],`,
    `  "evidence": [`,
    `    {`,
    `      "doc": "ZignSec - BankID Norway v5.1 - Integration Guidelines.pdf",`,
    `      "page": 5,`,
    `      "snippet": "Authentication and API endpoint configuration details..."`,
    `    }`,
    `  ]`,
    `}`,
  ].join('\n');
  }  // End of USE_PROMPT_ROUTER conditional

  // Group context by document to show diversity
  const byDocument = new Map<string, typeof context>();
  context.forEach(c => {
    const title = c.title;
    if (!byDocument.has(title)) {
      byDocument.set(title, []);
    }
    byDocument.get(title)!.push(c);
  });

  const packed = Array.from(byDocument.entries())
    .map(([docTitle, chunks]) => {
      const source = docTitle.toLowerCase().includes('.md') ? 'md' : 
                    docTitle.toLowerCase().includes('.pdf') ? 'pdf' : 'doc';
      const chunksList = chunks.map((c, i) => {
        // Use page number if available, otherwise chunk index
        const location = c.chunkIndex ? `p. ${c.chunkIndex}` : `chunk ${i + 1}`;
        return `[${source}:#${i + 1}] (${location})\n${sanitizeSnippet(c.content)}`;
      }).join('\n\n');
      return `**Document: ${docTitle}**\n${chunksList}`;
    })
    .join('\n\n---\n\n')

  const docCount = byDocument.size;
  const docList = Array.from(byDocument.keys()).join(', ');

  const user = [
    `Question: ${message}`,
    '',
    `**IMPORTANT: You have context from ${docCount} different document${docCount > 1 ? 's' : ''}: ${docList}**`,
    `**When answering, synthesize information from ALL documents into a unified, flowing response.**`,
    `**Do NOT list each document separately - create a single cohesive answer.**`,
    '',
    'Context:',
    packed,
  ].join('\n')

  try {
    console.log('Making OpenAI API call...')
    // Build messages array with conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: sys }
    ];
    
    // Add conversation history if available (max last 5 exchanges = 10 messages)
    if (options?.conversationHistory && options.conversationHistory.length > 0) {
      const recentHistory = options.conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      messages.push(...recentHistory);
      console.log('💬 Added conversation history to OpenAI call:', {
        historyMessages: recentHistory.length,
        roles: recentHistory.map(m => m.role)
      });
    }
    
    // Add current user message
    messages.push({ role: 'user', content: user });
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',  // Use GPT-5 if configured in env
      temperature: options?.deterministic ? 0 : 0.4,  // Lower temp for golden tests
      max_tokens: 1200,  // Increased for structured formatting
      messages,
    })

    console.log('OpenAI completion:', completion)
    const out = completion.choices?.[0]?.message?.content?.trim()
    console.log('OpenAI response content:', out)
    if (out) return out
  } catch (error) {
    console.error('OpenAI API error:', error)
    return generateFallbackResponse(message, context)
  }

  // Fallback: short preview
  return [
    'I found some related content, but I had trouble forming a complete answer. Here\'s what I found:',
    '',
    ...context.slice(0, 3).map((c, i) => {
      const source = c.title.toLowerCase().includes('.md') ? 'md' : 
                    c.title.toLowerCase().includes('.pdf') ? 'pdf' : 'doc';
      const location = c.chunkIndex ? `p. ${c.chunkIndex}` : `chunk ${i + 1}`;
      return `[${source}:#${i + 1}] ${c.title} (${location})\n${sanitizeSnippet(c.content, 600)}`;
    }),
    '',
    'Feel free to ask me to clarify any of this content, or try rephrasing your question!',
  ].join('\n\n')
}

function generateFallbackResponse(message: string, context: NormalizedContext[]): string {
  const messageLower = message.toLowerCase();
  
  // Handle simple greetings and casual conversation
  if (messageLower === 'hi' || messageLower === 'hello' || messageLower === 'hey' || 
      messageLower === 'hi there' || messageLower === 'hello there' || 
      messageLower.includes('good morning') || messageLower.includes('good afternoon') ||
      messageLower.includes('good evening') || messageLower === 'how are you') {
    return `Hi there! 👋 I'm your Avenai Copilot for API documentation and SDK integration.

I'm here to help you with:
- Understanding APIs and endpoints
- SDK integration and setup
- Troubleshooting technical issues
- Code examples and best practices

**Important**: I only answer from your uploaded documents - I never invent endpoints or SDK methods. If information isn't in your docs, I'll let you know and direct you to support.

**Note**: I'm currently running in fallback mode. For more detailed AI-powered responses, please configure your OpenAI API key.

What would you like to know about your APIs or documentation?`;
  }

  // Special responses for common questions
  if (messageLower.includes('what is avenai') || messageLower.includes('who are you')) {
    return `Hi! I'm your Avenai Copilot for API documentation and SDK integration. I help developers understand APIs, troubleshoot issues, and provide practical guidance based only on your uploaded docs.

**Current Status**: I'm running in fallback mode because the OpenAI API key isn't configured. To enable full AI functionality:

1. Run: \`./setup-enhancements.sh\`
2. Enter your OpenAI API key
3. Restart the development server

Even without the API key, I can still help you navigate your documentation!`;
  }

  if (messageLower.includes('api') || messageLower.includes('endpoint')) {
    return `I'd love to help you with API questions! I can assist with:

**API Documentation Help:**
- Understanding endpoints and parameters
- Authentication and authorization
- Error handling and status codes
- Request/response examples
- Integration best practices

**Current Status**: Running in fallback mode. For full AI-powered responses, please configure your OpenAI API key using \`./setup-enhancements.sh\`

**What I can do right now:**
- Help you navigate your uploaded documentation
- Provide general API guidance
- Answer basic integration questions

What specific API question do you have?`;
  }

  if (context && context.length > 0) {
    return `I found some relevant content in your documentation:

${context.slice(0, 3).map((c, i) => {
  const source = c.title.toLowerCase().includes('.md') ? 'md' : 
                c.title.toLowerCase().includes('.pdf') ? 'pdf' : 'doc';
  return `[${source}:#${i + 1}] ${c.title}\n${sanitizeSnippet(c.content, 400)}`;
}).join('\n\n')}

**Note**: I'm currently in fallback mode. For more detailed AI-powered responses, please configure your OpenAI API key using \`./setup-enhancements.sh\`

Is there something specific about this content you'd like me to help explain?`;
  }

  return `Hi! I'm your Avenai Copilot for API documentation and integration help.

**Important**: I only answer from your uploaded documents - I never invent endpoints or SDK methods not present in your PDFs.

**Current Status**: Running in fallback mode due to missing OpenAI API key.

**To enable full functionality:**
1. Run: \`./setup-enhancements.sh\`
2. Enter your OpenAI API key
3. Restart the development server

**What I can help with:**
- API documentation and integration
- Code examples and troubleshooting
- Best practices and guidance
- Step-by-step implementation help

**Even in fallback mode, I can:**
- Help navigate your uploaded docs
- Provide general guidance
- Answer basic questions

What would you like to know about your APIs or documentation?`;
}