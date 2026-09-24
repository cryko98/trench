import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getCommunity, getFeed, hydratePosts, meetsGate } from "@/lib/data";
import { sweepRadar } from "@/lib/radar";
import { getToken } from "@/lib/token";
import { extractCa, isSolanaAddress } from "@/lib/format";
import { checkText } from "@/lib/moderation";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 500;
const COOLDOWN_SECONDS = 5;

/** Blob URLs this deployment issued; anything else is not attached. */
function isOwnUpload(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".vercel-storage.com");
  } catch {
    return false;
  }
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const viewer = await getSessionWallet();

  // Let the radar report on existing calls while the feed is being read.
  const isGlobal =
    !searchParams.get("wallet") && !searchParams.get("ca") && !searchParams.get("community");
  if (isGlobal) await sweepRadar().catch(() => undefined);
  const posts = await getFeed(viewer, {
    limit: Math.min(Number(searchParams.get("limit") ?? 30), 50),
    offset: Math.max(Number(searchParams.get("offset") ?? 0), 0),
    wallet: searchParams.get("wallet") ?? undefined,
    ca: searchParams.get("ca") ?? undefined,
    community: searchParams.get("community") ?? undefined,
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const cooldownKey = `cooldown:post:${wallet}`;
  if (await store.get<number>(cooldownKey)) {
    return NextResponse.json({ error: "Slow down, anon" }, { status: 429 });
  }

  const body = (await req.json()) as {
    text?: string;
    ca?: string;
    communityId?: string;
    image?: string;
  };
  const text = (body.text ?? "").trim().slice(0, MAX_LEN);
  if (!text) return NextResponse.json({ error: "Say something" }, { status: 400 });

  const blocked = checkText(text);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

  // Community posts are gated: member, and still holding the coin.
  const communityId = body.communityId?.trim() || null;
  if (communityId) {
    const community = await getCommunity(communityId);
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    const members = await store.smembers(K.communityMembers(communityId));
    if (!members.includes(wallet)) {
      return NextResponse.json({ error: "Join the community first" }, { status: 403 });
    }

    const gate = await meetsGate(wallet, community);
    if (!gate.ok) {
      return NextResponse.json(
        {
          error:
            gate.balance === null
              ? "Could not verify your balance right now, try again"
              : `You no longer hold enough $${community.name} coin to post here`,
        },
        { status: 403 }
      );
    }
  }

  // A post is only a call when the composer explicitly attached a coin;
  // a plain thought stays a plain thought even if it mentions an address.
  const rawCa = (body.ca ?? "").trim();
  const ca = rawCa ? (isSolanaAddress(rawCa) ? rawCa : extractCa(rawCa)) : null;

  // Snapshot the market cap so the call can be scored later.
  let callMcap: number | null = null;
  let callToken: Post["callToken"] = null;
  if (ca) {
    const snap = await getToken(ca);
    if (snap) {
      callMcap = snap.marketCap;
      callToken = { name: snap.name, symbol: snap.symbol, image: snap.image };
    }
  }

  // Only images this deployment stored itself are accepted.
  const image = isOwnUpload(body.image) ? body.image! : null;

  const post: Post = {
    id: newId(),
    author: wallet,
    text,
    image,
    ca,
    callMcap,
    callToken,
    communityId,
    createdAt: Date.now(),
  };

  await store.set(K.post(post.id), post);
  await store.zadd(K.userPosts(wallet), post.id, post.createdAt);

  if (communityId) {
    await store.zadd(K.communityPosts(communityId), post.id, post.createdAt);
  } else {
    await store.zadd(K.feed, post.id, post.createdAt);
  }

  if (ca) {
    await store.zadd(K.callPosts(ca), post.id, post.createdAt);
    await store.zadd(K.allCalls, post.id, post.createdAt);
    await store.zincrby(K.callIndex, ca, 1);
  }
  await store.set(cooldownKey, 1, { ex: COOLDOWN_SECONDS });

  const [view] = await hydratePosts([post], wallet);
  return NextResponse.json({ post: view }, { status: 201 });
}
