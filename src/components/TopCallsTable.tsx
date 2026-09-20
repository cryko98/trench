import Link from "next/link";
import type { TopCall } from "@/lib/data";
import { formatMultiple, formatUsd } from "@/lib/format";
import { Avatar } from "./Avatar";
import { CoinImage, CopyAddress } from "./TokenCard";
import { TimeAgo } from "./TimeAgo";

function rankStyle(i: number) {
  if (i === 0) return "bg-mint text-mint-ink";
  if (i === 1) return "bg-violet/25 text-violet";
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
      {calls.map(({ post, multiple }, i) => (
        <li key={post.id}>
          <Link
            href={`/post/${post.id}`}
            className="tf-card flex items-center gap-3 p-3 transition hover:border-mint/40"
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
                  ${post.token?.symbol ?? post.callToken?.symbol ?? "???"}
                </span>
                {post.token?.bonding && <span className="tf-chip tf-chip-violet">On curve</span>}
                <span className="text-xs text-muted">
                  {formatUsd(post.callMcap)} → {formatUsd(post.token?.marketCap ?? null)}
                </span>
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

            <span
              className={`shrink-0 rounded-lg px-3 py-1.5 text-base font-black tabular-nums ${
                multiple >= 1 ? "bg-mint/10 text-mint" : "bg-loss/10 text-loss"
              }`}
            >
              {formatMultiple(multiple)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
