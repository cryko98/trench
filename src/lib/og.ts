import { headers } from "next/headers";

/** Shared bits for the generated social cards. */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

export const og = {
  bg: "#071310",
  panel: "#0d1b18",
  line: "#1c302a",
  text: "#e9fbf4",
  muted: "#7f9a91",
  mint: "#90ffd0",
  mintInk: "#04221a",
  lav: "#bb8cff",
  lavSolid: "#9040f0",
  loss: "#ff7b7b",
};

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
