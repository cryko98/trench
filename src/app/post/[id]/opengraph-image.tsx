/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/data";
import { callMultiple, formatMultiple, formatUsd, shortAddress, ticker } from "@/lib/format";
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

export const alt = "A call on Trench Social";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// The card reflects live market data, so it is rendered per request.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, origin, host, fonts] = await Promise.all([
    getPost(id, null),
    siteOrigin(),
    siteHost(),
    ogFonts(),
  ]);

  const multiple = post ? callMultiple(post.callMcap, post.token?.marketCap ?? null) : null;
  const peak = post ? callMultiple(post.callMcap, post.peakMcap) : null;
  const showPeak = peak !== null && multiple !== null && peak > multiple * 1.05;
  const avatar = post?.profile.avatar
    ? post.profile.avatar.startsWith("/")
      ? `${origin}${post.profile.avatar}`
      : post.profile.avatar
    : null;
  const symbol = post?.token?.symbol ?? post?.callToken?.symbol;

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
            padding: "34px 44px",
          }}
        >
          {/* brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={`${origin}/logo.png`} width={60} height={60} />
            <div
              style={{
                display: "flex",
                fontFamily: og.display,
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              <span style={{ color: og.lav, textShadow: `2px 2px 0 ${og.mint}` }}>TRENCH</span>
              <span style={{ marginLeft: 10 }}>SOCIAL</span>
            </div>
            <span style={{ ...chip(og.sun), marginLeft: 8, fontSize: 18 }}>
              Posting from the trenches
            </span>
            <span style={{ ...chip(og.panelSoft, og.lavDeep), marginLeft: "auto" }}>$social</span>
          </div>

          {!post ? (
            <div style={{ display: "flex", fontFamily: og.display, fontSize: 48, color: og.muted }}>
              Post not found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* the call itself */}
              {post.ca && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    background: og.panelSoft,
                    border: `3px solid ${og.ink}`,
                    borderRadius: 24,
                    padding: "18px 24px",
                  }}
                >
                  {post.token?.image ? (
                    <img
                      src={post.token.image}
                      width={96}
                      height={96}
                      style={{ borderRadius: 20, border: `3px solid ${og.ink}` }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        width: 96,
                        height: 96,
                        borderRadius: 20,
                        border: `3px solid ${og.ink}`,
                        background: og.mintSoft,
                        color: og.mintDeep,
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: og.display,
                        fontSize: 34,
                        fontWeight: 800,
                      }}
                    >
                      {(symbol ?? "?").replace(/^\$/, "").slice(0, 3)}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          display: "flex",
                          fontFamily: og.display,
                          fontSize: 56,
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {ticker(symbol)}
                      </span>
                      {post.token?.bonding && <span style={chip(og.lav, "#fff8ff")}>On curve</span>}
                    </div>
                    <div style={{ display: "flex", fontSize: 26, color: og.muted }}>
                      called at {formatUsd(post.callMcap)} → now{" "}
                      {formatUsd(post.token?.marketCap ?? null)}
                    </div>
                  </div>

                  {multiple !== null && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        marginLeft: "auto",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          fontFamily: og.display,
                          fontSize: 92,
                          fontWeight: 800,
                          lineHeight: 1,
                          color: showPeak ? og.lavDeep : multiple >= 1 ? og.mintDeep : og.loss,
                        }}
                      >
                        {formatMultiple(showPeak ? peak! : multiple)}
                      </div>
                      <div style={{ display: "flex", fontSize: 22, color: og.muted, marginTop: 6 }}>
                        {showPeak ? `peak · now ${formatMultiple(multiple)}` : "since the call"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  fontSize: post.ca ? 32 : 50,
                  lineHeight: 1.3,
                  color: og.ink,
                }}
              >
                {post.text.length > (post.ca ? 120 : 200)
                  ? `${post.text.slice(0, post.ca ? 120 : 200)}…`
                  : post.text}
              </div>
            </div>
          )}

          {/* caller row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {avatar ? (
              <img
                src={avatar}
                width={64}
                height={64}
                style={{ borderRadius: 999, border: `3px solid ${og.ink}` }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  border: `3px solid ${og.ink}`,
                  background: og.lavSoft,
                  color: og.lavDeep,
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: og.display,
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                {(post?.profile.name ?? "TS").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{ display: "flex", fontFamily: og.display, fontSize: 28, fontWeight: 800 }}
              >
                {post?.profile.name ?? "Trench Social"}
              </div>
              <div style={{ display: "flex", fontSize: 22, color: og.muted }}>
                @{post?.profile.handle ?? "trenches"} ·{" "}
                {post ? shortAddress(post.author, 4) : "solana"}
              </div>
            </div>
            <span style={{ ...chip(og.mint), marginLeft: "auto" }}>{host}</span>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts && { fonts }) }
  );
}
