// lib/chat/answerGenerators.ts
// Document-grounded answer generation to prevent hallucination

const ENDPOINT_WHITELIST = [
  /https?:\/\/(?:test-)?gateway\.zignsec\.com/i,
  /\/mobilesdk\/(?:faceapi|docreader)/i,
  /\/auth\/realms\/zignsec\/protocol\/openid-connect\/token/i,
  /\/api\/ping$/i
];

export function filterEndpointsToBrand(text: string, brand: 'zignsec'|'avenai'|'other'): string[] {
  const httpUrls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const pathUrls = text.match(/\/[a-z0-9-]+(?:\/[a-z0-9-{}]+)+/gi) ?? [];
  const urls = Array.from(new Set([...httpUrls, ...pathUrls]));
  // Keep only branded endpoints for Zignsec
  if (brand === 'zignsec') {
    return urls.filter(u => ENDPOINT_WHITELIST.some(rx => rx.test(u)));
  }
  // For other brands, similar approach (extend later). Default: return explicit paths only.
  return urls.filter(u => u.startsWith("/"));
}

export function generateEndpointResponse(context: string, brand: 'zignsec'|'avenai'|'other' = 'zignsec'): string {
  const endpoints = filterEndpointsToBrand(context, brand);
  
  if (endpoints.length === 0) {
    return "This document does not list specific API endpoints for this topic.";
  }
  
  let response = "**Documented API Endpoints:**\n\n";
  endpoints.forEach((endpoint, index) => {
    response += `${index + 1}. ${endpoint}\n`;
  });
  
  return response;
}

export function generateStructuredAnswer(
  definition: string,
  steps?: string[],
  example?: string,
  caveat?: string
): string {
  let response = `**Definition:** ${definition}\n\n`;
  
  if (steps && steps.length > 0) {
    response += "**Steps:**\n";
    steps.forEach((step, index) => {
      response += `${index + 1}. ${step}\n`;
    });
    response += "\n";
  }
  
  if (example) {
    response += `**Example:**\n${example}\n\n`;
  }
  
  if (caveat) {
    response += `**Note:** ${caveat}`;
  }
  
  return response;
}
