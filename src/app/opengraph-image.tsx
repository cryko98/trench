/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getStats, getTopCalls } from "@/lib/data";
import { getGraduatingCoins } from "@/lib/graduating";
import { formatMultiple, formatUsd, ticker } from "@/lib/format";
import {
  OG_SIZE,
  OG_TYPE,
  og,
  ogBackground,
  ogFonts,
  chip,
  siteHost,
  siteOrigin,
  sticker,
} from "@/lib/og";

export const alt = "Trench Social — the Solana trenches in one feed";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// Live counters, but a preview crawler should never wait on our data fetches:
// the card is regenerated at most every few minutes.
export const revalidate = 300;

function Tile({
  label,
  value,
  tone = og.panelSoft,
  color = og.ink,
}: {
  label: string;
  value: string;
  tone?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: tone,
        border: `3px solid ${og.ink}`,
        borderRadius: 20,
        padding: "14px 24px",
        minWidth: 190,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: og.display,
          fontSize: 20,
          fontWeight: 800,
          color: og.inkSoft,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", fontFamily: og.display, fontSize: 48, fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}

export default async function Image() {
  const [origin, host] = await Promise.all([siteOrigin(), siteHost()]);
  const [stats, topCalls, graduating, fonts] = await Promise.all([
    getStats().catch(() => ({ posts: 0, calls: 0, communities: 0 })),
    getTopCalls(1, 60).catch(() => []),
    getGraduatingCoins(3).catch(() => []),
    ogFonts(),
  ]);

  const best = topCalls[0];
  const next = graduating[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 40,
          fontFamily: og.body,
          color: og.ink,
          ...ogBackground,
        }}
      >
        <div
          style={{
            ...sticker(32, 10),
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "38px 44px",
          }}
        >
          {/* brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <img src={`${origin}/logo.png`} width={112} height={112} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: og.display,
                  fontSize: 64,
                  fontWeight: 800,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                <span style={{ color: og.lav, textShadow: `3px 3px 0 ${og.mint}` }}>TRENCH</span>
                <span style={{ marginLeft: 16 }}>SOCIAL</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={chip(og.sun)}>Posting from the trenches</span>
                <span style={chip(og.panelSoft, og.lavDeep)}>$social</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              color: og.inkSoft,
              maxWidth: 940,
            }}
          >
            Call a coin by its contract address — pump.fun curve included — and the feed scores
            the call from the market cap you called it at.
          </div>

          {/* stat stickers */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <Tile label="Posts" value={String(stats.posts)} />
            <Tile label="Calls" value={String(stats.calls)} tone={og.mintSoft} />
            <Tile
              label="Best call"
              value={best ? formatMultiple(best.peakMultiple) : "—"}
              tone={og.sunSoft}
              color={best ? og.mintDeep : og.muted}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginLeft: "auto",
                alignItems: "flex-end",
              }}
            >
              {next ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: og.display,
                      fontSize: 20,
                      fontWeight: 800,
                      color: og.inkSoft,
                    }}
                  >
                    Closest to migration
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {next.image ? (
                      <img
                        src={next.image}
                        width={44}
                        height={44}
                        style={{ borderRadius: 12, border: `3px solid ${og.ink}` }}
                      />
                    ) : null}
                    <span
                      style={{ display: "flex", fontFamily: og.display, fontSize: 30, fontWeight: 800 }}
                    >
                      {ticker(next.symbol)}
                    </span>
                    <span style={chip(og.lav, "#fff8ff")}>{next.progress.toFixed(0)}%</span>
                    <span style={{ display: "flex", fontSize: 22, color: og.muted }}>
                      {formatUsd(next.marketCap)}
                    </span>
                  </div>
                </div>
              ) : null}
              <span style={chip(og.mint)}>{host}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts && { fonts }) }
  );
}
