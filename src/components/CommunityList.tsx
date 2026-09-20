"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommunityView, TokenSnapshot } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { CommunityCard } from "./CommunityCard";
import { CoinImage } from "./TokenCard";
import { formatUsd, isSolanaAddress } from "@/lib/format";

function CreateCommunity({ onCreated }: { onCreated: (c: CommunityView) => void }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ca, setCa] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minTokens, setMinTokens] = useState("");
  const [token, setToken] = useState<TokenSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (address: string) => {
    if (!isSolanaAddress(address)) {
      setToken(null);
      return;
    }
    try {
      const res = await fetch(`/api/token/${address}`);
      const json = (await res.json()) as { token: TokenSnapshot | null };
      setToken(json.token ?? null);
      if (json.token && !name) setName(json.token.symbol);
    } catch {
      setToken(null);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ca: ca.trim(),
          name,
          description,
          minTokens: Number(minTokens) || 0,
        }),
      });
      const json = (await res.json()) as { community?: CommunityView; error?: string };
      if (!res.ok || !json.community) throw new Error(json.error ?? "Could not create");
      onCreated(json.community);
      setOpen(false);
      setCa("");
      setName("");
      setDescription("");
      setMinTokens("");
      setToken(null);
      router.push(`/c/${json.community.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return (
      <div className="tf-card p-4 text-center text-sm text-muted">
        Connect your wallet to open a community for a coin you hold.
      </div>
    );
  }

  if (!open) {
    return (
      <button className="tf-btn tf-btn-primary w-full" onClick={() => setOpen(true)}>
        + Create a community
      </button>
    );
  }

  return (
    <div className="tf-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">New community</h2>
        <button className="text-muted hover:text-foreground" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <p className="text-xs text-muted">
        You need to hold the coin yourself. Anyone else holding it can then join and post.
      </p>

      <div>
        <label className="tf-label">Coin contract address</label>
        <input
          value={ca}
          onChange={(e) => {
            setCa(e.target.value);
            void lookup(e.target.value.trim());
          }}
          placeholder="Paste the CA…"
          spellCheck={false}
          className="tf-input mt-1 font-mono text-xs"
        />
      </div>

      {token && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5">
          <CoinImage token={token} size={36} />
          <div className="min-w-0 text-sm">
            <div className="truncate font-bold">
              ${token.symbol} <span className="font-normal text-muted">{token.name}</span>
            </div>
            <div className="text-xs text-muted">
              {formatUsd(token.marketCap)} MC{token.bonding ? " · on bonding curve" : ""}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="tf-label">Community name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder="e.g. BONK trenches"
          className="tf-input mt-1"
        />
      </div>

      <div>
        <label className="tf-label">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          placeholder="What is this community for?"
          className="tf-input mt-1"
        />
      </div>

      <div>
        <label className="tf-label">Minimum tokens to join (0 = any holder)</label>
        <input
          value={minTokens}
          onChange={(e) => setMinTokens(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          inputMode="decimal"
          className="tf-input mt-1"
        />
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <button
        className="tf-btn tf-btn-primary w-full"
        onClick={() => void create()}
        disabled={busy || !isSolanaAddress(ca.trim())}
      >
        {busy ? "Checking your balance…" : "Create community"}
      </button>
    </div>
  );
}

export function CommunityList({ initial }: { initial: CommunityView[] }) {
  const [communities, setCommunities] = useState(initial);

  return (
    <div className="space-y-4">
      <CreateCommunity onCreated={(c) => setCommunities((prev) => [c, ...prev])} />

      {communities.length === 0 ? (
        <div className="tf-card p-8 text-center text-sm text-muted">
          No communities yet. Open the first one for a coin you hold.
        </div>
      ) : (
        <div className="space-y-2">
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </div>
      )}
    </div>
  );
}
