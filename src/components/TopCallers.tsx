import Link from "next/link";
import type { Caller } from "@/lib/data";
import { formatMultiple } from "@/lib/format";
import { Avatar } from "./Avatar";

function medal(i: number) {
  if (i === 0) return "bg-mint text-mint-ink shadow-[0_0_16px_-4px_rgba(144,255,208,0.9)]";
  if (i === 1) return "bg-lav/25 text-lav";
  if (i === 2) return "bg-surface-3 text-mint";
  return "bg-surface-2 text-muted";
}

/** Wallets ranked by how their calls actually played out. */
export function TopCallers({ callers, compact = false }: { callers: Caller[]; compact?: boolean }) {
  if (callers.length === 0) {
    return (
      <div className="tf-card p-6 text-center text-sm text-muted">
        No scored callers yet — post a coin call and the board fills up.
      </div>
    );
  }

  return (
    <div className="tf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <h2 className="tf-label">Top callers</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          by avg peak
        </span>
      </div>

      <ul className="divide-y divide-line">
        {callers.map((caller, i) => (
          <li key={caller.profile.wallet}>
            <Link
              href={`/u/${caller.profile.wallet}`}
              className="flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-surface-2/50"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-black tabular-nums ${medal(i)}`}
              >
                {i + 1}
              </span>
              <Avatar profile={caller.profile} size="sm" className="tf-ring" />

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{caller.profile.name}</div>
                <div className="truncate text-[11px] text-muted">
                  @{caller.profile.handle} · {caller.calls}{" "}
                  {caller.calls === 1 ? "call" : "calls"}
                  {!compact && ` · ${Math.round(caller.hitRate * 100)}% hit 2x+`}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-black tabular-nums text-mint">
                  {formatMultiple(caller.average)}
                </div>
                <div className="font-mono text-[10px] text-muted">
                  best {formatMultiple(caller.best)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
