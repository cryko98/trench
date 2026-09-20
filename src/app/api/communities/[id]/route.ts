import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";
import { getCommunity, hydrateCommunity } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const community = await getCommunity(id);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const viewer = await getSessionWallet();
  return NextResponse.json({ community: await hydrateCommunity(community, viewer) });
}
