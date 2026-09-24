import Link from "next/link";
import type { RewardsSnapshot } from "@/lib/rewards";
import { formatMultiple } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Who is in line for today's caller rewards. */
export function RewardRail({ rewards }: { rewards: RewardsSnapshot }) {
  const { board, epoch, places } = rewards;

  return (
    <div className="tf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <h2 className="tf-label">Daily caller rewards</h2>
        <Link
          href="/rewards"
          className="text-[11px] font-medium text-muted transition hover:text-mint-deep"
        >
          Rules ↗
        </Link>
      </div>

      <div className="px-3.5 py-3">
        <div className="text-base font-bold leading-snug">
          The day&apos;s best callers get rewarded.
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          Top {places} on the board · {epoch.label}
        </div>

        {board.length === 0 ? (
          <p className="mt-3 text-[11px] text-muted">
            No scoring calls yet today — the board resets at 00:00 UTC, so an early call counts.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {board.slice(0, 3).map((row, i) => (
              <li key={row.profile.wallet}>
                <Link
                  href="/rewards"
                  className="flex items-center gap-2 transition hover:opacity-80"
                >
                  <span className="w-3 font-mono text-[11px] font-bold text-muted">{i + 1}</span>
                  <Avatar profile={row.profile} size="xs" className="tf-ring" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">
                    {row.profile.name}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    best {formatMultiple(row.best)}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-mint-deep">
                    {row.score.toFixed(1)}x
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/rewards"
        className="flex items-center justify-between border-t border-line px-3.5 py-2.5 text-[11px] text-muted transition hover:text-mint-deep"
      >
        <span>Every call you post scores for today</span>
        <span>→</span>
      </Link>
    </div>
  );
}
