import { store, K } from "./store";

const CACHE_SECONDS = 120;

const RPC =
  process.env.SOLANA_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://api.mainnet-beta.solana.com";

type TokenAccount = {
  account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } };
};

/**
 * How many whole tokens of `mint` a wallet holds, summed across its token
 * accounts. Returns null when the RPC could not answer — callers must not
 * treat that as "holds nothing".
 */
export async function getTokenBalance(wallet: string, mint: string): Promise<number | null> {
  const key = K.balance(wallet, mint);
  const cached = await store.get<number>(key);
  if (cached !== null) return cached;

  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        // A wallet that just bought should be able to join right away.
        params: [wallet, { mint }, { encoding: "jsonParsed", commitment: "confirmed" }],
      }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      result?: { value?: TokenAccount[] };
      error?: unknown;
    };
    if (json.error || !json.result) return null;

    const balance = (json.result.value ?? []).reduce(
      (sum, acc) => sum + (acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
      0
    );

    await store.set(key, balance, { ex: CACHE_SECONDS });
    return balance;
  } catch {
    return null;
  }
}

/** Drops the cached balance so the next check hits the chain again. */
export async function forgetBalance(wallet: string, mint: string) {
  await store.del(K.balance(wallet, mint));
}
