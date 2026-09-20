import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getComments, getProfile } from "@/lib/data";
import type { Comment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ comments: await getComments(id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const post = await store.get(K.post(id));
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { text } = (await req.json()) as { text?: string };
  const clean = (text ?? "").trim().slice(0, 300);
  if (!clean) return NextResponse.json({ error: "Say something" }, { status: 400 });

  const comment: Comment = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    postId: id,
    author: wallet,
    text: clean,
    createdAt: Date.now(),
  };

  await store.set(K.comment(comment.id), comment);
  await store.zadd(K.comments(id), comment.id, comment.createdAt);

  return NextResponse.json(
    { comment: { ...comment, profile: await getProfile(wallet) } },
    { status: 201 }
  );
}
