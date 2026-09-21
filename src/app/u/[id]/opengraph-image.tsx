/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain img tags */
import { ImageResponse } from "next/og";
import { getFeed, getProfile } from "@/lib/data";
import { store, K } from "@/lib/store";
import { callMultiple, formatMultiple, isSolanaAddress, shortAddress } from "@/lib/format";
import { OG_SIZE, OG_TYPE, og, siteOrigin } from "@/lib/og";

export const alt = "A caller on Trench Socials";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

// The card reflects live market data, so it is rendered per request.
export const dynamic = "force-dynamic";

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: og.panel,
        border: `1px solid ${og.line}`,
        borderRadius: 18,
        padding: "20px 28px",
        minWidth: 230,
      }}
    >
      <div style={{ display: "flex", fontSize: 20, color: og.muted, letterSpacing: 3 }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = await siteOrigin();
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
          flexDirection: "column",
          justifyContent: "space-between",
          background: og.bg,
          backgroundImage: `radial-gradient(900px 420px at 10% -10%, rgba(144,255,208,0.13), transparent 60%), radial-gradient(760px 380px at 95% 0%, rgba(160,144,224,0.16), transparent 60%)`,
          padding: 56,
          color: og.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={`${origin}/logo.png`} width={56} height={56} style={{ borderRadius: 999 }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>
            TRENCH <span style={{ color: og.mint, marginLeft: 8 }}>SOCIALS</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              width={168}
              height={168}
              style={{ borderRadius: 999, border: `3px solid ${og.line}` }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 168,
                height: 168,
                borderRadius: 999,
                background: og.panel,
                color: og.mint,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 800,
              }}
            >
              {(profile?.name ?? "TS").slice(0, 2).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
              {profile?.name ?? "Unknown trencher"}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: og.muted }}>
              @{profile?.handle ?? "anon"} · {wallet ? shortAddress(wallet, 5) : ""}
            </div>
            {profile?.bio ? (
              <div style={{ display: "flex", fontSize: 26, color: og.muted, maxWidth: 700 }}>
                {profile.bio.length > 90 ? `${profile.bio.slice(0, 90)}…` : profile.bio}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <Stat label="POSTS" value={String(posts.length)} color={og.text} />
          <Stat label="CALLS" value={String(calls.length)} color={og.text} />
          <Stat
            label="BEST CALL"
            value={best ? formatMultiple(best) : "—"}
            color={best ? og.mint : og.muted}
          />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
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
