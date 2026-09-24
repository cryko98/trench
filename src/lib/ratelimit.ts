import { NextResponse } from "next/server";
import { store } from "./store";

/**
 * Fixed-window rate limiting on top of the store: one counter per scope and
 * caller, which expires with the window. Cheap enough to sit in front of
 * every route, and it is what stands between a bot and the free tiers this
 * site runs on — the Redis quota, the RPC credits, the upstream APIs.
 */

/** The caller's address as the edge saw it. Vercel sets the first hop. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimit(
  scope: string,
  id: string,
  limit: number,
  windowSeconds: number
): Promise<{ ok: boolean; retryAfter: number }> {
  const key = `rl:${scope}:${id}`;
  const count = await store.incr(key);
  // The first hit opens the window; the counter dies with it.
  if (count === 1) await store.expire(key, windowSeconds);
  return { ok: count <= limit, retryAfter: windowSeconds };
}

/**
 * The 429 to return when a caller is over the line, or null to carry on.
 * `who` is usually the IP, or the wallet for signed-in actions.
 */
export async function limited(
  scope: string,
  who: string,
  limit: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const { ok, retryAfter } = await rateLimit(scope, who, limit, windowSeconds);
  if (ok) return null;
  return NextResponse.json(
    { error: "Too many requests — slow down a little" },
    { status: 429, headers: { "retry-after": String(retryAfter) } }
  );
}
