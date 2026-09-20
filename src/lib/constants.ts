/** Values shared by server and browser code — no Node-only imports here. */

/** SOL a pump.fun bonding curve collects before the coin migrates. */
export const MIGRATION_SOL = 85;

export type Graduating = {
  mint: string;
  symbol: string;
  name: string;
  image: string | null;
  marketCap: number | null;
  /** 0-100, how close the curve is to migrating. */
  progress: number;
  solRaised: number;
};
