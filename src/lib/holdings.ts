import { store, K } from "./store";

const CACHE_SECONDS = 120;

const RPC =
  process.env.SOLANA_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://api.mainnet-beta.solana.com";

/** SOL a wallet must hold before it can write anything here. */
export const MIN_SOL_TO_POST = 0.001;
const SOL_CACHE_SECONDS = 600;

/**
 * Whether the wallet holds any SOL at all. Wallets are free to make, so a
 * bot can mint a thousand and dodge every per-wallet limit — but each one
 * it wants to post from has to be funded first, which is what this checks.
 * Null when the chain could not be asked; callers decide what to do then.
 */
export async function hasSol(wallet: string): Promise<boolean | null> {
  const key = K.sol(wallet);
  const cached = await store.get<boolean>(key);
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
        params: [wallet, { commitment: "confirmed" }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { value?: number } };
    const lamports = json.result?.value;
    if (typeof lamports !== "number") return null;

    const funded = lamports / 1e9 >= MIN_SOL_TO_POST;
    // A funded wallet stays funded for a while; an empty one is re-asked sooner.
    await store.set(key, funded, { ex: funded ? SOL_CACHE_SECONDS : 60 });
    return funded;
  } catch {
    return null;
  }
}

/** The 403 for an unfunded wallet, or null when it may write. */
export async function fundedOr403(wallet: string): Promise<Response | null> {
  const funded = await hasSol(wallet);
  if (funded) return null;
  return Response.json(
    {
      error:
        funded === null
          ? "Could not check your wallet right now, try again"
          : `Your wallet needs a little SOL in it (${MIN_SOL_TO_POST} or more) before it can post — bots do not bother.`,
    },
    { status: funded === null ? 503 : 403 }
  );
}

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
