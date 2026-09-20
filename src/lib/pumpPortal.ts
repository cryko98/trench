/**
 * PumpPortal's public data websocket (wss://pumpportal.fun/api/data).
 *
 * Only the free methods are used: `subscribeNewToken` and `subscribeMigration`.
 * Trade streams need a funded API key, so live prices keep coming from the
 * cached REST snapshots instead.
 *
 * PumpPortal asks for a single connection per client, so this module owns one
 * socket for the whole tab and fans messages out to every subscriber.
 */

const ENDPOINT = "wss://pumpportal.fun/api/data";
const MAX_BACKOFF_MS = 30_000;

export type Launch = {
  mint: string;
  name: string;
  symbol: string;
  /** Market cap in SOL at creation, straight from the curve. */
  marketCapSol: number | null;
  /** SOL the creator put in with the first buy. */
  devBuySol: number;
  at: number;
};

export type Migration = {
  mint: string;
  pool: string | null;
  at: number;
};

export type PumpHandlers = {
  onLaunch?: (launch: Launch) => void;
  onMigration?: (migration: Migration) => void;
  onStatus?: (connected: boolean) => void;
};

type RawMessage = {
  message?: string;
  txType?: string;
  mint?: string;
  name?: string;
  symbol?: string;
  marketCapSol?: number;
  solAmount?: number;
  pool?: string;
};

const handlers = new Set<PumpHandlers>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempts = 0;

function announce(connected: boolean) {
  handlers.forEach((h) => h.onStatus?.(connected));
}

function handle(raw: RawMessage) {
  if (!raw.mint) return; // subscription acknowledgements

  if (raw.txType === "create") {
    // Only pump.fun launches carry name/symbol; other launchpads on this
    // stream send an address and nothing worth rendering.
    if (raw.pool !== "pump" || !raw.name) return;
    const launch: Launch = {
      mint: raw.mint,
      name: raw.name,
      symbol: raw.symbol ?? "???",
      marketCapSol: raw.marketCapSol ?? null,
      devBuySol: raw.solAmount ?? 0,
      at: Date.now(),
    };
    handlers.forEach((h) => h.onLaunch?.(launch));
    return;
  }

  if (raw.txType === "buy" || raw.txType === "sell") return;

  // Anything else carrying a mint is a graduation off the bonding curve.
  const migration: Migration = { mint: raw.mint, pool: raw.pool ?? null, at: Date.now() };
  handlers.forEach((h) => h.onMigration?.(migration));
}

function connect() {
  if (typeof window === "undefined" || socket) return;

  socket = new WebSocket(ENDPOINT);

  socket.onopen = () => {
    attempts = 0;
    announce(true);
    socket?.send(JSON.stringify({ method: "subscribeNewToken" }));
    socket?.send(JSON.stringify({ method: "subscribeMigration" }));
  };

  socket.onmessage = (event) => {
    try {
      handle(JSON.parse(event.data as string) as RawMessage);
    } catch {
      /* ignore malformed frames */
    }
  };

  socket.onerror = () => socket?.close();

  socket.onclose = () => {
    socket = null;
    announce(false);
    if (handlers.size === 0) return;
    const delay = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** attempts++);
    reconnectTimer = setTimeout(connect, delay);
  };
}

function disconnectWhenIdle() {
  if (handlers.size > 0) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const open = socket;
  socket = null;
  open?.close();
}

/** Subscribe to the live stream; returns the unsubscribe function. */
export function subscribePump(h: PumpHandlers): () => void {
  handlers.add(h);
  connect();
  return () => {
    handlers.delete(h);
    disconnectWhenIdle();
  };
}
