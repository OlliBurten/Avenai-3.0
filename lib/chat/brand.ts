// lib/chat/brand.ts
export type Brand = "avenai" | "zignsec" | undefined;

export function inferBrandFromNames(names: string[]): Brand {
  const s = names.join(" ").toLowerCase();
  if (/\bavenai\b/.test(s)) return "avenai";
  if (/\bzignsec\b/.test(s)) return "zignsec";
  return undefined;
}

// Prefer single dataset inference; if multiple, return undefined unless all match the same brand.
export function inferBrandFromDatasets(datasets: { id: string; name: string }[]): Brand {
  if (!datasets.length) return undefined;
  if (datasets.length === 1) return inferBrandFromNames([datasets[0].name]);
  const brands = new Set(datasets.map(d => inferBrandFromNames([d.name])).filter(Boolean) as Brand[]);
  if (brands.size === 1) return [...brands][0];
  return undefined;
}
