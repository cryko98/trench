# Trench Socials — $socials

The Solana trenches in one feed. Connect a wallet, post whatever is on your mind, call coins by
contract address, and open token-gated communities for the coins you hold.

- **Wallet login** — Phantom, Solflare, Backpack and every other Wallet Standard wallet. Sign-in is
  a free off-chain message signature, verified server-side with ed25519. No email, no password.
- **Profiles** — every wallet gets one: display name, @handle, profile picture (upload or URL) and
  bio, editable at `/settings`.
- **Posts** — plain posts by default. Switch the composer to **Coin call** to attach a coin.
- **Coin calls** — paste any Solana contract address, including pump.fun coins that are still on
  the bonding curve. The post renders a live coin card with market cap, 24h change, liquidity and
  curve progress. The market cap at post time is snapshotted, so every call shows its multiple.
- **Top calls** — leaderboard of the calls that ran the furthest, scored on the peak market cap
  reached after the call (not just where it sits now), plus a board of the best callers.
- **Share cards** — every post and profile generates its own social image: the coin, the entry and
  current market cap, the multiple and the caller.
- **Communities** — anyone holding a coin can open its community; other holders can join and post
  there. Membership is checked against the wallet's on-chain balance, with an optional minimum.
- **Fresh launches** — a live rail of pump.fun coins the second they launch, streamed over
  PumpPortal's public websocket, with the launch market cap in USD. One click opens the coin page
  with the composer ready to call it.
- **Coin window** — clicking a coin anywhere opens an in-page window with live stats and an
  embedded DexScreener chart. pump.fun itself refuses to be framed (`X-Frame-Options`), so it gets
  a button that opens it in a new tab.
- **Replies** — every post has a comment thread.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Wallets | `@solana/wallet-adapter-react` (Wallet Standard auto-detect) |
| Auth | ed25519 message signature → JWT in an httpOnly cookie (`jose`) |
| Storage | Upstash Redis (free tier) — with a local JSON snapshot as the dev fallback |
| Market data | DexScreener → Jupiter → on-chain bonding curve → pump.fun API |
| Token gating | `getTokenAccountsByOwner` over JSON-RPC, cached |
| Live stream | PumpPortal public websocket (new launches + migrations) |

### How a coin is resolved

Coins are looked up in this order, and the first source that answers wins (results cached 30s):

1. **DexScreener** — richest stats for anything trading on a DEX; it also lists the pump.fun
   bonding curve pair (`dexId: pumpfun`), which is how a curve coin is detected.
2. **Jupiter token API** (`lite-api.jup.ag`) — free and generous, indexes pump.fun launches within
   seconds, and reports whether a coin has graduated off the curve.
3. **The chain itself** — the pump.fun bonding curve account (`["bonding-curve", mint]` under
   `6EF8rrec…wF6P`) is read and decoded directly, giving price, market cap and curve progress even
   for a coin no indexer knows yet. This is also where curve progress comes from.
4. **pump.fun's frontend API** — last resort only; it rate limits hard.

On top of that, the browser keeps one shared websocket to
`wss://pumpportal.fun/api/data` for the two methods that are free without an API key:
`subscribeNewToken` (the Fresh launches rail) and `subscribeMigration` (a called coin
graduating off the curve refreshes the feed). Trade streams need a funded PumpPortal key, so live
prices keep coming from the cached REST snapshots instead.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Without Redis credentials the app falls back to a JSON snapshot in `.data/store.json`, so a local
dev server keeps its posts and profiles across restarts. That file belongs to one machine, so a
deployment where everyone sees the same feed needs the two Upstash variables below.

### Environment

| Variable | Needed | What it is |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | production | From [console.upstash.com](https://console.upstash.com) → create a Redis database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | production | Same page |
| `AUTH_SECRET` | production | Cookie signing key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SOLANA_RPC` | recommended | Server-side RPC for balance checks and curve reads. The default public endpoint (`api.mainnet-beta.solana.com`) is heavily rate limited — a free Helius or QuickNode key is worth it |
| `NEXT_PUBLIC_SOLANA_RPC` | optional | RPC handed to the wallet adapter in the browser |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for social cards |

## Deploy

Push to GitHub, import the repo on Vercel, set the environment variables above, deploy. The Upstash
free tier and Vercel's hobby tier cover a launch.

## Routes

| Path | What |
| --- | --- |
| `/` | Feed + composer + top calls and most-called rails |
| `/top-calls` | Leaderboard of the biggest multiples since call |
| `/communities` | All token-gated communities, and the create form |
| `/c/[id]` | One community: coin header, join gate, community feed |
| `/post/[id]` | A post with its replies |
| `/u/[wallet or handle]` | Profile and that wallet's posts |
| `/coin/[ca]` | Live coin card + every call on that contract |
| `/settings` | Edit your profile |

API routes live under `/api` — `auth/nonce`, `auth/verify`, `auth/logout`, `me`, `profile`,
`posts`, `posts/[id]`, `posts/[id]/like`, `posts/[id]/comments`, `token/[mint]`, `top-calls`,
`communities`, `communities/[id]`, `communities/[id]/join`.

## Data model (Redis keys)

```
user:<wallet>            profile JSON
handle:<handle>          wallet that owns the handle
post:<id>                post JSON (market cap it was called at, community id)
feed                     zset of global post ids by timestamp
user:<wallet>:posts      zset of that wallet's post ids
post:<id>:likes          set of wallets
post:<id>:comments       zset of comment ids
comment:<id>             comment JSON
call:<ca>:posts          zset of post ids calling that contract
calls:posts              zset of every call, for the leaderboard
calls:index              zset of contracts by number of calls
community:<id>           community JSON
community:ca:<ca>        the community that owns a contract
community:<id>:members   set of wallets
community:<id>:posts     zset of post ids
communities              zset of community ids
token:<mint>             cached market snapshot (30s TTL)
bal:<wallet>:<mint>      cached token balance (2 min TTL)
```

Nothing here is financial advice.
