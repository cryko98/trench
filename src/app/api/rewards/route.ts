import { NextResponse } from "next/server";
import { getRewardsSnapshot } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getRewardsSnapshot());
}
