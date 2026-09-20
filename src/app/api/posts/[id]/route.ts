import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getPost, getComments } from "@/lib/data";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getSessionWallet();
  const post = await getPost(id, viewer);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post, comments: await getComments(id) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const post = await store.get<Post>(K.post(id));
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.author !== wallet) return NextResponse.json({ error: "Not your post" }, { status: 403 });

  await store.del(K.post(id));
  await store.zrem(K.feed, id);
  await store.zrem(K.userPosts(wallet), id);
  if (post.communityId) await store.zrem(K.communityPosts(post.communityId), id);
  if (post.ca) {
    await store.zrem(K.callPosts(post.ca), id);
    await store.zrem(K.allCalls, id);
    await store.zincrby(K.callIndex, post.ca, -1);
  }
  await store.del(K.likes(id));

  return NextResponse.json({ ok: true });
}
