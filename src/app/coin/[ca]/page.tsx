import { notFound } from "next/navigation";
import { getSessionWallet } from "@/lib/auth";
import { getFeed } from "@/lib/data";
import { getToken } from "@/lib/token";
import { isSolanaAddress } from "@/lib/format";
import { Feed } from "@/components/Feed";
import { TokenCard } from "@/components/TokenCard";

export const dynamic = "force-dynamic";

export default async function CoinPage({ params }: PageProps<"/coin/[ca]">) {
  const { ca } = await params;
  if (!isSolanaAddress(ca)) notFound();

  const viewer = await getSessionWallet();
  const [token, posts] = await Promise.all([getToken(ca), getFeed(viewer, { ca, limit: 30 })]);

  const firstCall = [...posts].reverse().find((p) => p.callMcap);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <section className="tf-card p-5">
        <h1 className="text-xl font-black">
          {token ? (
            <>
              ${token.symbol} <span className="font-normal text-muted">{token.name}</span>
            </>
          ) : (
            "Unknown coin"
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {posts.length} {posts.length === 1 ? "call" : "calls"} in the trenches
        </p>
        <TokenCard token={token} ca={ca} callMcap={firstCall?.callMcap ?? null} />
      </section>

      <Feed
        initialPosts={posts}
        ca={ca}
        emptyMessage="Nobody has called this coin yet."
      />
    </div>
  );
}
