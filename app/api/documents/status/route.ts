import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.sub || !token.organizationId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get('datasetId');
    
    if (!datasetId) {
      return NextResponse.json({ ok: false, error: "Missing datasetId" }, { status: 400 });
    }

    // Verify dataset ownership
    const dataset = await prisma.dataset.findFirst({
      where: { 
        id: datasetId,
        organizationId: String(token.organizationId)
      }
    });

    if (!dataset) {
      return NextResponse.json({ ok: false, error: "Dataset not found" }, { status: 404 });
    }

    // For now, return a simple response to avoid SSE build issues
    // We'll implement proper SSE later
    return NextResponse.json({
      ok: true,
      message: "SSE endpoint ready",
      datasetId
    });

  } catch (error: any) {
    console.error('SSE error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? "SSE failed" 
    }, { status: 500 });
  }
}