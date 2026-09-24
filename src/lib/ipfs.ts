/**
 * Coin logos mostly live on IPFS, and the public gateways they are linked
 * through (ipfs.io above all) rate-limit and time out. pump.fun's own
 * gateway pins every coin it launched and resizes on the fly, so the same
 * content is served from there — with the public gateways as a fallback,
 * for the logos it does not hold.
 *
 * Safe to import from the browser: no runtime dependencies.
 */

const PATH_CID = /(?:^ipfs:\/\/|\/ipfs\/)([A-Za-z0-9]+)/;
const SUBDOMAIN_CID = /^https?:\/\/([a-z0-9]+)\.ipfs\./i;

/** The content id inside an IPFS URL, whichever gateway shape it uses. */
export function ipfsCid(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.match(PATH_CID)?.[1] ?? url.match(SUBDOMAIN_CID)?.[1] ?? null;
}

const fast = (cid: string) => `https://pump.mypinata.cloud/ipfs/${cid}?img-width=256&img-dpr=2`;
const slow = (cid: string) => [
  `https://gateway.pinata.cloud/ipfs/${cid}`,
  `https://ipfs.io/ipfs/${cid}`,
];

/** The same logo through the fast gateway; a non-IPFS URL passes through. */
export function fastGateway(url: string | null): string | null {
  const cid = ipfsCid(url);
  return cid ? fast(cid) : url;
}

/** URLs to try in order before giving up on a logo. */
export function imageCandidates(url: string | null | undefined): string[] {
  if (!url) return [];
  const cid = ipfsCid(url);
  if (!cid) return [url];
  return [...new Set([fast(cid), ...slow(cid), url])];
}
