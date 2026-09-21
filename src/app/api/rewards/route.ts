import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";
import { currentEpoch, getRewardsSnapshot, recordPayout } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getRewardsSnapshot());
}

/** The creator records a payout once it has been sent from the treasury. */
export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  const admin = process.env.ADMIN_WALLET;

  if (!admin) {
    return NextResponse.json({ error: "No admin wallet configured" }, { status: 503 });
  }
  if (wallet !== admin) {
    return NextResponse.json({ error: "Not the treasury wallet" }, { status: 403 });
  }

  const body = (await req.json()) as { sol?: number; signature?: string; epochStart?: number };
  const sol = Number(body.sol);
  if (!Number.isFinite(sol) || sol <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  await recordPayout({
    epochStart: body.epochStart ?? currentEpoch().start,
    sol,
    signature: body.signature?.trim() || null,
    at: Date.now(),
  });

  return NextResponse.json(await getRewardsSnapshot());
}
