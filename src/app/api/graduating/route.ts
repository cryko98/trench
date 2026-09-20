import { NextResponse } from "next/server";
import { getGraduatingCoins } from "@/lib/graduating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 5), 10);
  return NextResponse.json({ coins: await getGraduatingCoins(limit) });
}
