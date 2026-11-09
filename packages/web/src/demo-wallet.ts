import { registerWallet, type Wallet, type SuiSignTransactionInput } from '@mysten/wallet-standard';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { toBase64 } from '@mysten/sui/utils';

type DemoAccount = { label: string; address: string };
export const DEMO_WALLET_NAME = 'Demo signer (server-held key)';
const chain = 'sui:mainnet';
const icon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#d56b32"/><text x="32" y="42" font-size="32" text-anchor="middle" fill="white">D</text></svg>')}` as const;

export async function registerDemoWallet() {
  let result: { enabled: boolean; accounts: DemoAccount[] };
  try {
    const response = await fetch('/api/demo-signer');
    if (!response.ok) return;
    result = await response.json();
  } catch { return; }
  if (!result.enabled || !result.accounts.length) return;
  const accounts = result.accounts.map(({ address, label }) => ({
    address, label, publicKey: new Uint8Array(), chains: [chain] as const,
    features: ['sui:signTransaction'] as const,
  }));
  const wallet: Wallet = {
    version: '1.0.0', name: DEMO_WALLET_NAME, icon, chains: [chain], accounts,
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts }) },
      'standard:events': { version: '1.0.0', on: () => () => {} },
      'sui:signTransaction': {
        version: '2.0.0',
        signTransaction: async ({ transaction, account, chain: selectedChain }: SuiSignTransactionInput) => {
          if (selectedChain !== chain || !accounts.some((a) => a.address === account.address))
            throw Error('Demo account or chain unavailable');
          const tx = Transaction.from(await transaction.toJSON());
          const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: 'https://fullnode.mainnet.sui.io:443' });
          const built = await tx.build({ client });
          const bytes = toBase64(built);
          const response = await fetch('/api/demo-signer/sign', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ address: account.address, bytes }),
          });
          const signed = await response.json();
          if (!response.ok) throw Error(signed.error ?? 'Demo signing refused');
          return { bytes: signed.bytes as string, signature: signed.signature as string };
        },
      },
    },
  };
  registerWallet(wallet);
}
