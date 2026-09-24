"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/format";

const CA = process.env.NEXT_PUBLIC_TOKEN_CA ?? "";
const X_URL = process.env.NEXT_PUBLIC_X_URL ?? "";

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Contract address and socials for $social itself. */
export function TokenBar() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!CA) return;
    void navigator.clipboard.writeText(CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {CA ? (
        <button
          onClick={copy}
          title={CA}
          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink transition hover:bg-mint-soft"
        >
          <span className="hidden sm:inline">CA</span>
          <span>{shortAddress(CA, 4)}</span>
          <span className="opacity-70">{copied ? "copied" : "copy"}</span>
        </button>
      ) : (
        <span
          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink"
          title="The contract address goes live at launch"
        >
          CA<span className="text-lav-deep">coming soon</span>
        </span>
      )}

      {X_URL ? (
        <a
          href={X_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Trench Social on X"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-ink bg-surface text-ink transition hover:bg-sun"
        >
          <XLogo />
        </a>
      ) : (
        <span
          aria-label="X account coming soon"
          title="X account coming soon"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-ink/30 bg-surface/60 text-muted"
        >
          <XLogo />
        </span>
      )}
    </div>
  );
}
