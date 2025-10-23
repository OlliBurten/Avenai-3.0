// lib/chat/responseCleaners.ts
// Enterprise-grade response cleaning for GPT-5 parity

export function cleanArtifacts(s: string): string {
  // Preserve source citations and filenames before cleaning
  const sourceLines = s.match(/^(\*\*)?Sources?:.*$/gim) || [];
  const filenamePatterns = s.match(/\b[\w\-]+\.(pdf|txt|md|docx)\b/gi) || [];
  
  // Strip known artifact phrases (but NOT source citations)
  const BAD_PATTERNS = [
    /looks like an auth\/error response.*$/gim,
    /copy fix/gim,
    /here's the corrected request.*$/gim,
    /for detailed api requests.*postman.*$/gim,
    /\[\d+\](?:,\s*\[\d+\])*/g, // dangling [1], [2] style refs - but not in source lines
  ];
  
  for (const rx of BAD_PATTERNS) {
    s = s.replace(rx, "");
  }
  
  // Remove emojis EXCEPT in specific contexts (preserve file icons if any)
  s = s.replace(/\p{Extended_Pictographic}/gu, "");
  
  // Normalize whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  
  // Don't return empty string if we have content
  if (s.length === 0) {
    return "Content was filtered out by artifact removal.";
  }
  
  return s;
}

export function normalizePdfText(s: string): string {
  // Fix hyphenated line breaks: "authenti-\ncation" -> "authentication"
  s = s.replace(/(\w)-\n(\w)/g, "$1$2");
  // Fix split words with spaces: "authent ication" -> "authentication"
  s = s.replace(/(\w)\s{1,2}\n(\w)/g, "$1 $2");
  // Collapse mid-line newlines that are not paragraph breaks
  s = s.replace(/([^\.\?!:])\n(?!\n)/g, "$1 ");
  
  // Remove duplicate headers and repeated lines
  const lines = s.split('\n');
  const seenHeaders = new Set<string>();
  const filteredLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip duplicate headers (case-insensitive)
    if (trimmedLine.endsWith(':') && trimmedLine.length < 50) {
      const headerKey = trimmedLine.toLowerCase();
      if (seenHeaders.has(headerKey)) {
        continue; // Skip duplicate header
      }
      seenHeaders.add(headerKey);
    }
    
    // Skip repeated lines (exact duplicates within 3 lines)
    const recentLines = filteredLines.slice(-3).map(l => l.trim());
    if (recentLines.includes(trimmedLine) && trimmedLine.length > 10) {
      continue; // Skip duplicate line
    }
    
    filteredLines.push(line);
  }
  
  return filteredLines.join('\n');
}

export function addCompactCitation(s: string): string {
  // Replace citation placeholders like [1], [2], [#1] but PRESERVE actual source lines
  // Don't touch lines that start with "Source:" or "**Source"
  const lines = s.split('\n');
  const cleaned = lines.map(line => {
    // Preserve source citation lines
    if (/^\*\*Sources?:/i.test(line.trim()) || /^Sources?:/i.test(line.trim())) {
      return line;
    }
    
    // Remove citation brackets from other lines
    return line
      .replace(/\[\s*#?\d+\s*\]/g, '')
      .replace(/\[\s*#?\d+\s*,\s*#?\d+\s*\]/g, '');
  });
  
  s = cleaned.join('\n');
  
  // Clean up extra spaces left by citation removal
  s = s.replace(/  +/g, ' '); // Multiple spaces to single space
  s = s.replace(/\n\s*\n\s*\n/g, '\n\n'); // Triple+ newlines to double
  s = s.trim();
  
  // Don't add generic source citation - let the UI chips handle it
  // The sources come from the API response separately
  
  return s;
}

export function finalizeAnswer(s: string): string {
  let cleaned = addCompactCitation(cleanArtifacts(normalizePdfText(s)));
  
  // Remove full-response bold wrapping (if LLM wrapped everything in **)
  // This happens when the response starts with ** and ends with ** but has content in between
  const trimmed = cleaned.trim();
  if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
    // Count ** pairs to see if we have outer wrapping
    const allBoldMarkers = trimmed.match(/\*\*/g) || [];
    
    // If we have exactly 2 markers (start and end), or if the content between first and last
    // markers contains other markdown (headings like ####), it's likely outer wrapping
    if (allBoldMarkers.length === 2 || 
        (allBoldMarkers.length > 2 && /####.*?\*\*/.test(trimmed))) {
      // Remove outer ** wrapping
      const withoutOuter = trimmed.slice(2, -2).trim();
      
      // Verify we didn't break anything - if it still looks like valid markdown, use it
      if (withoutOuter.includes('####') || withoutOuter.includes('\n')) {
        cleaned = withoutOuter;
      }
    }
  }
  
  // Additional cleanup for summary sections that are still bold
  // Remove **Summary:** or **In summary:** patterns and make them normal text
  cleaned = cleaned.replace(/^\*\*(Summary|In summary|To summarize):\*\*\s*/gmi, '$1: ');
  
  // Remove any remaining bold wrapping around summary paragraphs
  cleaned = cleaned.replace(/^\*\*(.*?)\*\*$/gm, (match, content) => {
    // Only remove if it's a single line and doesn't contain markdown
    if (!content.includes('####') && !content.includes('**') && !content.includes('*')) {
      return content;
    }
    return match;
  });
  
  // CRITICAL FIX: Force blank line after H4 headings
  // Handle the actual format the LLM generates: "#### From Document: Title.pdf This document..."
  cleaned = cleaned.replace(
    /^(####\s+From\s+Document:[^\n]+?)\s+(This\s+document\s+)/gm,
    '$1\n\n$2'
  );
  
  // Also handle other common paragraph starters after headings
  cleaned = cleaned.replace(
    /^(####\s+From\s+Document:[^\n]+?)\s+(This\s+document\s+outlines)/gm,
    '$1\n\n$2'
  );
  
  cleaned = cleaned.replace(
    /^(####\s+From\s+Document:[^\n]+?)\s+(This\s+document\s+provides)/gm,
    '$1\n\n$2'
  );
  
  return cleaned;
}
