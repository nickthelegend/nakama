import { useEffect, useState } from 'react';
import type { N } from '../state';
import { api } from '../state';
import { Notice, short } from '../ui';

type Tx = {
  digest: string;
  checkpoint?: string;
  timestampMs?: string;
  transaction?: { data?: { sender?: string } };
  effects?: { status?: { status: string; error?: string }; gasUsed?: { computationCost: string; storageCost: string; storageRebate: string } };
  events?: { type: string; parsedJson?: Record<string, unknown> }[];
  balanceChanges?: { owner: { AddressOwner?: string } | string; coinType: string; amount: string }[];
  objectChanges?: { type: string; objectType?: string; objectId?: string }[];
};
const coin = (t: string) => (t.endsWith('::usdc::USDC') ? ['USDC', 6] : t.endsWith('::sui::SUI') ? ['SUI', 9] : [t.split('::').pop() ?? t, 0]) as [string, number];
const typeName = (t: string) => t.replace(/0x[0-9a-f]{20,}/g, (a) => short(a));

/** A LOCAL FORK transaction, read from the fork's own RPC: SuiScan cannot see these. */
export function TxPage({ n }: { n: N }) {
  const d = new URLSearchParams(location.search).get('d') ?? '';
  const [tx, setTx] = useState<Tx | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<{ tx: Tx }>(`/fork/tx/${d}`).then((r) => setTx(r.tx)).catch((e) => setErr(String(e.message ?? e))); }, [d]);
  const ok = tx?.effects?.status?.status === 'success';
  const gas = tx?.effects?.gasUsed ? (Number(tx.effects.gasUsed.computationCost) + Number(tx.effects.gasUsed.storageCost) - Number(tx.effects.gasUsed.storageRebate)) / 1e9 : null;
  return (
    <main className="page" data-film="fork-tx">
      <div className="page-head">
        <div>
          <span className="greet-k">LOCAL FORK of Sui mainnet · no real funds · not on SuiScan</span>
          <h1>Transaction</h1>
          <p className="mono" style={{ overflowWrap: 'anywhere' }}>{d}</p>
        </div>
        {tx && <span className={`stamp ${ok ? '' : 'bad'}`}>{ok ? 'SUCCESS' : (tx.effects?.status?.status ?? '?').toUpperCase()}</span>}
      </div>
      {err && <Notice error>{err}</Notice>}
      {!tx && !err && <div className="c3 skeleton" style={{ height: 240 }} />}
      {tx && (
        <div className="board-grid">
          <div className="stack">
            <section className="c3 txc">
              <span className="k">EFFECTS · READ FROM THE FORK RPC (sui_getTransactionBlock)</span>
              <dl className="txdl">
                <dt>Status</dt><dd className={ok ? 'up' : 'down'}>{tx.effects?.status?.status}{tx.effects?.status?.error ? ` · ${tx.effects.status.error}` : ''}</dd>
                <dt>Sender</dt><dd className="mono">{tx.transaction?.data?.sender ? short(tx.transaction.data.sender) : '–'}</dd>
                <dt>Checkpoint</dt><dd className="mono">{tx.checkpoint ?? 'pending'}</dd>
                <dt>Gas</dt><dd className="mono">{gas != null ? `${gas.toFixed(4)} SUI` : '–'}</dd>
                <dt>Network</dt><dd>{n.status?.rpc ?? 'LOCAL FORK'}</dd>
              </dl>
            </section>
            <section className="c3 txc">
              <span className="k">BALANCE CHANGES</span>
              {(tx.balanceChanges ?? []).map((b, i) => {
                const [sym, dec] = coin(b.coinType);
                const owner = typeof b.owner === 'string' ? b.owner : b.owner.AddressOwner ?? 'object';
                const amt = Number(b.amount) / 10 ** dec;
                return <div key={i} className="trade-row"><span className="mono">{short(owner)}</span><b className={`mono ${amt < 0 ? 'down' : 'up'}`}>{amt > 0 ? '+' : ''}{amt.toFixed(dec ? 4 : 0)} {sym}</b></div>;
              })}
            </section>
          </div>
          <div className="stack">
            <section className="c3 txc">
              <span className="k">EVENTS · {tx.events?.length ?? 0}</span>
              {(tx.events ?? []).map((e, i) => <div key={i} className="trade-row"><span className="mono w">{typeName(e.type)}</span></div>)}
            </section>
            <section className="c3 txc">
              <span className="k">OBJECTS · {tx.objectChanges?.length ?? 0}</span>
              {(tx.objectChanges ?? []).slice(0, 10).map((o, i) => <div key={i} className="trade-row"><span className="chip">{o.type}</span><span className="mono w">{typeName(o.objectType ?? '')}</span></div>)}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
