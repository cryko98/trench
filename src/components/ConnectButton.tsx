"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "./AuthContext";
import { WalletModal } from "./WalletModal";
import { Avatar } from "./Avatar";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  const { connected, wallet, connect, connecting } = useWallet();
  const { profile, loading, signIn, signingIn, signOut, needsSignIn, error } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const autoSignIn = useRef(false);

  // Connect as soon as a wallet is picked in the modal.
  useEffect(() => {
    if (wallet && !connected && !connecting) {
      connect().catch(() => undefined);
    }
  }, [wallet, connected, connecting, connect]);

  // Then ask for the sign-in signature once, automatically.
  useEffect(() => {
    if (needsSignIn && !signingIn && !autoSignIn.current) {
      autoSignIn.current = true;
      void signIn();
    }
    if (!connected) autoSignIn.current = false;
  }, [needsSignIn, signingIn, signIn, connected]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  if (loading) {
    return <div className="h-9 w-32 animate-pulse rounded-xl bg-surface-2" />;
  }

  if (profile) {
    return (
      <div className="relative">
        <button
          className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pl-1 pr-3 transition hover:border-mint/50"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <Avatar profile={profile} size="sm" />
          <span className="max-w-28 truncate text-sm font-semibold">{profile.name}</span>
        </button>

        {menuOpen && (
          <div className="tf-card absolute right-0 z-40 mt-2 w-56 overflow-hidden p-1 text-sm">
            <div className="px-3 py-2">
              <div className="truncate font-semibold">@{profile.handle}</div>
              <div className="font-mono text-xs text-muted">{shortAddress(profile.wallet, 6)}</div>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              href={`/u/${profile.wallet}`}
              className="block rounded-lg px-3 py-2 hover:bg-surface-2"
            >
              My profile
            </Link>
            <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-surface-2">
              Edit profile
            </Link>
            <button
              className="block w-full rounded-lg px-3 py-2 text-left text-loss hover:bg-surface-2"
              onClick={() => void signOut()}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  if (connected && needsSignIn) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="hidden text-xs text-loss sm:inline">{error}</span>}
        <button className="tf-btn tf-btn-primary" onClick={() => void signIn()} disabled={signingIn}>
          {signingIn ? "Check wallet…" : "Sign in"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="tf-btn tf-btn-primary" onClick={() => setModalOpen(true)}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
