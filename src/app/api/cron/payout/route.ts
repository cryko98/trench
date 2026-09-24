import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSessionWallet, isAdminWallet } from "@/lib/auth";
import { runPayout, PAYOUTS_LIVE } from "@/lib/payout";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Vercel Cron calls this after 09:00 UTC with the CRON_SECRET; the admin
 * wallet may call it too, which plans (dry run) unless ?live=1 is passed
 * with payouts switched on.
 */
export async function GET(req: Request) {
  const block = await limited("cron", clientIp(req), 10, 60);
  if (block) return block;

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const byCron = Boolean(secret) && sameSecret(auth, `Bearer ${secret}`);
  const byAdmin = !byCron && isAdminWallet(await getSessionWallet());
  if (!byCron && !byAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const wantLive = new URL(req.url).searchParams.get("live") === "1";
  const result = await runPayout({ live: byCron || wantLive });

  return NextResponse.json({
    live: PAYOUTS_LIVE,
    trigger: byCron ? "cron" : "admin",
    ...result,
  });
}
