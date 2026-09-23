import Image from "next/image";
import Link from "next/link";
import { getSessionWallet } from "@/lib/auth";
import { getFeed, getStats, getTopCalls, getTrendingCalls } from "@/lib/data";
import { getGraduatingCoins } from "@/lib/graduating";
import { sweepRadar } from "@/lib/radar";
import { formatMultiple } from "@/lib/format";
import { Feed } from "@/components/Feed";
import { TrendingRail } from "@/components/TrendingRail";
import { RewardRail } from "@/components/RewardRail";
import { getRewardsSnapshot } from "@/lib/rewards";

export const dynamic = "force-dynamic";

function HeroStat({
  label,
  value,
  tone = "#fffaf1",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="tf-inset px-3 py-2.5" style={{ background: tone }}>
      <div className="tf-label tf-label-plain text-ink-soft">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await getSessionWallet();
  await sweepRadar().catch(() => undefined);
  const [posts, calls, topCalls, graduating, stats, rewards] = await Promise.all([
    getFeed(viewer, { limit: 30 }),
    getTrendingCalls(),
    getTopCalls(5, 100),
    getGraduatingCoins(5),
    getStats(),
    getRewardsSnapshot(),
  ]);

  // The board ranks by peak, so the headline number has to be the peak too.
  const best = topCalls[0]?.peakMultiple ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <section className="tf-card relative overflow-hidden p-5 sm:p-6">
        {/* flat sticker blobs, in the logo's colours */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-sun/60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-[-5rem] h-40 w-40 rounded-full bg-bubble/25"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Image
              src="/logo.png"
              alt=""
              width={88}
              height={88}
              priority
              className="relative"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-none tracking-tight sm:text-3xl">
              <span className="tf-neon">TRENCH</span> SOCIALS
            </h1>
            <p className="tf-chip tf-chip-sun mt-2 inline-flex">
              Posting from the trenches
            </p>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">
              Hang out, post whatever you like, and when you spot something — call it by its
              contract address. We save the market cap at that moment, so your call speaks for
              itself later.
            </p>
          </div>
        </div>

        <Link
          href="/rewards"
          className="tf-card tf-card-hover relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
          style={{ background: "#c7f6e4" }}
        >
          <span className="tf-chip tf-chip-mint">Daily rewards</span>
          <span className="text-sm font-bold text-ink">
            {rewards.payable === null
              ? "Call coins, get paid"
              : `${rewards.payable.toFixed(2)} SOL in today's pot`}
          </span>
          <span className="text-xs text-ink-soft">
            The $socials creator fees are split between the day&apos;s best callers.
          </span>
          <span className="ml-auto text-xs font-bold text-lav-deep">How it pays →</span>
        </Link>

        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat label="Posts" value={String(stats.posts)} />
          <HeroStat label="Calls" value={String(stats.calls)} tone="#c7f6e4" />
          <HeroStat label="Best call" value={best ? formatMultiple(best) : "—"} tone="#ffeaa1" />
          <Link
            href="/communities"
            className="tf-inset px-3 py-2.5 transition hover:brightness-95"
            style={{ background: "#e4d4ff" }}
          >
            <div className="tf-label tf-label-plain text-ink-soft">Communities</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.communities}</div>
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Feed initialPosts={posts} />
        </div>
        <div className="min-w-0 lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="space-y-4">
            <RewardRail rewards={rewards} />
            <TrendingRail calls={calls} topCalls={topCalls} graduating={graduating} />
          </div>
        </div>
      </div>
    </div>
  );
}
