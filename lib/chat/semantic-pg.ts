// lib/chat/semantic-pg.ts
// Minimal pgvector-only retrieval (clean & typed)

import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/embeddings";
import type { RetrieveOpts, RetrievalSource } from "./types";

export async function semanticSearchOnly(opts: RetrieveOpts): Promise<RetrievalSource[]> {
  const { query, organizationId, datasetId, k = 15 } = opts;

  console.log("🔍 Generating query embedding…");
  const vec = await getEmbedding(query); // number[]

  // Build a Postgres vector literal: "[v1,v2,...]"
  // Using float8 is fine; pgvector will accept this when cast via ::vector
  const vecLiteral = `[${vec.join(",")}]`; // e.g. "[0.01,0.02,...]"

  console.log("🎯 Running pgvector similarity (HNSW/cosine)...");
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT c.id, c."documentId", c.content, c."chunkIndex",
           1 - (c.embedding <=> $1::vector) AS score,
           c.metadata, d.title
    FROM document_chunks c
    JOIN documents d ON d.id = c."documentId"
    WHERE c."organizationId" = $2
      AND d."datasetId" = $3
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $1::vector
    LIMIT $4;
    `,
    vecLiteral,                // $1 ::vector
    organizationId,            // $2
    datasetId,                 // $3
    k                          // $4
  );

  console.log(`✅ pgvector returned ${rows.length} hits`);

  const mapped: RetrievalSource[] = rows.map((r) => {
    const meta = r.metadata ?? {};
    const pageRaw = meta?.page ?? meta?.Page ?? meta?.pageStart ?? null;
    const page = pageRaw == null ? null : Number(pageRaw);
    return {
      id: r.id,
      chunkId: r.id,
      documentId: r.documentId,
      content: r.content,
      score: Number(r.score ?? 0),
      page,
      title: r.title || 'Unknown Document',
      chunkIndex: Number(r.chunkIndex ?? 0),
      sectionPath: meta?.section_path ?? meta?.sectionPath ?? null,
      metadata: meta ?? null,
    };
  });

  // simple diversity cap: max 2 per page
  const byPage = new Map<number, number>();
  const selected: RetrievalSource[] = [];
  for (const m of mapped) {
    const p = Number.isFinite(m.page as any) ? Number(m.page) : -1;
    const count = byPage.get(p) ?? 0;
    if (count < 2) {
      byPage.set(p, count + 1);
      selected.push(m);
    }
    if (selected.length >= k) break;
  }

  console.log(`📦 Selected ${selected.length} contexts (pgvector-only)`);
  return selected;
}
