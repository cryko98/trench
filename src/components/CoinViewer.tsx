"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { TokenSnapshot } from "@/lib/types";
import { formatPct, formatUsd, ticker } from "@/lib/format";
import { CoinImage, CopyAddress } from "./TokenCard";
import { CLOSE_OVERLAYS_EVENT } from "./BuyButton";
import { BuyButton } from "./BuyButton";

type ViewerState = { open: (ca: string) => void };

const Ctx = createContext<ViewerState | null>(null);

/** Opens the in-page coin window. */
export function useCoinViewer() {
  const ctx = useContext(Ctx);
  // Outside the provider (e.g. during SSR) the viewer is simply unavailable.
  return ctx ?? { open: () => undefined };
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="tf-inset px-2.5 py-2">
      <div className="tf-label tf-label-plain">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${className}`}>{value}</div>
    </div>
  );
}

function CoinModal({ ca, onClose }: { ca: string; onClose: () => void }) {
  const [token, setToken] = useState<TokenSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/token/${ca}`)
      .then((r) => r.json() as Promise<{ token: TokenSnapshot | null }>)
      .then((j) => {
        if (!active) return;
        setToken(j.token ?? null);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ca]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener(CLOSE_OVERLAYS_EVENT, onClose);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(CLOSE_OVERLAYS_EVENT, onClose);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const up = (token?.change24h ?? 0) >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="tf-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Coin details"
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <CoinImage token={token} size={44} className="tf-ring" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-lg font-bold">
                {loading ? "Loading…" : token ? ticker(token.symbol) : "Unknown coin"}
              </span>
              {token && <span className="truncate text-sm text-muted">{token.name}</span>}
              {token?.bonding && <span className="tf-chip tf-chip-lav">On curve</span>}
            </div>
            <CopyAddress address={ca} className="mt-1" />
          </div>
          <button
            onClick={onClose}
            className="tf-btn tf-btn-ghost h-8 w-8 !p-0 text-base"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            <Stat label="Market cap" value={formatUsd(token?.marketCap ?? null)} />
            {token?.bonding ? (
              <Stat
                label="Curve"
                value={token.progress === null ? "—" : `${token.progress.toFixed(1)}%`}
                className="text-mint-deep"
              />
            ) : (
              <Stat
                label="24h"
                value={formatPct(token?.change24h ?? null)}
                className={up ? "text-mint-deep" : "text-loss"}
              />
            )}
            <Stat label="Liquidity" value={formatUsd(token?.liquidity ?? null)} />
            <Stat label="Vol 24h" value={formatUsd(token?.volume24h ?? null)} />
          </div>

          {token?.bonding && token.progress !== null && (
            <div className="px-4 pb-3">
              <div className="tf-bar">
                <div
                  className="tf-bar-fill"
                  style={{ width: `${Math.max(2, Math.min(100, token.progress))}%` }}
                />
              </div>
            </div>
          )}

          {/* pump.fun refuses to be framed (X-Frame-Options), so the in-page
              chart comes from DexScreener's embeddable view. */}
          <div className="px-4 pb-4">
            <div className="tf-inset h-[380px] overflow-hidden">
              {loading ? (
                <div className="tf-skeleton h-full w-full" />
              ) : (
                <iframe
                  src={`https://dexscreener.com/solana/${ca}?embed=1&theme=dark&info=0&trades=0`}
                  className="h-full w-full border-0"
                  title="Price chart"
                  loading="lazy"
                />
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Chart by DexScreener. Coins with no pool yet show an empty chart.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
          <BuyButton mint={ca} symbol={token?.symbol} label={`Buy ${token ? ticker(token.symbol) : "coin"}`} />
          <a
            href={`https://pump.fun/coin/${ca}`}
            target="_blank"
            rel="noreferrer"
            className="tf-btn tf-btn-ghost"
          >
            pump.fun ↗
          </a>
          <a
            href={token?.pairUrl ?? `https://dexscreener.com/solana/${ca}`}
            target="_blank"
            rel="noreferrer"
            className="tf-btn tf-btn-ghost"
          >
            Full chart ↗
          </a>
          <Link href={`/coin/${ca}`} className="tf-btn tf-btn-ghost ml-auto" onClick={onClose}>
            Calls on this coin
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CoinViewerProvider({ children }: { children: React.ReactNode }) {
  const [ca, setCa] = useState<string | null>(null);
  const open = useCallback((address: string) => setCa(address), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {ca && <CoinModal ca={ca} onClose={() => setCa(null)} />}
    </Ctx.Provider>
  );
}
