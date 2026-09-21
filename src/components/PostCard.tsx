"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PostView } from "@/lib/types";
import { Avatar } from "./Avatar";
import { TokenCard } from "./TokenCard";
import { TimeAgo } from "./TimeAgo";
import { useAuth } from "./AuthContext";
import { isSolanaAddress } from "@/lib/format";
import { RADAR_AUTHOR } from "@/lib/constants";
import { useCoinViewer } from "./CoinViewer";

/** Renders post text, turning contract addresses and links into chips. */
function PostText({ text }: { text: string }) {
  const viewer = useCoinViewer();
  const parts = text.split(/(\s+)/);
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        const bare = part.replace(/[.,!?;:()[\]]+$/g, "");
        if (isSolanaAddress(bare)) {
          return (
            <button
              key={i}
              className="font-mono text-sm text-mint hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                viewer.open(bare);
              }}
            >
              {bare.slice(0, 4)}…{bare.slice(-4)}
            </button>
          );
        }
        if (/^https?:\/\//i.test(bare)) {
          return (
            <a
              key={i}
              href={bare}
              target="_blank"
              rel="noreferrer"
              className="text-mint hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {bare.length > 40 ? `${bare.slice(0, 40)}…` : bare}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function PostCard({
  post,
  onDeleted,
  clickable = true,
}: {
  post: PostView;
  onDeleted?: (id: string) => void;
  clickable?: boolean;
}) {
  const router = useRouter();
  const { profile: me } = useAuth();
  const isRadar = post.author === RADAR_AUTHOR;
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(post.liked);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (!me || busy) return;
    setBusy(true);
    // Optimistic — the server is the source of truth on the way back.
    setLiked(!liked);
    setLikes(likes + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const json = (await res.json()) as { liked?: boolean; likes?: number };
      if (typeof json.liked === "boolean" && typeof json.likes === "number") {
        setLiked(json.liked);
        setLikes(json.likes);
      }
    } catch {
      setLiked(liked);
      setLikes(likes);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(post.id);
  };

  return (
    <article
      className={`tf-card p-4 ${clickable ? "tf-card-hover cursor-pointer" : ""}`}
      onClick={clickable ? () => router.push(`/post/${post.id}`) : undefined}
    >
      <div className="flex gap-3">
        {isRadar ? (
          <Avatar profile={post.profile} className="tf-ring" />
        ) : (
          <Link href={`/u/${post.author}`} onClick={(e) => e.stopPropagation()}>
            <Avatar profile={post.profile} className="tf-ring" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            {isRadar ? (
              <span className="truncate font-bold">{post.profile.name}</span>
            ) : (
              <Link
                href={`/u/${post.author}`}
                className="truncate font-bold hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {post.profile.name}
              </Link>
            )}
            {isRadar ? (
              <span className="tf-chip tf-chip-mint">Radar</span>
            ) : (
              <span className="truncate text-muted">@{post.profile.handle}</span>
            )}
            <span className="text-muted">·</span>
            <TimeAgo ts={post.createdAt} className="text-muted" />
            {post.ca && !isRadar && (
              <span className="tf-chip tf-chip-lav ml-1">
                Call
              </span>
            )}
            {!isRadar && me?.wallet === post.author && (
              <button
                className="ml-auto text-xs text-muted hover:text-loss"
                onClick={(e) => {
                  e.stopPropagation();
                  void remove();
                }}
              >
                Delete
              </button>
            )}
          </div>

          <div className="mt-1.5">
            <PostText text={post.text} />
          </div>

          {post.radar?.postId && (
            <Link
              href={`/post/${post.radar.postId}`}
              className="mt-1 inline-block text-xs text-muted transition hover:text-mint"
              onClick={(e) => e.stopPropagation()}
            >
              see the original call →
            </Link>
          )}

          {post.ca && (
            <TokenCard
              token={post.token}
              ca={post.ca}
              callMcap={post.callMcap}
              peakMcap={post.peakMcap}
            />
          )}

          <div className="mt-3 flex items-center gap-5 text-sm text-muted">
            <button
              className={`inline-flex items-center gap-1.5 transition hover:text-mint ${
                liked ? "text-mint" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                void toggleLike();
              }}
              disabled={!me}
              title={me ? "Like" : "Sign in to like"}
            >
              <span>{liked ? "▲" : "△"}</span>
              <span className="tabular-nums">{likes}</span>
            </button>

            <Link
              href={`/post/${post.id}`}
              className="inline-flex items-center gap-1.5 transition hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <span>💬</span>
              <span className="tabular-nums">{post.comments}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
