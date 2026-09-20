"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import type { Profile } from "@/lib/types";

type AuthState = {
  profile: Profile | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = (await res.json()) as { profile: Profile | null };
      setProfile(json.profile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      loading,
      signingIn,
      error,
      needsSignIn: Boolean(connected && publicKey && !profile),
      signIn,
      signOut,
      refresh,
      setProfile,
    }),
    [profile, loading, signingIn, error, connected, publicKey, signIn, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
