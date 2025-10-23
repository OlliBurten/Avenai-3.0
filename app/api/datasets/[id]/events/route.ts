import { NextRequest } from "next/server";
import { sseStream, subscribeDataset } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sseStream((send) => {
    const unsub = subscribeDataset(id, (evt) => send(evt)); // evt is stringified already
    return () => unsub();
  });
}
