"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const PLUGIN_SRC = "https://plugin.jup.ag/plugin-v1.js";

/** Asks the header to open our own wallet picker. */
export const CONNECT_WALLET_EVENT = "tf:connect-wallet";

/** Tells any open overlay of ours to step aside for the swap widget. */
export const CLOSE_OVERLAYS_EVENT = "tf:close-overlays";
const SOL_MINT = "So11111111111111111111111111111111111111112";

type JupiterPlugin = {
  init: (opts: Record<string, unknown>) => void;
  syncProps?: (opts: Record<string, unknown>) => void;
  resume?: () => void;
  close?: () => void;
};

declare global {
  interface Window {
    Jupiter?: JupiterPlugin;
  }
}

let loader: Promise<JupiterPlugin | null> | null = null;

/** Loads Jupiter's swap plugin once per tab. */
function loadPlugin(): Promise<JupiterPlugin | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Jupiter) return Promise.resolve(window.Jupiter);
  if (loader) return loader;

  loader = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = PLUGIN_SRC;
    script.async = true;
    script.onload = () => resolve(window.Jupiter ?? null);
    script.onerror = () => {
      loader = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return loader;
}

/**
 * Opens Jupiter's swap widget for one coin. The swap is built, signed and sent
 * by the visitor's own wallet — the site never holds funds or keys.
 */
export function BuyButton({
  mint,
  symbol,
  className = "tf-btn tf-btn-primary",
  label,
}: {
  mint: string;
  symbol?: string | null;
  className?: string;
  label?: string;
}) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);

  // Keep the widget's view of the wallet in step with ours.
  useEffect(() => {
    if (wallet.connected) {
      window.Jupiter?.syncProps?.({ passthroughWalletContextState: wallet });
    }
  }, [wallet]);

  const open = useCallback(async () => {
    setBusy(true);
    const plugin = await loadPlugin();
    setBusy(false);

    if (!plugin) {
      // Plugin blocked or offline — send them to Jupiter itself.
      window.open(`https://jup.ag/swap/SOL-${mint}`, "_blank", "noreferrer");
      return;
    }

    window.dispatchEvent(new Event(CLOSE_OVERLAYS_EVENT));

    // Hand over our wallet when one is connected; otherwise let the widget
    // run its own wallet picker, so a visitor can connect inside the swap.
    const connected = wallet.connected && Boolean(wallet.publicKey);

    plugin.init({
      displayMode: "modal",
      formProps: {
        initialInputMint: SOL_MINT,
        initialOutputMint: mint,
      },
      ...(connected
        ? {
            enableWalletPassthrough: true,
            passthroughWalletContextState: wallet,
            onRequestConnectWallet: () =>
              window.dispatchEvent(new Event(CONNECT_WALLET_EVENT)),
          }
        : {}),
    });
  }, [mint, wallet]);

  return (
    <button
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void open();
      }}
      disabled={busy}
      title={symbol ? `Swap SOL for ${symbol}` : "Swap on Jupiter"}
    >
      {busy ? "Opening…" : label ?? "Buy"}
    </button>
  );
}
