/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { Avatar } from "./Avatar";
import { extractCa, formatPct, formatUsd, isSolanaAddress } from "@/lib/format";
import type { PostView, TokenSnapshot } from "@/lib/types";

const MAX_LEN = 500;

export function Composer({
  onPosted,
  presetCa,
}: {
  onPosted: (post: PostView) => void;
  presetCa?: string;
}) {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [caInput, setCaInput] = useState(presetCa ?? "");
  const [resolved, setResolved] = useState<{ ca: string; token: TokenSnapshot | null } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // An explicit CA wins; otherwise pull one out of the text.
  const ca = useMemo(() => {
    const manual = caInput.trim();
    if (manual) return isSolanaAddress(manual) ? manual : extractCa(manual);
    return extractCa(text);
  }, [caInput, text]);

  // Debounced lookup of whatever address is currently in play.
  useEffect(() => {
    if (!ca) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      let token: TokenSnapshot | null = null;
      try {
        const res = await fetch(`/api/token/${ca}`);
        const json = (await res.json()) as { token: TokenSnapshot | null };
        token = json.token ?? null;
      } catch {
        token = null;
      }
      if (!cancelled) setResolved({ ca, token });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [ca]);

  // Only show market data that belongs to the address currently in the box.
  const shownToken = resolved && resolved.ca === ca ? resolved.token : null;
  const tokenLoading = Boolean(ca) && resolved?.ca !== ca;

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), ca }),
      });
      const json = (await res.json()) as { post?: PostView; error?: string };
      if (!res.ok || !json.post) throw new Error(json.error ?? "Could not post");
      onPosted(json.post);
      setText("");
      setCaInput(presetCa ?? "");
      setResolved(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post");
    } finally {
      setPosting(false);
    }
  };

  if (!profile) {
    return (
      <div className="tf-card p-5 text-center">
        <h2 className="text-base font-bold">Drop into the trenches</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your Solana wallet to post calls, and to reply to other degens.
        </p>
      </div>
    );
  }

  const remaining = MAX_LEN - text.length;

  return (
    <div className="tf-card p-4">
      <div className="flex gap-3">
        <Avatar profile={profile} />
        <div className="min-w-0 flex-1">
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
            rows={3}
            placeholder="What are you calling, anon? Paste a contract address…"
            className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted"
          />

          <input
            value={caInput}
            onChange={(e) => setCaInput(e.target.value)}
            placeholder="Contract address (optional)"
            spellCheck={false}
            className="tf-input mt-2 font-mono text-xs"
          />

          {ca && (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5">
              {shownToken?.image ? (
                <img src={shownToken.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="tf-gradient-bg flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-black/80">
                  {(shownToken?.symbol ?? "?").slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                {tokenLoading && !shownToken ? (
                  <span className="text-muted">Loading market data…</span>
                ) : shownToken ? (
                  <>
                    <div className="truncate font-bold">
                      ${shownToken.symbol} <span className="font-normal text-muted">{shownToken.name}</span>
                    </div>
                    <div className="text-xs text-muted">
                      Calling at{" "}
                      <span className="font-semibold text-foreground">
                        {formatUsd(shownToken.marketCap)}
                      </span>{" "}
                      MC ·{" "}
                      <span
                        className={
                          (shownToken.change24h ?? 0) >= 0 ? "text-sol-green" : "text-loss"
                        }
                      >
                        {formatPct(shownToken.change24h)} 24h
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-muted">
                    No market data for this address yet — it will still be attached.
                  </span>
                )}
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-loss">{error}</p>}

          <div className="mt-3 flex items-center justify-between">
            <span
              className={`text-xs tabular-nums ${remaining < 50 ? "text-loss" : "text-muted"}`}
            >
              {remaining}
            </span>
            <button
              className="tf-btn tf-btn-primary"
              onClick={() => void submit()}
              disabled={!text.trim() || posting}
            >
              {posting ? "Posting…" : ca ? "Post call" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
