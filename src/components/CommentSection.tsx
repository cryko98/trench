"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommentView } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { Avatar } from "./Avatar";
import { TimeAgo } from "./TimeAgo";

export function CommentSection({
  postId,
  initialComments,
}: {
  postId: string;
  initialComments: CommentView[];
}) {
  const { profile } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const json = (await res.json()) as { comment?: CommentView; error?: string };
      if (!res.ok || !json.comment) throw new Error(json.error ?? "Could not comment");
      setComments((prev) => [...prev, json.comment!]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not comment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="tf-label px-1">
        Replies · {comments.length}
      </h2>

      {profile ? (
        <div className="tf-card flex gap-3 p-3">
          <Avatar profile={profile} size="sm" />
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
              }}
              rows={2}
              placeholder="Add your take"
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
            />
            {error && <p className="text-xs text-loss">{error}</p>}
            <div className="flex justify-end">
              <button
                className="tf-btn tf-btn-primary"
                onClick={() => void submit()}
                disabled={!text.trim() || busy}
              >
                {busy ? "Sending…" : "Reply"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="tf-card p-4 text-center text-sm text-muted">
          Connect your wallet to join in.
        </div>
      )}

      {comments.length === 0 ? (
        <div className="tf-card p-6 text-center text-sm text-muted">
          No replies yet — be the first.
        </div>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="tf-card flex gap-3 p-3">
              <Link href={`/u/${c.author}`}>
                <Avatar profile={c.profile} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <Link href={`/u/${c.author}`} className="font-bold hover:underline">
                    {c.profile.name}
                  </Link>
                  <span className="truncate text-muted">@{c.profile.handle}</span>
                  <span className="text-muted">·</span>
                  <TimeAgo ts={c.createdAt} className="text-muted" />
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {c.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
