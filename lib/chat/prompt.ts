/**
 * Chat Prompt Scaffolding
 * 
 * Builds grounded prompts with retrieved content context
 */
import { SearchResult } from "../rag/search";

export interface GroundingContext {
  results: SearchResult[];
  query: string;
}

export function buildGroundedPrompt(context: GroundingContext): string {
  const { results, query } = context;
  
  if (results.length === 0) {
    return `I couldn't find relevant content in your documents. Try uploading more documents or re-processing existing ones.`;
  }
  
  // Build grounding summary
  const groundingSummary = buildGroundingSummary(results);
  
  // Build content sections
  const contentSections = buildContentSections(results);
  
  return `${groundingSummary}

${contentSections}

Instructions:
- Answer concisely using the retrieved sections. Cite the document/title inline where relevant.
- Start with a 1-line grounding from the top chunk (e.g., "From API Documentation, section Authentication → Token:")
- After each key claim or code, append a bracketed source chip like [API Docs §Auth]
- Be direct and specific - avoid boilerplate like "I can help with..."
- Use format: "Do X → then Y → sample code"

User question: ${query}`;
}

function buildGroundingSummary(results: SearchResult[]): string {
  const datasetGroups = new Map<string, Array<{ title: string; datasetId: string }>>();
  
  results.forEach(result => {
    const datasetId = result.metadata.datasetId;
    if (!datasetGroups.has(datasetId)) {
      datasetGroups.set(datasetId, []);
    }
    datasetGroups.get(datasetId)!.push({
      title: result.metadata.title,
      datasetId
    });
  });
  
  const summaryLines: string[] = [];
  summaryLines.push("Grounding:");
  
  for (const [datasetId, docs] of datasetGroups) {
    const uniqueDocs = Array.from(new Set(docs.map(d => d.title)));
    uniqueDocs.forEach(title => {
      summaryLines.push(`- Dataset: ${datasetId} — ${title}`);
    });
  }
  
  summaryLines.push(`(total ${results.length} retrieved sections)`);
  
  return summaryLines.join('\n');
}

function buildContentSections(results: SearchResult[]): string {
  const sections: string[] = [];
  
  results.forEach((result, index) => {
    const sectionTitle = `[${result.metadata.datasetId}] ${result.metadata.title}`;
    sections.push(`## ${sectionTitle}`);
    sections.push(result.metadata.content);
    sections.push(''); // Empty line between sections
  });
  
  return sections.join('\n');
}

export function createEmptyResponse(selectedDatasetIds?: string[]): string {
  if (selectedDatasetIds && selectedDatasetIds.length > 0) {
    return `I couldn't find relevant content in the selected datasets (${selectedDatasetIds.join(', ')}). Try selecting "All datasets" or re-processing the document.`;
  }
  return "I couldn't find relevant content in your documents. Try uploading more documents or re-processing existing ones.";
}
