"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { Avatar } from "./Avatar";
import { CoinImage } from "./TokenCard";
import { extractCa, formatPct, formatUsd, isSolanaAddress, ticker } from "@/lib/format";
import type { PostView, TokenSnapshot } from "@/lib/types";

const MAX_LEN = 500;
const MAX_IMAGE_PX = 1440;

/** Shrinks a picked image so uploads stay small; GIFs pass through intact. */
async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_PX / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  return blob ?? file;
}

type Mode = "post" | "call";

export function Composer({
  onPosted,
  presetCa,
  communityId,
  placeholder = "What's on your mind?",
}: {
  onPosted: (post: PostView) => void;
  presetCa?: string;
  /** Posts go into this token-gated community instead of the global feed. */
  communityId?: string;
  placeholder?: string;
}) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>(presetCa ? "call" : "post");
  const [text, setText] = useState("");
  const [caInput, setCaInput] = useState(presetCa ?? "");
  const [resolved, setResolved] = useState<{ ca: string; token: TokenSnapshot | null } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // A coin is only attached in call mode: an explicit address wins, otherwise
  // one pasted into the text is picked up as a convenience.
  const ca = useMemo(() => {
    if (mode !== "call") return null;
    const manual = caInput.trim();
    if (manual) return isSolanaAddress(manual) ? manual : extractCa(manual);
    return extractCa(text);
  }, [mode, caInput, text]);

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
        body: JSON.stringify({ text: text.trim(), ca, communityId, image }),
      });
      const json = (await res.json()) as { post?: PostView; error?: string };
      if (!res.ok || !json.post) throw new Error(json.error ?? "Could not post");
      onPosted(json.post);
      setText("");
      setCaInput(presetCa ?? "");
      setResolved(null);
      setImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post");
    } finally {
      setPosting(false);
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      const form = new FormData();
      form.append("file", prepared, file.name.replace(/.[^.]+$/, "") + (prepared.type === "image/gif" ? ".gif" : ".jpg"));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setImage(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) {
    return (
      <div className="tf-card p-5 text-center">
        <h2 className="text-base font-bold">Welcome to the trenches</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your Solana wallet and you are in — post, call coins, reply to anyone. It takes
          one signature and costs nothing.
        </p>
      </div>
    );
  }

  const remaining = MAX_LEN - text.length;
  const missingCa = mode === "call" && !ca;

  return (
    <div className="tf-card p-4">
      <div className="flex gap-3">
        <Avatar profile={profile} />
        <div className="min-w-0 flex-1">
          {/* Plain thoughts by default; call mode attaches a coin. */}
          <div className="mb-2 inline-flex rounded-full bg-surface-2 p-1 text-xs font-semibold">
            <button
              className={`rounded-full px-3.5 py-1.5 transition ${
                mode === "post" ? "bg-background text-foreground" : "text-muted hover:text-foreground"
              }`}
              onClick={() => setMode("post")}
            >
              Post
            </button>
            <button
              className={`rounded-full px-3.5 py-1.5 transition ${
                mode === "call" ? "bg-mint text-mint-ink" : "text-muted hover:text-foreground"
              }`}
              onClick={() => setMode("call")}
            >
              Coin call
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
            rows={3}
            placeholder={
              mode === "call" ? "Why is this one sending? Add your callout…" : placeholder
            }
            className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted"
          />

          {mode === "call" && (
            <>
              <input
                value={caInput}
                onChange={(e) => setCaInput(e.target.value)}
                placeholder="Paste a contract address — pump.fun, PumpSwap, Raydium…"
                spellCheck={false}
                className="tf-input mt-2 font-mono text-xs"
              />

              <p className="mt-1.5 text-[11px] text-muted">
                This call scores for today&apos;s reward pot.{" "}
                <Link href="/rewards" className="text-mint-deep hover:underline">
                  How it pays →
                </Link>
              </p>

              {ca && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-background/60 p-2.5">
                  <CoinImage token={shownToken} size={36} />
                  <div className="min-w-0 flex-1 text-sm">
                    {tokenLoading && !shownToken ? (
                      <span className="text-muted">Loading market data…</span>
                    ) : shownToken ? (
                      <>
                        <div className="flex items-center gap-2 truncate font-bold">
                          {ticker(shownToken.symbol)}
                          <span className="font-normal text-muted">{shownToken.name}</span>
                          {shownToken.bonding && (
                            <span className="tf-chip tf-chip-lav">On curve</span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          Calling at{" "}
                          <span className="font-semibold text-foreground">
                            {formatUsd(shownToken.marketCap)}
                          </span>{" "}
                          MC
                          {shownToken.change24h !== null && (
                            <>
                              {" · "}
                              <span
                                className={
                                  (shownToken.change24h ?? 0) >= 0 ? "text-mint-deep" : "text-loss"
                                }
                              >
                                {formatPct(shownToken.change24h)} 24h
                              </span>
                            </>
                          )}
                          {shownToken.bonding && shownToken.progress !== null && (
                            <> · curve {shownToken.progress.toFixed(1)}%</>
                          )}
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
            </>
          )}

          {image && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="max-h-72 w-full object-cover" />
              <button
                className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-foreground backdrop-blur"
                onClick={() => setImage(null)}
              >
                Remove
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-loss">{error}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="tf-btn tf-btn-ghost !px-2.5 !py-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Attach an image"
              >
                {uploading ? "Uploading…" : "🖼 Image"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  void pickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className={`text-xs tabular-nums ${remaining < 50 ? "text-loss" : "text-muted"}`}>
                {missingCa ? "Paste a contract address" : remaining}
              </span>
            </div>
            <button
              className="tf-btn tf-btn-primary"
              onClick={() => void submit()}
              disabled={!text.trim() || posting || missingCa}
            >
              {posting ? "Posting…" : mode === "call" ? "Post call" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
