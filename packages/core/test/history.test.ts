import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { chain, historyFromEvents } from '../src/index.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/history-events.json', import.meta.url), 'utf8'));
const ch = chain({ NAKAMA_DEV_SUI_RPC: 'https://fullnode.mainnet.sui.io:443' });
const event = (value: { eventType: string; bcs: string; transactionDigest: string; sender: string }) => ({
  ...value, bcs: Buffer.from(value.bcs, 'base64'),
});
const data = {
  enqueues: { events: [event(fixture.enqueue)], complete: true },
  fills: { events: [event(fixture.fill)], complete: true },
  payouts: { events: [event(fixture.payout)], complete: true },
  tickSize: fixture.tickSize as number,
};

test('real Predict queue BCS events form a settled trade with matching digests', () => {
  const history = historyFromEvents(fixture.address, ch, data);
  assert.equal(history.trades.length, 1);
  const trade = history.trades[0];
  assert.equal(trade.side, 'down');
  assert.equal(trade.strike, 75260);
  assert.equal(trade.result, 'loss');
  assert.equal(trade.pnl, -4.99511);
  assert.equal(trade.digests.order, fixture.enqueue.transactionDigest);
  assert.equal(trade.digests.fill, fixture.fill.transactionDigest);
  assert.equal(trade.digests.payout, fixture.payout.transactionDigest);
  assert.deepEqual(history.record, { wins: 0, calls: 1, streak: 0, pnl: -4.99511 });
});

test('a different account cannot inherit the fixture trade', () => {
  const history = historyFromEvents('0x' + '0'.repeat(63) + '1', ch, data);
  assert.equal(history.trades.length, 0);
  assert.equal(history.record.calls, 0);
});
