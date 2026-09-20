import { getSessionWallet } from "@/lib/auth";
import { getFeed, getTrendingCalls } from "@/lib/data";
import { Feed } from "@/components/Feed";
import { TrendingRail } from "@/components/TrendingRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getSessionWallet();
  const [posts, calls] = await Promise.all([getFeed(viewer, { limit: 30 }), getTrendingCalls()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface/60 p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          The trenches, <span className="tf-gradient-text">in one feed</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          Connect your Solana wallet, call a coin with its contract address, and the feed tracks the
          market cap from the moment you called it. The trenches reply below.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Feed initialPosts={posts} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <TrendingRail calls={calls} />
        </div>
      </div>
    </div>
  );
}
