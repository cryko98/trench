import Link from "next/link";
import type { TokenSnapshot } from "@/lib/types";
import type { TopCall } from "@/lib/data";
import type { Graduating } from "@/lib/graduating";
import { formatMultiple, formatPct, formatUsd } from "@/lib/format";
import { CoinImage } from "./TokenCard";
import { GraduatingSoon } from "./GraduatingSoon";

export function TrendingRail({
  calls,
  topCalls = [],
  graduating = [],
}: {
  calls: { ca: string; token: TokenSnapshot | null }[];
  topCalls?: TopCall[];
  graduating?: Graduating[];
}) {
  return (
    <aside className="space-y-4">
      <GraduatingSoon initial={graduating} />

      {topCalls.length > 0 && (
        <div className="tf-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
            <h2 className="tf-label">Top calls</h2>
            <Link
              href="/top-calls"
              className="font-mono text-[10px] uppercase tracking-widest text-muted transition hover:text-mint"
            >
              All ↗
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {topCalls.map(({ post, multiple }, i) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.id}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-surface-2/50"
                >
                  <span className="w-3 font-mono text-[11px] font-bold text-muted">{i + 1}</span>
                  <CoinImage token={post.token} size={30} className="tf-ring" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      ${post.token?.symbol ?? post.callToken?.symbol ?? "???"}
                    </div>
                    <div className="truncate text-[11px] text-muted">by {post.profile.name}</div>
                  </div>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-xs font-black tabular-nums ${
                      multiple >= 1 ? "bg-mint/10 text-mint" : "bg-loss/10 text-loss"
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
        <h2 className="tf-label border-b border-line px-3.5 py-3">Most called</h2>
        {calls.length === 0 ? (
          <p className="px-3.5 py-5 text-sm text-muted">No calls yet. Post the first one.</p>
        ) : (
          <ul className="divide-y divide-line">
            {calls.map(({ ca, token }, i) => (
              <li key={ca}>
                <Link
                  href={`/coin/${ca}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-surface-2/50"
                >
                  <span className="w-3 font-mono text-[11px] font-bold text-muted">{i + 1}</span>
                  <CoinImage token={token} size={30} className="tf-ring" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">${token?.symbol ?? "???"}</div>
                    <div className="text-[11px] text-muted">
                      {formatUsd(token?.marketCap ?? null)} MC
                    </div>
                  </div>
                  {token?.bonding ? (
                    <span className="tf-chip tf-chip-lav">curve</span>
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

      <div className="tf-card p-3.5">
        <h2 className="tf-label">How it works</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          {[
            "Connect a Solana wallet — that is your account.",
            "Post anything, or switch to Coin call and paste a contract address.",
            "Your entry market cap is locked in, so the feed scores the call.",
            "Hold a coin? Join or open its community.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-mint/10 font-mono text-[10px] font-bold text-mint">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-muted">
          Data from DexScreener, Jupiter, pump.fun and Solana. Nothing here is financial advice.
        </p>
      </div>
    </aside>
  );
}
