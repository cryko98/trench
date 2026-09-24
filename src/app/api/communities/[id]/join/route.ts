import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getCommunity, hydrateCommunity, meetsGate } from "@/lib/data";
import { forgetBalance } from "@/lib/holdings";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Join (or re-verify) — membership requires holding the gating coin. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // Every join asks the chain fresh, so it is metered.
  const block = await limited("join", clientIp(req), 30, 60);
  if (block) return block;

  const community = await getCommunity(id);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  // Always check the chain fresh when someone asks to join.
  await forgetBalance(wallet, community.ca);
  const gate = await meetsGate(wallet, community);

  if (gate.balance === null) {
    return NextResponse.json(
      { error: "Could not reach Solana to check your balance, try again" },
      { status: 503 }
    );
  }
  if (!gate.ok) {
    const need = community.minTokens > 0 ? `${community.minTokens} ` : "";
    return NextResponse.json(
      {
        error: `You need to hold ${need}$${community.name} to join. Your balance: ${gate.balance}`,
        balance: gate.balance,
      },
      { status: 403 }
    );
  }

  await store.sadd(K.communityMembers(id), wallet);
  await store.zadd(K.userCommunities(wallet), id, Date.now());

  return NextResponse.json({ community: await hydrateCommunity(community, wallet) });
}

/** Leave a community. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const community = await getCommunity(id);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  await store.srem(K.communityMembers(id), wallet);
  return NextResponse.json({ community: await hydrateCommunity(community, wallet) });
}
