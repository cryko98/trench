import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { isSolanaAddress } from "@/lib/format";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export function signInMessage(wallet: string, nonce: string) {
  return [
    "Trench Social — sign in",
    "",
    "Signing this message proves you own this wallet.",
    "It is free and does not send a transaction.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function POST(req: Request) {
  // Unauthenticated and it writes: the first thing a bot would hammer.
  const block = await limited("nonce", clientIp(req), 20, 60);
  if (block) return block;

  const { wallet } = (await req.json().catch(() => ({}))) as { wallet?: string };
  if (!wallet || !isSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  await store.set(K.nonce(wallet), nonce, { ex: 300 });

  return NextResponse.json({ nonce, message: signInMessage(wallet, nonce) });
}
