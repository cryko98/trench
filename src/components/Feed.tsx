"use client";

import { useCallback, useEffect, useState } from "react";
import type { PostView } from "@/lib/types";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";

const REFRESH_MS = 45_000;

export function Feed({
  initialPosts,
  wallet,
  ca,
  showComposer = true,
  onlyCalls = false,
  emptyMessage = "Nothing here yet. Be the first to call something.",
}: {
  initialPosts: PostView[];
  wallet?: string;
  ca?: string;
  showComposer?: boolean;
  /** Keep only posts that carry a contract address. */
  onlyCalls?: boolean;
  emptyMessage?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [refreshing, setRefreshing] = useState(false);

  const query = useCallback(() => {
    const params = new URLSearchParams({ limit: "30" });
    if (wallet) params.set("wallet", wallet);
    if (ca) params.set("ca", ca);
    return params.toString();
  }, [wallet, ca]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/posts?${query()}`, { cache: "no-store" });
      const json = (await res.json()) as { posts?: PostView[] };
      if (json.posts) setPosts(onlyCalls ? json.posts.filter((p) => p.ca) : json.posts);
    } catch {
      /* keep what we have */
    } finally {
      setRefreshing(false);
    }
  }, [query, onlyCalls]);

  // Keep market caps and new posts flowing in.
  useEffect(() => {
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-4">
      {showComposer && (
        <Composer
          presetCa={ca}
          onPosted={(post) => setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)])}
        />
      )}

      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Live feed</h2>
        <button
          className="text-xs text-muted transition hover:text-foreground"
          onClick={() => void load()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="tf-card p-8 text-center text-sm text-muted">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
