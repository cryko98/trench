"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "./ConnectButton";
import { NAV } from "./nav";
import { TokenBar } from "./TokenBar";

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
    <span className="hidden items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-2.5 py-1 md:inline-flex">
      <span className="tf-live-dot h-1.5 w-1.5 rounded-full bg-mint" />
      <span className="font-mono text-[11px] font-bold tracking-wide text-muted">SOL</span>
      <span className="font-mono text-[11px] font-bold tabular-nums text-mint-deep">
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
            "linear-gradient(90deg, transparent, rgba(144,255,208,0.45), rgba(144,64,240,0.5), transparent)",
        }}
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-60 blur-md transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle, rgba(144,64,240,0.6), rgba(144,255,208,0.3) 60%, transparent 75%)",
              }}
            />
            <Image
              src="/logo.png"
              alt="Trench Social"
              width={40}
              height={40}
              priority
              className="relative"
            />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[15px] font-bold tracking-tight">
              TRENCH <span className="text-mint-deep">SOCIAL</span>
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="rounded-full border-2 border-ink bg-sun px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-ink">
                $social
              </span>
              <span className="font-mono text-[9px] tracking-[0.12em] text-muted">SOLANA</span>
            </span>
          </span>
        </Link>

        <nav className="ml-1 hidden items-center gap-0.5 rounded-full border-2 border-ink bg-surface p-1 lg:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-3.5 ${
                  active
                    ? "border-2 border-ink bg-mint text-ink"
                    : "border-2 border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <TokenBar />
          <SolPrice />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
