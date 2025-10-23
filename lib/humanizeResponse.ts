/**
 * Humanize Response Middleware
 * 
 * Adds natural, brief openers and connective phrases to make the copilot
 * feel more human and professional without changing the core logic.
 */

export function humanizeResponse(userPrompt: string, rawResponse: string): string {
  // If the model already wrote a human-like opener, don't add fluff
  const startsHuman = /^(got it|understood|sure|okay|that makes sense|here('|')s how|i can help|let me|based on)/i.test(rawResponse.trim());
  
  // If response is long/structured, don't add opener
  if (startsHuman || rawResponse.length > 1200) {
    return rawResponse;
  }

  // Normalize the user prompt for acknowledgment
  const normalized = userPrompt.replace(/\s+/g, ' ').trim();
  const ask = normalized.length > 140 ? normalized.slice(0, 140).trim() + '…' : normalized;

  // Choose appropriate connector based on response length
  const connector = rawResponse.length < 400 ? " Here's what to do:" : " Here's how it works:";

  // Add natural opener
  return `Got it — you're asking about "${ask}."${connector}\n\n${rawResponse}`.trim();
}

/**
 * Generate smart follow-up suggestions based on intent and confidence
 */
export function suggestFollowUp(intent: string, confidence: 'high' | 'medium' | 'low'): string {
  // Only suggest follow-ups for high confidence answers
  if (confidence !== 'high') return '';

  switch (intent.toLowerCase()) {
    case 'endpoint':
    case 'api':
      return " Want a sample cURL request?";
    case 'json':
    case 'example':
      return " Need this as a typed TypeScript interface?";
    case 'auth':
    case 'authentication':
      return " I can show a complete request with headers if helpful.";
    case 'integration':
    case 'setup':
      return " Want me to walk through the complete setup process?";
    case 'error':
    case 'troubleshooting':
      return " Need help debugging this specific issue?";
    default:
      return "";
  }
}

/**
 * Detect user intent from the prompt
 */
export function detectIntent(prompt: string): string {
  const p = prompt.toLowerCase();
  
  // API/Endpoint related
  if (p.includes('endpoint') || p.includes('api call') || p.includes('request')) {
    return 'endpoint';
  }
  
  // Authentication related
  if (p.includes('auth') || p.includes('token') || p.includes('key') || p.includes('login')) {
    return 'auth';
  }
  
  // JSON/Examples
  if (p.includes('json') || p.includes('example') || p.includes('sample')) {
    return 'json';
  }
  
  // Integration/Setup
  if (p.includes('integrate') || p.includes('setup') || p.includes('install') || p.includes('configure')) {
    return 'integration';
  }
  
  // Errors/Troubleshooting
  if (p.includes('error') || p.includes('problem') || p.includes('issue') || p.includes('debug')) {
    return 'error';
  }
  
  return 'general';
}

/**
 * Add subtle thinking pause (builds trust)
 */
export function calculateTypingDelay(responseLength: number): number {
  // Base delay + length-based delay, capped at reasonable maximum
  const baseDelay = 600; // 0.6 seconds
  const lengthDelay = Math.floor(responseLength * 0.4); // 0.4ms per character
  return Math.min(1800, baseDelay + lengthDelay); // Max 1.8 seconds
}

/**
 * Pause execution for specified milliseconds
 */
export function pause(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}



