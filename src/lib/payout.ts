import bs58 from "bs58";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { store } from "./store";
import { RPC } from "./pumpCurve";
import { currentEpoch, getRewardBoard, REWARD_PLACES, type RewardEpoch } from "./rewards";
import { RADAR_AUTHOR } from "./constants";

/**
 * The daily payout: the reward day that just closed is scored, and the top
 * callers are paid their share of the reward wallet, from this server.
 *
 * Nothing here runs live until REWARD_PAYOUTS_LIVE is "true" and the
 * wallet's secret is configured; until then every run is a dry run that
 * only writes the plan down. A closed day is paid at most once: the
 * transaction's signature is recorded the moment it is sent, before the
 * network confirms it, so an interrupted run can never send it twice.
 *
 * Secrets are read from the environment and never logged or returned.
 */

/**
 * Share of the wallet (above the reserve) that a day pays out. Everything,
 * by default: whatever SOL sits in the wallet at 09:00 is split by score.
 */
export const PAYOUT_RATIO = Math.min(1, Math.max(0, Number(process.env.REWARD_PAYOUT_RATIO ?? 1)));
/** Always left in the wallet for fees and rent; never paid out. */
const RESERVE_SOL = 0.15;
/** A share smaller than this stays in the wallet for tomorrow. */
const MIN_SEND_SOL = 0.001;
/** The switch that turns dry runs into transfers. */
export const PAYOUTS_LIVE = process.env.REWARD_PAYOUTS_LIVE === "true";

export type Recipient = {
  wallet: string;
  name: string;
  handle: string;
  share: number;
  sol: number;
};

export type PayoutPlan = {
  epoch: RewardEpoch;
  treasury: string | null;
  balance: number | null;
  payable: number;
  recipients: Recipient[];
  skipped: string[];
  problem: string | null;
};

export type PayoutRecord = {
  epochStart: number;
  sol: number;
  signature: string | null;
  at: number;
  status: "sent" | "confirmed";
  recipients: Recipient[];
};

/** The reward day that ended most recently — the one a 09:00 run pays. */
export function closedEpoch(now = Date.now()): RewardEpoch {
  return currentEpoch(currentEpoch(now).start - 1);
}

/** The signing key, in the shapes wallets export it: base58 (64 or 32 bytes) or a JSON array. */
function keypairFromEnv(): Keypair | null {
  const secret = process.env.REWARD_WALLET_SECRET?.trim();
  if (!secret) return null;
  try {
    if (secret.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
    }
    const bytes = bs58.decode(secret);
    return bytes.length === 64 ? Keypair.fromSecretKey(bytes) : Keypair.fromSeed(bytes.slice(0, 32));
  } catch {
    return null;
  }
}

/** Address and key of the reward wallet, with the one reason they cannot be used. */
export function treasury(): { address: string | null; keypair: Keypair | null; problem: string | null } {
  const keypair = keypairFromEnv();
  const configured = process.env.REWARD_WALLET_ADDRESS?.trim() || null;
  if (process.env.REWARD_WALLET_SECRET && !keypair) {
    return { address: configured, keypair: null, problem: "REWARD_WALLET_SECRET could not be read" };
  }
  const derived = keypair?.publicKey.toBase58() ?? null;
  if (derived && configured && derived !== configured) {
    return { address: null, keypair: null, problem: "REWARD_WALLET_SECRET does not belong to REWARD_WALLET_ADDRESS" };
  }
  const address = derived ?? configured;
  return { address, keypair, problem: address ? null : "No reward wallet configured" };
}

async function solBalance(address: string): Promise<number | null> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address, { commitment: "confirmed" }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { value?: number } };
    return typeof json.result?.value === "number" ? json.result.value / LAMPORTS_PER_SOL : null;
  } catch {
    return null;
  }
}

/** Who gets what for a closed day, without sending anything. */
export async function planPayout(epoch: RewardEpoch): Promise<PayoutPlan> {
  const t = treasury();
  const balance = t.address ? await solBalance(t.address) : null;
  const board = (await getRewardBoard(epoch))
    .filter((row) => row.profile.wallet !== RADAR_AUTHOR)
    .slice(0, REWARD_PLACES);
  const total = board.reduce((sum, row) => sum + row.score, 0);
  const payable = balance === null ? 0 : Math.max(0, (balance - RESERVE_SOL) * PAYOUT_RATIO);

  const recipients: Recipient[] = [];
  const skipped: string[] = [];
  for (const row of board) {
    const share = total > 0 ? row.score / total : 0;
    // Six decimals: whole lamport thousands, no float dust in the transfer.
    const sol = Math.floor(payable * share * 1e6) / 1e6;
    if (sol < MIN_SEND_SOL) {
      skipped.push(`@${row.profile.handle}: ${sol.toFixed(6)} SOL is below the ${MIN_SEND_SOL} minimum`);
      continue;
    }
    recipients.push({
      wallet: row.profile.wallet,
      name: row.profile.name,
      handle: row.profile.handle,
      share,
      sol,
    });
  }

  return {
    epoch,
    treasury: t.address,
    balance,
    payable: Math.floor(payable * 1e6) / 1e6,
    recipients,
    skipped,
    problem: t.problem ?? (balance === null && t.address ? "Could not read the wallet balance" : null),
  };
}

export type PayoutResult = {
  status: "paid" | "dry-run" | "already-paid" | "nothing-to-pay" | "locked" | "blocked";
  plan: PayoutPlan;
  record?: PayoutRecord;
  reason?: string;
};

const paidKey = (start: number) => `rewards:paid:${start}`;
const lockKey = (start: number) => `rewards:paylock:${start}`;
const previewKey = (start: number) => `rewards:preview:${start}`;

/**
 * Pay the closed day, or plan it. `live` is honoured only with the switch
 * on and a key present; everything else is a dry run.
 */
export async function runPayout({
  now = Date.now(),
  live = false,
}: { now?: number; live?: boolean } = {}): Promise<PayoutResult> {
  const epoch = closedEpoch(now);

  const already = await store.get<PayoutRecord>(paidKey(epoch.start));
  const plan = await planPayout(epoch);
  if (already) return { status: "already-paid", plan, record: already };

  const t = treasury();
  const canSend = live && PAYOUTS_LIVE && Boolean(t.keypair) && !plan.problem;
  if (!canSend) {
    await store.set(previewKey(epoch.start), { ...plan, at: Date.now() }, { ex: 60 * 60 * 24 * 7 });
    const reason = !PAYOUTS_LIVE
      ? "REWARD_PAYOUTS_LIVE is not \"true\""
      : !t.keypair
        ? "no signing key"
        : plan.problem ?? "not asked to go live";
    return { status: plan.problem ? "blocked" : "dry-run", plan, reason };
  }
  if (plan.recipients.length === 0) return { status: "nothing-to-pay", plan };

  // One run at a time per day, even if two crons or an admin overlap.
  const holders = await store.incr(lockKey(epoch.start));
  await store.expire(lockKey(epoch.start), 600);
  if (holders > 1) return { status: "locked", plan, reason: "another run holds the lock" };

  const keypair = t.keypair!;
  const connection = new Connection(RPC, "confirmed");
  const tx = new Transaction();
  for (const r of plan.recipients) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(r.wallet),
        lamports: Math.round(r.sol * LAMPORTS_PER_SOL),
      })
    );
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  // Written before confirmation: from here on this day is spoken for.
  const total = plan.recipients.reduce((sum, r) => sum + r.sol, 0);
  const record: PayoutRecord = {
    epochStart: epoch.start,
    sol: Math.floor(total * 1e6) / 1e6,
    signature,
    at: Date.now(),
    status: "sent",
    recipients: plan.recipients,
  };
  await store.set(paidKey(epoch.start), record);
  const id = `${record.epochStart}-${record.at}`;
  await store.set(`rewards:payout:${id}`, record);
  await store.zadd("rewards:payouts", id, record.at);

  try {
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    record.status = "confirmed";
    await store.set(paidKey(epoch.start), record);
    await store.set(`rewards:payout:${id}`, record);
  } catch {
    // Left as "sent": the signature is on record for anyone to check.
  }

  return { status: "paid", plan, record };
}
