import { NextResponse } from "next/server";
import { getToken } from "@/lib/token";
import { isSolanaAddress } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isSolanaAddress(mint)) {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }
  const token = await getToken(mint);
  if (!token) return NextResponse.json({ token: null, error: "No market data yet" }, { status: 404 });
  return NextResponse.json({ token });
}
