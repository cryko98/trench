import { NextResponse } from "next/server";
import { getSessionWallet, isAdminWallet } from "@/lib/auth";
import { getProfile } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ profile: null, admin: false });
  return NextResponse.json({ profile: await getProfile(wallet), admin: isAdminWallet(wallet) });
}
