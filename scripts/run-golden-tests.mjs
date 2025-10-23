// scripts/run-golden-tests.mjs
import fs from "node:fs/promises";
import path from "node:path";

// ----------- Config -----------
const BASE_URL = process.env.COPILOT_BASE_URL || "http://localhost:3000";
const DATASET_ID = process.env.COPILOT_DATASET_ID || "cmgrhya8z0001ynm3zr7n69xl";
const SESSION_TOKEN = process.env.COPILOT_SESSION_TOKEN || "a41e8787-9624-4691-ae5d-d03387e85673";
const CHAT_PATH = "/api/chat";
const TIMEOUT_MS = 25000;

// Confidence ordering
const RANK = { low: 0, medium: 1, high: 2 };

// ----------- Helpers -----------
function normalizeText(s) {
  if (!s) return "";
  return String(s)
    .replace(/```json|```/gi, "")
    .replace(/[\uFEFF]/g, "")
    .replace(/\r/g, "")
    .trim();
}

function extractPrimaryText(resp) {
  // Response can be:
  // - { response: string }
  // - { response: { answers:[{content}], ... }, isStructured: true }
  const r = resp?.response;
  if (typeof r === "string") return normalizeText(r);

  if (r && typeof r === "object") {
    // try answers[0].content, else stringify
    if (Array.isArray(r.answers) && r.answers[0]?.content) {
      return normalizeText(r.answers[0].content);
    }
    // some code paths return plain object (JSON body)
    return normalizeText(JSON.stringify(r, null, 2));
  }

  // Fallback
  return normalizeText(JSON.stringify(resp ?? "", null, 2));
}

function getConfidenceTier(resp) {
  // Prefer explicit confidenceLevel from backend
  const tier = resp?.confidenceLevel || resp?.metadata?.confidenceLevel;
  if (tier && ["low", "medium", "high"].includes(String(tier).toLowerCase())) {
    return String(tier).toLowerCase();
  }

  // Fallback on numeric confidence if provided
  const numeric = Number(resp?.confidence);
  if (!isNaN(numeric)) {
    if (numeric >= 0.22) return "high";
    if (numeric >= 0.14) return "medium";
  }
  return "low";
}

function passConfidence(minNeeded, got) {
  return RANK[got] >= RANK[minNeeded];
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ----------- Assertions -----------
function assertRegex(text, { pattern, flags = "i" }) {
  const re = new RegExp(pattern, flags);
  return re.test(text) ? null : `Regex not matched: /${pattern}/${flags}`;
}

function assertContainsAll(text, { needles }) {
  const misses = needles.filter((n) => !text.toLowerCase().includes(n.toLowerCase()));
  return misses.length ? `Missing: ${misses.join(", ")}` : null;
}

function assertContainsAny(text, { needles }) {
  const hit = needles.some((n) => text.toLowerCase().includes(n.toLowerCase()));
  return hit ? null : `None matched: ${needles.join(", ")}`;
}

function assertJsonContains(text, { mustHaveKeys = [], mustHavePairs = {} }) {
  const obj = tryParseJson(text);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return "Response is not a JSON object";
  }
  const missingKeys = mustHaveKeys.filter((k) => !(k in obj));
  if (missingKeys.length) return `JSON missing keys: ${missingKeys.join(", ")}`;

  for (const [k, v] of Object.entries(mustHavePairs)) {
    if (!(k in obj)) return `JSON missing key: ${k}`;
    if (JSON.stringify(obj[k]) !== JSON.stringify(v)) {
      return `JSON key ${k} expected ${JSON.stringify(v)} but got ${JSON.stringify(obj[k])}`;
    }
  }
  return null;
}

function assertJsonArrayOfObjects(text, { mustHaveKeysPerObject = [] }) {
  const arr = tryParseJson(text);
  if (!Array.isArray(arr) || arr.length < 1) return "Not a JSON array with elements";
  const missing = [];
  for (const [i, o] of arr.entries()) {
    if (typeof o !== "object" || Array.isArray(o)) {
      return `Element at index ${i} is not an object`;
    }
    for (const key of mustHaveKeysPerObject) {
      if (!(key in o)) missing.push(`${i}.${key}`);
    }
  }
  return missing.length ? `Missing keys per object: ${missing.join(", ")}` : null;
}

// ----------- Runner -----------
async function callChat(prompt, timeoutMs = TIMEOUT_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);

  const url = DATASET_ID 
    ? `${BASE_URL}${CHAT_PATH}?datasetId=${DATASET_ID}`
    : `${BASE_URL}${CHAT_PATH}`;

  // Generate unique session ID for this test
  const sessionId = `golden-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  
  const headers = { 
    "content-type": "application/json",
    "x-golden-test": "true",        // Enable deterministic mode
    "x-session-id": sessionId        // Per-test session isolation
  };
  
  // Add session token for authentication
  if (SESSION_TOKEN) {
    headers["cookie"] = `next-auth.session-token=${SESSION_TOKEN}`;
  }

  const res = await fetch(url, {
    method: "POST",
    signal: ctl.signal,
    headers,
    body: JSON.stringify({
      message: prompt,
      stream: false,
      noHistory: true                // Skip conversation history
    })
  }).catch((e) => {
    clearTimeout(t);
    throw e;
  });

  clearTimeout(t);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function runAssertion(kind, text, spec) {
  switch (kind) {
    case "regex":
      return assertRegex(text, spec);
    case "contains-all":
      return assertContainsAll(text, spec);
    case "contains-any":
      return assertContainsAny(text, spec);
    case "json-contains":
      return assertJsonContains(text, spec);
    case "json-array-of-objects":
      return assertJsonArrayOfObjects(text, spec);
    default:
      return `Unknown assertion kind: ${kind}`;
  }
}

async function main() {
  const testPath = path.resolve("tests/golden-tests.json");
  const raw = await fs.readFile(testPath, "utf8");
  const tests = JSON.parse(raw);

  console.log(`\n🧪 Running ${tests.length} golden tests with session isolation...\n`);

  const results = [];
  for (const t of tests) {
    const { name, prompt, assert, minConfidence } = t;
    let error = null;
    let confidenceOk = false;
    let tier = "low";
    let text = "";

    try {
      const resp = await callChat(prompt, t.timeoutMs);
      tier = getConfidenceTier(resp);
      confidenceOk = passConfidence(minConfidence, tier);
      text = extractPrimaryText(resp);
      const contentErr = runAssertion(assert.kind, text, assert);
      if (contentErr) {
        error = `Content check failed: ${contentErr}`;
      } else if (!confidenceOk) {
        error = `Confidence too low: need >= ${minConfidence}, got ${tier}`;
      }
    } catch (e) {
      error = `Request failed: ${e.message}`;
    }

    results.push({ name, tier, ok: !error, error, sample: text.slice(0, 220) });
  }

  // Report
  const passes = results.filter((r) => r.ok).length;
  console.log("\n=== Golden Tests Summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}  [${r.tier}]`);
    if (!r.ok) {
      console.log(`   → ${r.error}`);
      console.log(`   ↳ Sample: ${r.sample}\n`);
    }
  }
  console.log(`\nTotal: ${passes}/${results.length} passed\n`);

  process.exit(passes === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

