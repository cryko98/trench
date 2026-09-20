import { getSessionWallet } from "@/lib/auth";
import { getCommunities } from "@/lib/data";
import { CommunityList } from "@/components/CommunityList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Communities — Trench Socials" };

export default async function CommunitiesPage() {
  const viewer = await getSessionWallet();
  const communities = await getCommunities(viewer);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-black tracking-tight">
          Coin <span className="text-mint">communities</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every community is gated by its coin: hold it in your wallet and you can join and post.
        </p>
      </div>
      <CommunityList initial={communities} />
    </div>
  );
}
