"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "./AuthContext";
import { WalletModal } from "./WalletModal";
import { Avatar } from "./Avatar";
import { shortAddress } from "@/lib/format";
import { CONNECT_WALLET_EVENT } from "./BuyButton";

export function ConnectButton() {
  const { connected, wallet, connect, connecting } = useWallet();
  const { profile, loading, signIn, signingIn, signOut, needsSignIn, error } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [connectError, setConnectError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const autoSignIn = useRef(false);
  const tried = useRef<string | null>(null);

  // Connect as soon as a wallet is picked in the modal — once per pick, or a
  // wallet that refuses would be asked again on every render.
  useEffect(() => {
    if (!wallet || connected || connecting) return;
    if (tried.current === wallet.adapter.name) return;
    tried.current = wallet.adapter.name;
    connect().catch((e: unknown) => {
      setConnectError(e instanceof Error ? e.message : "Could not reach the wallet");
    });
  }, [wallet, connected, connecting, connect]);

  // Opening the picker starts a fresh attempt, even for the same wallet.
  const openPicker = useCallback(() => {
    tried.current = null;
    setConnectError(null);
    setModalOpen(true);
  }, []);

  // Then ask for the sign-in signature once, automatically.
  useEffect(() => {
    if (needsSignIn && !signingIn && !autoSignIn.current) {
      autoSignIn.current = true;
      void signIn();
    }
    if (!connected) autoSignIn.current = false;
  }, [needsSignIn, signingIn, signIn, connected]);

  // The Jupiter swap widget asks us to open the wallet picker.
  useEffect(() => {
    window.addEventListener(CONNECT_WALLET_EVENT, openPicker);
    return () => window.removeEventListener(CONNECT_WALLET_EVENT, openPicker);
  }, [openPicker]);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Clear the sticky header, not just the button.
    const header = triggerRef.current?.closest("header")?.getBoundingClientRect();
    const top = Math.max(rect.bottom, header?.bottom ?? 0) + 8;
    setMenuPosition({ top, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    place();
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menuOpen, place]);

  const picker = <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />;

  if (loading) {
    return (
      <>
        <div className="h-9 w-32 animate-pulse rounded-xl bg-surface-2" />
        {picker}
      </>
    );
  }

  if (profile) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pl-1 pr-3 transition hover:border-mint/50"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <Avatar profile={profile} size="sm" />
          <span className="max-w-28 truncate text-sm font-semibold">{profile.name}</span>
        </button>

        {/* In a portal, anchored under the button: the header's backdrop-blur
            would otherwise paint over the top of the menu. */}
        {menuOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              // .tf-card sets position: relative, so pin it inline instead
              className="tf-card z-50 w-56 overflow-hidden p-1 text-sm"
              style={{ position: "fixed", top: menuPosition.top, right: menuPosition.right }}
              onClick={(e) => e.stopPropagation()}
            >
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
            </div>,
            document.body
          )}
        {picker}
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
        {picker}
      </div>
    );
  }

  // A retry has to come straight off a click: some browsers only let the
  // wallet raise its window while the user's gesture is still warm.
  const retry = () => {
    setConnectError(null);
    connect().catch((e: unknown) => {
      setConnectError(e instanceof Error ? e.message : "Could not reach the wallet");
    });
  };

  // A connection that came good makes the old error moot.
  const shownError = connected ? null : connectError;

  return (
    <>
      {shownError && wallet ? (
        <div className="flex items-center gap-2">
          <span
            className="hidden max-w-44 truncate text-xs text-loss lg:inline"
            title={shownError}
          >
            {shownError}
          </span>
          <button className="tf-btn tf-btn-primary" onClick={retry} disabled={connecting}>
            {connecting ? "Connecting…" : `Open ${wallet.adapter.name}`}
          </button>
        </div>
      ) : (
        <button className="tf-btn tf-btn-primary" onClick={openPicker}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
      )}
      {picker}
    </>
  );
}
