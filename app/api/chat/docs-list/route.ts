import { NextResponse } from "next/server";
import { getDocsList } from "@/lib/server/docsList";

export async function POST(req: Request) {
  try {
    const { orgId, datasetIds } = await req.json() as { orgId: string; datasetIds: string[] };

    if (!orgId || !Array.isArray(datasetIds)) {
      return NextResponse.json({ ok: false, error: "orgId and datasetIds required" }, { status: 400 });
    }

    const datasets = await getDocsList(orgId, datasetIds);
    return NextResponse.json({ ok: true, datasets });
  } catch (e:any) {
    console.error("docs-list error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown" }, { status: 500 });
  }
}