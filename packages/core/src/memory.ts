import { MemWal } from '@mysten-incubation/memwal';
import { setupQuery, decodeMemory, encodeMemory, type Setup, type Hit, type Memory } from './policy.js';

export function memoryFor(namespace: string, env = process.env) {
  if (!env.MEMWAL_MAINNET_KEY) throw new Error('Setup required: MEMWAL_MAINNET_KEY');
  if (!env.MEMWAL_MAINNET_ACCOUNT_ID) throw new Error('Setup required: MEMWAL_MAINNET_ACCOUNT_ID');
  const client = MemWal.create({
    key: env.MEMWAL_MAINNET_KEY,
    accountId: env.MEMWAL_MAINNET_ACCOUNT_ID,
    serverUrl: 'https://relayer.memory.walrus.xyz',
    namespace: `nakama-v1:${namespace.toLowerCase()}`,
  });
  return {
    async recall(context: Setup): Promise<Hit[]> {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await client.recall({ query: setupQuery(context), limit: 40 });
          return result.results.flatMap((r) => {
            const memory = decodeMemory(r.text);
            return memory ? [{ blobId: r.blob_id, memory, distance: r.distance }] : [];
          });
        } catch (error) {
          if (attempt >= 3 || !String(error).includes('429')) throw error;
          await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
        }
      }
    },
    async remember(memory: Memory): Promise<string> {
      for (let attempt = 0; ; attempt++) {
        try {
          return (await client.rememberAndWait(encodeMemory(memory), { timeoutMs: 300_000 })).blob_id;
        } catch (error) {
          if (attempt >= 3 || !String(error).includes('429')) throw error;
          await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
        }
      }
    },
  };
}
