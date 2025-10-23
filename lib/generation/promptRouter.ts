/**
 * Prompt Router - Deterministic Answer Shapes
 * Clean, strict templates for each intent type
 * No fluff, just clear instructions
 */

import { Intent } from '@/lib/retrieval/policy';

export interface PromptContext {
  intent: Intent;
  query: string;
  contexts: string[];
  conversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * Build intent-specific prompt instruction
 * Returns the system message template for each intent
 */
export function buildPrompt(intent: Intent, contextInstructions?: string): string {
  switch (intent) {
    case 'JSON':
      return `Return the JSON verbatim from the provided context (no commentary). If none exists, reply exactly: "No JSON sample available in docs."`;

    case 'ENDPOINT':
      return `Answer with short bullets: "METHOD /path — brief purpose". Up to 6 lines. If unknown, list nearest related endpoints.`;

    case 'WORKFLOW':
      return `Provide 5–9 numbered steps. Cite two distinct sections by title in parentheses. Keep under 200 words.`;

    case 'CONTACT':
      return `Return the support email verbatim and add "(found in footer)". If multiple, list one per line.`;

    case 'TABLE':
      return `Return a markdown table from the context. If table text is fragmented, reconstruct headers + 3–10 rows from the provided content only.`;

    case 'ERROR_CODE':
      return `List error codes with format: "CODE_NAME — what it means — how to fix". Up to 5 errors. Use markdown table if >3 errors.`;

    case 'ONE_LINE':
      return `Provide exact technical specification in code blocks. For headers: show both with syntax. For values: exact format. Keep under 100 words.`;

    case 'DEFAULT':
    default:
      return `Be concise (≤180 words), grounded strictly in the provided context. Prefer exact strings for endpoints, headers, and codes.`;
  }
}

/**
 * Generate complete system prompt
 * Combines intent-specific instruction + base rules + context
 */
export function generateSystemPrompt(options: PromptContext): string {
  const { intent, query, contexts } = options;

  // Base rules (always applied)
  const baseRules = `You are a technical documentation expert. Follow these rules strictly:
- Answer ONLY from the provided context
- Use exact technical terms, method names, and endpoint paths
- For code/JSON: return verbatim from context
- If information is missing: state clearly what's not available
- NO hallucination, NO guessing, NO external knowledge`;

  // Intent-specific instruction
  const intentInstruction = buildPrompt(intent);

  // Combine context chunks
  const contextBlock = contexts.length > 0
    ? `\n\nCONTEXT:\n${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n---\n\n')}`
    : '\n\nCONTEXT: (none provided)';

  // Build final prompt
  return `${baseRules}

INTENT: ${intent}
INSTRUCTION: ${intentInstruction}
${contextBlock}

USER QUERY: ${query}

Respond according to the INTENT and INSTRUCTION above.`;
}

/**
 * Generate user message (if needed for multi-turn)
 */
export function generateUserMessage(query: string): string {
  return query;
}

/**
 * Simplified prompt builder for quick integration
 */
export function createPrompt(
  intent: Intent,
  query: string,
  contexts: Array<{ content: string; title?: string; page?: number }>
): { system: string; user: string } {
  // Format contexts with metadata
  const formattedContexts = contexts.map((ctx, idx) => {
    let header = `Source ${idx + 1}`;
    if (ctx.title) header += ` (${ctx.title})`;
    if (ctx.page) header += ` [Page ${ctx.page}]`;
    return `${header}:\n${ctx.content}`;
  });

  const systemPrompt = generateSystemPrompt({
    intent,
    query,
    contexts: formattedContexts
  });

  return {
    system: systemPrompt,
    user: query
  };
}

/**
 * Intent-specific post-processing rules
 * Applied to LLM output before returning to user
 */
export function postProcess(intent: Intent, rawOutput: string): string {
  switch (intent) {
    case 'JSON': {
      // Ensure JSON is properly formatted
      const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return `\`\`\`json\n${jsonMatch[1].trim()}\n\`\`\``;
      }
      // Look for bare JSON
      const bareJsonMatch = rawOutput.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (bareJsonMatch) {
        return `\`\`\`json\n${bareJsonMatch[0].trim()}\n\`\`\``;
      }
      return rawOutput;
    }

    case 'ENDPOINT': {
      // Ensure endpoints are formatted consistently
      return rawOutput
        .split('\n')
        .map(line => {
          // Normalize endpoint format: METHOD /path — description
          const match = line.match(/^[•\-*]?\s*(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)\s*[—-]?\s*(.*)/i);
          if (match) {
            const [, method, path, desc] = match;
            return `• ${method.toUpperCase()} ${path}${desc ? ` — ${desc.trim()}` : ''}`;
          }
          return line;
        })
        .join('\n');
    }

    case 'CONTACT': {
      // Ensure email is highlighted
      return rawOutput
        .split('\n')
        .map(line => {
          if (/@/.test(line) && !line.includes('`')) {
            // Wrap email in backticks
            return line.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '`$1`');
          }
          return line;
        })
        .join('\n');
    }

    case 'TABLE': {
      // Ensure table has proper markdown spacing
      if (/\|/.test(rawOutput)) {
        const lines = rawOutput.split('\n');
        const tableLines = lines.filter(line => line.trim().startsWith('|'));
        if (tableLines.length > 0) {
          return tableLines.join('\n');
        }
      }
      return rawOutput;
    }

    default:
      return rawOutput;
  }
}

/**
 * Validate response quality
 * Returns warnings if response doesn't meet intent expectations
 */
export function validateResponse(intent: Intent, response: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  switch (intent) {
    case 'JSON':
      if (!response.includes('```json') && !response.includes('{') && !response.includes('[')) {
        if (!response.includes('No JSON sample available')) {
          warnings.push('Expected JSON or "No JSON sample available" message');
        }
      }
      break;

    case 'ENDPOINT':
      if (!/\b(GET|POST|PUT|PATCH|DELETE)\b/.test(response)) {
        warnings.push('Expected HTTP method in endpoint response');
      }
      if (!response.includes('/')) {
        warnings.push('Expected path (/) in endpoint response');
      }
      break;

    case 'WORKFLOW':
      const numberedSteps = response.match(/^\d+[\.)]/gm);
      if (!numberedSteps || numberedSteps.length < 3) {
        warnings.push('Expected numbered steps (minimum 3)');
      }
      break;

    case 'CONTACT':
      if (!/@/.test(response)) {
        warnings.push('Expected email address in contact response');
      }
      break;

    case 'TABLE':
      if (!/\|/.test(response)) {
        warnings.push('Expected markdown table (|) in response');
      }
      break;
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}
