"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import type { Profile } from "@/lib/types";

type AuthState = {
  profile: Profile | null;
  /** Signed in as the moderating wallet: may remove anyone's post. */
  admin: boolean;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  /** Wallet is connected but the session is not established yet. */
  needsSignIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (p: Profile) => void;
};

const Ctx = createContext<AuthState | null>(null);

type Me = { profile: Profile | null; admin: boolean };

/** Reads the session-backed profile, or null when signed out. */
async function loadMe(): Promise<Me> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = (await res.json()) as Partial<Me>;
    return { profile: json.profile ?? null, admin: json.admin === true };
  } catch {
    return { profile: null, admin: false };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await loadMe();
    setProfile(next.profile);
    setAdmin(next.admin);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    loadMe().then((next) => {
      if (!active) return;
      setProfile(next.profile);
      setAdmin(next.admin);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that can sign messages");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();

      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const { message, error: nonceError } = (await nonceRes.json()) as {
        message?: string;
        error?: string;
      };
      if (!message) throw new Error(nonceError ?? "Could not start sign in");

      const signature = await signMessage(new TextEncoder().encode(message));

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, signature: bs58.encode(signature) }),
      });
      const verify = (await verifyRes.json()) as { profile?: Profile; error?: string };
      if (!verifyRes.ok || !verify.profile) throw new Error(verify.error ?? "Sign in failed");

      setProfile(verify.profile);
      // Whether this wallet moderates is the server's call, so ask it.
      setAdmin((await loadMe()).admin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      setError(msg.includes("User rejected") ? "Signature rejected" : msg);
    } finally {
      setSigningIn(false);
    }
  }, [publicKey, signMessage]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfile(null);
    setAdmin(false);
    try {
      await disconnect();
    } catch {
      /* wallet may already be gone */
    }
  }, [disconnect]);

  // Session belongs to a different wallet than the one now connected.
  useEffect(() => {
    if (!connected || !publicKey || !profile) return;
    if (profile.wallet !== publicKey.toBase58()) {
      void fetch("/api/auth/logout", { method: "POST" }).then(() => setProfile(null));
    }
  }, [connected, publicKey, profile]);

  const value = useMemo<AuthState>(
    () => ({
      profile,
      admin,
      loading,
      signingIn,
      error,
      needsSignIn: Boolean(connected && publicKey && !profile),
      signIn,
      signOut,
      refresh,
      setProfile,
    }),
    [profile, admin, loading, signingIn, error, connected, publicKey, signIn, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
