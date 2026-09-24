/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";

const INSTALL_LINKS = [
  { name: "Phantom", url: "https://phantom.app/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/download" },
];

/** Phones have no extensions: the wallet's own browser opens the site instead. */
function mobileLinks(): { name: string; url: string }[] {
  if (typeof window === "undefined") return [];
  const here = window.location.href;
  return [
    {
      name: "Phantom",
      url: `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(
        window.location.origin
      )}`,
    },
    {
      name: "Solflare",
      url: `https://solflare.com/ul/v1/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(
        window.location.origin
      )}`,
    },
  ];
}

function isPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets, select } = useWallet();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Rendered only on click, but guard anyway so SSR never touches document.
  if (!open || typeof document === "undefined") return null;

  const available = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable
  );
  const phone = isPhone();
  const fallback = phone ? mobileLinks() : INSTALL_LINKS;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="tf-card my-auto w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Connect a wallet"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">Connect wallet</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Your wallet is your account. No email, no password.
        </p>

        {available.length > 0 ? (
          <ul className="space-y-2">
            {available.map((w) => (
              <li key={w.adapter.name}>
                <button
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-surface-2 px-3 py-3 text-left transition hover:bg-sun"
                  onClick={() => {
                    select(w.adapter.name);
                    onClose();
                  }}
                >
                  <img src={w.adapter.icon} alt="" className="h-7 w-7 rounded-md" />
                  <span className="font-semibold">{w.adapter.name}</span>
                  <span className="ml-auto text-xs text-muted">
                    {w.readyState === WalletReadyState.Installed ? "Detected" : "Available"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {phone
                ? "No wallet in this browser — open the site inside your wallet's own browser and you are in."
                : "No Solana wallet found in this browser. Install one, then reload the page."}
            </p>
            <ul className="space-y-2">
              {fallback.map((l) => (
                <li key={l.name}>
                  <a
                    href={l.url}
                    target={phone ? undefined : "_blank"}
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border-2 border-ink bg-surface-2 px-3 py-3 text-sm font-semibold transition hover:bg-sun"
                  >
                    {l.name} <span className="text-muted">{phone ? "Open ↗" : "Install ↗"}</span>
                  </a>
                </li>
              ))}
            </ul>
            {!phone && (
              <p className="text-[11px] text-muted">
                Already have one? Some browsers only hand the wallet to the page after a reload —
                give the page a refresh and try again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
