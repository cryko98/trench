import Link from "next/link";
import { getRewardsSnapshot, REWARD_PLACES } from "@/lib/rewards";
import { formatMultiple, formatUsd, shortAddress } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { CopyAddress } from "@/components/TokenCard";
import { PayoutRecorder } from "@/components/PayoutRecorder";
import { getSessionWallet } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caller rewards — Trench Socials",
  description:
    "Creator rewards from $socials go back to the callers: every day the best calls on Trench Socials share the pot.",
};

function sol(n: number | null, digits = 2) {
  return n === null ? "—" : `${n.toFixed(digits)} SOL`;
}

function Tile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="tf-inset px-4 py-3">
      <div className="tf-label tf-label-plain">{label}</div>
      <div
        className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-mint-deep" : "text-foreground"}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default async function RewardsPage() {
  const [snap, viewer] = await Promise.all([getRewardsSnapshot(), getSessionWallet()]);
  const isAdmin = Boolean(process.env.ADMIN_WALLET) && viewer === process.env.ADMIN_WALLET;
  const usd = (amount: number | null) =>
    amount === null || !snap.solUsd ? undefined : formatUsd(amount * snap.solUsd);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <section className="tf-card relative overflow-hidden p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #90ffd0, transparent 70%)" }}
        />
        <div className="relative">
          <span className="tf-label">Caller rewards</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            The creator fees go back to <span className="tf-neon">the callers</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Every trade of $socials pays a creator reward. That reward is not kept — it collects in
            the reward wallet, and every day it is split between the callers whose calls ran the
            furthest. Post good calls, take a cut.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="In the pot" value={sol(snap.pool)} sub={usd(snap.pool)} accent />
            <Tile
              label="Today's payout"
              value={sol(snap.payable)}
              sub={`${Math.round(snap.payoutRatio * 100)}% of the pot`}
            />
            <Tile label="Paid out so far" value={sol(snap.paidOut)} sub={usd(snap.paidOut)} />
            <Tile label="Places paid" value={`Top ${REWARD_PLACES}`} sub={snap.epoch.label} />
          </div>

          {snap.treasury ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Reward wallet:</span>
              <CopyAddress address={snap.treasury} />
              <a
                href={`https://solscan.io/account/${snap.treasury}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-mint-deep"
              >
                Solscan ↗
              </a>
            </div>
          ) : (
            <p className="mt-3 text-xs text-loss">
              No reward wallet set yet — add NEXT_PUBLIC_REWARD_WALLET and the pot goes live.
            </p>
          )}
        </div>
      </section>

      <section className="tf-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="tf-label">Today&apos;s standings</h2>
          <span className="text-[11px] font-medium text-muted">
            {snap.epoch.label} · UTC
          </span>
        </div>

        {snap.board.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            No scoring calls yet today. Post a call — the board resets at 00:00 UTC.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {snap.board.map((row, i) => (
              <li key={row.profile.wallet}>
                <Link
                  href={`/u/${row.profile.wallet}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2/50"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold tabular-nums ${
                      i === 0
                        ? "bg-mint text-mint-ink shadow-[0_0_16px_-4px_rgba(144,255,208,0.9)]"
                        : i < 3
                          ? "bg-lav/20 text-lav-deep"
                          : "bg-surface-2 text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar profile={row.profile} size="sm" className="tf-ring" />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{row.profile.name}</div>
                    <div className="truncate text-[11px] text-muted">
                      @{row.profile.handle} · {row.calls} {row.calls === 1 ? "call" : "calls"} · best{" "}
                      {formatMultiple(row.best)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums text-mint-deep">
                      {row.sol === null ? `${(row.share * 100).toFixed(1)}%` : sol(row.sol, 3)}
                    </div>
                    <div className="font-mono text-[10px] text-muted">
                      {row.sol === null
                        ? `${row.score.toFixed(1)}x gained`
                        : `${(row.share * 100).toFixed(1)}% · ${row.score.toFixed(1)}x gained`}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
          Shares update live as the calls move, and are final when the day closes.
        </p>
      </section>

      <section className="tf-card p-5">
        <span className="tf-label">The rules</span>
        <ol className="mt-3 space-y-3 text-sm text-muted">
          <li>
            <span className="text-foreground">1.</span> Only calls posted inside the running day
            count. A new day starts at 00:00 UTC.
          </li>
          <li>
            <span className="text-foreground">2.</span> A call is scored on its{" "}
            <span className="text-foreground">peak</span> market cap since it was posted. A 6x call
            adds 5 points, a 2x adds 1, and a call that never moved adds nothing.
          </li>
          <li>
            <span className="text-foreground">3.</span> Your points are the sum across your calls,
            so consistency and one monster call both pay.
          </li>
          <li>
            <span className="text-foreground">4.</span> The top {REWARD_PLACES} split{" "}
            {Math.round(snap.payoutRatio * 100)}% of the pot in proportion to their points; the rest
            rolls into tomorrow.
          </li>
          <li>
            <span className="text-foreground">5.</span> Payouts go to the wallet you posted from —
            it is your account here, so there is nothing to claim.
          </li>
        </ol>
        <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted">
          The site publishes the split; the transfers are sent from the reward wallet itself. No
          private key ever reaches this server, and the site never holds your funds.
        </p>
      </section>

      <PayoutRecorder epochStart={snap.epoch.start} isAdmin={isAdmin} />

      <section className="tf-card overflow-hidden">
        <h2 className="tf-label border-b border-line px-4 py-3">Payout history</h2>
        <PayoutHistory />
      </section>
    </div>
  );
}

async function PayoutHistory() {
  const { getPayouts } = await import("@/lib/rewards");
  const payouts = await getPayouts(20);

  if (payouts.length === 0) {
    return <p className="px-4 py-5 text-sm text-muted">Nothing paid out yet.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {payouts.map((p) => (
        <li key={`${p.epochStart}-${p.at}`} className="flex items-center gap-3 px-4 py-2.5">
          <span className="font-mono text-[11px] text-muted">
            {new Date(p.epochStart).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })}
          </span>
          <span className="text-sm font-bold text-mint-deep">{p.sol.toFixed(3)} SOL</span>
          {p.signature && (
            <a
              href={`https://solscan.io/tx/${p.signature}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto font-mono text-[11px] text-muted hover:text-mint-deep"
            >
              {shortAddress(p.signature, 6)} ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
