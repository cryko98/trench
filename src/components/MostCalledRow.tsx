"use client";

import type { TokenSnapshot } from "@/lib/types";
import { formatPct, formatUsd, ticker } from "@/lib/format";
import { CoinImage } from "./TokenCard";
import { useCoinViewer } from "./CoinViewer";

/** One row of the most-called rail; opens the coin window in place. */
export function MostCalledRow({
  ca,
  token,
  rank,
}: {
  ca: string;
  token: TokenSnapshot | null;
  rank: number;
}) {
  const viewer = useCoinViewer();

  return (
    <button
      onClick={() => viewer.open(ca)}
      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-surface-2/50"
    >
      <span className="w-3 font-mono text-[11px] font-bold text-muted">{rank}</span>
      <CoinImage token={token} size={30} className="tf-ring" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{ticker(token?.symbol)}</div>
        <div className="text-[11px] text-muted">{formatUsd(token?.marketCap ?? null)} MC</div>
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
    </button>
  );
}
