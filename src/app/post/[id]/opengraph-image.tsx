/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/data";
import { callMultiple, formatMultiple, formatUsd, shortAddress, ticker } from "@/lib/format";
import { OG_SIZE, OG_TYPE, og, siteOrigin } from "@/lib/og";

export const alt = "A call on Trench Socials";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// The card reflects live market data, so it is rendered per request.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id, null);
  const origin = await siteOrigin();

  const multiple = post ? callMultiple(post.callMcap, post.token?.marketCap ?? null) : null;
  const peak = post ? callMultiple(post.callMcap, post.peakMcap) : null;
  const showPeak = peak !== null && multiple !== null && peak > multiple * 1.05;
  const avatar = post?.profile.avatar
    ? post.profile.avatar.startsWith("/")
      ? `${origin}${post.profile.avatar}`
      : post.profile.avatar
    : null;

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
          backgroundImage: `radial-gradient(900px 420px at 8% -10%, rgba(144,255,208,0.13), transparent 60%), radial-gradient(760px 380px at 95% 0%, rgba(144,64,240,0.2), transparent 60%)`,
          padding: 56,
          color: og.text,
          fontSize: 32,
        }}
      >
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={`${origin}/logo.png`} width={64} height={64} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
              TRENCH <span style={{ color: og.mint, marginLeft: 10 }}>SOCIALS</span>
            </div>
            <div style={{ display: "flex", fontSize: 18, color: og.muted, letterSpacing: 4 }}>
              POSTING FROM THE TRENCHES
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              background: "rgba(144,255,208,0.12)",
              color: og.mint,
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            $socials
          </div>
        </div>

        {!post ? (
          <div style={{ display: "flex", fontSize: 44, color: og.muted }}>Post not found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            {/* the call itself */}
            {post.ca && (
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                {post.token?.image ? (
                  <img
                    src={post.token.image}
                    width={104}
                    height={104}
                    style={{ borderRadius: 22, border: `2px solid ${og.line}` }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: 104,
                      height: 104,
                      borderRadius: 22,
                      background: og.panel,
                      color: og.mint,
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 38,
                      fontWeight: 800,
                    }}
                  >
                    {(post.token?.symbol ?? post.callToken?.symbol ?? "?").slice(0, 3)}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 60, fontWeight: 800 }}>
                      {ticker(post.token?.symbol ?? post.callToken?.symbol)}
                    </span>
                    {post.token?.bonding && (
                      <span
                        style={{
                          display: "flex",
                          background: "rgba(144,64,240,0.22)",
                          color: og.lav,
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        ON CURVE
                      </span>
                    )}
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
                        fontSize: 96,
                        fontWeight: 800,
                        color: showPeak ? og.lav : multiple >= 1 ? og.mint : og.loss,
                        lineHeight: 1,
                      }}
                    >
                      {formatMultiple(showPeak ? peak! : multiple)}
                    </div>
                    <div style={{ display: "flex", fontSize: 22, color: og.muted, marginTop: 8 }}>
                      {showPeak ? `peak · now ${formatMultiple(multiple)}` : "since the call"}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                fontSize: post.ca ? 34 : 52,
                lineHeight: 1.3,
                color: og.text,
              }}
            >
              {post.text.length > (post.ca ? 120 : 200)
                ? `${post.text.slice(0, post.ca ? 120 : 200)}…`
                : post.text}
            </div>
          </div>
        )}

        {/* caller row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {avatar ? (
            <img
              src={avatar}
              width={64}
              height={64}
              style={{ borderRadius: 999, border: `2px solid ${og.line}` }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 64,
                height: 64,
                borderRadius: 999,
                background: og.panel,
                color: og.mint,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {(post?.profile.name ?? "TS").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
              {post?.profile.name ?? "Trench Socials"}
            </div>
            <div style={{ display: "flex", fontSize: 22, color: og.muted }}>
              @{post?.profile.handle ?? "trenches"} ·{" "}
              {post ? shortAddress(post.author, 4) : "solana"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: 22,
              color: og.muted,
            }}
          >
            trenchsocials.fun
          </div>
        </div>
      </div>
    ),
    size
  );
}
