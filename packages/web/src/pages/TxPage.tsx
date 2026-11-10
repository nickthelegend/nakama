import { useEffect, useState } from 'react';
import type { N } from '../state';
import { api } from '../state';
import { Notice, short } from '../ui';

type Tx = {
  digest: string;
  checkpoint: string | null;
  sender: string | null;
  status: string;
  error: string | null;
  gasMist: number;
  calls: string[];
  events: string[];
  balanceChanges: { owner: string; coinType: string; amount: string }[];
  objectChanges: { type: string; objectType: string | null; objectId: string }[];
};
const coin = (t: string) => (t.endsWith('::usdc::USDC') ? ['USDC', 6] : t.endsWith('::sui::SUI') ? ['SUI', 9] : [t.split('::').pop() ?? t, 0]) as [string, number];
const typeName = (t: string) => t.replace(/0x[0-9a-f]{20,}/g, (a) => short(a));

/** A LOCAL FORK transaction, read from the fork's own RPC: SuiScan cannot see these. */
export function TxPage({ n }: { n: N }) {
  const d = new URLSearchParams(location.search).get('d') ?? '';
  const [tx, setTx] = useState<Tx | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<{ tx: Tx }>(`/fork/tx/${d}`).then((r) => setTx(r.tx)).catch((e) => setErr(String(e.message ?? e))); }, [d]);
  const ok = tx?.status === 'success';
  const gas = tx ? tx.gasMist / 1e9 : null;
  return (
    <main className="page" data-film="fork-tx">
      <div className="page-head">
        <div>
          <span className="greet-k">LOCAL FORK of Sui mainnet · no real funds · not on SuiScan</span>
          <h1>Transaction</h1>
          <p className="mono" style={{ overflowWrap: 'anywhere' }}>{d}</p>
        </div>
        {tx && <span className={`stamp ${ok ? '' : 'bad'}`}>{ok ? 'SUCCESS' : tx.status.toUpperCase()}</span>}
      </div>
      {err && <Notice error>{err}</Notice>}
      {!tx && !err && <div className="c3 skeleton" style={{ height: 240 }} />}
      {tx && (
        <div className="board-grid">
          <div className="stack">
            <section className="c3 txc">
              <span className="k">EFFECTS · READ FROM THE FORK'S OWN RPC</span>
              <dl className="txdl">
                <dt>Status</dt><dd className={ok ? 'up' : 'down'}>{tx.status}{tx.error ? ` · ${tx.error}` : ''}</dd>
                <dt>Sender</dt><dd className="mono">{tx.sender ? short(tx.sender) : '–'}</dd>
                <dt>Move calls</dt><dd className="mono">{tx.calls.length ? tx.calls.join(', ') : '–'}</dd>
                <dt>Checkpoint</dt><dd className="mono">{tx.checkpoint ?? 'pending'}</dd>
                <dt>Gas</dt><dd className="mono">{gas != null ? `${gas.toFixed(4)} SUI` : '–'}</dd>
                <dt>Network</dt><dd>{n.status?.rpc ?? 'LOCAL FORK'}</dd>
              </dl>
            </section>
            <section className="c3 txc">
              <span className="k">BALANCE CHANGES</span>
              {tx.balanceChanges.map((b, i) => {
                const [sym, dec] = coin(b.coinType ?? '');
                const owner = b.owner;
                const amt = Number(b.amount) / 10 ** dec;
                return <div key={i} className="trade-row"><span className="mono">{short(owner)}</span><b className={`mono ${amt < 0 ? 'down' : 'up'}`}>{amt > 0 ? '+' : ''}{amt.toFixed(dec ? 4 : 0)} {sym}</b></div>;
              })}
            </section>
          </div>
          <div className="stack">
            <section className="c3 txc">
              <span className="k">EVENTS · {tx.events.length}</span>
              {tx.events.map((e, i) => <div key={i} className="trade-row"><span className="mono w">{typeName(e)}</span></div>)}
            </section>
            <section className="c3 txc">
              <span className="k">OBJECTS · {tx.objectChanges.length}</span>
              {tx.objectChanges.slice(0, 10).map((o, i) => <div key={i} className="trade-row"><span className="chip">{o.type}</span><span className="mono w">{typeName(o.objectType ?? '')}</span></div>)}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
