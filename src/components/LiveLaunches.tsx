"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribePump, type Launch } from "@/lib/pumpPortal";
import { formatUsd } from "@/lib/format";
import { TimeAgo } from "./TimeAgo";

const KEEP = 8;

/** Live pump.fun launches, straight off PumpPortal's public websocket. */
export function LiveLaunches() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [migrated, setMigrated] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [solUsd, setSolUsd] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/sol-price")
        .then((r) => r.json() as Promise<{ solUsd: number | null }>)
        .then((j) => active && setSolUsd(j.solUsd))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    return subscribePump({
      onStatus: setConnected,
      onLaunch: (launch) =>
        setLaunches((prev) => [launch, ...prev.filter((l) => l.mint !== launch.mint)].slice(0, KEEP)),
      onMigration: (m) => setMigrated((prev) => [m.mint, ...prev].slice(0, 12)),
    });
  }, []);

  return (
    <div className="tf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 className="tf-label">Fresh launches</h2>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "tf-live-dot bg-mint" : "bg-muted"}`}
          />
          {connected ? "Live" : "Connecting"}
        </span>
      </div>

      {launches.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">
          Waiting for the next pump.fun launch…
        </p>
      ) : (
        <ul>
          {launches.map((l) => (
            <li key={l.mint}>
              <Link
                href={`/coin/${l.mint}`}
                className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface-2/60"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-mono text-[10px] font-black text-mint">
                  {l.symbol.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold">${l.symbol}</span>
                    {migrated.includes(l.mint) && (
                      <span className="tf-chip tf-chip-violet">migrated</span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted">{l.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-bold tabular-nums">
                    {solUsd && l.marketCapSol
                      ? formatUsd(l.marketCapSol * solUsd)
                      : l.marketCapSol
                        ? `${l.marketCapSol.toFixed(1)} SOL`
                        : "—"}
                  </div>
                  <TimeAgo ts={l.at} className="text-[10px] text-muted" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-line px-3 py-2 text-[10px] text-muted">
        Live feed from PumpPortal. Brand new coins are unaudited — do your own research.
      </p>
    </div>
  );
}
