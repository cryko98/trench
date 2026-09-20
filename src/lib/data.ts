import { store, K } from "./store";
import { getTokens } from "./token";
import type { Comment, CommentView, Post, PostView, Profile } from "./types";
import { shortAddress } from "./format";

export function defaultProfile(wallet: string): Profile {
  return {
    wallet,
    name: shortAddress(wallet),
    handle: wallet.slice(0, 6).toLowerCase(),
    avatar: "",
    bio: "",
    createdAt: 0,
  };
}

export async function getProfile(wallet: string): Promise<Profile> {
  const p = await store.get<Profile>(K.user(wallet));
  return p ? { ...defaultProfile(wallet), ...p } : defaultProfile(wallet);
}

export async function getProfiles(wallets: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(wallets)];
  if (unique.length === 0) return new Map();
  const rows = await store.mget<Profile>(unique.map(K.user));
  const map = new Map<string, Profile>();
  unique.forEach((w, i) => {
    map.set(w, rows[i] ? { ...defaultProfile(w), ...rows[i]! } : defaultProfile(w));
  });
  return map;
}

export async function hydratePosts(posts: Post[], viewer: string | null): Promise<PostView[]> {
  const profiles = await getProfiles(posts.map((p) => p.author));
  const tokens = await getTokens(posts.map((p) => p.ca).filter((ca): ca is string => Boolean(ca)));

  const meta = await Promise.all(
    posts.map(async (p) => {
      const [likeWallets, comments] = await Promise.all([
        store.smembers(K.likes(p.id)),
        store.zcard(K.comments(p.id)),
      ]);
      return {
        likes: likeWallets.length,
        liked: viewer ? likeWallets.includes(viewer) : false,
        comments,
      };
    })
  );

  return posts.map((p, i) => ({
    ...p,
    profile: profiles.get(p.author) ?? defaultProfile(p.author),
    token: p.ca ? tokens.get(p.ca) ?? null : null,
    ...meta[i],
  }));
}

export async function getFeed(
  viewer: string | null,
  opts: { limit?: number; offset?: number; wallet?: string; ca?: string } = {}
): Promise<PostView[]> {
  const { limit = 30, offset = 0 } = opts;
  const key = opts.wallet ? K.userPosts(opts.wallet) : opts.ca ? K.callPosts(opts.ca) : K.feed;
  const ids = await store.zrange(key, offset, offset + limit - 1, true);
  if (ids.length === 0) return [];
  const rows = await store.mget<Post>(ids.map(K.post));
  const posts = rows.filter((p): p is Post => Boolean(p));
  return hydratePosts(posts, viewer);
}

export async function getPost(id: string, viewer: string | null): Promise<PostView | null> {
  const post = await store.get<Post>(K.post(id));
  if (!post) return null;
  const [view] = await hydratePosts([post], viewer);
  return view ?? null;
}

export async function getComments(postId: string): Promise<CommentView[]> {
  const ids = await store.zrange(K.comments(postId), 0, 199, false);
  if (ids.length === 0) return [];
  const rows = await store.mget<Comment>(ids.map(K.comment));
  const comments = rows.filter((c): c is Comment => Boolean(c));
  const profiles = await getProfiles(comments.map((c) => c.author));
  return comments.map((c) => ({ ...c, profile: profiles.get(c.author) ?? defaultProfile(c.author) }));
}

/** Most-called contracts, for the trending rail. */
export async function getTrendingCalls(limit = 6) {
  const cas = await store.zrange(K.callIndex, 0, limit - 1, true);
  if (cas.length === 0) return [];
  const tokens = await getTokens(cas);
  return cas
    .map((ca) => ({ ca, token: tokens.get(ca) ?? null }))
    .filter((row) => row.token !== null);
}
