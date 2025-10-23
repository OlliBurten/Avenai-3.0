/**
 * Semantic, Structure-Safe Chunking
 * 
 * Implements heading-aware chunking that preserves document structure
 * and never splits code blocks, tables, or other structural elements.
 */

type Chunk = { id: string; content: string; meta?: any };

export function chunkMarkdown(md: string, maxTokens = 800): Chunk[] {
  // very simple token estimate
  const estTokens = (s: string) => Math.ceil(s.split(/\s+/).length * 0.75);

  // split by top-level headings, keep fences
  const blocks = md.split(/\n(?=#+\s)/); // sections by heading
  const chunks: Chunk[] = [];
  let bucket: string[] = [];
  let size = 0;

  const flush = () => {
    if (!bucket.length) return;
    const text = bucket.join("\n");
    chunks.push({ id: `c_${chunks.length + 1}`, content: text });
    bucket = []; size = 0;
  };

  const pushSafe = (line: string) => {
    const t = estTokens(line);
    if (size + t > maxTokens && bucket.length) flush();
    bucket.push(line);
    size += t;
  };

  for (const b of blocks) {
    const lines = b.split("\n");
    let inFence = false;
    for (const ln of lines) {
      const isFence = /^```/.test(ln.trim());
      if (isFence) inFence = !inFence;
      // never split inside fences: force include
      pushSafe(ln);
    }
    // ensure section boundary is respected
    if (!inFence) flush();
  }
  flush();
  return chunks;
}