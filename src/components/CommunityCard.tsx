"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommunityView } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { CoinImage } from "./TokenCard";
import { useAuth } from "./AuthContext";

/** Join button that checks the wallet's balance of the gating coin server-side. */
export function JoinButton({
  community,
  onChange,
  className = "",
}: {
  community: CommunityView;
  onChange?: (c: CommunityView) => void;
  className?: string;
}) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(community);

  const act = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${state.id}/join`, { method });
      const json = (await res.json()) as { community?: CommunityView; error?: string };
      if (!res.ok || !json.community) throw new Error(json.error ?? "Could not join");
      setState(json.community);
      onChange?.(json.community);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return <span className={`text-xs text-muted ${className}`}>Connect wallet to join</span>;
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      {state.isMember ? (
        <button
          className="tf-btn tf-btn-ghost"
          onClick={(e) => {
            e.preventDefault();
            void act("DELETE");
          }}
          disabled={busy}
        >
          {busy ? "…" : "Leave"}
        </button>
      ) : (
        <button
          className="tf-btn tf-btn-primary"
          onClick={(e) => {
            e.preventDefault();
            void act("POST");
          }}
          disabled={busy}
        >
          {busy ? "Checking wallet…" : "Join"}
        </button>
      )}
      {error && <span className="max-w-56 text-right text-[11px] text-loss">{error}</span>}
    </div>
  );
}

export function CommunityCard({ community }: { community: CommunityView }) {
  const [state, setState] = useState(community);

  return (
    <Link
      href={`/c/${state.id}`}
      className="tf-card flex items-center gap-3 p-3 transition hover:border-mint/40"
    >
      <CoinImage token={state.token} size={44} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="truncate font-bold">{state.name}</span>
          <span className="tf-chip">${state.token?.symbol ?? "???"}</span>
          {state.isMember && <span className="tf-chip tf-chip-mint">Member</span>}
          {state.token?.bonding && <span className="tf-chip tf-chip-violet">On curve</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {state.description || `Holders of $${state.token?.symbol ?? "this coin"} only`}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
          <span>
            <span className="font-bold text-foreground tabular-nums">{state.members}</span> members
          </span>
          <span>
            <span className="font-bold text-foreground tabular-nums">{state.posts}</span> posts
          </span>
          <span>{formatUsd(state.token?.marketCap ?? null)} MC</span>
          {state.minTokens > 0 && (
            <span className="text-violet">min {state.minTokens.toLocaleString()} tokens</span>
          )}
        </div>
      </div>

      <JoinButton community={state} onChange={setState} />
    </Link>
  );
}
