import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet, isAdminWallet } from "@/lib/auth";
import type { Comment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const comment = await store.get<Comment>(K.comment(id));
  if (!comment) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

  // The author can take their reply down; the admin wallet can take anyone's.
  if (comment.author !== wallet && !isAdminWallet(wallet)) {
    return NextResponse.json({ error: "Not your reply" }, { status: 403 });
  }

  await store.del(K.comment(id));
  await store.zrem(K.comments(comment.postId), id);

  return NextResponse.json({ ok: true });
}
