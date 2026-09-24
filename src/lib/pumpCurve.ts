import { PublicKey } from "@solana/web3.js";
import { store } from "./store";

/** pump.fun's bonding curve program. */
const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const WSOL = "So11111111111111111111111111111111111111112";

/** Share of the supply that sits on the curve at launch. */
const CURVE_SUPPLY_RATIO = 0.7931;

export const RPC =
  process.env.SOLANA_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://api.mainnet-beta.solana.com";

export type CurveState = {
  priceSol: number;
  marketCapSol: number;
  marketCapUsd: number | null;
  /** 0-100, how much of the curve has been bought out. */
  progress: number;
  complete: boolean;
  solRaised: number;
};

/** SOL price in USD, cached for a minute. */
export async function getSolUsd(): Promise<number | null> {
  const cached = await store.get<number>("sol:usd");
  if (cached) return cached;

  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${WSOL}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { usdPrice?: number }>;
    const price = json[WSOL]?.usdPrice;
    if (!price) return null;
    await store.set("sol:usd", price, { ex: 60 });
    return price;
  } catch {
    return null;
  }
}

/**
 * Reads a pump.fun bonding curve straight from the chain, so a coin resolves
 * the second it is launched and without depending on any indexer's rate limit.
 * Returns null when the mint has no curve account (not a pump.fun coin, or the
 * curve was already closed).
 */
export async function getCurveState(mint: string): Promise<CurveState | null> {
  let pda: PublicKey;
  try {
    [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
      PUMP_PROGRAM
    );
  } catch {
    return null;
  }

  let data: Buffer;
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        // "confirmed", not the default "finalized": a coin launched seconds
        // ago has no finalized account yet, and those are exactly the ones
        // people are calling.
        params: [pda.toBase58(), { encoding: "base64", commitment: "confirmed" }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { value?: { data?: [string, string] } } };
    const raw = json.result?.value?.data?.[0];
    if (!raw) return null;
    data = Buffer.from(raw, "base64");
  } catch {
    return null;
  }

  // 8-byte anchor discriminator, then five u64s and the `complete` flag.
  if (data.length < 49) return null;

  const virtualTokens = Number(data.readBigUInt64LE(8));
  const virtualSol = Number(data.readBigUInt64LE(16));
  const realTokens = Number(data.readBigUInt64LE(24));
  const realSol = Number(data.readBigUInt64LE(32));
  const totalSupply = Number(data.readBigUInt64LE(40));
  const complete = data.readUInt8(48) === 1;

  if (!virtualTokens || !totalSupply) return null;

  // SOL has 9 decimals, pump.fun tokens 6.
  const priceSol = virtualSol / 1e9 / (virtualTokens / 1e6);
  const marketCapSol = priceSol * (totalSupply / 1e6);
  const solUsd = await getSolUsd();

  return {
    priceSol,
    marketCapSol,
    marketCapUsd: solUsd ? marketCapSol * solUsd : null,
    progress: Math.min(100, Math.max(0, (1 - realTokens / (totalSupply * CURVE_SUPPLY_RATIO)) * 100)),
    complete,
    solRaised: realSol / 1e9,
  };
}
