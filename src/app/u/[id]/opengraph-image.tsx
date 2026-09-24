/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getFeed, getProfile } from "@/lib/data";
import { store, K } from "@/lib/store";
import { callMultiple, formatMultiple, isSolanaAddress, shortAddress } from "@/lib/format";
import { OG_SIZE, OG_TYPE, og, ogBackground, ogFonts, chip, siteOrigin, sticker } from "@/lib/og";

export const alt = "A caller on Trench Social";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// The card reflects live market data, so it is rendered per request.
export const dynamic = "force-dynamic";

function Stat({
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
        padding: "16px 26px",
        minWidth: 210,
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
      <div style={{ display: "flex", fontFamily: og.display, fontSize: 52, fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [origin, fonts] = await Promise.all([siteOrigin(), ogFonts()]);
  const raw = decodeURIComponent(id);
  const wallet = isSolanaAddress(raw)
    ? raw
    : await store.get<string>(K.handleTaken(raw.replace(/^@/, "").toLowerCase()));

  const profile = wallet ? await getProfile(wallet) : null;
  const posts = wallet ? await getFeed(null, { wallet, limit: 50 }) : [];
  const calls = posts.filter((p) => p.ca && p.callMcap);
  const peaks = calls
    .map((p) => callMultiple(p.callMcap, p.peakMcap))
    .filter((x): x is number => x !== null);
  const best = peaks.length ? Math.max(...peaks) : null;

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
            <span style={{ ...chip(og.panelSoft, og.lavDeep), marginLeft: "auto" }}>$social</span>
          </div>

          {/* the caller */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                width={160}
                height={160}
                style={{ borderRadius: 999, border: `4px solid ${og.ink}` }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 160,
                  height: 160,
                  borderRadius: 999,
                  border: `4px solid ${og.ink}`,
                  background: og.lavSoft,
                  color: og.lavDeep,
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: og.display,
                  fontSize: 64,
                  fontWeight: 800,
                }}
              >
                {(profile?.name ?? "TS").slice(0, 2).toUpperCase()}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: og.display,
                  fontSize: 62,
                  fontWeight: 800,
                  lineHeight: 1.05,
                }}
              >
                {profile?.name ?? "Unknown trencher"}
              </div>
              <div style={{ display: "flex", fontSize: 28, color: og.muted }}>
                @{profile?.handle ?? "anon"} · {wallet ? shortAddress(wallet, 5) : ""}
              </div>
              {profile?.bio ? (
                <div style={{ display: "flex", fontSize: 26, color: og.inkSoft, maxWidth: 760 }}>
                  {profile.bio.length > 90 ? `${profile.bio.slice(0, 90)}…` : profile.bio}
                </div>
              ) : null}
            </div>
          </div>

          {/* stat stickers */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <Stat label="Posts" value={String(posts.length)} />
            <Stat label="Calls" value={String(calls.length)} tone={og.mintSoft} />
            <Stat
              label="Best call"
              value={best ? formatMultiple(best) : "—"}
              tone={og.sunSoft}
              color={best ? og.mintDeep : og.muted}
            />
            <span style={{ ...chip(og.mint), marginLeft: "auto" }}>trenchsocials.fun</span>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts && { fonts }) }
  );
}
