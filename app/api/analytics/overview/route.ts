import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SafeNumber = number | null | undefined;
const n = (x: SafeNumber) => (typeof x === "number" && isFinite(x) ? x : 0);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId: string | null =
      (session.user as any)?.organization?.id ??
      (session as any)?.orgId ??
      null;

    // Default zero metrics
    const result = {
      documents: 0,
      chats: 0,
      responses: 0,
      apiKeys: 0,
      storageBytes: 0,
    };

    // If we can't infer org, still return zeros (don't 500 the dashboard)
    if (!orgId) {
      console.log("[Analytics] No orgId, returning zeros");
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    }

    console.log("[Analytics] Fetching metrics for org:", orgId);

    // Guarded Prisma access so we never crash even if a model/table isn't present.
    const anyPrisma: any = prisma;

    const [docCount, docBytes, apiKeyCount, chatCount, msgCount] = await Promise.all([
      // Document count
      anyPrisma?.document?.count?.({ where: { organizationId: orgId } }).catch(() => {
        console.log("[Analytics] Document count failed, using 0");
        return 0;
      }),
      // Document storage bytes
      anyPrisma?.document?.aggregate?.({
        _sum: { fileSize: true }, // Changed from sizeBytes to fileSize based on schema
        where: { organizationId: orgId },
      }).then((r: any) => {
        console.log("[Analytics] Document bytes:", r?._sum?.fileSize);
        return n(r?._sum?.fileSize);
      }).catch(() => {
        console.log("[Analytics] Document bytes failed, using 0");
        return 0;
      }),
      // API keys (if you have this table)
      anyPrisma?.apiKey?.count?.({ where: { organizationId: orgId, revokedAt: null } }).catch(() => {
        console.log("[Analytics] API key count failed, using 0");
        return 0;
      }),
      // Chat sessions (if you have this table)
      anyPrisma?.chatSession?.count?.({ where: { organizationId: orgId } }).catch(() => {
        console.log("[Analytics] Chat session count failed, using 0");
        return 0;
      }),
      // Chat messages (if you have this table)
      anyPrisma?.chatMessage?.count?.({ where: { organizationId: orgId, role: "assistant" } }).catch(() => {
        console.log("[Analytics] Chat message count failed, using 0");
        return 0;
      }),
    ]);

    result.documents = n(docCount);
    result.storageBytes = n(docBytes);
    result.apiKeys = n(apiKeyCount);
    result.chats = n(chatCount);
    result.responses = n(msgCount);

    console.log("[Analytics] Returning metrics:", result);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    // Never throw — dashboard must live
    console.error("[Analytics] ANALYSIS_OVERVIEW_ERROR:", err);
    return NextResponse.json(
      { 
        ok: true, 
        documents: 0, 
        chats: 0, 
        responses: 0, 
        apiKeys: 0, 
        storageBytes: 0, 
        degraded: true 
      },
      { status: 200 }
    );
  }
}
