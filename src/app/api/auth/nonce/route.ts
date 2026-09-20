import { NextResponse } from "next/server";
import { store, K } from "@/lib/store";
import { isSolanaAddress } from "@/lib/format";

export const runtime = "nodejs";

export function signInMessage(wallet: string, nonce: string) {
  return [
    "Trench Socials — sign in",
    "",
    "Signing this message proves you own this wallet.",
    "It is free and does not send a transaction.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function POST(req: Request) {
  const { wallet } = (await req.json()) as { wallet?: string };
  if (!wallet || !isSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  await store.set(K.nonce(wallet), nonce, { ex: 300 });

  return NextResponse.json({ nonce, message: signInMessage(wallet, nonce) });
}
