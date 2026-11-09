// LOCAL FORK rehearsal through Nakama's own server endpoints (server must run with NAKAMA_ENV_FILE=.env.fork, see docs/FORK.md).
// Members A and B are fork-only keys read by variable name from .env.fork; nothing secret is printed.
// Steps: create a crew, both join, each /fund (create + deposit) signed and sent via /execute, A posts a call on a live
// market, each member /plan + sign + /execute a real queued order, and /calls/:id/orders verifies each enqueue receipt.
import { resolve } from 'node:path';
import { fromBase64 } from '@mysten/sui/utils';
import { PredictClient } from '@mysten/deepbook-v3/predict';
import { keyFromEnvFile, forkClient } from '../../core/src/fork.ts';
const file = resolve(import.meta.dirname, '../../..', '.env.fork');
const api = `http://127.0.0.1:${process.env.NAKAMA_PORT ?? 8798}`;
const members = { A: keyFromEnvFile(file, 'NAKAMA_MEMBER_A_KEY'), B: keyFromEnvFile(file, 'NAKAMA_MEMBER_B_KEY') };
const call = async (path: string, body?: unknown) => {
  const r = await fetch(api + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json: any = await r.json();
  if (!r.ok) throw new Error(`${path}: ${json.error ?? r.status}`);
  return json;
};
const sign = async (key: (typeof members)['A'], bytes: string) => (await key.signTransaction(fromBase64(bytes))).signature;
const log = (step: string, value: unknown) => console.log(step, JSON.stringify(value));
const status = await call('/status');
log('status', { rpc: status.rpc, fork: status.fork, mainnetWrites: status.mainnetWrites });
if (!status.fork?.writes) throw new Error('Server is not in LOCAL FORK write mode');
const predict = new PredictClient({ network: 'mainnet', client: forkClient(process.env.NAKAMA_SUI_FORK_RPC ?? 'http://127.0.0.1:9796') });
const crew = await call('/crews', { name: 'Fork rehearsal crew' });
for (const [name, key] of Object.entries(members)) {
  await call(`/crews/${crew.id}/join`, { address: key.toSuiAddress() });
  const fund = await call('/fund', { address: key.toSuiAddress(), amount: 3, create: true });
  if (!fund.transaction) throw new Error(`member ${name} /fund dry run: ${JSON.stringify(fund.dryRun)}`);
  const sent = await call('/execute', { bytes: fund.transaction, signature: await sign(key, fund.transaction) });
  log(`member ${name} create+deposit 3 USDC`, { address: key.toSuiAddress(), digest: sent.digest, predictBalance: await predict.read.balance(key.toSuiAddress()) });
}
const { markets } = await call('/markets');
const market = [...markets].filter((m: any) => m.suggestedStrike != null).sort((a: any, b: any) => b.expiryMs - a.expiryMs)[0];
if (!market) throw new Error('No active market with a suggested strike at this fork checkpoint');
log('market', { id: market.id, expiry: new Date(market.expiryMs).toISOString(), secondsLeftWallClock: Math.round((market.expiryMs - Date.now()) / 1000), strike: market.suggestedStrike });
const posted = await call(`/crews/${crew.id}/calls`, { caller: members.A.toSuiAddress(), marketId: market.id, direction: 'up', strike: market.suggestedStrike, why: 'Fork rehearsal: BTC above the suggested strike' });
log('A posts call', { id: posted.id, strike: posted.strike, memoryError: posted.memoryError });
for (const [name, key] of Object.entries(members)) {
  const plan = await call(`/calls/${posted.id}/plan`, { address: key.toSuiAddress(), size: 2 });
  log(`member ${name} /plan`, { quote: plan.quote, dryRun: plan.dryRun, mode: plan.mode });
  if (!plan.transaction) throw new Error(`member ${name}: plan returned no transaction`);
  const sent = await call('/execute', { bytes: plan.transaction, signature: await sign(key, plan.transaction) });
  const order = await call(`/calls/${posted.id}/orders`, { address: key.toSuiAddress(), digest: sent.digest });
  log(`member ${name} enqueue verified`, order);
}
for (const [name, key] of Object.entries(members)) log(`member ${name} Predict balance after`, await predict.read.balance(key.toSuiAddress()));
log('crew', (await call(`/crews/${crew.id}`)).calls.map((x: any) => ({ id: x.id, status: x.status, orders: x.orders })));
