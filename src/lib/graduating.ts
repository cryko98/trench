import { store } from "./store";
import { getToken } from "./token";
import type { TokenSnapshot } from "./types";
import { MIGRATION_SOL, type Graduating } from "./constants";

export { MIGRATION_SOL };
export type { Graduating };

const CACHE_SECONDS = 45;
const CANDIDATE_KEY = "graduating:list";

type PumpCoin = {
  mint?: string;
  symbol?: string;
  name?: string;
  image_uri?: string;
  real_sol_reserves?: number;
  usd_market_cap?: number;
};

/**
 * Coins about to graduate off the pump.fun bonding curve.
 *
 * Candidates come from pump.fun's recently traded list — its `complete` flag
 * is stale for coins that already migrated, so every candidate is confirmed
 * against our own market snapshot (DexScreener/Jupiter/chain) and dropped if
 * it is no longer bonding.
 */
export async function getGraduatingCoins(limit = 5): Promise<Graduating[]> {
  const cached = await store.get<Graduating[]>(CANDIDATE_KEY);
  if (cached) return cached.slice(0, limit);

  let coins: PumpCoin[] = [];
  try {
    const res = await fetch(
      "https://frontend-api-v3.pump.fun/coins?offset=0&limit=100&sort=last_trade_timestamp&order=DESC&includeNsfw=false&complete=false",
      { headers: { accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    coins = (await res.json()) as PumpCoin[];
  } catch {
    return [];
  }

  const candidates = coins
    .map((c) => ({ coin: c, solRaised: (c.real_sol_reserves ?? 0) / 1e9 }))
    .filter((c) => c.coin.mint && c.solRaised > 0 && c.solRaised < MIGRATION_SOL - 0.1)
    .sort((a, b) => b.solRaised - a.solRaised)
    .slice(0, limit * 3);

  const checked = await Promise.all(
    candidates.map(async ({ coin, solRaised }) => {
      let snapshot: TokenSnapshot | null = null;
      try {
        snapshot = await getToken(coin.mint!);
      } catch {
        snapshot = null;
      }
      // Anything that already trades on a DEX has migrated, whatever
      // pump.fun's cached flag says.
      if (snapshot && !snapshot.bonding) return null;

      return {
        mint: coin.mint!,
        symbol: snapshot?.symbol ?? coin.symbol ?? "???",
        name: snapshot?.name ?? coin.name ?? "Unknown",
        image: snapshot?.image ?? coin.image_uri ?? null,
        marketCap: snapshot?.marketCap ?? coin.usd_market_cap ?? null,
        progress: snapshot?.progress ?? Math.min(100, (solRaised / MIGRATION_SOL) * 100),
        solRaised,
      } satisfies Graduating;
    })
  );

  const rows = checked.filter((r): r is Graduating => r !== null).slice(0, limit * 2);
  await store.set(CANDIDATE_KEY, rows, { ex: CACHE_SECONDS });
  return rows.slice(0, limit);
}
