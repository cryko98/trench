/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { TokenSnapshot } from "@/lib/types";
import { callMultiple, formatMultiple, formatPct, formatUsd, shortAddress } from "@/lib/format";

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${className}`}>{value}</div>
    </div>
  );
}

export function CopyAddress({ address, className = "" }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={`inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted transition hover:text-foreground ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void navigator.clipboard.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      title={address}
    >
      {shortAddress(address, 5)}
      <span className={copied ? "text-sol-green" : ""}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}

/**
 * The coin card under a call: live market cap plus how the call is doing
 * relative to the market cap it was posted at.
 */
export function TokenCard({
  token,
  ca,
  callMcap,
  compact = false,
}: {
  token: TokenSnapshot | null;
  ca: string;
  callMcap: number | null;
  compact?: boolean;
}) {
  const multiple = callMultiple(callMcap, token?.marketCap ?? null);
  const up = (token?.change24h ?? 0) >= 0;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface-2/60">
      <div className="flex items-center gap-3 p-3">
        {token?.image ? (
          <img src={token.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
        ) : (
          <div className="tf-gradient-bg flex h-11 w-11 items-center justify-center rounded-lg text-sm font-black text-black/80">
            {(token?.symbol ?? "?").slice(0, 2)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/coin/${ca}`}
              className="truncate font-bold hover:text-sol-green"
              onClick={(e) => e.stopPropagation()}
            >
              {token ? `$${token.symbol}` : "Unknown coin"}
            </Link>
            {token && <span className="truncate text-xs text-muted">{token.name}</span>}
          </div>
          <CopyAddress address={ca} className="mt-1" />
        </div>

        {multiple !== null && (
          <div
            className={`rounded-lg px-2.5 py-1.5 text-center ${
              multiple >= 1 ? "bg-sol-green/10 text-sol-green" : "bg-loss/10 text-loss"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Since call
            </div>
            <div className="text-sm font-black tabular-nums">{formatMultiple(multiple)}</div>
          </div>
        )}
      </div>

      {token ? (
        <div className="grid grid-cols-2 gap-3 border-t border-line px-3 py-2.5 sm:grid-cols-4">
          <Stat label="Market cap" value={formatUsd(token.marketCap)} />
          <Stat
            label="24h"
            value={formatPct(token.change24h)}
            className={up ? "text-sol-green" : "text-loss"}
          />
          {!compact && <Stat label="Liquidity" value={formatUsd(token.liquidity)} />}
          {!compact && <Stat label="Vol 24h" value={formatUsd(token.volume24h)} />}
        </div>
      ) : (
        <div className="border-t border-line px-3 py-2.5 text-xs text-muted">
          No market data yet — the coin may still be on the bonding curve.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-muted">
        <span>
          Called at <span className="font-semibold text-foreground">{formatUsd(callMcap)}</span> MC
        </span>
        <div className="flex items-center gap-3">
          <a
            href={token?.pairUrl ?? `https://dexscreener.com/solana/${ca}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            Chart ↗
          </a>
          <a
            href={`https://pump.fun/coin/${ca}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            pump.fun ↗
          </a>
        </div>
      </div>
    </div>
  );
}
