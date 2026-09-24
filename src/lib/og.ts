import { headers } from "next/headers";

/** Shared bits for the generated social cards. */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

/** The site's sticker-book palette, so a card looks like the page it links to. */
export const og = {
  paper: "#fbf2e4",
  panel: "#ffffff",
  panelSoft: "#fffaf1",
  ink: "#1d1628",
  inkSoft: "#3a3049",
  muted: "#6f6680",
  mint: "#2bd79b",
  mintSoft: "#c7f6e4",
  mintDeep: "#0b8f68",
  lav: "#8b3df5",
  lavSoft: "#e4d4ff",
  lavDeep: "#6a22d6",
  sun: "#ffd84d",
  sunSoft: "#ffeaa1",
  bubble: "#ff7ac6",
  loss: "#e0453b",
  display: '"Baloo 2"',
  body: "Nunito",
};

/** Cream paper with the hero's colour blobs. */
export const ogBackground = {
  background: og.paper,
  backgroundImage: `radial-gradient(520px 320px at 96% -6%, rgba(255,216,77,0.6), transparent 62%), radial-gradient(420px 300px at -4% 104%, rgba(255,122,198,0.28), transparent 62%), radial-gradient(520px 320px at 12% -10%, rgba(139,61,245,0.16), transparent 62%)`,
};

/** A white sticker: thick ink outline, hard offset shadow. */
export function sticker(radius = 28, shadow = 8): Record<string, string | number> {
  return {
    background: og.panel,
    border: `3px solid ${og.ink}`,
    borderRadius: radius,
    boxShadow: `${shadow}px ${shadow}px 0 ${og.ink}`,
  };
}

/** A small pill label in the display face. */
export function chip(background: string, color = og.ink): Record<string, string | number> {
  return {
    display: "flex",
    alignItems: "center",
    background,
    color,
    border: `3px solid ${og.ink}`,
    borderRadius: 999,
    padding: "4px 18px",
    fontFamily: og.display,
    fontSize: 22,
    fontWeight: 800,
  };
}

/**
 * Absolute origin for the assets inside a card, which renders outside the
 * browser. The request's own host comes first: a dev server on another port
 * would otherwise pull images from whatever runs on the default one.
 */
export async function siteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Rendered outside a request (at build time) — fall back to the env.
  }

  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

type OgFont = { name: string; data: ArrayBuffer; weight: 600 | 800; style: "normal" };

/**
 * One static TTF from Google Fonts. An old browser signature makes the CSS
 * point at a single TrueType file, which is what the renderer can read.
 */
async function fetchFont(family: string, weight: 600 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0",
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    ).then((r) => (r.ok ? r.text() : ""));
    // That signature gets TrueType or WOFF, both of which the renderer reads.
    const url = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
    if (!url || url.endsWith(".woff2")) return null;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * The site's own faces for the cards. If neither can be fetched the result
 * is undefined, not an empty list: an empty list would switch off the
 * renderer's built-in font too, and a card with no font at all cannot render.
 */
export async function ogFonts(): Promise<OgFont[] | undefined> {
  const [display, body] = await Promise.all([fetchFont("Baloo 2", 800), fetchFont("Nunito", 600)]);
  const fonts: OgFont[] = [];
  if (display) fonts.push({ name: "Baloo 2", data: display, weight: 800, style: "normal" });
  if (body) fonts.push({ name: "Nunito", data: body, weight: 600, style: "normal" });
  return fonts.length ? fonts : undefined;
}
