import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";
import { getProfile } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: await getProfile(wallet) });
}
