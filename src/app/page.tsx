import Image from "next/image";
import Link from "next/link";
import { getSessionWallet } from "@/lib/auth";
import { getFeed, getStats, getTopCalls, getTrendingCalls } from "@/lib/data";
import { getGraduatingCoins } from "@/lib/graduating";
import { formatMultiple } from "@/lib/format";
import { Feed } from "@/components/Feed";
import { TrendingRail } from "@/components/TrendingRail";

export const dynamic = "force-dynamic";

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tf-inset px-3 py-2">
      <div className="tf-label tf-label-plain">{label}</div>
      <div className="mt-0.5 text-base font-black tabular-nums text-mint">{value}</div>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await getSessionWallet();
  const [posts, calls, topCalls, graduating, stats] = await Promise.all([
    getFeed(viewer, { limit: 30 }),
    getTrendingCalls(),
    getTopCalls(5, 100),
    getGraduatingCoins(5),
    getStats(),
  ]);

  const best = topCalls[0]?.multiple ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="tf-card relative overflow-hidden p-5 sm:p-6">
        {/* logo glow bleeding into the panel, like the banner artwork */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #90ffd0, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-[-6rem] h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #a090e0, transparent 70%)" }}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: "radial-gradient(circle, rgba(144,255,208,0.45), transparent 70%)" }}
            />
            <Image
              src="/logo.png"
              alt=""
              width={88}
              height={88}
              priority
              className="relative rounded-full"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-none tracking-tight sm:text-3xl">
              <span className="tf-neon">TRENCH</span> SOCIALS
            </h1>
            <p className="tf-label tf-label-plain mt-2 inline-block rounded border border-mint/25 bg-mint/5 px-2 py-1 text-mint">
              Posting from the trenches
            </p>
            <p className="mt-2.5 max-w-xl text-sm text-muted">
              Post anything, or call a coin by its contract address — pump.fun bonding curve
              included. Your entry market cap is locked in, so every call is scored in public.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat label="Posts" value={String(stats.posts)} />
          <HeroStat label="Calls" value={String(stats.calls)} />
          <HeroStat label="Best call" value={best ? formatMultiple(best) : "—"} />
          <Link href="/communities" className="tf-inset px-3 py-2 transition hover:border-mint/40">
            <div className="tf-label tf-label-plain">Communities</div>
            <div className="mt-0.5 text-base font-black tabular-nums text-mint">
              {stats.communities}
            </div>
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Feed initialPosts={posts} />
        <div className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <TrendingRail calls={calls} topCalls={topCalls} graduating={graduating} />
        </div>
      </div>
    </div>
  );
}
