import { store } from "./store";
import { getTopCalls } from "./data";
import type { Profile } from "./types";

/**
 * The callers whose calls ran the furthest on a given day are rewarded for it.
 *
 * The site only ever *computes and publishes* the standings — nothing is paid
 * from here, and no key ever touches this server.
 */

/** How many callers are rewarded each day. */
export const REWARD_PLACES = 10;

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
  /** Weight inside the day's standings, 0-1. */
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
  const board = await getRewardBoard(epoch);
  return { epoch, board, places: REWARD_PLACES };
}
