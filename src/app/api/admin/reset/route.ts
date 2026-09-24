import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";
import { wipeContent } from "@/lib/wipe";
import { timingSafeEqual } from "node:crypto";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Equal without leaking, through timing, how much of the guess was right. */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Clears the feed. Either the treasury wallet asks for it while signed in,
 * or an operator passes the reset token configured on the deployment.
 */
export async function POST(req: Request) {
  // Five guesses a minute per address makes the token unguessable in practice.
  const block = await limited("reset", clientIp(req), 5, 60);
  if (block) return block;

  const token = process.env.ADMIN_RESET_TOKEN;
  const provided = req.headers.get("x-admin-token");
  const wallet = await getSessionWallet();
  const admin = process.env.ADMIN_WALLET;

  const byToken = Boolean(token) && Boolean(provided) && sameSecret(provided!, token!);
  const byWallet = Boolean(admin) && wallet === admin;

  if (!byToken && !byWallet) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const result = await wipeContent();
  return NextResponse.json({ ok: true, ...result });
}
