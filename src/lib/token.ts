import { store, K } from "./store";
import type { TokenSnapshot } from "./types";

const CACHE_SECONDS = 30;

type DexPair = {
  chainId: string;
  dexId?: string;
  url?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h1?: number; h24?: number };
  info?: { imageUrl?: string };
};

/**
 * Live market data for a Solana mint, from DexScreener (free, no key).
 * Cached briefly so a busy feed does not hammer the API.
 */
export async function getToken(mint: string): Promise<TokenSnapshot | null> {
  const cached = await store.get<TokenSnapshot>(K.token(mint));
  if (cached) return cached;

  let pairs: DexPair[] = [];
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { pairs?: DexPair[] | null };
    pairs = (json.pairs ?? []).filter((p) => p.chainId === "solana");
  } catch {
    return null;
  }

  if (pairs.length === 0) return null;

  // Deepest liquidity wins — that is the pair people actually trade.
  const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

  const snapshot: TokenSnapshot = {
    mint,
    name: best.baseToken?.name ?? "Unknown",
    symbol: best.baseToken?.symbol ?? "???",
    image: best.info?.imageUrl ?? null,
    priceUsd: best.priceUsd ? Number(best.priceUsd) : null,
    marketCap: best.marketCap ?? best.fdv ?? null,
    liquidity: best.liquidity?.usd ?? null,
    volume24h: best.volume?.h24 ?? null,
    change24h: best.priceChange?.h24 ?? null,
    change1h: best.priceChange?.h1 ?? null,
    pairUrl: best.url ?? `https://dexscreener.com/solana/${mint}`,
    dex: best.dexId ?? null,
    updatedAt: Date.now(),
  };

  await store.set(K.token(mint), snapshot, { ex: CACHE_SECONDS });
  return snapshot;
}

export async function getTokens(mints: string[]): Promise<Map<string, TokenSnapshot>> {
  const unique = [...new Set(mints)];
  const results = await Promise.all(unique.map((m) => getToken(m).catch(() => null)));
  const map = new Map<string, TokenSnapshot>();
  unique.forEach((mint, i) => {
    const snap = results[i];
    if (snap) map.set(mint, snap);
  });
  return map;
}
