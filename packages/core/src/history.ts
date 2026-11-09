import { chain, type Chain } from './chain.js';
import { SessionsContract, getSessionsConfig } from '@mysten/deepbook-v3/sessions';
import { POS_INF_TICK } from '@mysten/deepbook-v3/predict';

type Event = { eventType: string; bcs: Uint8Array; transactionDigest: string; sender: string };
type Scan = { events: Event[]; complete: boolean };
const cache = new Map<string, { at: number; value: Promise<Scan> }>();
const PAGE_LIMIT = 50;
const MAX_PAGES = 20;

async function scan(ch: Chain, kind: string): Promise<Scan> {
  const pkg = ch.config.packages.predictOrdersV1 ?? ch.config.packages.predictOrders;
  if (!pkg) throw Error('Predict queue package unavailable');
  const key = `${ch.rpcUrl}:${kind}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const value = (async () => {
    const events: Event[] = [];
    let before: string | undefined;
    let complete = false;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await ch.client.core.listEvents({
        filter: { eventType: `${pkg}::queue_events::${kind}` },
        order: 'descending', limit: PAGE_LIMIT, before,
      });
      events.push(...result.events.map(e => ({
        eventType: e.eventType, bcs: e.bcs, transactionDigest: e.transactionDigest, sender: e.sender,
      })));
      if (!result.hasNextPage) { complete = true; break; }
      if (!result.endCursor || result.endCursor === before) break;
      before = result.endCursor;
    }
    return { events, complete };
  })();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}

const key = (accountId: string, marketId: string, recordId: bigint) => `${accountId}:${marketId}:${recordId}`;
const dollars = (n: bigint, tickSize: number) => Number(n) * tickSize;

export async function memberHistory(owner: string, ch = chain()) {
  const [enqueues, fills, payouts, currentMarkets] = await Promise.all([
    scan(ch, 'OrderEnqueued'), scan(ch, 'QueuedOrderFilled'), scan(ch, 'OpenRecordSettled'),
    ch.predict.read.markets(),
  ]);
  return historyFromEvents(owner, ch, { enqueues, fills, payouts, tickSize: currentMarkets[0]?.tickSize });
}

export function historyFromEvents(owner: string, ch: Chain, data: {
  enqueues: Scan; fills: Scan; payouts: Scan; tickSize: number | undefined;
}) {
  if (!/^0x[0-9a-f]{64}$/i.test(owner)) throw Error('Invalid Sui address');
  const address = owner.toLowerCase();
  const sessions = new SessionsContract(getSessionsConfig('mainnet'));
  const wrapperId = ch.predict.wrapperIdFor(address);
  if (wrapperId !== sessions.deriveAccountWrapperId(address)) throw Error('Predict account identity mismatch');
  const accountId = sessions.deriveAccountId(address);
  const { enqueues, fills, payouts, tickSize } = data;
  const submitted = new Map<string, { digest: string; side: string; strike: number | null; size: number; placedAtMs: number }>();
  for (const event of enqueues.events) {
    const receipt = ch.predict.decode.enqueues({ events: [event] })[0];
    if (receipt.accountId !== accountId || receipt.side !== 'mint') continue;
    const { lowerTick, higherTick } = receipt.request;
    const side = lowerTick === 0n ? 'down' : higherTick === POS_INF_TICK ? 'up' : 'range';
    const strikeTick = side === 'down' ? higherTick : lowerTick;
    submitted.set(key(accountId, receipt.marketId, receipt.recordId), {
      digest: event.transactionDigest, side, strike: tickSize == null ? null : dollars(strikeTick, tickSize),
      size: receipt.budget + receipt.orderFee, placedAtMs: Number(receipt.timestampMs),
    });
  }
  const settled = new Map<string, { payout: number; digest: string; timestampMs: number }>();
  for (const event of payouts.events) {
    const receipt = ch.predict.decode.openRecordPayouts({ events: [event] })[0];
    if (receipt.accountId !== accountId || receipt.skipped) continue;
    settled.set(key(accountId, receipt.marketId, receipt.recordId), {
      payout: receipt.payout, digest: event.transactionDigest, timestampMs: Number(receipt.timestampMs),
    });
  }
  const trades = fills.events.flatMap(event => {
    const receipt = ch.predict.decode.queuedFills({ events: [event] })[0];
    if (receipt.accountId !== accountId || receipt.side !== 'mint') return [];
    const id = key(accountId, receipt.marketId, receipt.recordId);
    const submit = submitted.get(id);
    const payout = settled.get(id);
    const cost = receipt.amount + receipt.fees.order;
    return [{ marketId: receipt.marketId, recordId: String(receipt.recordId),
      side: submit?.side ?? null, strike: submit?.strike ?? null,
      size: submit?.size ?? cost, cost, result: payout ? payout.payout > 0 ? 'win' : 'loss' : 'pending',
      pnl: payout ? Math.round((payout.payout - cost) * 1e6) / 1e6 : null,
      payout: payout?.payout ?? null,
      digests: { order: submit?.digest ?? null, fill: event.transactionDigest, payout: payout?.digest ?? null },
      timestampMs: payout?.timestampMs ?? Number(receipt.timestampMs),
    }];
  }).sort((a, b) => b.timestampMs - a.timestampMs);
  const resolved = trades.filter(t => t.result !== 'pending');
  let streak = 0;
  for (const trade of resolved) { if (trade.result !== 'win') break; streak++; }
  return { address, wrapperId, accountId, source: 'on-chain history' as const,
    complete: enqueues.complete && fills.complete && payouts.complete,
    scanned: { enqueues: enqueues.events.length, fills: fills.events.length, payouts: payouts.events.length },
    trades, record: { wins: resolved.filter(t => t.result === 'win').length, calls: resolved.length, streak,
      pnl: resolved.reduce((n, t) => n + (t.pnl ?? 0), 0) },
  };
}
