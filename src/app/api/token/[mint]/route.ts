import { NextResponse } from "next/server";
import { getToken } from "@/lib/token";
import { isSolanaAddress } from "@/lib/format";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isSolanaAddress(mint)) {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }
  // An unknown mint fans out to four upstreams and spends RPC credits, so
  // one address does not get to ask for thousands of them.
  const block = await limited("token", clientIp(req), 90, 60);
  if (block) return block;
  const token = await getToken(mint);
  if (!token) return NextResponse.json({ token: null, error: "No market data yet" }, { status: 404 });
  return NextResponse.json({ token });
}
