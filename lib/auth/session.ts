import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return { ok: false as const, error: "Unauthorized", session: null };
  }
  return { ok: true as const, session };
}