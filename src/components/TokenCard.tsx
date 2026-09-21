/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useCoinViewer } from "./CoinViewer";
import type { TokenSnapshot } from "@/lib/types";
import { callMultiple, formatMultiple, formatPct, formatUsd, shortAddress, ticker } from "@/lib/format";

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="tf-label">{label}</div>
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
      <span className={copied ? "text-mint" : ""}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}

export function CoinImage({
  token,
  size = 44,
  className = "",
}: {
  token: Pick<TokenSnapshot, "image" | "symbol"> | null;
  size?: number;
  className?: string;
}) {
  // A logo URL can still 404 or time out (IPFS), so keep the tile as a net.
  const [broken, setBroken] = useState(false);
  const src = token?.image;

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-lg bg-surface-2 object-cover ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size / 3 }}
      className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-2 font-black text-mint ${className}`}
    >
      {(token?.symbol ?? "?").replace(/^\$+/, "").slice(0, 2).toUpperCase()}
    </div>
  );
}

/**
 * The coin card under a call: live market cap plus how the call is doing
 * relative to the market cap it was posted at. Coins still on the pump.fun
 * bonding curve show curve progress instead of DEX stats.
 */
export function TokenCard({
  token,
  ca,
  callMcap,
  peakMcap = null,
}: {
  token: TokenSnapshot | null;
  ca: string;
  callMcap: number | null;
  /** Highest market cap seen since the call. */
  peakMcap?: number | null;
}) {
  const viewer = useCoinViewer();
  const multiple = callMultiple(callMcap, token?.marketCap ?? null);
  const peak = callMultiple(callMcap, peakMcap);
  const up = (token?.change24h ?? 0) >= 0;

  return (
    <div className="tf-inset mt-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <CoinImage token={token} />

        <div className="min-w-0 flex-1 basis-40">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              className="truncate font-bold transition hover:text-mint"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                viewer.open(ca);
              }}
            >
              {token ? ticker(token.symbol) : "Unknown coin"}
            </button>
            {token && <span className="truncate text-xs text-muted">{token.name}</span>}
            {token?.bonding && <span className="tf-chip tf-chip-lav">On curve</span>}
          </div>
          <CopyAddress address={ca} className="mt-1" />
        </div>

        {multiple !== null && (
          <div className="flex shrink-0 items-stretch gap-1.5 ml-auto">
            <div
              className={`rounded-lg px-2.5 py-1.5 text-center ${
                multiple >= 1 ? "bg-mint/10 text-mint" : "bg-loss/10 text-loss"
              }`}
            >
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                Now
              </div>
              <div className="text-sm font-black tabular-nums">{formatMultiple(multiple)}</div>
            </div>
            {peak !== null && peak > multiple * 1.05 && (
              <div className="rounded-lg bg-lav/15 px-2.5 py-1.5 text-center text-lav">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                  Peak
                </div>
                <div className="text-sm font-black tabular-nums">{formatMultiple(peak)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {token ? (
        token.bonding ? (
          <div className="border-t border-line px-3 py-2.5">
            <div className="flex items-end justify-between">
              <Stat label="Market cap" value={formatUsd(token.marketCap)} />
              <div className="text-right">
                <div className="tf-label">Bonding curve</div>
                <div className="text-sm font-black tabular-nums text-mint">
                  {token.progress === null ? "—" : `${token.progress.toFixed(1)}%`}
                </div>
              </div>
            </div>
            {token.progress !== null && (
              <div className="tf-bar mt-2">
                <div
                  className="tf-bar-fill"
                  style={{ width: `${Math.max(2, token.progress)}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 border-t border-line px-3 py-2.5 sm:grid-cols-4">
            <Stat label="Market cap" value={formatUsd(token.marketCap)} />
            <Stat
              label="24h"
              value={formatPct(token.change24h)}
              className={up ? "text-mint" : "text-loss"}
            />
            <Stat label="Liquidity" value={formatUsd(token.liquidity)} />
            <Stat label="Vol 24h" value={formatUsd(token.volume24h)} />
          </div>
        )
      ) : (
        <div className="border-t border-line px-3 py-2.5 text-xs text-muted">
          No market data for this address.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-muted">
        <span>
          Called at <span className="font-semibold text-foreground">{formatUsd(callMcap)}</span> MC
        </span>
        <div className="flex items-center gap-3">
          <button
            className="transition hover:text-mint"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              viewer.open(ca);
            }}
          >
            Chart
          </button>
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
