/**
 * Re-ranking Module
 * 
 * Lightweight LLM re-ranker using OpenAI gpt-5
 */
import { openai } from "../openai";

export interface RerankCandidate {
  id: string;
  content: string;
  metadata: {
    title: string;
    datasetId: string;
    docId: string;
  };
  score: number;
}

export interface RerankResult {
  id: string;
  score: number;
  rank: number;
}

export async function rerank(
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankResult[]> {
  if (candidates.length === 0) {
    return [];
  }
  
  let content: string | null | undefined;
  
  try {
    // Limit to top 20 candidates for cost efficiency
    const topCandidates = candidates.slice(0, 20);
    
    // Truncate each passage to ~400-500 chars
    const truncatedCandidates = topCandidates.map(candidate => ({
      ...candidate,
      content: candidate.content.substring(0, 500)
    }));
    
    // Prepare prompt
    const passages = truncatedCandidates.map((candidate, index) => 
      `${index + 1}. [${candidate.metadata.title}] ${candidate.content}`
    ).join('\n\n');
    
    const prompt = `Rank these passages by how well they answer: "${query}"

Passages:
${passages}

IMPORTANT: Return ONLY a valid JSON array with no additional text. 
- Only rank the passages that are actually shown above (1 to ${truncatedCandidates.length})
- Do not include indices beyond ${truncatedCandidates.length}
- Format: [{"index": 1, "score": 0.9}, {"index": 2, "score": 0.8}]

JSON:`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a JSON-only response system. Return ONLY valid JSON arrays with no additional text, explanations, or formatting. Never include markdown, code blocks, or any text outside the JSON.

CRITICAL: Only rank the passages that are actually provided. If there are ${truncatedCandidates.length} passages, only use indices 1 to ${truncatedCandidates.length}. Do not create indices beyond the available passages.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // GPT-5 only supports default temperature (1)
      max_completion_tokens: 1000
    });
    
    content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    
    // Parse JSON response (handle markdown code blocks and extract JSON)
    let jsonContent = content.trim();
    
    // Remove markdown code blocks
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to extract JSON array from the response
    const jsonMatch = jsonContent.match(/\[.*\]/s);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    const rankings = JSON.parse(jsonContent);
    
    // Map back to candidates with scores
    const reranked: RerankResult[] = rankings.map((ranking: any) => {
      const candidateIndex = ranking.index - 1; // Convert to 0-based
      
      // Safety check for invalid index
      if (candidateIndex < 0 || candidateIndex >= truncatedCandidates.length) {
        console.warn(`Reranking: Invalid index ${ranking.index} (candidateIndex: ${candidateIndex}, total candidates: ${truncatedCandidates.length})`);
        return null;
      }
      
      const candidate = truncatedCandidates[candidateIndex];
      
      // Safety check for undefined candidate
      if (!candidate) {
        console.warn(`Reranking: Candidate at index ${candidateIndex} is undefined`);
        return null;
      }
      
      return {
        id: candidate.id,
        score: ranking.score,
        rank: ranking.index
      };
    }).filter(Boolean); // Remove null entries
    
    // Sort by score (descending) and take top 8
    reranked.sort((a, b) => b.score - a.score);
    return reranked.slice(0, 8);
    
  } catch (error) {
    console.error("Re-ranking failed:", error);
    console.error("Raw LLM response:", content || "No content available");
    
    // Fallback to dense score order
    return candidates
      .slice(0, 8)
      .map((candidate, index) => ({
        id: candidate.id,
        score: candidate.score,
        rank: index + 1
      }));
  }
}
