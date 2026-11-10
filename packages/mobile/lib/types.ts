export type Direction = 'up' | 'down' | 'range';
export type Market = {
  id: string; expiryMs: number; cadence: 1 | 5; forward: number | null; referencePrice: number | null;
  suggestedStrike: number | null; suggestedStrikeDown: number | null; mintPaused?: boolean;
};
export type Order = { address: string; size: number; digest: string; status: string; pnl?: number; hit?: boolean; fillDigest?: string; payoutDigest?: string };
export type Call = {
  id: string; crewId: string; caller: string; why: string;
  setup: { cadence: 1 | 5; direction: Direction; move60s: number | null; move5m: number | null };
  marketId: string; expiryMs: number; strike: number; upper?: number; orders: Order[];
  status: 'live' | 'expired' | 'settled' | string; createdAt?: string; recalled?: string[]; memoryBlobId?: string;
};
export type Crew = { id: string; name: string; members: string[]; calls: Call[]; createdAt?: string; readOnlyDemo?: boolean; public?: boolean };
export type Room = {
  id: string; name: string; members: number; calls: number; createdAt: string; readOnlyDemo: boolean;
  live: { id: string; direction: Direction; strike: number; upper: number | null; cadence: number; expiryMs: number; taps: number } | null;
};
export type Status = { rpc: string; memoryNetwork: string; memoryConfigured: boolean; mainnetWrites: boolean; setup: string[] };
export type Odds = { direction: string; probability: number | null; inBand: boolean | null; band: { min: number; max: number }; forward?: number };
export type PlanResult = {
  quote: { accepting: boolean; refusal?: string; potentialPayout?: number; orderFee: number; totalDebit: number };
  dryRun: { status: string; error?: string | null; rpc?: string } | null;
  transaction: string | null; mode: string; memoryError?: string | null;
};
export type History = {
  complete: boolean;
  trades: { result: string; side: string | null; strike: number | null; pnl: number | null; digests: { fill: string; payout: string | null } }[];
  record: { wins: number; calls: number; streak: number; pnl: number };
};
