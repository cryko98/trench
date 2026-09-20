import { getSessionWallet } from "@/lib/auth";
import { getFeed, getTrendingCalls } from "@/lib/data";
import { Feed } from "@/components/Feed";
import { TrendingRail } from "@/components/TrendingRail";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const viewer = await getSessionWallet();
  const [posts, calls] = await Promise.all([
    getFeed(viewer, { limit: 50 }),
    getTrendingCalls(10),
  ]);

  const onlyCalls = posts.filter((p) => p.ca);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-black tracking-tight">
        Coin <span className="tf-gradient-text">calls</span>
      </h1>
      <p className="mb-6 text-sm text-muted">
        Every post with a contract address, scored against the market cap it was called at.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Feed
          initialPosts={onlyCalls}
          showComposer={false}
          onlyCalls
          emptyMessage="No calls yet. Head to the feed and post one."
        />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <TrendingRail calls={calls} />
        </div>
      </div>
    </div>
  );
}
