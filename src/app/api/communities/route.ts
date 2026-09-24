import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet, isHouseException } from "@/lib/auth";
import { getCommunities, hydrateCommunity } from "@/lib/data";
import { getToken } from "@/lib/token";
import { getTokenBalance } from "@/lib/holdings";
import { isSolanaAddress } from "@/lib/format";
import type { Community } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getSessionWallet();
  return NextResponse.json({ communities: await getCommunities(viewer) });
}

export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json()) as {
    ca?: string;
    name?: string;
    description?: string;
    minTokens?: number;
  };

  const ca = (body.ca ?? "").trim();
  if (!isSolanaAddress(ca)) {
    return NextResponse.json({ error: "Enter a valid contract address" }, { status: 400 });
  }

  const existing = await store.get<string>(K.communityByCa(ca));
  if (existing) {
    return NextResponse.json(
      { error: "This coin already has a community", id: existing },
      { status: 409 }
    );
  }

  // The founder has to hold the coin too — any amount, but more than none.
  // The single exception: the admin opening the site's own coin's room.
  if (!isHouseException(wallet, ca)) {
    const balance = await getTokenBalance(wallet, ca);
    if (balance === null) {
      return NextResponse.json(
        { error: "Could not verify your balance right now, try again" },
        { status: 503 }
      );
    }
    if (balance <= 0) {
      return NextResponse.json(
        { error: "You need to hold this coin to open its community" },
        { status: 403 }
      );
    }
  }

  const token = await getToken(ca);
  const name = (body.name ?? "").trim().slice(0, 40) || (token ? token.symbol : "Community");
  const description = (body.description ?? "").trim().slice(0, 200);
  const minTokens = Math.max(0, Number(body.minTokens) || 0);

  const community: Community = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ca,
    name,
    description,
    creator: wallet,
    minTokens,
    createdAt: Date.now(),
  };

  await store.set(K.community(community.id), community);
  await store.set(K.communityByCa(ca), community.id);
  await store.zadd(K.communities, community.id, community.createdAt);
  await store.sadd(K.communityMembers(community.id), wallet);
  await store.zadd(K.userCommunities(wallet), community.id, community.createdAt);

  const viewerView = await hydrateCommunity(community, wallet);
  return NextResponse.json({ community: viewerView }, { status: 201 });
}
