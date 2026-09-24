"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { AuthProvider } from "./AuthContext";
import { CoinViewerProvider } from "./CoinViewer";

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("mainnet-beta"),
    []
  );

  /*
   * Most wallets announce themselves through the Wallet Standard, and those
   * need no adapter here. That announcement is an event the extension fires
   * into the page, though, and not every browser build gets it across —
   * Firefox users were left with an empty picker. These adapters talk to the
   * provider the extension injects instead, so the big wallets work either
   * way; a wallet that did register is dropped from this list, so nothing
   * shows up twice.
   */
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <AuthProvider>
          <CoinViewerProvider>{children}</CoinViewerProvider>
        </AuthProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
