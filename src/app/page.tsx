import Image from "next/image";
import { getSessionWallet } from "@/lib/auth";
import { getFeed, getTopCalls, getTrendingCalls } from "@/lib/data";
import { Feed } from "@/components/Feed";
import { TrendingRail } from "@/components/TrendingRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getSessionWallet();
  const [posts, calls, topCalls] = await Promise.all([
    getFeed(viewer, { limit: 30 }),
    getTrendingCalls(),
    getTopCalls(5, 100),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="mb-5 flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
        <Image
          src="/logo.jpg"
          alt=""
          width={64}
          height={64}
          className="hidden rounded-xl sm:block"
        />
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">
            <span className="tf-neon">TRENCH</span> FEED
          </h1>
          <p className="tf-label mt-1 inline-block rounded border border-mint/30 px-2 py-1 text-mint">
            Posting from the trenches
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Wallet in, call a coin by its contract address — pump.fun bonding curve included — and
            the feed scores the call from the market cap you called it at.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Feed initialPosts={posts} />
        <div className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <TrendingRail calls={calls} topCalls={topCalls} />
        </div>
      </div>
    </div>
  );
}
