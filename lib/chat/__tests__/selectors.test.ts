import { describe, it, expect } from "vitest";

// Copied (or import) from your intent handler:
export function pickLang(q: string): "py" | "js" | "ts" {
  const s = (q || "").toLowerCase();
  if (/(typescript|ts)\b/.test(s)) return "ts";
  if (/\b(js|javascript|node)\b/.test(s)) return "js";
  if (/\b(py|python)\b/.test(s)) return "py";
  return "py";
}

export function pickEndpoint(input: { fromQuery?: string; fallback?: string } = {}): string | undefined {
  const src = input.fromQuery || "";
  const m = src.match(/\/v[0-9]+\/[a-z0-9/_-]+/i);
  return m?.[0] || input.fallback;
}

describe("pickLang", () => {
  it("detects python variants", () => {
    expect(pickLang("show me a PY example")).toBe("py");
    expect(pickLang("python please")).toBe("py");
  });

  it("detects js/node variants", () => {
    expect(pickLang("node example")).toBe("js");
    expect(pickLang("javascript sample")).toBe("js");
    expect(pickLang("js snippet")).toBe("js");
  });

  it("detects typescript", () => {
    expect(pickLang("typescript snippet")).toBe("ts");
    expect(pickLang("ts example")).toBe("ts");
  });

  it("defaults to python", () => {
    expect(pickLang("give me something")).toBe("py");
    expect(pickLang("")).toBe("py");
  });
});

describe("pickEndpoint", () => {
  it("extracts versioned endpoints from query", () => {
    expect(pickEndpoint({ fromQuery: "Show me a Python example for /v1/auth" })).toBe("/v1/auth");
    expect(pickEndpoint({ fromQuery: "Use /v2/sessions/create please" })).toBe("/v2/sessions/create");
  });

  it("returns fallback when none found", () => {
    expect(pickEndpoint({ fromQuery: "no endpoint here", fallback: "/sessions" })).toBe("/sessions");
  });

  it("returns undefined without match or fallback", () => {
    expect(pickEndpoint({ fromQuery: "no endpoint here" })).toBeUndefined();
  });
});
