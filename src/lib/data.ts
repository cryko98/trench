import { store, K } from "./store";
import { getToken, getTokens } from "./token";
import { getTokenBalance } from "./holdings";
import { isHouseException } from "./auth";
import type {
  Comment,
  CommentView,
  Community,
  CommunityView,
  Post,
  PostView,
  Profile,
  TokenSnapshot,
} from "./types";
import { callMultiple, shortAddress } from "./format";
import { RADAR_AUTHOR } from "./constants";

export const RADAR_PROFILE: Profile = {
  wallet: RADAR_AUTHOR,
  name: "Trench Radar",
  handle: "radar",
  avatar: "/logo.png",
  bio: "Automated reports from the trenches.",
  createdAt: 0,
};

export function defaultProfile(wallet: string): Profile {
  if (wallet === RADAR_AUTHOR) return RADAR_PROFILE;
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
  if (wallet === RADAR_AUTHOR) return RADAR_PROFILE;
  const p = await store.get<Profile>(K.user(wallet));
  return p ? { ...defaultProfile(wallet), ...p } : defaultProfile(wallet);
}

export async function getProfiles(wallets: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(wallets)];
  if (unique.length === 0) return new Map();
  const rows = await store.mget<Profile>(unique.map(K.user));
  const map = new Map<string, Profile>();
  unique.forEach((w, i) => {
    if (w === RADAR_AUTHOR) return map.set(w, RADAR_PROFILE);
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

  const peaks = await trackPeaks(posts, tokens);

  return posts.map((p, i) => ({
    ...p,
    communityId: p.communityId ?? null,
    profile: profiles.get(p.author) ?? defaultProfile(p.author),
    token: p.ca ? tokens.get(p.ca) ?? null : null,
    peakMcap: peaks.get(p.id) ?? null,
    ...meta[i],
  }));
}

/**
 * Highest market cap a call has seen. Every render samples the live price and
 * raises the stored peak, so a coin that ran and dumped still shows what the
 * call was worth at its best — no background job required.
 */
async function trackPeaks(
  posts: Post[],
  tokens: Map<string, TokenSnapshot>
): Promise<Map<string, number>> {
  const calls = posts.filter((p) => p.ca && p.callMcap);
  if (calls.length === 0) return new Map();

  const stored = await store.mget<number>(calls.map((p) => K.peak(p.id)));
  const peaks = new Map<string, number>();

  await Promise.all(
    calls.map(async (post, i) => {
      const live = tokens.get(post.ca!)?.marketCap ?? null;
      const previous = stored[i] ?? post.callMcap ?? 0;
      // A single sample cannot realistically be 20x the last one; anything
      // that wild is a bad quote, and a peak can never be walked back.
      const sane = live !== null && live <= previous * 20 ? live : 0;
      const peak = Math.max(previous, sane);
      peaks.set(post.id, peak);
      if (peak > (stored[i] ?? 0)) await store.set(K.peak(post.id), peak);
    })
  );

  return peaks;
}

export async function getFeed(
  viewer: string | null,
  opts: { limit?: number; offset?: number; wallet?: string; ca?: string; community?: string } = {}
): Promise<PostView[]> {
  const { limit = 30, offset = 0 } = opts;
  const key = opts.community
    ? K.communityPosts(opts.community)
    : opts.wallet
      ? K.userPosts(opts.wallet)
      : opts.ca
        ? K.callPosts(opts.ca)
        : K.feed;

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

export type TopCall = {
  post: PostView;
  /** Where the call stands right now. */
  multiple: number;
  /** The best it ever got. */
  peakMultiple: number;
};

/**
 * Calls ranked by how far the coin ran since it was called. Only posts whose
 * entry market cap was captured can be scored.
 */
export async function getTopCalls(limit = 25, scan = 200): Promise<TopCall[]> {
  const ids = await store.zrange(K.allCalls, 0, scan - 1, true);
  if (ids.length === 0) return [];

  const rows = await store.mget<Post>(ids.map(K.post));
  const posts = rows.filter(
    (p): p is Post => Boolean(p?.ca) && Boolean(p?.callMcap) && p!.author !== RADAR_AUTHOR
  );
  if (posts.length === 0) return [];

  const views = await hydratePosts(posts, null);

  return views
    .map((post) => ({
      post,
      multiple: callMultiple(post.callMcap, post.token?.marketCap ?? null),
      peakMultiple: callMultiple(post.callMcap, post.peakMcap),
    }))
    .filter((row): row is TopCall => row.multiple !== null && row.peakMultiple !== null)
    .sort((a, b) => b.peakMultiple - a.peakMultiple)
    .slice(0, limit);
}

export type Caller = {
  profile: Profile;
  calls: number;
  /** Best peak multiple this wallet ever called. */
  best: number;
  /** Average peak multiple across their calls. */
  average: number;
  /** Share of calls that at least doubled. */
  hitRate: number;
};

/**
 * Wallets ranked by how their calls played out. A caller needs more than one
 * call to rank, so a single lucky post does not top the board.
 */
export async function getTopCallers(limit = 10, scan = 300): Promise<Caller[]> {
  const rows = await getTopCalls(scan, scan);
  if (rows.length === 0) return [];

  const byWallet = new Map<string, { profile: Profile; peaks: number[] }>();
  for (const row of rows) {
    const entry = byWallet.get(row.post.author) ?? { profile: row.post.profile, peaks: [] };
    entry.peaks.push(row.peakMultiple);
    byWallet.set(row.post.author, entry);
  }

  return [...byWallet.values()]
    .map(({ profile, peaks }) => ({
      profile,
      calls: peaks.length,
      best: Math.max(...peaks),
      average: peaks.reduce((sum, x) => sum + x, 0) / peaks.length,
      hitRate: peaks.filter((x) => x >= 2).length / peaks.length,
    }))
    .sort((a, b) => b.average * Math.min(b.calls, 5) - a.average * Math.min(a.calls, 5))
    .slice(0, limit);
}

/** Headline counters for the hero strip. */
export async function getStats() {
  const [posts, calls, communities] = await Promise.all([
    store.zcard(K.feed),
    store.zcard(K.allCalls),
    store.zcard(K.communities),
  ]);
  return { posts, calls, communities };
}

export async function getCommunity(id: string): Promise<Community | null> {
  return await store.get<Community>(K.community(id));
}

export async function hydrateCommunity(
  community: Community,
  viewer: string | null
): Promise<CommunityView> {
  const [token, members, posts, memberWallets] = await Promise.all([
    getToken(community.ca),
    store.scard(K.communityMembers(community.id)),
    store.zcard(K.communityPosts(community.id)),
    viewer ? store.smembers(K.communityMembers(community.id)) : Promise.resolve([]),
  ]);

  const isMember = viewer ? memberWallets.includes(viewer) : false;
  const balance = viewer ? await getTokenBalance(viewer, community.ca) : null;

  return { ...community, token, members, posts, isMember, balance };
}

export async function getCommunities(
  viewer: string | null,
  limit = 50
): Promise<CommunityView[]> {
  const ids = await store.zrange(K.communities, 0, limit - 1, true);
  if (ids.length === 0) return [];
  const rows = await store.mget<Community>(ids.map(K.community));
  const communities = rows.filter((c): c is Community => Boolean(c));
  return Promise.all(communities.map((c) => hydrateCommunity(c, viewer)));
}

/** True when the wallet currently holds enough of the gating coin. */
export async function meetsGate(
  wallet: string,
  community: Community
): Promise<{ ok: boolean; balance: number | null }> {
  // The admin runs the site's own coin's room without holding it.
  // (A zero, not a null: null means "could not check", which callers refuse.)
  if (isHouseException(wallet, community.ca)) return { ok: true, balance: 0 };

  const balance = await getTokenBalance(wallet, community.ca);
  if (balance === null) return { ok: false, balance: null };
  return { ok: balance >= Math.max(community.minTokens, 0) && balance > 0, balance };
}
