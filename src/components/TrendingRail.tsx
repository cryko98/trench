/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { TokenSnapshot } from "@/lib/types";
import { formatPct, formatUsd } from "@/lib/format";

export function TrendingRail({
  calls,
}: {
  calls: { ca: string; token: TokenSnapshot | null }[];
}) {
  return (
    <aside className="space-y-4">
      <div className="tf-card overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted">
          Most called
        </h2>
        {calls.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted">No calls yet. Post the first one.</p>
        ) : (
          <ul>
            {calls.map(({ ca, token }, i) => (
              <li key={ca}>
                <Link
                  href={`/coin/${ca}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2/60"
                >
                  <span className="w-4 text-xs font-bold text-muted">{i + 1}</span>
                  {token?.image ? (
                    <img src={token.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="tf-gradient-bg flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-black/80">
                      {(token?.symbol ?? "?").slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">${token?.symbol ?? "???"}</div>
                    <div className="text-xs text-muted">{formatUsd(token?.marketCap ?? null)} MC</div>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      (token?.change24h ?? 0) >= 0 ? "text-sol-green" : "text-loss"
                    }`}
                  >
                    {formatPct(token?.change24h ?? null)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tf-card p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">How it works</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="text-foreground">1.</span> Connect a Solana wallet — that is your
            account.
          </li>
          <li>
            <span className="text-foreground">2.</span> Paste a contract address to call a coin.
          </li>
          <li>
            <span className="text-foreground">3.</span> Your entry market cap is locked in, so the
            feed shows how the call played out.
          </li>
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
          Market data by DexScreener. Nothing here is financial advice.
        </p>
      </div>
    </aside>
  );
}
