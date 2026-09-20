import { NextResponse } from "next/server";
import { getSolUsd } from "@/lib/pumpCurve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SOL price for the browser, so live market caps can be shown in USD. */
export async function GET() {
  return NextResponse.json({ solUsd: await getSolUsd() });
}
