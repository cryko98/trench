import { store, K } from "./store";
import { getCurveState } from "./pumpCurve";
import type { TokenSnapshot } from "./types";

const CACHE_SECONDS = 30;
/** Short negative cache so a dead address cannot hammer the upstream APIs. */
const MISS_CACHE_SECONDS = 20;

/** DexScreener's id for the pump.fun bonding curve itself. */
const CURVE_DEX_IDS = new Set(["pumpfun", "pump", "pumpdotfun"]);

type Cached = TokenSnapshot | { miss: true };

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

type JupToken = {
  id?: string;
  name?: string;
  symbol?: string;
  icon?: string;
  usdPrice?: number;
  mcap?: number;
  fdv?: number;
  liquidity?: number;
  launchpad?: string;
  graduatedAt?: string | null;
  graduatedPool?: string | null;
  stats1h?: { priceChange?: number };
  stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number };
};

type PumpCoin = {
  mint?: string;
  name?: string;
  symbol?: string;
  image_uri?: string;
  usd_market_cap?: number;
  complete?: boolean;
  total_supply?: number;
};

function empty(mint: string): TokenSnapshot {
  return {
    mint,
    name: "Unknown",
    symbol: "???",
    image: null,
    priceUsd: null,
    marketCap: null,
    liquidity: null,
    volume24h: null,
    change24h: null,
    change1h: null,
    pairUrl: null,
    dex: null,
    source: "dexscreener",
    bonding: false,
    progress: null,
    updatedAt: Date.now(),
  };
}

/**
 * Picks the pair that represents the coin.
 *
 * Deepest liquidity alone is not safe: a single broken or manipulated pool can
 * quote a price thousands of times off (a Bonk/JUP pool once reported $0.0158
 * against $0.0000032 everywhere else) and would poison every call scored off
 * it. So the price is sanity-checked against the median of the liquid pairs,
 * and outliers are dropped before the deepest one wins.
 */
function pickPair(pairs: DexPair[]): DexPair | null {
  const byLiquidity = [...pairs].sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  );
  if (byLiquidity.length < 3) return byLiquidity[0] ?? null;

  const top = byLiquidity.slice(0, 8);
  const prices = top
    .map((p) => Number(p.priceUsd))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return byLiquidity[0];

  const median = prices[Math.floor(prices.length / 2)];
  const sane = top.filter((p) => {
    const price = Number(p.priceUsd);
    if (!Number.isFinite(price) || price <= 0) return false;
    const ratio = price / median;
    return ratio > 0.34 && ratio < 3;
  });

  return sane[0] ?? byLiquidity[0];
}

async function fromDexScreener(mint: string): Promise<TokenSnapshot | null> {
  let pairs: DexPair[] = [];
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { pairs?: DexPair[] | null };
    // Only pairs where this mint is the base token: in a pair where it is the
    // quote (SOL/MINT), every stat describes the other coin.
    pairs = (json.pairs ?? []).filter(
      (p) =>
        p.chainId === "solana" &&
        p.baseToken?.address?.toLowerCase() === mint.toLowerCase()
    );
  } catch {
    return null;
  }

  if (pairs.length === 0) return null;

  const best = pickPair(pairs);
  if (!best) return null;
  const dexId = (best.dexId ?? "").toLowerCase();
  const bonding = CURVE_DEX_IDS.has(dexId);

  return {
    ...empty(mint),
    name: best.baseToken?.name ?? "Unknown",
    symbol: best.baseToken?.symbol ?? "???",
    image: best.info?.imageUrl ?? null,
    priceUsd: best.priceUsd ? Number(best.priceUsd) : null,
    marketCap: best.marketCap ?? best.fdv ?? null,
    liquidity: best.liquidity?.usd ?? null,
    volume24h: best.volume?.h24 ?? null,
    change24h: best.priceChange?.h24 ?? null,
    change1h: best.priceChange?.h1 ?? null,
    pairUrl: bonding
      ? `https://pump.fun/coin/${mint}`
      : best.url ?? `https://dexscreener.com/solana/${mint}`,
    dex: bonding ? "pump.fun curve" : best.dexId ?? null,
    source: "dexscreener",
    bonding,
  };
}

/**
 * Jupiter's token API indexes pump.fun launches within seconds, is free and
 * far more forgiving than pump.fun's own frontend API.
 */
async function fromJupiter(mint: string): Promise<TokenSnapshot | null> {
  let token: JupToken | null = null;
  try {
    const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as JupToken[] | { data?: JupToken[] };
    const rows = Array.isArray(json) ? json : json.data ?? [];
    token = rows.find((t) => t.id === mint) ?? null;
  } catch {
    return null;
  }

  if (!token) return null;

  const onPump = (token.launchpad ?? "").toLowerCase().includes("pump");
  const graduated = Boolean(token.graduatedAt || token.graduatedPool);
  const bonding = onPump && !graduated;
  const volume24h =
    token.stats24h?.buyVolume !== undefined || token.stats24h?.sellVolume !== undefined
      ? (token.stats24h.buyVolume ?? 0) + (token.stats24h.sellVolume ?? 0)
      : null;

  return {
    ...empty(mint),
    name: token.name ?? "Unknown",
    symbol: token.symbol ?? "???",
    image: token.icon ?? null,
    priceUsd: token.usdPrice ?? null,
    marketCap: token.mcap ?? token.fdv ?? null,
    liquidity: token.liquidity ?? null,
    volume24h,
    change24h: token.stats24h?.priceChange ?? null,
    change1h: token.stats1h?.priceChange ?? null,
    pairUrl: onPump
      ? `https://pump.fun/coin/${mint}`
      : `https://dexscreener.com/solana/${mint}`,
    dex: bonding ? "pump.fun curve" : token.launchpad ?? null,
    source: "jupiter",
    bonding,
  };
}

/** Last resort: pump.fun's own frontend API (it rate limits aggressively). */
async function fromPumpApi(mint: string): Promise<TokenSnapshot | null> {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const coin = (await res.json()) as PumpCoin;
    if (!coin?.mint) return null;

    const onCurve = coin.complete !== true;
    const marketCap = coin.usd_market_cap ?? null;
    const supply = coin.total_supply ?? null;

    return {
      ...empty(mint),
      name: coin.name ?? "Unknown",
      symbol: coin.symbol ?? "???",
      image: coin.image_uri ?? null,
      priceUsd: marketCap && supply ? marketCap / (supply / 1e6) : null,
      marketCap,
      pairUrl: `https://pump.fun/coin/${mint}`,
      dex: onCurve ? "pump.fun curve" : "pump.fun",
      source: "pumpfun",
      bonding: onCurve,
    };
  } catch {
    return null;
  }
}

/**
 * Anything the chain knows, even for a coin nothing has indexed yet: the
 * bonding curve account itself carries price, market cap and curve progress.
 */
async function fromChain(mint: string): Promise<TokenSnapshot | null> {
  const curve = await getCurveState(mint);
  if (!curve || curve.complete) return null;

  return {
    ...empty(mint),
    priceUsd: null,
    marketCap: curve.marketCapUsd,
    pairUrl: `https://pump.fun/coin/${mint}`,
    dex: "pump.fun curve",
    source: "onchain",
    bonding: true,
    progress: curve.progress,
  };
}

/**
 * Live market data for a Solana mint.
 *
 * DexScreener first (deepest stats for anything trading on a DEX, and it also
 * lists the pump.fun curve), then Jupiter (indexes pump.fun launches in
 * seconds, free and generous), then the bonding curve account read straight
 * from the chain, and pump.fun's own API only as a last resort. Coins still on
 * the curve get their progress from the chain. Snapshots are cached briefly so
 * a busy feed never hammers an upstream.
 */
export async function getToken(mint: string): Promise<TokenSnapshot | null> {
  const cached = await store.get<Cached>(K.token(mint));
  if (cached) return "miss" in cached ? null : cached;

  let snapshot =
    (await fromDexScreener(mint)) ?? (await fromJupiter(mint)) ?? (await fromChain(mint));

  // Jupiter may know a pump.fun coin that DexScreener reported without market
  // data, and the chain knows the curve even when no indexer does.
  if (snapshot && snapshot.marketCap === null && snapshot.source === "dexscreener") {
    const better = await fromJupiter(mint);
    if (better?.marketCap) snapshot = { ...snapshot, ...better, source: "jupiter" };
  }

  if (!snapshot) snapshot = await fromPumpApi(mint);

  if (!snapshot) {
    await store.set(K.token(mint), { miss: true }, { ex: MISS_CACHE_SECONDS });
    return null;
  }

  // Curve progress and a chain-accurate market cap for coins still bonding.
  if (snapshot.bonding && snapshot.progress === null) {
    const curve = await getCurveState(mint);
    if (curve) {
      snapshot.progress = curve.progress;
      snapshot.marketCap = snapshot.marketCap ?? curve.marketCapUsd;
      if (curve.complete) snapshot.bonding = false;
    }
  }

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
