import Link from "next/link";
import type { TokenSnapshot } from "@/lib/types";
import type { TopCall } from "@/lib/data";
import { formatMultiple, formatPct, formatUsd } from "@/lib/format";
import { CoinImage } from "./TokenCard";
import { LiveLaunches } from "./LiveLaunches";

export function TrendingRail({
  calls,
  topCalls = [],
}: {
  calls: { ca: string; token: TokenSnapshot | null }[];
  topCalls?: TopCall[];
}) {
  return (
    <aside className="space-y-4">
      <LiveLaunches />

      {topCalls.length > 0 && (
        <div className="tf-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h2 className="tf-label">Top calls</h2>
            <Link href="/top-calls" className="text-[11px] text-muted hover:text-mint">
              All ↗
            </Link>
          </div>
          <ul>
            {topCalls.map(({ post, multiple }, i) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface-2/60"
                >
                  <span className="w-3 text-[11px] font-bold text-muted">{i + 1}</span>
                  <CoinImage token={post.token} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      ${post.token?.symbol ?? post.callToken?.symbol ?? "???"}
                    </div>
                    <div className="truncate text-[11px] text-muted">by {post.profile.name}</div>
                  </div>
                  <span
                    className={`text-xs font-black tabular-nums ${
                      multiple >= 1 ? "text-mint" : "text-loss"
                    }`}
                  >
                    {formatMultiple(multiple)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tf-card overflow-hidden">
        <h2 className="tf-label border-b border-line px-3 py-2.5">Most called</h2>
        {calls.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted">No calls yet. Post the first one.</p>
        ) : (
          <ul>
            {calls.map(({ ca, token }, i) => (
              <li key={ca}>
                <Link
                  href={`/coin/${ca}`}
                  className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface-2/60"
                >
                  <span className="w-3 text-[11px] font-bold text-muted">{i + 1}</span>
                  <CoinImage token={token} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">${token?.symbol ?? "???"}</div>
                    <div className="text-[11px] text-muted">
                      {formatUsd(token?.marketCap ?? null)} MC
                    </div>
                  </div>
                  {token?.bonding ? (
                    <span className="tf-chip tf-chip-violet">curve</span>
                  ) : (
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        (token?.change24h ?? 0) >= 0 ? "text-mint" : "text-loss"
                      }`}
                    >
                      {formatPct(token?.change24h ?? null)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tf-card p-3">
        <h2 className="tf-label">How it works</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>
            <span className="text-mint">1.</span> Connect a Solana wallet — that is your account.
          </li>
          <li>
            <span className="text-mint">2.</span> Paste a contract address to call a coin, on a DEX
            or still on the pump.fun curve.
          </li>
          <li>
            <span className="text-mint">3.</span> Your entry market cap is locked in, so the feed
            shows how the call played out.
          </li>
          <li>
            <span className="text-mint">4.</span> Hold a coin? Join or open its community.
          </li>
        </ul>
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">
          Market data by DexScreener, Jupiter and pump.fun. Nothing here is financial advice.
        </p>
      </div>
    </aside>
  );
}
