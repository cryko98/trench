/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getStats, getTopCalls } from "@/lib/data";
import { getGraduatingCoins } from "@/lib/graduating";
import { formatMultiple, formatUsd, ticker } from "@/lib/format";
import { OG_SIZE, OG_TYPE, og, siteOrigin } from "@/lib/og";

export const alt = "Trench Socials — the Solana trenches in one feed";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// Live counters, but a preview crawler should never wait on our data fetches:
// the card is regenerated at most every few minutes.
export const revalidate = 300;

function Tile({ label, value, color = og.text }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: og.panel,
        border: `1px solid ${og.line}`,
        borderRadius: 18,
        padding: "18px 26px",
        minWidth: 200,
      }}
    >
      <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: og.muted }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default async function Image() {
  const origin = await siteOrigin();
  const [stats, topCalls, graduating] = await Promise.all([
    getStats().catch(() => ({ posts: 0, calls: 0, communities: 0 })),
    getTopCalls(1, 60).catch(() => []),
    getGraduatingCoins(3).catch(() => []),
  ]);

  const best = topCalls[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: og.bg,
          backgroundImage: `radial-gradient(900px 430px at 6% -12%, rgba(144,255,208,0.16), transparent 60%), radial-gradient(800px 400px at 96% 0%, rgba(160,144,224,0.18), transparent 60%)`,
          padding: 56,
          color: og.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <img src={`${origin}/logo.png`} width={116} height={116} style={{ borderRadius: 999 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 62, fontWeight: 800, letterSpacing: -1 }}>
              TRENCH <span style={{ color: og.mint, marginLeft: 14 }}>SOCIALS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "flex",
                  border: `1px solid rgba(144,255,208,0.35)`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 18,
                  letterSpacing: 4,
                  color: og.mint,
                }}
              >
                POSTING FROM THE TRENCHES
              </span>
              <span style={{ display: "flex", fontSize: 20, color: og.muted }}>$socials</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: og.muted, maxWidth: 900 }}>
          Call a coin by its contract address — pump.fun bonding curve included — and the feed
          scores the call from the market cap you called it at.
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <Tile label="POSTS" value={String(stats.posts)} />
          <Tile label="CALLS" value={String(stats.calls)} />
          <Tile
            label="BEST CALL"
            value={best ? formatMultiple(best.peakMultiple) : "—"}
            color={best ? og.mint : og.muted}
          />

          {graduating[0] ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginLeft: "auto",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: og.muted }}>
                CLOSEST TO MIGRATION
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {graduating[0].image ? (
                  <img
                    src={graduating[0].image}
                    width={44}
                    height={44}
                    style={{ borderRadius: 12 }}
                  />
                ) : null}
                <span style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>
                  {ticker(graduating[0].symbol)}
                </span>
                <span style={{ display: "flex", fontSize: 26, color: og.mint }}>
                  {graduating[0].progress.toFixed(0)}%
                </span>
                <span style={{ display: "flex", fontSize: 22, color: og.muted }}>
                  {formatUsd(graduating[0].marketCap)}
                </span>
              </div>
              <div style={{ display: "flex", fontSize: 22, color: og.muted }}>
                trenchsocials.fun
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                alignItems: "flex-end",
                fontSize: 22,
                color: og.muted,
              }}
            >
              trenchsocials.fun
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
