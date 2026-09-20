import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { getSessionWallet } from "@/lib/auth";
import { getProfile } from "@/lib/data";

export const runtime = "nodejs";

const HANDLE_RE = /^[a-z0-9_]{2,20}$/;

export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json()) as Partial<{ name: string; handle: string; avatar: string; bio: string }>;
  const current = await getProfile(wallet);

  const name = (body.name ?? current.name).trim().slice(0, 32);
  const handle = (body.handle ?? current.handle).trim().toLowerCase().replace(/^@/, "");
  const bio = (body.bio ?? current.bio).trim().slice(0, 160);
  const avatar = (body.avatar ?? current.avatar).trim();

  if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json(
      { error: "Handle must be 2-20 chars: a-z, 0-9, underscore" },
      { status: 400 }
    );
  }
  const isDataUrl = avatar.startsWith("data:image/");
  if (avatar && !/^https?:\/\//i.test(avatar) && !isDataUrl) {
    return NextResponse.json({ error: "Avatar must be an image URL" }, { status: 400 });
  }
  // Uploaded pictures are downscaled in the browser; this is the hard ceiling.
  if (avatar.length > (isDataUrl ? 400_000 : 500)) {
    return NextResponse.json({ error: "Avatar image is too large" }, { status: 413 });
  }

  if (handle !== current.handle) {
    const owner = await store.get<string>(K.handleTaken(handle));
    if (owner && owner !== wallet) {
      return NextResponse.json({ error: "Handle already taken" }, { status: 409 });
    }
    await store.set(K.handleTaken(handle), wallet);
    if (current.handle) await store.del(K.handleTaken(current.handle));
  }

  const profile = { ...current, name, handle, avatar, bio, createdAt: current.createdAt || Date.now() };
  await store.set(K.user(wallet), profile);

  return NextResponse.json({ profile });
}
