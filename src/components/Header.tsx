"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "./ConnectButton";

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/top-calls", label: "Top calls" },
  { href: "/communities", label: "Communities" },
];

/** Live SOL price chip — the same cached number the coin cards use. */
function SolPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const run = () =>
      fetch("/api/sol-price")
        .then((r) => r.json() as Promise<{ solUsd: number | null }>)
        .then((j) => active && setPrice(j.solUsd))
        .catch(() => undefined);
    run();
    const id = setInterval(run, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!price) return null;

  return (
    <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface/80 px-2.5 py-1.5 md:inline-flex">
      <span className="tf-live-dot h-1.5 w-1.5 rounded-full bg-mint" />
      <span className="font-mono text-[11px] font-bold tracking-wide text-muted">SOL</span>
      <span className="font-mono text-[11px] font-black tabular-nums text-mint">
        ${price.toFixed(2)}
      </span>
    </span>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-xl">
      {/* hairline glow under the bar, echoing the logo's neon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(144,255,208,0.45), rgba(160,144,224,0.35), transparent)",
        }}
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-60 blur-md transition-opacity group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, rgba(144,255,208,0.55), transparent 70%)" }}
            />
            <Image
              src="/logo.png"
              alt="Trench Socials"
              width={40}
              height={40}
              priority
              className="relative rounded-full"
            />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[15px] font-black tracking-tight">
              TRENCH <span className="text-mint">SOCIALS</span>
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-mint/10 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-[0.18em] text-mint">
                $TS
              </span>
              <span className="font-mono text-[9px] tracking-[0.14em] text-muted">SOLANA</span>
            </span>
          </span>
        </Link>

        <nav className="ml-1 flex items-center gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface/60 p-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-bold transition sm:px-3 ${
                  active
                    ? "bg-mint/12 text-mint shadow-[0_0_20px_-8px_rgba(144,255,208,0.9)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SolPrice />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
