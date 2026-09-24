import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const block = await limited("like", clientIp(req), 60, 60);
  if (block) return block;

  const exists = await store.get(K.post(id));
  if (!exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const current = await store.smembers(K.likes(id));
  const liked = current.includes(wallet);
  if (liked) await store.srem(K.likes(id), wallet);
  else await store.sadd(K.likes(id), wallet);

  return NextResponse.json({ liked: !liked, likes: liked ? current.length - 1 : current.length + 1 });
}
