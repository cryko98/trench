import Link from "next/link";
import { getRewardsSnapshot, REWARD_PLACES } from "@/lib/rewards";
import { formatMultiple, shortAddress } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caller rewards — Trench Social",
  description:
    "The best callers on Trench Social are rewarded every day. Post a call, climb the board, get paid.",
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tf-inset px-4 py-3">
      <div className="tf-label tf-label-plain">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default async function RewardsPage() {
  const snap = await getRewardsSnapshot();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <section className="tf-card relative overflow-hidden p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-sun/60"
        />
        <div className="relative">
          <span className="tf-label">Caller rewards</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            The best callers get <span className="tf-neon">rewarded</span>, every day
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Call coins you believe in. Every day the calls are scored on how far they ran, and the
            callers at the top of the board are rewarded for them. No claiming, no forms — the board
            does the work.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Rewarded daily" value={`Top ${REWARD_PLACES}`} sub="on the day's board" />
            <Tile label="Scored on" value="Peak" sub="market cap since the call" />
            <Tile label="Board resets" value="00:00" sub="UTC, every day" />
            <Tile label="Today" value={snap.epoch.label} sub="running now" />
          </div>
        </div>
      </section>

      <section className="tf-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="tf-label">Today&apos;s standings</h2>
          <span className="text-[11px] font-medium text-muted">{snap.epoch.label} · UTC</span>
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
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-ink font-mono text-[11px] font-bold tabular-nums ${
                      i === 0
                        ? "bg-sun text-ink"
                        : i === 1
                          ? "bg-lav text-white"
                          : i === 2
                            ? "bg-mint text-ink"
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
                      {row.score.toFixed(1)}x
                    </div>
                    <div className="font-mono text-[10px] text-muted">gained today</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
          The board moves with the calls, and is final when the day closes.
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
            <span className="text-foreground">4.</span> The top {REWARD_PLACES} at the end of the
            day are rewarded, weighted by their points.
          </li>
          <li>
            <span className="text-foreground">5.</span> Rewards go to the wallet you posted from —
            it is your account here, so there is nothing to claim.
          </li>
        </ol>
        <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted">
          The site publishes the standings only. Nothing is paid from this server, no private key
          ever reaches it, and the site never holds your funds.
        </p>
      </section>

      <section className="tf-card overflow-hidden">
        <h2 className="tf-label border-b border-line px-4 py-3">Reward history</h2>
        <PayoutHistory />
      </section>
    </div>
  );
}

async function PayoutHistory() {
  const { getPayouts } = await import("@/lib/rewards");
  const payouts = await getPayouts(20);

  if (payouts.length === 0) {
    return <p className="px-4 py-5 text-sm text-muted">Nothing rewarded yet.</p>;
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
          <span className="text-sm font-bold text-mint-deep">Rewarded</span>
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
