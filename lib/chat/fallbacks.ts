// lib/chat/fallbacks.ts
export const prettyBrand = (b?: string) =>
  b?.toLowerCase() === "avenai" ? "Avenai"
: b?.toLowerCase() === "zignsec" ? "Zignsec"
: "this project";

export const listEndpointsFallback = (brand: string | undefined) => {
  return [
    `The selected document doesn't list specific endpoints.`,
    ``,
    `Here's a vendor-neutral REST pattern (placeholders):`,
    ``,
    `- POST /v1/sessions — create a session`,
    `- GET  /v1/sessions/{id} — get session status`,
    `- GET  /v1/sessions — list sessions`,
    `- POST /v1/webhooks/test — trigger test webhook (if supported)`,
    ``,
    `Notes:`,
    `- Treat these as placeholders unless your docs explicitly list them.`,
    brand ? `- Brand: ${prettyBrand(brand)}` : `- Brand not set`,
  ].join('\n');
};

export type CodeLang = "py" | "js" | "ts";
export interface CodeTemplateOptions {
  baseUrl?: string;   // optional
  endpoint?: string;  // e.g. "/v1/sessions"
  brand?: string;
}

export const codeTemplatePython = (opts: CodeTemplateOptions) => {
  const base = opts.baseUrl ?? "https://api.example.com/v1";
  const ep   = opts.endpoint ?? "/sessions";
  return `# Vendor-neutral example (placeholders)
import requests

BASE_URL = "${base}"
API_KEY  = "YOUR_API_KEY"  # replace

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

try:
    resp = requests.post(f"{BASE_URL}${ep}", headers=headers, json={
        "customerRef": "cust_12345",
        "features": ["document", "liveness"]
    }, timeout=30)
    if resp.status_code == 422:
        print("422 Unprocessable Entity: validate payload fields, enums, and formats")
    resp.raise_for_status()
    print(resp.json())
except requests.exceptions.HTTPError as e:
    print("HTTP error:", e.response.status_code, e.response.text)
except Exception as e:
    print("Unexpected error:", e)
`;
};

export const codeTemplateNode = (opts: CodeTemplateOptions) => {
  const base = opts.baseUrl ?? "https://api.example.com/v1";
  const ep   = opts.endpoint ?? "/sessions";
  return `// Vendor-neutral example (placeholders)
const BASE_URL = "${base}";
const API_KEY  = "YOUR_API_KEY"; // replace

(async () => {
  try {
    const res = await fetch(\`\${BASE_URL}${ep}\`, {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerRef: "cust_12345",
        features: ["document", "liveness"]
      })
    });
    if (res.status === 422) {
      console.log("422 Unprocessable Entity: validate payload fields, enums, and formats");
    }
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    console.log(await res.json());
  } catch (e) {
    console.error("Request failed:", e);
  }
})();
`;
};

export const error422Fallback = (brand?: string) => [
  `**Why 422 happens (vendor-neutral):**`,
  `- Payload validation failed (required fields / wrong types).`,
  `- Invalid enum values (use only documented values).`,
  `- Format constraints (dates/emails/IDs).`,
  `- Business logic conflicts (incompatible options).`,
  ``,
  `**Debug checklist:**`,
  `1) Set Content-Type: application/json`,
  `2) Validate field names & casing`,
  `3) Verify enums & formats`,
  `4) Try minimal valid payload`,
  ``,
  brand ? `Brand: ${prettyBrand(brand)}` : undefined,
].filter(Boolean).join('\n');
