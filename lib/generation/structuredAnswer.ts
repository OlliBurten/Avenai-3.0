// Lightweight format helpers for crisp, copyable blocks.
// These return Markdown strings that render beautifully with your Shiki renderer.

type Headers = Record<string, string | number | boolean>;

export function httpBlock(
  method: string, path: string, headers?: Headers, body?: unknown
): string {
  const hdr = headers ? Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n') + '\n' : '';
  const bdy = body ? '\n' + JSON.stringify(body, null, 2) : '';
  return `\`\`\`http\n${method.toUpperCase()} ${path}\n${hdr}${bdy}\n\`\`\``;
}

export function jsonBlock(data: unknown | string): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return `\`\`\`json\n${json}\n\`\`\``;
}

export function curlBlock(opts: {
  method: string; url: string; headers?: Headers; data?: unknown | string;
}): string {
  const { method, url, headers, data } = opts;
  const hdr = headers ? Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(' \\\n') + ' \\\n' : '';
  const dta = data ? `  -d '${typeof data === 'string' ? data : JSON.stringify(data)}'` : '';
  return `\`\`\`bash\ncurl -X ${method.toUpperCase()} \\\n  '${url}' \\\n${hdr}${dta}\n\`\`\``;
}

export function endpointList(items: Array<{ method: string; path: string; note?: string }>): string {
  return items.map(i => `- \`${i.method.toUpperCase()} ${i.path}\`${i.note ? ` — ${i.note}` : ''}`).join('\n');
}

export function tableMd(input: { headers: string[]; rows: (string | number | boolean | null)[][] }): string {
  const { headers, rows } = input;
  const sep = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const hdr = '| ' + headers.join(' | ') + ' |';
  const rws = rows.map(r => '| ' + r.map(c => c ?? '').join(' | ') + ' |').join('\n');
  return `${hdr}\n${sep}\n${rws}`;
}

export function bullets(lines: string[]): string {
  return lines.map(l => `- ${l}`).join('\n');
}

export function note(text: string): string {
  return `> ${text}`;
}

export function contactLine(email: string): string {
  return `**Support:** \`${email}\``;
}
