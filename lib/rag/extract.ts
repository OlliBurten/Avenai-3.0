type Chunk = { content: string; metadata: any };
type UDoc = { md: string; meta?: any };

const ENDPOINT_RE = /(?:GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9_\/\-:{]+/g;

export function extractEndpointsFromMarkdown(md: string): string[] {
  const set = new Set<string>();
  // inline lines
  md.split('\n').forEach(line => {
    const m = line.match(ENDPOINT_RE);
    if (m) m.forEach(e => set.add(e.trim()));
  });
  // code fences
  const fences = md.split("```");
  for (let i = 1; i < fences.length; i += 2) {
    const block = fences[i];
    const ms = block.match(ENDPOINT_RE);
    if (ms) ms.forEach(e => set.add(e.trim()));
  }
  return Array.from(set);
}

export function hasAuthHints(md: string): boolean {
  return /\b(authorization|bearer|api-?key|oauth|token|client_secret|client_id)\b/i.test(md);
}

export function mentionsError(md: string, code: string): boolean {
  const re = new RegExp(`\\b${code}\\b`);
  return re.test(md) || new RegExp(`http\\s*${code}`).test(md);
}
