/** Wallet balances straight from Sui mainnet GraphQL (public JSON-RPC is deprecated). */
export const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const SUI_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const GQL = 'https://graphql.mainnet.sui.io/graphql';

export type Balances = { sui: number; usdc: number; source: string; at: number };

export async function balances(address: string): Promise<Balances> {
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: `{ address(address:"${address}") { balances { nodes { coinType { repr } totalBalance } } } }` }),
  });
  if (!r.ok) throw Error(`Sui GraphQL HTTP ${r.status}`);
  const j: any = await r.json();
  if (j.errors?.length) throw Error(`Sui GraphQL: ${j.errors[0].message}`);
  const nodes: { coinType: { repr: string }; totalBalance: string }[] = j.data?.address?.balances?.nodes ?? [];
  const find = (t: string) => Number(nodes.find((n) => n.coinType.repr === t)?.totalBalance ?? 0);
  return { sui: find(SUI_TYPE) / 1e9, usdc: find(USDC_TYPE) / 1e6, source: 'Sui mainnet GraphQL', at: Date.now() };
}
