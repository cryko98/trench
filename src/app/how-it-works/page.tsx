import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "How it works — Trench Socials",
  description:
    "Everything you can do on Trench Socials: connect a wallet, post, call coins, buy them, open token-gated communities and get scored on your calls.",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-mint/10 font-mono text-[11px] font-bold text-mint">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold">{title}</h3>
        <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tf-card p-5">
      <span className="tf-label">{label}</span>
      <h2 className="mt-3 text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <section className="tf-card relative overflow-hidden p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #90ffd0, transparent 70%)" }}
        />
        <div className="relative flex items-center gap-4">
          <Image src="/logo.png" alt="" width={64} height={64} />
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              How <span className="tf-neon">Trench Socials</span> works
            </h1>
            <p className="mt-1 text-sm text-muted">
              A feed for the Solana trenches: post, call coins, and let the market score you in
              public.
            </p>
          </div>
        </div>
      </section>

      <Section label="Getting in" title="Your wallet is your account">
        <ol className="space-y-4">
          <Step n={1} title="Connect">
            Hit <span className="text-foreground">Connect wallet</span> and pick Phantom, Solflare,
            Backpack or any other Solana wallet in your browser.
          </Step>
          <Step n={2} title="Sign a message">
            You sign one short message to prove the wallet is yours. It is free, it is not a
            transaction, and nothing leaves your wallet. No email, no password.
          </Step>
          <Step n={3} title="Set up your profile">
            Open <Link href="/settings" className="text-mint hover:underline">Edit profile</Link> to
            pick a display name, an @handle, a picture and a bio. Everything is tied to your wallet
            address, so your profile follows you.
          </Step>
        </ol>
      </Section>

      <Section label="Posting" title="Say anything, or call a coin">
        <ol className="space-y-4">
          <Step n={1} title="A normal post">
            The composer starts in <span className="text-foreground">Post</span> mode: up to 500
            characters of whatever is on your mind. Attach an image with the{" "}
            <span className="text-foreground">🖼 Image</span> button — memes included.
          </Step>
          <Step n={2} title="A coin call">
            Switch to <span className="text-foreground">Coin call</span> and paste a contract
            address. A pump.fun or DexScreener link works too. Coins still on the pump.fun bonding
            curve are supported — you do not have to wait for migration.
          </Step>
          <Step n={3} title="Your entry is locked in">
            The moment you post, the coin&apos;s market cap is saved with the call. From then on the
            card shows <span className="text-mint">Now</span> (where it stands) and{" "}
            <span className="text-lav">Peak</span> (the best it ever got) — so a coin that ran and
            came back still shows what your call was worth.
          </Step>
          <Step n={4} title="Replies and likes">
            Every post has a thread. Tap a post to open it, reply, or hit ▲ to like it.
          </Step>
        </ol>
      </Section>

      <Section label="Coins" title="Check a coin, then buy it without leaving">
        <ul className="space-y-3 text-sm text-muted">
          <li>
            <span className="text-foreground">Click any coin</span> — in a post, in the rails, or an
            address inside someone&apos;s text — and a window opens with live market cap, 24h move,
            liquidity, volume or bonding curve progress, plus a chart.
          </li>
          <li>
            <span className="text-foreground">Buy</span> opens Jupiter&apos;s swap widget with the
            coin preselected. Your wallet builds, signs and sends the swap: this site never holds
            your funds and never sees your keys.
          </li>
          <li>
            <span className="text-foreground">Calls on this coin</span> shows every call anyone has
            made on that contract, oldest entry first.
          </li>
        </ul>
      </Section>

      <Section label="Scoreboards" title="Calls are judged in public">
        <ul className="space-y-3 text-sm text-muted">
          <li>
            <Link href="/top-calls" className="text-mint hover:underline">
              Top calls
            </Link>{" "}
            ranks calls by the peak market cap the coin reached after the call, with where it sits
            now next to it.
          </li>
          <li>
            <span className="text-foreground">Top callers</span> ranks wallets by their average peak
            multiple, weighted by how many calls they have made, and shows their best call and how
            often they hit 2x or more. One lucky post does not put you on top.
          </li>
          <li>
            <span className="text-foreground">Closest to migration</span> lists the five pump.fun
            coins nearest to graduating off the bonding curve, with how much of the curve is left.
          </li>
          <li>
            <span className="text-foreground">Trench Radar</span> posts into the feed by itself when
            a call crosses 2x, 5x, 10x… or when a called coin graduates.
          </li>
        </ul>
      </Section>

      <Section label="Rewards" title="Good calls get paid">
        <p className="text-sm leading-relaxed text-muted">
          Every trade of $socials pays a creator reward, and that reward is not kept: it collects in
          the reward wallet and is split every day between the callers whose calls ran the furthest.
          A call counts for the day it was posted on, and is scored on its peak — a 6x call is worth
          five points, a 2x one, a flat call nothing. The top ten share the pot in proportion to
          their points, paid to the wallet they posted from.{" "}
          <Link href="/rewards" className="text-mint hover:underline">
            See the running pot and today&apos;s standings →
          </Link>
        </p>
      </Section>

      <Section label="Communities" title="Rooms only holders can enter">
        <ol className="space-y-4">
          <Step n={1} title="Open one">
            On the{" "}
            <Link href="/communities" className="text-mint hover:underline">
              Communities
            </Link>{" "}
            page, paste the contract of a coin you hold and give the room a name. You can require a
            minimum balance, or leave it at zero so any holder can walk in.
          </Step>
          <Step n={2} title="Join one">
            Hit Join and your balance is checked on Solana. Hold the coin, and you are in.
          </Step>
          <Step n={3} title="Post inside">
            A community has its own feed, separate from the main one. Sell your bag and you lose
            posting rights — the check runs again every time.
          </Step>
        </ol>
      </Section>

      <Section label="Sharing" title="Every post is a card">
        <p className="text-sm leading-relaxed text-muted">
          Share a post link on X or Telegram and it unfurls into a generated image: the coin, the
          market cap you called it at, where it stands now, the multiple, and your name and picture.
          Your profile has one too, with your post and call counts and your best call.
        </p>
      </Section>

      <Section label="Good to know" title="The small print">
        <ul className="space-y-3 text-sm text-muted">
          <li>
            Market data comes from DexScreener, Jupiter, pump.fun and the Solana chain itself, and
            refreshes constantly. Numbers on brand new coins can be thin or missing for a minute.
          </li>
          <li>
            Anyone can post any contract address. A call is an opinion, not a recommendation —
            nothing here is financial advice, and new coins are unaudited.
          </li>
          <li>
            The site never takes custody of anything: no deposits, no keys, no approvals beyond the
            swap you sign yourself.
          </li>
        </ul>
      </Section>

      <div className="flex justify-center pb-4">
        <Link href="/" className="tf-btn tf-btn-primary">
          Into the trenches →
        </Link>
      </div>
    </div>
  );
}
