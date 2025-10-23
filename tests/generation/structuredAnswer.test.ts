import {
  httpBlock, jsonBlock, curlBlock, endpointList, tableMd, bullets, note, contactLine
} from '../../lib/generation/structuredAnswer';
import { describe, it, expect } from 'vitest';

describe('structuredAnswer helpers', () => {
  it('httpBlock renders HTTP + headers + body', () => {
    const out = httpBlock('post', '/bankidse/auth', {
      Authorization: 'Bearer <token>',
      'Content-Type': 'application/json'
    }, { personalNumber: 'YYYYYY-XXXX' });
    expect(out).toMatchInlineSnapshot(`
      "\`\`\`http
      POST /bankidse/auth
      Authorization: Bearer <token>
      Content-Type: application/json

      {
        "personalNumber": "YYYYYY-XXXX"
      }
      \`\`\`"
    `);
  });

  it('jsonBlock renders pretty JSON', () => {
    const out = jsonBlock({ status: 'complete', orderRef: 'abc-123' });
    expect(out).toMatchInlineSnapshot(`
"\`\`\`json
{
  "status": "complete",
  "orderRef": "abc-123"
}
\`\`\`"
`);
  });

  it('curlBlock renders with headers and data', () => {
    const out = curlBlock({
      method: 'POST',
      url: 'https://gateway.zignsec.com/core/api/sessions',
      headers: { Authorization: 'Bearer <token>', 'Zs-Product-Key': 'bankidse' },
      data: { flow: 'auth', redirectUrl: 'https://merchant.example/ok' }
    });
    expect(out).toMatchInlineSnapshot(`
      "\`\`\`bash
      curl -X POST \\
        'https://gateway.zignsec.com/core/api/sessions' \\
        -H 'Authorization: Bearer <token>' \\
        -H 'Zs-Product-Key: bankidse' \\
        -d '{"flow":"auth","redirectUrl":"https://merchant.example/ok"}'
      \`\`\`"
    `);
  });

  it('endpointList produces concise bullets', () => {
    const out = endpointList([
      { method: 'POST', path: '/bankidse/auth' },
      { method: 'GET',  path: '/bankidse/collect/{orderRef}', note: 'poll status' }
    ]);
    expect(out).toMatchInlineSnapshot(`
"- \`POST /bankidse/auth\`
- \`GET /bankidse/collect/{orderRef}\` — poll status"
`);
  });

  it('tableMd renders GFM table', () => {
    const out = tableMd({
      headers: ['field', 'type', 'description'],
      rows: [
        ['orderRef', 'string', 'Identifier from init'],
        ['status', 'string', 'pending|complete|failed']
      ]
    });
    expect(out).toMatchInlineSnapshot(`
"| field | type | description |
| --- | --- | --- |
| orderRef | string | Identifier from init |
| status | string | pending|complete|failed |"
`);
  });

  it('bullets / note / contactLine look tidy', () => {
    expect(bullets(['Step 1', 'Step 2'])).toMatchInlineSnapshot(`
"- Step 1
- Step 2"
`);
    expect(note('Returning exact payload from docs.')).toMatchInlineSnapshot(`"> Returning exact payload from docs."`);
    expect(contactLine('clientservices@g2risksolutions.com')).toMatchInlineSnapshot(`"**Support:** \`clientservices@g2risksolutions.com\`"`);
  });
});

