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
  likes: number;
  liked: boolean;
  comments: number;
  token: TokenSnapshot | null;
};

export type CommentView = Comment & { profile: Profile };
