import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth";
import { wipeContent } from "@/lib/wipe";

export const runtime = "nodejs";

/**
 * Clears the feed. Either the treasury wallet asks for it while signed in,
 * or an operator passes the reset token configured on the deployment.
 */
export async function POST(req: Request) {
  const token = process.env.ADMIN_RESET_TOKEN;
  const provided = req.headers.get("x-admin-token");
  const wallet = await getSessionWallet();
  const admin = process.env.ADMIN_WALLET;

  const byToken = Boolean(token) && provided === token;
  const byWallet = Boolean(admin) && wallet === admin;

  if (!byToken && !byWallet) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const result = await wipeContent();
  return NextResponse.json({ ok: true, ...result });
}
