import { useEffect, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';

type Direction = 'up' | 'down' | 'range';
type Market = {
  id: string;
  expiryMs: number;
  cadence: 1 | 5;
  forward: number | null;
  referencePrice: number | null;
  suggestedStrike: number | null;
  suggestedStrikeDown: number | null;
};
type Order = {
  address: string;
  size: number;
  digest: string;
  status: string;
  pnl?: number;
  hit?: boolean;
  fillDigest?: string;
  payoutDigest?: string;
};
type Call = {
  id: string;
  crewId: string;
  caller: string;
  why: string;
  setup: { cadence: 1 | 5; direction: Direction; move60s: number | null; move5m: number | null };
  marketId: string;
  expiryMs: number;
  strike: number;
  upper?: number;
  orders: Order[];
  status: string;
  crewRecord?: { wins: number; calls: number; cold: boolean };
  recalled?: string[];
  memoryBlobId?: string;
};
type Crew = {
  id: string;
  name: string;
  members: string[];
  calls: Call[];
  playbook?: { best: string; worst: string; blobId?: string }[];
};
type Status = { rpc: string; memoryNetwork: string; mainnetWrites: boolean; setup: string[] };
type MemoryView = {
  record: { wins: number; calls: number; cold: boolean };
  hot: { setup: { cadence: 1 | 5; direction: Direction; strikeDistance: number }; wins: number; calls: number; blobIds: string[] } | null;
  member: { size: number; multiplier: number; streak: number; record: { wins: number; calls: number } } | null;
  recalled: string[];
  memoryError: string | null;
  markets?: Market[];
};
type PlanResult = {
  quote: { accepting: boolean; refusal?: string; orderFee: number; totalDebit: number };
  dryRun: { status: string; error?: string } | null;
  transaction: string | null;
  mode: string;
  memoryError?: string;
};

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  );
  const j = await r.json();
  if (!r.ok) throw Error(String(j.error ?? `HTTP ${r.status}`).replace(/^Error:\s*/, ''));
  return j as T;
}

const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Recalled({ ids }: { ids: string[] | undefined }) {
  if (!ids?.length) return null;
  return (
    <div className="recalled">
      <b>RECALLED {ids.length}</b>
      {ids.slice(0, 4).map((id) => (
        <a key={id} target="_blank" rel="noreferrer" href={`https://walruscan.com/mainnet/blob/${id}`}>
          {short(id)}
        </a>
      ))}
    </div>
  );
}

export function App() {
  const account = useCurrentAccount();
  const kit = useDAppKit();
  const [status, setStatus] = useState<Status | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [composer, setComposer] = useState<MemoryView | null>(null);
  const [suggestion, setSuggestion] = useState<MemoryView | null>(null);
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [marketId, setMarketId] = useState('');
  const [direction, setDirection] = useState<Direction>('up');
  const [strike, setStrike] = useState('');
  const [upper, setUpper] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recap, setRecap] = useState('');

  const crewId = new URLSearchParams(location.search).get('crew') ?? localStorage.getItem('nakama-crew');

  const refresh = async () => {
    setStatus(await api('/status'));
    if (crewId) {
      const c = await api<Crew>(`/crews/${crewId}`);
      setCrew(c);
      localStorage.setItem('nakama-crew', c.id);
    }
    try {
      const x = await api<{ markets: Market[] }>('/markets');
      setMarkets(x.markets);
      setMarketId((v) => (x.markets.some((m) => m.id === v) ? v : (x.markets[0]?.id ?? '')));
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    }
  };

  useEffect(() => {
    void refresh().catch((e) => setMessage(String(e.message ?? e)));
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const reload = setInterval(() => void refresh().catch(() => {}), 15_000);
    const es = new EventSource('/api/events');
    es.onmessage = () => void refresh().catch(() => {});
    return () => {
      clearInterval(tick);
      clearInterval(reload);
      es.close();
    };
  }, [crewId]);

  const active = crew?.calls.filter((c) => c.status === 'live' && c.expiryMs > now).at(-1);
  const latest = crew?.calls.at(-1);
  const joined = !!account && !!crew?.members.includes(account.address.toLowerCase());
  const mineIn = !!active?.orders.some((o) => o.address === account?.address.toLowerCase());

  useEffect(() => {
    if (!crew) return;
    api<MemoryView>(`/crews/${crew.id}/composer`)
      .then((v) => {
        setComposer(v);
        if (v.hot) {
          setDirection(v.hot.setup.direction);
          const m = v.markets?.find((x) => x.cadence === v.hot!.setup.cadence);
          if (m) {
            setMarketId(m.id);
            setStrike(String(Math.round((m.forward ?? m.referencePrice ?? 0) + v.hot.setup.strikeDistance)));
          }
        }
      })
      .catch(() => {});
  }, [crew?.id]);

  useEffect(() => {
    if (!active || !account || !joined) return;
    api<MemoryView>(`/calls/${active.id}/suggestion?address=${account.address}`)
      .then(setSuggestion)
      .catch((e) => setMessage(String(e.message ?? e)));
  }, [active?.id, account?.address, joined]);

  const market = markets.find((m) => m.id === marketId);
  const secondsLeft = (ms: number) => Math.max(0, Math.ceil((ms - now) / 1000));

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const create = () =>
    act(async () => {
      const c = await api<Crew>('/crews', { name });
      localStorage.setItem('nakama-crew', c.id);
      location.href = `/?crew=${c.id}`;
    });

  const join = () =>
    act(async () => {
      if (!crew || !account) return;
      setCrew(await api<Crew>(`/crews/${crew.id}/join`, { address: account.address }));
    });

  const postCall = () =>
    act(async () => {
      if (!crew || !account) return;
      await api(`/crews/${crew.id}/calls`, {
        caller: account.address,
        marketId,
        direction,
        strike: Number(strike || ((direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? 0)),
        upper: Number(upper),
        why,
      });
      setCrew(await api(`/crews/${crew.id}`));
      setWhy('');
    });

  const oneTap = () =>
    act(async () => {
      if (!active || !account || !crew) return;
      const p = await api<PlanResult>(`/calls/${active.id}/plan`, {
        address: account.address,
        size: suggestion?.member?.size,
      });
      if (!p.quote.accepting) return setMessage(`Predict refused: ${p.quote.refusal ?? 'unknown'}`);
      if (p.dryRun?.status !== 'success')
        return setMessage(`Dry-run ${p.dryRun?.status ?? 'unavailable'}: ${p.dryRun?.error ?? 'fund your Predict account'}`);
      if (!status?.mainnetWrites)
        return setMessage(
          `Dry-run success for ${short(account.address)}: ${p.quote.totalDebit.toFixed(2)} USDC including ${p.quote.orderFee.toFixed(2)} fee. No order submitted.`,
        );
      if (!p.transaction) throw Error('No transaction');
      const signed = await kit.signTransaction({ transaction: p.transaction });
      const sent = await api<{ digest: string }>('/execute', { bytes: signed.bytes, signature: signed.signature });
      await api(`/calls/${active.id}/orders`, { address: account.address, digest: sent.digest });
      setMessage(`Order queued: ${sent.digest}`);
      setCrew(await api(`/crews/${crew.id}`));
    });

  const board =
    crew?.members.map((a) => {
      const orders = crew.calls.flatMap((c) => c.orders).filter((o) => o.address === a && o.status === 'settled');
      let streak = 0;
      for (const o of [...orders].reverse()) {
        if (!o.hit) break;
        streak++;
      }
      return {
        address: a,
        calls: orders.length,
        wins: orders.filter((o) => o.hit).length,
        pnl: orders.reduce((n, o) => n + (o.pnl ?? 0), 0),
        streak,
      };
    }) ?? [];

  const size = suggestion?.member?.size ?? 2;
  const boosted = suggestion?.member?.multiplier === 1.5;

  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          <img src="/art/nakama-mark.webp" alt="" width={34} height={34} />
          <span>
            NAKAMA <em>仲間</em>
          </span>
        </a>
        <ConnectButton />
      </header>

      <div className="strip">
        <span className={status?.rpc?.startsWith('dev') ? 'warn' : ''}>{status?.rpc ?? 'checking chain'}</span>
        <span>{status?.memoryNetwork ?? 'Walrus mainnet'}</span>
        <span className={status?.mainnetWrites ? 'live' : ''}>{status?.mainnetWrites ? 'REAL USDC' : 'DRY-RUN'}</span>
      </div>
      {status?.setup.length ? (
        <div className="setup">
          <b>Setup required</b> {status.setup.map((x) => x.replace('Setup required: ', '')).join(' · ')}
        </div>
      ) : null}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}

      {!crew ? (
        <>
          <section className="hero">
            <img
              className="hero-art"
              src="/art/nakama-hero.webp"
              alt="Four friends on a rooftop at night point together at a glowing arrow in the sky"
              width={1536}
              height={1024}
            />
            <div className="hero-copy">
              <h1>
                Call it together.
                <br />
                <span>Win together.</span>
              </h1>
              <p>
                Your crew posts live BTC calls on DeepBook Predict. Everyone joins with one tap and signs their own
                order. The crew remembers which setups work, so every call gets sharper.
              </p>
            </div>
          </section>
          <section className="card start">
            <h2>Start your crew</h2>
            <p className="muted">Pick a name, then share the invite link with your friends.</p>
            <div className="row">
              <input placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="cta" disabled={busy || !name.trim()} onClick={create}>
                Create crew
              </button>
            </div>
          </section>
        </>
      ) : (
        <main className="grid">
          <section className="card crew-head">
            <div>
              <p className="eyebrow">your crew · BTC/USD</p>
              <h1>{crew.name}</h1>
              <p className="muted">{crew.members.length} members</p>
            </div>
            <div className="crew-actions">
              <button
                className="ghost-btn"
                onClick={() => {
                  void navigator.clipboard.writeText(`${location.origin}/?crew=${crew.id}`);
                  setMessage('Invite link copied');
                }}
              >
                Copy invite
              </button>
              {!joined && (
                <button className="cta" disabled={!account || busy} onClick={join}>
                  {account ? 'Join with wallet' : 'Connect wallet to join'}
                </button>
              )}
            </div>
          </section>

          {active ? (
            <section className="card call">
              <div className="call-top">
                <span className="tag">LIVE · {active.setup.cadence}m</span>
                <span className="timer num">{secondsLeft(active.expiryMs)}s</span>
              </div>
              <h2 className={`call-dir dir-${active.setup.direction}`}>
                {active.setup.direction === 'range'
                  ? `BTC between ${usd(active.strike)}–${usd(active.upper ?? active.strike)}`
                  : `BTC ${active.setup.direction === 'up' ? 'above' : 'below'} ${usd(active.strike)}`}
              </h2>
              <p className="why">“{active.why}”</p>
              <p className="muted small">
                Called by {short(active.caller)} · crew is {active.crewRecord?.wins ?? 0}/{active.crewRecord?.calls ?? 0} on
                this setup {active.crewRecord?.cold && <b className="cold">COLD SETUP</b>}
              </p>
              <Recalled ids={active.recalled} />
              <div className="joiners">
                {active.orders.length
                  ? active.orders.map((o) => (
                      <span key={o.digest} className="joiner">
                        {short(o.address)} · {o.size} USDC · {o.status}
                      </span>
                    ))
                  : 'Nobody in yet'}
              </div>
              {joined && (
                <button className="tap" disabled={busy || mineIn} onClick={oneTap}>
                  {busy ? (
                    'Checking Predict…'
                  ) : mineIn ? (
                    "You're in"
                  ) : (
                    <>
                      {status?.mainnetWrites ? 'Tap in' : 'Dry-run tap in'} · {size} USDC
                      {boosted && <span className="boost">×1.5 streak</span>}
                    </>
                  )}
                </button>
              )}
              {suggestion?.member && (
                <p className="muted small">
                  Your record on crew calls {suggestion.member.record.wins}/{suggestion.member.record.calls} ·{' '}
                  {suggestion.member.streak} win streak
                </p>
              )}
            </section>
          ) : (
            <section className="card call empty-call">
              <img src="/art/nakama-empty-1.webp" alt="" width={120} height={120} />
              <div>
                <h2>No live call</h2>
                <p className="muted">Post one below. Your crew gets one tap to join before the market closes.</p>
              </div>
            </section>
          )}

          <section className="card composer">
            <h2>Make a call</h2>
            {composer?.hot && (
              <div className="hot">
                <b>🔥 Crew’s hot setup</b> {composer.hot.setup.cadence}m {composer.hot.setup.direction.toUpperCase()}, won{' '}
                {composer.hot.wins} of {composer.hot.calls}
                <Recalled ids={composer.hot.blobIds} />
              </div>
            )}
            <label>
              Market
              <select value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    BTC {m.cadence} min · closes in {secondsLeft(m.expiryMs)}s
                  </option>
                ))}
              </select>
            </label>
            <div className="dirs" role="radiogroup" aria-label="Direction">
              {(['up', 'down', 'range'] as const).map((d) => (
                <button key={d} role="radio" aria-checked={direction === d} className={`dir dir-${d} ${direction === d ? 'on' : ''}`} onClick={() => setDirection(d)}>
                  {d === 'up' ? 'Above ↑' : d === 'down' ? 'Below ↓' : 'Range ↔'}
                </button>
              ))}
            </div>
            <div className="row">
              <label>
                Strike (USD)
                <input
                  className="num"
                  type="number"
                  step="1"
                  value={strike}
                  placeholder={String((direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? '')}
                  onChange={(e) => setStrike(e.target.value)}
                />
              </label>
              {direction === 'range' && (
                <label>
                  Upper (USD)
                  <input className="num" type="number" step="1" value={upper} onChange={(e) => setUpper(e.target.value)} />
                </label>
              )}
            </div>
            <label>
              Why
              <input maxLength={280} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What do you see?" />
            </label>
            <p className="muted small">
              Crew record on this setup: {composer?.record.wins ?? 0}/{composer?.record.calls ?? 0}
            </p>
            <button className="cta" disabled={!joined || busy || !marketId || !why.trim()} onClick={postCall}>
              Post call to the crew
            </button>
          </section>

          {latest?.status === 'settled' && (
            <section className="card reveal">
              <h2>Settled</h2>
              <p className="big">
                {latest.orders.filter((o) => o.hit).length} won · {latest.orders.length} joined
              </p>
              {latest.orders.map((o) => (
                <div key={o.digest} className={`result ${o.hit ? 'win' : 'loss'}`}>
                  <span>{short(o.address)}</span>
                  <b>{o.hit ? 'WIN' : 'LOSS'}</b>
                  <span className="num">{o.pnl?.toFixed(2) ?? 'pending'} USDC</span>
                  <span className="links">
                    <a href={`https://suiscan.xyz/mainnet/tx/${o.digest}`} target="_blank" rel="noreferrer">
                      order
                    </a>
                    {o.fillDigest && (
                      <a href={`https://suiscan.xyz/mainnet/tx/${o.fillDigest}`} target="_blank" rel="noreferrer">
                        fill
                      </a>
                    )}
                    {o.payoutDigest && (
                      <a href={`https://suiscan.xyz/mainnet/tx/${o.payoutDigest}`} target="_blank" rel="noreferrer">
                        payout
                      </a>
                    )}
                  </span>
                </div>
              ))}
              <Recalled ids={latest.memoryBlobId ? [latest.memoryBlobId] : []} />
            </section>
          )}

          <section className="card board-card">
            <h2>Crew board</h2>
            {board.length ? (
              board.map((m) => (
                <div className="board" key={m.address}>
                  <span className="num">{short(m.address)}</span>
                  <span className="streak">{m.streak > 0 ? `🔥 ${m.streak}` : ''}</span>
                  <b className={`num ${m.pnl > 0 ? 'pos' : m.pnl < 0 ? 'neg' : ''}`}>{m.pnl.toFixed(2)} USDC</b>
                  <small className="muted">
                    {m.wins}/{m.calls}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No members yet.</p>
            )}
            <h3>Playbook</h3>
            {crew.playbook?.length ? (
              crew.playbook.map((p, i) => (
                <div key={i} className="play">
                  <p>
                    <b>Works:</b> {p.best}
                  </p>
                  <p>
                    <b>Weak:</b> {p.worst}
                  </p>
                  <Recalled ids={p.blobId ? [p.blobId] : []} />
                </div>
              ))
            ) : (
              <p className="muted small">The playbook is written to Walrus every five settled calls.</p>
            )}
            <button
              className="ghost-btn"
              onClick={() =>
                void act(async () => {
                  const r = await api<{ text: string }>(`/crews/${crew.id}/recap`);
                  setRecap(r.text);
                })
              }
            >
              Recap from crew memory
            </button>
            {recap && <p className="recap">{recap}</p>}
          </section>
        </main>
      )}

      <footer className="foot">
        DeepBook Predict on Sui mainnet · memory on Walrus · chain reads via Tatum · each member signs their own order · art
        generated with ChatGPT
      </footer>
    </div>
  );
}
