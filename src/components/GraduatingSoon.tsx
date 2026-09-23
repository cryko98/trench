"use client";

import { useCallback, useEffect, useState } from "react";
import { MIGRATION_SOL, type Graduating } from "@/lib/constants";
import { subscribePump } from "@/lib/pumpPortal";
import { formatUsd, ticker } from "@/lib/format";
import { CoinImage } from "./TokenCard";
import { useCoinViewer } from "./CoinViewer";

const REFRESH_MS = 45_000;

async function fetchGraduating(): Promise<Graduating[] | null> {
  try {
    const res = await fetch("/api/graduating?limit=5", { cache: "no-store" });
    const json = (await res.json()) as { coins?: Graduating[] };
    return json.coins ?? null;
  } catch {
    return null;
  }
}

/** The five pump.fun coins closest to graduating off the bonding curve. */
export function GraduatingSoon({ initial = [] }: { initial?: Graduating[] }) {
  const viewer = useCoinViewer();
  const [coins, setCoins] = useState<Graduating[]>(initial);
  const [migrated, setMigrated] = useState<string[]>([]);
  const [loading, setLoading] = useState(initial.length === 0);

  const load = useCallback(async () => {
    const rows = await fetchGraduating();
    if (rows) setCoins(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const run = () =>
      fetchGraduating().then((rows) => {
        if (!active) return;
        if (rows) setCoins(rows);
        setLoading(false);
      });
    if (initial.length === 0) run();
    const id = setInterval(run, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [initial.length]);

  // The live stream tells us the moment one of them actually graduates.
  useEffect(() => {
    return subscribePump({
      onMigration: (m) =>
        setCoins((current) => {
          if (!current.some((c) => c.mint === m.mint)) return current;
          setMigrated((prev) => [m.mint, ...prev].slice(0, 6));
          setTimeout(() => void load(), 4000);
          return current;
        }),
    });
  }, [load]);

  return (
    <div className="tf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <h2 className="tf-label">Closest to migration</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <span className="tf-live-dot h-1.5 w-1.5 rounded-full bg-mint" />
          Live
        </span>
      </div>

      {loading ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="tf-skeleton h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="tf-skeleton h-3 w-20 rounded" />
                <div className="tf-skeleton h-1.5 w-full rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : coins.length === 0 ? (
        <p className="px-3.5 py-5 text-sm text-muted">
          No coins near migration right now.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {coins.map((coin, i) => {
            const justMigrated = migrated.includes(coin.mint);
            return (
              <li key={coin.mint}>
                <button
                  onClick={() => viewer.open(coin.mint)}
                  className="block w-full px-3.5 py-2.5 text-left transition hover:bg-surface-2/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 shrink-0 font-mono text-[11px] font-bold text-muted">
                      {i + 1}
                    </span>
                    <CoinImage token={coin} size={32} className="tf-ring-violet" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{ticker(coin.symbol)}</span>
                        {justMigrated && <span className="tf-chip tf-chip-mint">migrated</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">{coin.name}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold tabular-nums text-mint">
                        {coin.progress.toFixed(1)}%
                      </div>
                      <div className="font-mono text-[10px] text-muted">
                        {formatUsd(coin.marketCap)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="tf-bar flex-1">
                      <div
                        className="tf-bar-fill"
                        style={{ width: `${Math.max(2, Math.min(100, coin.progress))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-muted">
                      {coin.solRaised.toFixed(1)}/{MIGRATION_SOL} SOL
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-line px-3.5 py-2 text-[10px] text-muted">
        Curve data from pump.fun and the chain. New coins are unaudited.
      </p>
    </div>
  );
}
