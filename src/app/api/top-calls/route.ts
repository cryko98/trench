import { NextResponse } from "next/server";
import { getTopCalls } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 25), 50);
  return NextResponse.json({ calls: await getTopCalls(limit) });
}
