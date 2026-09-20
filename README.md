# Trench Feed — $TF

The Solana trenches in one feed. Connect a wallet, post, call coins by contract address, and the
feed tracks the market cap from the moment the call was made.

- **Wallet login** — Phantom, Solflare, Backpack and every other Wallet Standard wallet. Sign-in is
  a free off-chain message signature, verified server-side with ed25519. No email, no password.
- **Profiles** — display name, @handle, avatar (upload or URL) and bio, keyed by wallet address.
- **Global feed** — anyone signed in can post; everyone can reply.
- **Coin calls** — paste a contract address (or a pump.fun / DexScreener link) and the post renders
  a live coin card: market cap, 24h change, liquidity, volume. The market cap at post time is
  snapshotted, so every call shows its multiple since the call.
- **Trending** — most-called contracts, and a page per coin with every call on it.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Wallets | `@solana/wallet-adapter-react` (Wallet Standard auto-detect) |
| Auth | ed25519 message signature → JWT in an httpOnly cookie (`jose`) |
| Storage | Upstash Redis (free tier) — with an in-memory fallback for local dev |
| Market data | DexScreener public API, cached 30s |

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Without Redis credentials the app uses an in-memory store: everything works, but data resets when
the server restarts. That is fine for local development.

### Environment

| Variable | Needed | What it is |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | production | From [console.upstash.com](https://console.upstash.com) → create a Redis database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | production | Same page |
| `AUTH_SECRET` | production | Cookie signing key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SOLANA_RPC` | optional | Your own RPC; defaults to the public mainnet endpoint |

## Deploy

Push to GitHub, import the repo on Vercel, set the three environment variables above, deploy. The
Upstash free tier and Vercel's hobby tier cover a launch.

## Routes

| Path | What |
| --- | --- |
| `/` | Feed + composer + most-called rail |
| `/calls` | Only posts that carry a contract address |
| `/post/[id]` | A post with its replies |
| `/u/[wallet or handle]` | Profile and that wallet's posts |
| `/coin/[ca]` | Live coin card + every call on that contract |
| `/settings` | Edit your profile |

API routes live under `/api` — `auth/nonce`, `auth/verify`, `auth/logout`, `me`, `profile`,
`posts`, `posts/[id]`, `posts/[id]/like`, `posts/[id]/comments`, `token/[mint]`.

## Data model (Redis keys)

```
user:<wallet>          profile JSON
handle:<handle>        wallet that owns the handle
post:<id>              post JSON (includes the market cap it was called at)
feed                   zset of post ids by timestamp
user:<wallet>:posts    zset of that wallet's post ids
post:<id>:likes        set of wallets
post:<id>:comments     zset of comment ids
comment:<id>           comment JSON
call:<ca>:posts        zset of post ids calling that contract
calls:index            zset of contracts by number of calls
token:<mint>           cached DexScreener snapshot (30s TTL)
```

Nothing here is financial advice.
