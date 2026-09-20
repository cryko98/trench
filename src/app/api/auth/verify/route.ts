import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { store, K } from "@/lib/store";
import { createSession } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { isSolanaAddress } from "@/lib/format";
import { signInMessage } from "../nonce/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { wallet, signature } = (await req.json()) as { wallet?: string; signature?: string };

  if (!wallet || !isSolanaAddress(wallet) || !signature) {
    return NextResponse.json({ error: "Missing wallet or signature" }, { status: 400 });
  }

  const nonce = await store.get<string>(K.nonce(wallet));
  if (!nonce) {
    return NextResponse.json({ error: "Nonce expired, try again" }, { status: 400 });
  }

  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(signInMessage(wallet, nonce)),
      bs58.decode(signature),
      bs58.decode(wallet)
    );
  } catch {
    ok = false;
  }

  if (!ok) return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });

  // One-time use.
  await store.del(K.nonce(wallet));

  const profile = await getProfile(wallet);
  if (!profile.createdAt) {
    const fresh = { ...profile, createdAt: Date.now() };
    await store.set(K.user(wallet), fresh);
    await createSession(wallet);
    return NextResponse.json({ profile: fresh, isNew: true });
  }

  await createSession(wallet);
  return NextResponse.json({ profile, isNew: false });
}
