import { store } from "./store";
import { getTopCalls } from "./data";
import { getSolUsd } from "./pumpCurve";
import type { Profile } from "./types";

/**
 * Creator rewards from $socials flow into one wallet, and a share of that pool
 * goes to the callers whose calls ran the furthest that day.
 *
 * The site only ever *computes and publishes* the split. Payouts are sent by
 * the treasury wallet itself — no key ever touches this server.
 */

/** How many callers share the pot. */
export const REWARD_PLACES = 10;

/** Share of the pool paid out each day, the rest rolls over. */
export const PAYOUT_RATIO = Number(process.env.NEXT_PUBLIC_REWARD_PAYOUT_RATIO ?? 0.5);

export const TREASURY = process.env.NEXT_PUBLIC_REWARD_WALLET ?? "";

const RPC =
  process.env.SOLANA_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://api.mainnet-beta.solana.com";

export type RewardEpoch = {
  /** 00:00 UTC of the running day. */
  start: number;
  end: number;
  label: string;
};

export type RewardRow = {
  profile: Profile;
  calls: number;
  best: number;
  /** Total x gained across the day's calls. */
  score: number;
  /** Share of the payout, 0-1. */
  share: number;
};

export type Payout = {
  epochStart: number;
  /** SOL actually sent out. */
  sol: number;
  /** Explorer link or signature, when the creator records one. */
  signature: string | null;
  at: number;
};

/** Rewards run on UTC days: the board resets at midnight UTC. */
export function currentEpoch(now = Date.now()): RewardEpoch {
  const d = new Date(now);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const end = start + 24 * 60 * 60 * 1000;
  const label = new Date(start).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { start, end, label };
}

/** SOL sitting in the reward wallet right now. */
export async function getPoolSol(): Promise<number | null> {
  if (!TREASURY) return null;

  const cached = await store.get<number>("rewards:pool");
  if (cached !== null) return cached;

  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [TREASURY, { commitment: "confirmed" }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { value?: number } };
    const lamports = json.result?.value;
    if (typeof lamports !== "number") return null;

    const sol = lamports / 1e9;
    await store.set("rewards:pool", sol, { ex: 60 });
    return sol;
  } catch {
    return null;
  }
}

/**
 * The day's standings. A caller's score is the total multiple gained across
 * the calls they made inside the epoch, so one 10x counts as much as nine 2x,
 * and a call that went nowhere adds nothing.
 */
export async function getRewardBoard(epoch = currentEpoch()): Promise<RewardRow[]> {
  const rows = await getTopCalls(200, 200);
  const inEpoch = rows.filter(
    (r) => r.post.createdAt >= epoch.start && r.post.createdAt < epoch.end
  );
  if (inEpoch.length === 0) return [];

  const byWallet = new Map<string, { profile: Profile; peaks: number[] }>();
  for (const row of inEpoch) {
    const entry = byWallet.get(row.post.author) ?? { profile: row.post.profile, peaks: [] };
    entry.peaks.push(row.peakMultiple);
    byWallet.set(row.post.author, entry);
  }

  const scored = [...byWallet.values()]
    .map(({ profile, peaks }) => ({
      profile,
      calls: peaks.length,
      best: Math.max(...peaks),
      score: peaks.reduce((sum, x) => sum + Math.max(x - 1, 0), 0),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, REWARD_PLACES);

  const total = scored.reduce((sum, row) => sum + row.score, 0);
  return scored.map((row) => ({ ...row, share: total > 0 ? row.score / total : 0 }));
}

export async function getPayouts(limit = 10): Promise<Payout[]> {
  const ids = await store.zrange("rewards:payouts", 0, limit - 1, true);
  if (ids.length === 0) return [];
  const rows = await store.mget<Payout>(ids.map((id) => `rewards:payout:${id}`));
  return rows.filter((p): p is Payout => Boolean(p));
}

export async function recordPayout(payout: Payout) {
  const id = `${payout.epochStart}-${payout.at}`;
  await store.set(`rewards:payout:${id}`, payout);
  await store.zadd("rewards:payouts", id, payout.at);
}

export type RewardsSnapshot = Awaited<ReturnType<typeof buildSnapshot>>;

/**
 * Everything the rewards page and the home rail need. Scoring walks every
 * recent call, so the result is cached for a minute.
 */
export async function getRewardsSnapshot(): Promise<RewardsSnapshot> {
  const cached = await store.get<RewardsSnapshot>("rewards:snapshot");
  if (cached) return cached;

  const snapshot = await buildSnapshot();
  await store.set("rewards:snapshot", snapshot, { ex: 60 });
  return snapshot;
}

async function buildSnapshot() {
  const epoch = currentEpoch();
  const [pool, board, payouts, solUsd] = await Promise.all([
    getPoolSol(),
    getRewardBoard(epoch),
    getPayouts(),
    getSolUsd(),
  ]);

  const payable = pool === null ? null : pool * PAYOUT_RATIO;
  const paidOut = payouts.reduce((sum, p) => sum + p.sol, 0);

  return {
    epoch,
    pool,
    payable,
    paidOut,
    solUsd,
    treasury: TREASURY || null,
    payoutRatio: PAYOUT_RATIO,
    board: board.map((row) => ({
      ...row,
      sol: payable === null ? null : payable * row.share,
    })),
  };
}
