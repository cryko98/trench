import Link from "next/link";
import type { TopCall } from "@/lib/data";
import { formatMultiple, formatUsd, ticker } from "@/lib/format";
import { Avatar } from "./Avatar";
import { CoinImage, CopyAddress } from "./TokenCard";
import { TimeAgo } from "./TimeAgo";

function rankStyle(i: number) {
  if (i === 0) return "bg-mint text-mint-ink shadow-[0_0_16px_-4px_rgba(144,255,208,0.9)]";
  if (i === 1) return "bg-lav/20 text-lav";
  if (i === 2) return "bg-surface-2 text-mint";
  return "bg-surface-2 text-muted";
}

/** Leaderboard of the calls that ran the furthest since they were posted. */
export function TopCallsTable({ calls }: { calls: TopCall[] }) {
  if (calls.length === 0) {
    return (
      <div className="tf-card p-8 text-center text-sm text-muted">
        No scored calls yet. Post a contract address in the feed and it shows up here.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {calls.map(({ post, multiple, peakMultiple }, i) => (
        <li key={post.id}>
          <Link
            href={`/post/${post.id}`}
            className="tf-card tf-card-hover flex items-center gap-3 p-3"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums ${rankStyle(i)}`}
            >
              {i + 1}
            </span>

            <CoinImage token={post.token} size={38} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-bold">
                  {ticker(post.token?.symbol ?? post.callToken?.symbol)}
                </span>
                {post.token?.bonding && <span className="tf-chip tf-chip-lav">On curve</span>}
                <span className="text-xs text-muted">
                  {formatUsd(post.callMcap)} → {formatUsd(post.token?.marketCap ?? null)}
                </span>
                {post.peakMcap !== null && peakMultiple > multiple * 1.05 && (
                  <span className="text-xs text-lav">peak {formatUsd(post.peakMcap)}</span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Avatar profile={post.profile} size="xs" />
                  <span className="font-semibold text-foreground">{post.profile.name}</span>
                  <span>@{post.profile.handle}</span>
                </span>
                <span>·</span>
                <TimeAgo ts={post.createdAt} />
                {post.ca && <CopyAddress address={post.ca} />}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className="rounded-lg bg-lav/15 px-3 py-1.5 text-base font-black tabular-nums text-lav">
                {formatMultiple(peakMultiple)}
              </span>
              <div
                className={`mt-1 font-mono text-[10px] tabular-nums ${
                  multiple >= 1 ? "text-mint" : "text-loss"
                }`}
              >
                now {formatMultiple(multiple)}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
