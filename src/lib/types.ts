export type Profile = {
  wallet: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  createdAt: number;
};

export type TokenSnapshot = {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  change24h: number | null;
  change1h: number | null;
  pairUrl: string | null;
  dex: string | null;
  /** Where the numbers came from. */
  source: "dexscreener" | "jupiter" | "onchain" | "pumpfun";
  /** True while the coin is still on the pump.fun bonding curve. */
  bonding: boolean;
  /** Bonding curve completion, 0-100, only for coins still on the curve. */
  progress: number | null;
  updatedAt: number;
};

export type Post = {
  id: string;
  author: string;
  text: string;
  ca: string | null;
  /** Market cap at the moment of the call — what the caller is judged on. */
  callMcap: number | null;
  callToken: { name: string; symbol: string; image: string | null } | null;
  /** Set when the post belongs to a token-gated community. */
  communityId: string | null;
  /** Public URL of an attached image, if the poster added one. */
  image?: string | null;
  /** Set when the site itself posted this, rather than a wallet. */
  radar?: { kind: "milestone" | "migration"; postId?: string; x?: number };
  createdAt: number;
};

export type Comment = {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: number;
};

export type PostView = Post & {
  profile: Profile;
  /** Highest market cap seen since the call was posted. */
  peakMcap: number | null;
  likes: number;
  liked: boolean;
  comments: number;
  token: TokenSnapshot | null;
};

export type CommentView = Comment & { profile: Profile };

export type Community = {
  id: string;
  /** Contract address of the coin that gates this community. */
  ca: string;
  name: string;
  description: string;
  creator: string;
  /** Minimum token balance required to join (whole tokens, not raw units). */
  minTokens: number;
  createdAt: number;
};

export type CommunityView = Community & {
  token: TokenSnapshot | null;
  members: number;
  posts: number;
  isMember: boolean;
  /** Viewer's balance of the gating coin, when known. */
  balance: number | null;
};
