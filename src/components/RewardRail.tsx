import Link from "next/link";
import type { RewardsSnapshot } from "@/lib/rewards";
import { formatMultiple } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Today's reward pot and who is in line for it. */
export function RewardRail({ rewards }: { rewards: RewardsSnapshot }) {
  const { pool, payable, board, epoch } = rewards;

  return (
    <div className="tf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <h2 className="tf-label">Today&apos;s reward pot</h2>
        <Link
          href="/rewards"
          className="text-[11px] font-medium text-muted transition hover:text-mint"
        >
          Rules ↗
        </Link>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold tabular-nums text-mint">
              {payable === null ? "Soon" : `${payable.toFixed(2)} SOL`}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {pool === null
                ? "$socials creator fees go to the best callers"
                : `from ${pool.toFixed(2)} SOL collected · ${epoch.label}`}
            </div>
          </div>
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
                  <span className="text-xs font-bold tabular-nums text-mint">
                    {row.sol === null
                      ? `${(row.share * 100).toFixed(0)}%`
                      : `${row.sol.toFixed(2)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/rewards"
        className="flex items-center justify-between border-t border-line px-3.5 py-2.5 text-[11px] text-muted transition hover:text-mint"
      >
        <span>Every call you post scores for today</span>
        <span>→</span>
      </Link>
    </div>
  );
}
