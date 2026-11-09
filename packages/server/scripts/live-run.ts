// Mainnet live run, started by the person who owns the funds (never by an agent). Same endpoints as fork-rehearsal.ts,
// against a server started with NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC on .env. Member keys are read by variable
// name from .env and never printed.
// Steps: create a crew, A and B join (each join is a Walrus memory), each funds its own Predict account, A posts a live
// 5-minute call inside Predict's entry band, A and B each sign their own 2 USDC order, and the server verifies both.
// The server's watcher then records fills, payouts and the crew memory on Walrus after the market settles.
// Usage: tsx scripts/live-run.ts [--usdc 2.5] [--crew "Night Owls"]
//        tsx scripts/live-run.ts --fork   rehearsal on the LOCAL FORK (.env.fork keys, port 8798)
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fromBase64 } from '@mysten/sui/utils';
import { keyFromEnvFile } from '../../core/src/fork.ts';

const { values } = parseArgs({ options: { usdc: { type: 'string', default: '2.5' }, crew: { type: 'string', default: 'Night Owls' }, fork: { type: 'boolean', default: false } } });
const fork = values.fork;
const file = resolve(import.meta.dirname, '../../..', fork ? '.env.fork' : '.env');
const api = `http://127.0.0.1:${process.env.NAKAMA_PORT ?? (fork ? 8798 : 8807)}`;
const members = {
  A: keyFromEnvFile(file, fork ? 'NAKAMA_MEMBER_A_KEY' : 'DEMO_MEMBER_A_KEY'),
  B: keyFromEnvFile(file, fork ? 'NAKAMA_MEMBER_B_KEY' : 'DEMO_MEMBER_B_KEY'),
};
const scan = (d: string) => (fork ? `fork tx ${d}` : `https://suiscan.xyz/mainnet/tx/${d}`);
const call = async (path: string, body?: unknown) => {
  const r = await fetch(api + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json: any = await r.json();
  if (!r.ok) throw new Error(`${path}: ${json.error ?? r.status}`);
  return json;
};
const sign = async (key: (typeof members)['A'], bytes: string) => (await key.signTransaction(fromBase64(bytes))).signature;
const say = (step: string, value: unknown = '') => console.log(`[${new Date().toISOString().slice(11, 19)}] ${step}`, typeof value === 'string' ? value : JSON.stringify(value));

const status = await call('/status');
if (fork ? !status.fork?.writes : status.fork) throw new Error(fork ? 'Server is not in LOCAL FORK write mode' : 'This server is on a LOCAL FORK; run with --fork, or start it on mainnet.');
if (!fork && !status.mainnetWrites) throw new Error('Live writes are off. Start the server with NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC.');
say('server', { rpc: status.rpc, memory: status.memoryConfigured ? status.memoryNetwork : 'Setup required' });

const crew = await call('/crews', { name: values.crew });
say(`crew "${crew.name}" created`, `${api.replace('127.0.0.1:8807', 'localhost:5193')}/?crew=${crew.id}`);
const amount = Number(values.usdc);
for (const [name, key] of Object.entries(members)) {
  await call(`/crews/${crew.id}/join`, { address: key.toSuiAddress() });
  say(`member ${name} joined`, key.toSuiAddress());
  const deposit = (create: boolean) => call('/fund', { address: key.toSuiAddress(), amount, create });
  let fund = await deposit(true).catch((e) => (/AlreadyExists/.test(String(e)) ? deposit(false) : Promise.reject(e)));
  if (!fund.transaction) fund = await deposit(false);
  if (!fund.transaction) throw new Error(`member ${name} deposit dry-run failed: ${JSON.stringify(fund.dryRun)}`);
  const sent = await call('/execute', { bytes: fund.transaction, signature: await sign(key, fund.transaction) });
  say(`member ${name} funded their own Predict account with ${amount} USDC`, scan(sent.digest));
}

// A 5-minute market with time to join, at a strike Predict prices inside its 15–50% band right now.
const { markets } = await call('/markets');
const m = [...markets].filter((x: any) => x.expiryMs - Date.now() > 120_000 && x.suggestedStrike != null).sort((a: any, b: any) => a.expiryMs - b.expiryMs)[0];
if (!m) throw new Error('No market with two minutes left; run again in a minute');
const posted = await call(`/crews/${crew.id}/calls`, { caller: members.A.toSuiAddress(), marketId: m.id, direction: 'up', strike: m.suggestedStrike, why: 'Two green minutes in a row. Riding it.' });
say(`A called BTC above $${posted.strike}, ${m.cadence} min, closes ${new Date(m.expiryMs).toISOString().slice(11, 19)} UTC`);
for (const [name, key] of Object.entries(members)) {
  const plan = await call(`/calls/${posted.id}/plan`, { address: key.toSuiAddress(), size: 2 });
  if (!plan.transaction) throw new Error(`member ${name} refused: ${plan.quote?.refusal ?? JSON.stringify(plan.dryRun)}`);
  const sent = await call('/execute', { bytes: plan.transaction, signature: await sign(key, plan.transaction) });
  await call(`/calls/${posted.id}/orders`, { address: key.toSuiAddress(), digest: sent.digest });
  say(`member ${name} tapped in with their own 2 USDC order (verified)`, scan(sent.digest));
}
say('Done. The server records fills, payouts and the crew memory on Walrus after the market settles; watch the crew room.');
