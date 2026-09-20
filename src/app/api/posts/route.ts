import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getFeed, hydratePosts } from "@/lib/data";
import { getToken } from "@/lib/token";
import { extractCa, isSolanaAddress } from "@/lib/format";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 500;
const COOLDOWN_SECONDS = 5;

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const viewer = await getSessionWallet();
  const posts = await getFeed(viewer, {
    limit: Math.min(Number(searchParams.get("limit") ?? 30), 50),
    offset: Math.max(Number(searchParams.get("offset") ?? 0), 0),
    wallet: searchParams.get("wallet") ?? undefined,
    ca: searchParams.get("ca") ?? undefined,
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

  const body = (await req.json()) as { text?: string; ca?: string };
  const text = (body.text ?? "").trim().slice(0, MAX_LEN);
  if (!text) return NextResponse.json({ error: "Say something" }, { status: 400 });

  const rawCa = (body.ca ?? "").trim();
  const ca = rawCa && isSolanaAddress(rawCa) ? rawCa : extractCa(text);

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

  const post: Post = {
    id: newId(),
    author: wallet,
    text,
    ca,
    callMcap,
    callToken,
    createdAt: Date.now(),
  };

  await store.set(K.post(post.id), post);
  await store.zadd(K.feed, post.id, post.createdAt);
  await store.zadd(K.userPosts(wallet), post.id, post.createdAt);
  if (ca) {
    await store.zadd(K.callPosts(ca), post.id, post.createdAt);
    await store.zincrby(K.callIndex, ca, 1);
  }
  await store.set(cooldownKey, 1, { ex: COOLDOWN_SECONDS });

  const [view] = await hydratePosts([post], wallet);
  return NextResponse.json({ post: view }, { status: 201 });
}
