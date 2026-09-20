import { notFound } from "next/navigation";
import { getSessionWallet } from "@/lib/auth";
import { getFeed, getProfile } from "@/lib/data";
import { store, K } from "@/lib/store";
import { isSolanaAddress } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { Feed } from "@/components/Feed";
import { CopyAddress } from "@/components/TokenCard";

export const dynamic = "force-dynamic";

/** Profiles resolve by wallet address or by @handle. */
async function resolveWallet(id: string): Promise<string | null> {
  if (isSolanaAddress(id)) return id;
  const handle = id.replace(/^@/, "").toLowerCase();
  return await store.get<string>(K.handleTaken(handle));
}

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const wallet = await resolveWallet(decodeURIComponent(id));
  if (!wallet) notFound();

  const viewer = await getSessionWallet();
  const [profile, posts] = await Promise.all([
    getProfile(wallet),
    getFeed(viewer, { wallet, limit: 30 }),
  ]);

  const calls = posts.filter((p) => p.ca).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <section className="tf-card p-5">
        <div className="flex items-start gap-4">
          <Avatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black">{profile.name}</h1>
            <p className="text-sm text-muted">@{profile.handle}</p>
            {profile.bio && <p className="mt-2 text-sm leading-relaxed">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span>
                <span className="font-bold tabular-nums">{posts.length}</span>{" "}
                <span className="text-muted">posts</span>
              </span>
              <span>
                <span className="font-bold tabular-nums">{calls}</span>{" "}
                <span className="text-muted">calls</span>
              </span>
              <CopyAddress address={wallet} />
            </div>
          </div>
        </div>
      </section>

      <Feed
        initialPosts={posts}
        wallet={wallet}
        showComposer={viewer === wallet}
        emptyMessage="No posts from this wallet yet."
      />
    </div>
  );
}
