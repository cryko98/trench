export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs === 0) return "$0";
  return `$${n.toPrecision(3)}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Multiple relative to the market cap the coin was called at. */
export function callMultiple(callMcap: number | null, nowMcap: number | null): number | null {
  if (!callMcap || !nowMcap || callMcap <= 0) return null;
  return nowMcap / callMcap;
}

export function formatMultiple(x: number | null): string {
  if (x === null) return "—";
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(2)}x`;
}

export function shortAddress(addr: string, size = 4): string {
  if (!addr) return "";
  if (addr.length <= size * 2 + 3) return addr;
  return `${addr.slice(0, size)}...${addr.slice(-size)}`;
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Loose check for a Solana mint / contract address. */
export function isSolanaAddress(s: string): boolean {
  return BASE58.test(s.trim());
}

/** Pulls the first contract address out of free text (also from pump.fun / dexscreener links). */
export function extractCa(text: string): string | null {
  const urlMatch = text.match(
    /(?:pump\.fun\/(?:coin\/)?|dexscreener\.com\/solana\/|solscan\.io\/token\/|birdeye\.so\/token\/)([1-9A-HJ-NP-Za-km-z]{32,44})/i
  );
  if (urlMatch) return urlMatch[1];
  for (const word of text.split(/\s+/)) {
    const cleaned = word.replace(/[.,!?;:()[\]]+$/g, "");
    if (isSolanaAddress(cleaned)) return cleaned;
  }
  return null;
}
