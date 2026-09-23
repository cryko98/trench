import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionWallet } from "@/lib/auth";
import { getCommunity, getFeed, hydrateCommunity } from "@/lib/data";
import { formatUsd, ticker } from "@/lib/format";
import { Feed } from "@/components/Feed";
import { JoinButton } from "@/components/CommunityCard";
import { CoinImage, CopyAddress } from "@/components/TokenCard";

export const dynamic = "force-dynamic";

export default async function CommunityPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const base = await getCommunity(id);
  if (!base) notFound();

  const viewer = await getSessionWallet();
  const [community, posts] = await Promise.all([
    hydrateCommunity(base, viewer),
    getFeed(viewer, { community: id, limit: 30 }),
  ]);

  const canPost = community.isMember;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/communities" className="text-sm text-muted transition hover:text-foreground">
        ← All communities
      </Link>

      <section className="tf-card p-4">
        <div className="flex items-start gap-3">
          <CoinImage token={community.token} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold">{community.name}</h1>
              <span className="tf-chip">{ticker(community.token?.symbol)}</span>
              {community.token?.bonding && (
                <span className="tf-chip tf-chip-lav">On curve</span>
              )}
            </div>
            {community.description && (
              <p className="mt-1 text-sm text-muted">{community.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>
                <span className="font-bold tabular-nums text-foreground">
                  {community.members}
                </span>{" "}
                members
              </span>
              <span>
                <span className="font-bold tabular-nums text-foreground">{community.posts}</span>{" "}
                posts
              </span>
              <span>{formatUsd(community.token?.marketCap ?? null)} MC</span>
              <CopyAddress address={community.ca} />
            </div>
            {community.minTokens > 0 && (
              <p className="mt-2 text-xs text-lav">
                Holding at least {community.minTokens.toLocaleString()} $
                {community.token?.symbol ?? "tokens"} is required.
              </p>
            )}
          </div>

          <JoinButton community={community} />
        </div>
      </section>

      {!canPost && (
        <div className="tf-card p-4 text-center text-sm text-muted">
          Only holders who joined can post here. Your balance is checked on Solana when you join.
        </div>
      )}

      <Feed
        initialPosts={posts}
        community={id}
        showComposer={canPost}
        title={`${community.name} feed`}
        composerPlaceholder={`Post to the $${community.token?.symbol ?? "coin"} community…`}
        emptyMessage="No posts in this community yet."
      />
    </div>
  );
}
