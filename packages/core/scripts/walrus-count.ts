// Counts Walrus Memory per namespace for the shared Total Recall account (keys read by name from nakama/.env, never printed).
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { MemWal } from '@mysten-incubation/memwal';
const env = parseEnv(readFileSync(new URL('../../../.env', import.meta.url), 'utf8'));
const client = MemWal.create({ key: env.MEMWAL_MAINNET_KEY!, accountId: env.MEMWAL_MAINNET_ACCOUNT_ID!, serverUrl: 'https://relayer.memory.walrus.xyz' } as any);
const r: any = await client.listNamespaces({ limit: 200 } as any);
const per: Record<string, number> = {};
for (const n of r.namespaces ?? r.items ?? r) {
  const app = String(n.name).split('-v1:')[0];
  per[app] = (per[app] ?? 0) + n.memory_count;
  console.log(String(n.memory_count).padStart(4), n.name);
}
console.log('per app', JSON.stringify(per));
