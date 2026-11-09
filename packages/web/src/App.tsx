import { useEffect, useState } from 'react';
import { useCurrentAccount, useCurrentWallet, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { DEMO_WALLET_NAME } from './demo-wallet';
import { Avatar, Icon, Ring, Sticker, short, signed, usd } from './ui';

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
  readOnlyDemo?: boolean;
  playbook?: { best: string; worst: string; blobId?: string }[];
};
type Status = { rpc: string; memoryNetwork: string; memoryConfigured: boolean; mainnetWrites: boolean; setup: string[]; fork?: { label?: string; writes?: boolean } | null };
type History = { complete: boolean; trades: { result: string; side: string | null; strike: number | null; pnl: number | null; digests: { fill: string; payout: string | null } }[]; record: { wins: number; calls: number; streak: number; pnl: number } };
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

type Odds = { direction: string; probability: number | null; inBand: boolean | null; band: { min: number; max: number }; forward?: number; asOfMs?: number | null; rpc?: string };
type TapResult = { address: string; totalDebit: number; orderFee: number };
const pct = (p: number) => (p < 0.001 ? '<0.1' : (p * 100).toFixed(1));

function Recalled({ ids }: { ids: string[] | undefined }) {
  if (!ids?.length) return null;
  return (
    <div className="recalled">
      <span className="recalled-label">Recalled from Walrus · {ids.length}</span>
      {ids.slice(0, 4).map((id) => (
        <a key={id} className="link-pill" target="_blank" rel="noreferrer" href={`https://walruscan.com/mainnet/blob/${id}`}>
          {short(id)} <Icon name="link" size={13} />
        </a>
      ))}
    </div>
  );
}

/** A member funds their own Predict account (the queue debits orders from it). Dry-run first; signing only when
 *  the server allows writes (real USDC on mainnet, or the LOCAL FORK). */
function FundCard({ owner, writesOn, fork, kit }: { owner: string; writesOn: boolean; fork: boolean; kit: ReturnType<typeof useDAppKit> }) {
  const [amount, setAmount] = useState('3');
  const [create, setCreate] = useState(true);
  const [plan, setPlan] = useState<{ dryRun: { status: string; error: string | null }; transaction: string | null } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (fn: () => Promise<void>) => { setBusy(true); setNote(''); try { await fn(); } catch (e) { setNote(String((e as Error).message ?? e).replace(/^Error:\s*/, '')); } finally { setBusy(false); } };
  const dry = () => go(async () => { setPlan(await api('/fund', { address: owner, amount: Number(amount), create })); });
  const sign = () => go(async () => {
    if (!plan?.transaction) return;
    const signed = await kit.signTransaction({ transaction: plan.transaction });
    const sent = await api<{ digest: string }>('/execute', { bytes: signed.bytes, signature: signed.signature });
    setPlan(null); setNote(`Deposited${fork ? ' on the local fork' : ''}: ${sent.digest}`);
  });
  return (
    <section className="card fund-card" aria-label="Fund your Predict account">
      <h2 className="viewas-title">Fund your Predict account</h2>
      <p className="muted small">Calls debit your own Predict account. Create it and deposit in one signed transaction.</p>
      <div className="fund-row">
        <label className="field">
          <span>Deposit (USDC)</span>
          <input className="num" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setPlan(null); }} aria-label="Deposit USDC" />
        </label>
        <label className="check"><input type="checkbox" checked={create} onChange={(e) => { setCreate(e.target.checked); setPlan(null); }} /> Create the account too</label>
      </div>
      <button className="btn btn-ink" disabled={busy || !(Number(amount) >= 1)} onClick={dry}>{busy && !plan ? 'Checking…' : 'Dry-run the deposit'}</button>
      {plan && (
        <p className={`muted small ${plan.dryRun.status === 'success' ? '' : 'fund-fail'}`}>
          Dry-run {plan.dryRun.status}{plan.dryRun.error ? `: ${plan.dryRun.error}` : ''}
        </p>
      )}
      {plan?.transaction && writesOn && (
        <button className="btn btn-primary" disabled={busy} onClick={sign}>
          {busy ? 'Signing…' : fork ? 'Sign and deposit (local fork, no real funds)' : 'Sign and deposit real USDC'}
        </button>
      )}
      {note && <p className="muted small fund-note">{note}</p>}
    </section>
  );
}

export function App() {
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const kit = useDAppKit();
  const [viewAddresses, setViewAddresses] = useState<string[]>(() => {
    const valid = (value: string) => /^0x[0-9a-f]{64}$/i.test(value);
    const query = new URLSearchParams(location.search).getAll('as');
    const saved = JSON.parse(localStorage.getItem('nakama-view-addresses') ?? '[]') as string[];
    return [...new Set([...query, ...saved].filter(valid).map((value) => value.toLowerCase()))].slice(0, 4);
  });
  const [viewInput, setViewInput] = useState('');
  const [selectedView, setSelectedView] = useState(() => new URLSearchParams(location.search).get('as')?.toLowerCase() ?? '');
  const viewingAs = account ? null : viewAddresses.includes(selectedView) ? selectedView : viewAddresses[0] ?? null;
  const owner = account?.address.toLowerCase() ?? viewingAs;

  function selectView(value: string, addresses = viewAddresses) {
    setViewAddresses(addresses);
    setSelectedView(value);
    localStorage.setItem('nakama-view-addresses', JSON.stringify(addresses));
    const url = new URL(location.href);
    url.searchParams.delete('as');
    for (const address of [value, ...addresses.filter((a) => a !== value)]) url.searchParams.append('as', address);
    history.replaceState(null, '', url);
  }
  const [status, setStatus] = useState<Status | null>(null);
  // On the LOCAL FORK, fork writes count as writes; labels say fork, never real funds.
  const forkMode = Boolean(status?.fork);
  const writesOn = Boolean(status?.mainnetWrites || (forkMode && status?.fork?.writes));
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
  // A result belongs to the member who tapped: clear it when the viewed member changes.
  const [tapResult, setTapResult] = useState<TapResult | null>(null);
  useEffect(() => {
    setMessage('');
    setTapResult(null);
  }, [owner]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recap, setRecap] = useState('');
  const [histories, setHistories] = useState<Record<string, History>>({});

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
  const joined = !!owner && !!crew?.members.includes(owner);
  const mineIn = !!active?.orders.some((o) => o.address === owner);
  const [odds, setOdds] = useState<Odds | null>(null);
  const [oddsError, setOddsError] = useState<string | null>(null);
  useEffect(() => {
    setOdds(null);
    setOddsError(null);
    if (!active || active.setup.direction === 'range') return;
    let cancelled = false;
    const load = () =>
      api<Odds>(`/calls/${active.id}/odds`)
        .then((o) => !cancelled && (setOdds(o), setOddsError(null)))
        .catch((e) => !cancelled && setOddsError(String(e.message ?? e).replace(/^Error:\s*/, '')));
    load();
    const t = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [active?.id]);
  const outOfBand = odds?.inBand === false;

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
    if (!active || !owner || !joined) return;
    api<MemoryView>(`/calls/${active.id}/suggestion?address=${owner}`)
      .then(setSuggestion)
      .catch((e) => setMessage(String(e.message ?? e)));
  }, [active?.id, owner, joined]);

  useEffect(() => {
    if (!crew || !status || status.memoryConfigured) return;
    let cancelled = false;
    for (const address of crew.members) {
      api<History>(`/members/${address}/history`)
        .then((value) => { if (!cancelled) setHistories((old) => ({ ...old, [address]: value })); })
        .catch((error) => { if (!cancelled) setMessage(String(error.message ?? error)); });
    }
    return () => { cancelled = true; };
  }, [crew?.id, crew?.members.join(','), status?.memoryConfigured]);

  const market = markets.find((m) => m.id === marketId);
  const strikeValue = strike || String((direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? '');
  const [draftOdds, setDraftOdds] = useState<Odds | null>(null);
  useEffect(() => {
    setDraftOdds(null);
    if (!marketId || direction === 'range' || !Number(strikeValue)) return;
    let cancelled = false;
    const load = () =>
      api<Odds>(`/odds?marketId=${encodeURIComponent(marketId)}&direction=${direction}&strike=${Number(strikeValue)}`)
        .then((o) => !cancelled && setDraftOdds(o))
        .catch(() => {});
    // Debounce typing, then keep the odds live like the call card does: 5-minute BTC odds move with every tick.
    const t = setTimeout(load, 450);
    const poll = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearInterval(poll);
    };
  }, [marketId, direction, strikeValue]);
  const draftOutOfBand = draftOdds?.inBand === false;
  const secondsLeft = (ms: number) => Math.max(0, Math.ceil((ms - now) / 1000));
  // The server refuses calls on a market closing within 15 s, so only offer markets with time left to join.
  const openMarkets = markets.filter((m) => m.expiryMs - now > 20_000);
  const openKey = openMarkets.map((m) => m.id).join(',');
  useEffect(() => {
    if (openMarkets.length && !openMarkets.some((m) => m.id === marketId)) setMarketId(openMarkets[0].id);
  }, [openKey, marketId]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    setTapResult(null);
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
      const c = await api<Crew>('/crews', { name, readOnlyDemo: !account });
      localStorage.setItem('nakama-crew', c.id);
      const url = new URL(location.href);
      url.searchParams.set('crew', c.id);
      location.href = url.toString();
    });

  const join = () =>
    act(async () => {
      if (!crew || !owner) return;
      setCrew(await api<Crew>(`/crews/${crew.id}/join`, { address: owner }));
    });

  const postCall = () =>
    act(async () => {
      if (!crew || !owner) return;
      await api(`/crews/${crew.id}/calls`, {
        caller: owner,
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
      if (!active || !owner || !crew) return;
      const p = await api<PlanResult>(`/calls/${active.id}/plan`, {
        address: owner,
        size: Math.max(2, suggestion?.member?.size ?? 2),
      });
      if (!p.quote.accepting) return setMessage(`Predict refused: ${p.quote.refusal ?? 'unknown'}`);
      if (p.dryRun?.status !== 'success')
        return setMessage(`Dry-run ${p.dryRun?.status ?? 'unavailable'}: ${p.dryRun?.error || 'the chain returned no reason'}`);
      if (!writesOn || viewingAs || crew.readOnlyDemo)
        return setTapResult({ address: owner, totalDebit: p.quote.totalDebit, orderFee: p.quote.orderFee });
      if (!p.transaction) throw Error('No transaction');
      const signed = await kit.signTransaction({ transaction: p.transaction });
      const sent = await api<{ digest: string }>('/execute', { bytes: signed.bytes, signature: signed.signature });
      await api(`/calls/${active.id}/orders`, { address: owner, digest: sent.digest });
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
      const history = !status?.memoryConfigured ? histories[a] : null;
      return history ? { address: a, ...history.record, history } : {
        address: a,
        calls: orders.length,
        wins: orders.filter((o) => o.hit).length,
        pnl: orders.reduce((n, o) => n + (o.pnl ?? 0), 0),
        streak,
        history: null,
      };
    }) ?? [];
  // Crown goes to the member with the best real P&L, only once two or more records are loaded and it is positive.
  const loaded = board.filter((m) => status?.memoryConfigured || m.history);
  const best = loaded.length > 1 ? loaded.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const leader = best && best.pnl > 0 ? best.address : null;

  const size = Math.max(2, suggestion?.member?.size ?? 2);
  const boosted = suggestion?.member?.multiplier === 1.5;
  const liveMode = writesOn && !viewingAs && !crew?.readOnlyDemo;
  const suggestedStrike = (direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? null;
  const loadingCrew = !!crewId && !crew && !message;
  const crewFailed = !!crewId && !crew && !!message;

  const dirWord = (d: Direction) => (d === 'up' ? 'above' : d === 'down' ? 'below' : 'between');

  const isValid = /^0x[0-9a-f]{64}$/i.test(viewInput);
  const addRow = (
    <form
      className="addr-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid) return;
        const a = viewInput.toLowerCase();
        selectView(a, [...new Set([...viewAddresses, a])].slice(0, 4));
        setViewInput('');
      }}
    >
      <input aria-label="Sui address to view as" placeholder="0x… any Sui address" value={viewInput} onChange={(e) => setViewInput(e.target.value)} />
      <button className="btn btn-blue btn-sm" disabled={!isValid}>
        View
      </button>
    </form>
  );

  const viewAs = !account && (
    <div className="viewas">
      <p className="viewas-title">
        <Icon name="eye" size={15} /> {viewingAs ? 'Viewing read-only' : 'No wallet? Look around read-only'}
      </p>
      {viewAddresses.length > 0 && (
        <div className="chips" role="group" aria-label="Switch member">
          {viewAddresses.map((a) => (
            <button key={a} className="chip" aria-pressed={a === viewingAs} onClick={() => selectView(a)}>
              <Avatar address={a} size={22} />
              <span className="num">{short(a)}</span>
            </button>
          ))}
        </div>
      )}
      {viewAddresses.length < 4 && addRow}
    </div>
  );

  const setupNotice = status?.setup.length ? (
    <section className="setup" aria-label="Setup required">
      <Icon name="key" size={18} />
      <b>Setup required</b>
      {status.setup.map((x) => (
        <code key={x}>{x.replace('Setup required: ', '')}</code>
      ))}
      <span>Crew memory goes to Walrus once these keys exist.</span>
    </section>
  ) : null;

  const tapReceipt = tapResult ? (
    <section className="toast toast-ok" role="status">
      <img src="/art/v2/nakama-mascot-cheer.webp" alt="" width={64} height={64} />
      <div>
        <b>Dry-run success · no order sent</b>
        <span>
          <span className="num">{short(tapResult.address)}</span> would pay <b className="num">{tapResult.totalDebit.toFixed(2)} USDC</b> (fee{' '}
          <span className="num">{tapResult.orderFee.toFixed(2)}</span>)
        </span>
      </div>
    </section>
  ) : message ? (
    <section className={`toast ${/^(Predict refused|Dry-run (?!success))/.test(message) ? 'toast-bad' : /^(Order queued|Deposited)/.test(message) ? 'toast-ok' : 'toast-info'}`} role="status">
      <img src={/^(Predict refused|Dry-run (?!success))/.test(message) ? '/art/v2/nakama-mascot-sad.webp' : '/art/v2/nakama-mascot.webp'} alt="" width={56} height={56} />
      <span>{message}</span>
    </section>
  ) : null;

  const next1 = openMarkets.filter((m) => m.cadence === 1).sort((a, b) => a.expiryMs - b.expiryMs)[0];
  const next5 = openMarkets.filter((m) => m.cadence === 5).sort((a, b) => a.expiryMs - b.expiryMs)[0];
  const forward = markets.find((m) => m.forward != null)?.forward ?? null;
  const clock = (ms: number) => {
    const s = secondsLeft(ms);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const pickCadence = (c: 1 | 5) => {
    const m = c === 1 ? next1 : next5;
    if (m) setMarketId(m.id);
    document.getElementById(crew ? 'make-a-call' : 'start')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const settledCalls = crew?.calls.filter((c) => c.status === 'settled') ?? [];
  const crewWins = settledCalls.filter((c) => c.orders.some((o) => o.hit)).length;
  const bestStreak = board.reduce((n, m) => Math.max(n, m.streak), 0);
  const me = board.find((m) => m.address === owner);

  const Tile = ({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: string }) => (
    <div className={`tile tile-${tone}`}>
      <img src={`/art/v2/nakama-icon-${icon}.webp`} alt="" width={56} height={56} />
      <span>
        <b>{value}</b>
        <small>{label}</small>
      </span>
    </div>
  );

  return (
    <div className="shell">
      <div className="sky" aria-hidden="true">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <img className="float-gem g1" src="/art/v2/nakama-icon-gem.webp" alt="" />
        <img className="float-gem g2" src="/art/v2/nakama-icon-coin.webp" alt="" />
      </div>
      {account && wallet?.name === DEMO_WALLET_NAME && (
        <div className="demo-signer-badge" role="status">
          Demo signer · server-held demo key · {String(status?.rpc ?? '').includes('LOCAL FORK') ? 'LOCAL FORK of Sui mainnet · no real funds' : 'real mainnet funds'}
        </div>
      )}

      <header className="top">
        <p className="tagline">
          Call it together
          <br />
          <span>Win together</span>
        </p>
        <a className="logo" href="/" aria-label="Nakama home">
          <img src="/art/v2/nakama-logo.webp" alt="Nakama" width={1200} height={800} />
        </a>
        <div className="top-right">
          <span className={`pill ${writesOn ? 'pill-live' : ''}`}>
            <i />
            {writesOn ? (forkMode ? 'Fork writes' : 'Real USDC') : 'Dry-run'}
          </span>
          <span className="pill">
            <i />
            {status?.rpc ?? '…'} · Walrus
          </span>
        </div>
      </header>

      {loadingCrew ? (
        <main className="state-page" aria-busy="true">
          <img src="/art/v2/nakama-mascot.webp" alt="" width={160} height={160} className="bob" />
          <h1>Finding your crew…</h1>
          <p>Loading the crew and live Predict markets.</p>
        </main>
      ) : crewFailed ? (
        <main className="state-page">
          <img src="/art/v2/nakama-mascot-sad.webp" alt="" width={160} height={160} />
          <h1>Couldn't open this crew</h1>
          <p className="state-error" role="alert">
            {message}
          </p>
          <button
            className="btn btn-go"
            onClick={() => {
              localStorage.removeItem('nakama-crew');
              location.href = '/';
            }}
          >
            Start a new crew
          </button>
        </main>
      ) : (
        <main className="lobby">
          <nav className="side card" aria-label="Sections">
            {[
              ['crew', crew ? 'Crew room' : 'Lobby', '#top'],
              ['calls', 'Make a call', crew ? '#make-a-call' : '#start'],
              ['board', 'Scoreboard', crew ? '#board' : '#how'],
              ['how', 'How it works', '#how'],
            ].map(([id, label, href], i) => (
              <a key={id} href={href} className={i === 0 ? 'on' : ''}>
                <img src={`/art/v2/nakama-icon-${['megaphone', 'rocket-up', 'trophy', 'shield'][i]}.webp`} alt="" width={26} height={26} />
                {label}
              </a>
            ))}
            <div className="side-promo">
              <p>
                Call it.
                <br />
                <span>Tap in.</span>
                <br />
                Win together.
              </p>
              <small>One tap each · everyone signs their own</small>
              <img src="/art/v2/nakama-crew-2.webp" alt="" width={320} height={320} />
            </div>
          </nav>

          {/* The hero card: the live call when there is one, else the next thing to do. */}
          <section className="hero card" id="top" aria-label={crew ? 'Live call' : 'Start your crew'}>
            <img className="hero-mascot" src="/art/v2/nakama-mascot.webp" alt="" width={320} height={320} />
            {!crew ? (
              <div className="hero-body" id="start">
                <span className="tag">Next call</span>
                <p className="eyebrow">Your crew is waiting</p>
                <h1>Call BTC with your nakama</h1>
                <p className="sub">Live 1 and 5 minute markets · real Predict orders · Walrus memory</p>
                <div className="hero-panel">
                  <label className="field">
                    <span>Crew name</span>
                    <input placeholder="e.g. Night Owls" aria-label="Crew name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <div className="panel-stat">
                    <img src="/art/v2/nakama-icon-stopwatch.webp" alt="" width={40} height={40} />
                    <span>
                      <small>Next 5-min close</small>
                      <b className="num">{next5 ? clock(next5.expiryMs) : '—'}</b>
                    </span>
                  </div>
                </div>
                <button className="btn btn-go btn-big" disabled={busy || !name.trim()} onClick={create}>
                  Start a crew <Icon name="up" size={20} />
                </button>
                {!account && (
                  <p className="hint">{viewingAs ? 'No wallet: this becomes a read-only preview crew.' : 'Connect a wallet, or view as a public address on the right.'}</p>
                )}
              </div>
            ) : active ? (
              <div className={`hero-body call ${outOfBand ? 'call-closed' : ''}`} key={active.id}>
                <span className="tag tag-live">
                  <i /> Live call · {active.setup.cadence} min
                </span>
                <p className="eyebrow">
                  <Avatar address={active.caller} size={22} /> <span className="num">{short(active.caller)}</span> {active.caller === owner ? '(you)' : ''} called it
                </p>
                <h1 className={`dir-${active.setup.direction}`}>
                  BTC {active.setup.direction === 'range' ? `${usd(active.strike)}–${usd(active.upper ?? active.strike)}` : `${dirWord(active.setup.direction)} ${usd(active.strike)}`}
                </h1>
                {active.why && <p className="sub why">“{active.why}”</p>}
                <div className="hero-panel">
                  <div className="panel-stat">
                    <Ring seconds={secondsLeft(active.expiryMs)} total={active.setup.cadence * 60} />
                  </div>
                  {odds?.probability != null ? (
                    <div className={`odds ${outOfBand ? 'odds-out' : 'odds-in'}`} aria-live="polite">
                      <span className="odds-top">
                        <small>Predict odds now</small>
                        <b className="num">{pct(odds.probability)}%</b>
                      </span>
                      <span className="odds-bar" aria-hidden="true">
                        <span className="odds-band" style={{ left: `${odds.band.min * 100}%`, width: `${(odds.band.max - odds.band.min) * 100}%` }} />
                        <span className="odds-dot" style={{ left: `${Math.min(100, Math.max(0, odds.probability * 100))}%` }} />
                      </span>
                      <small>{outOfBand ? `Outside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band: Predict won't take new taps` : `Inside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band`}</small>
                    </div>
                  ) : oddsError ? (
                    <small className="state-error">Live odds unavailable: {oddsError}</small>
                  ) : (
                    <small className="muted">Reading Predict odds…</small>
                  )}
                </div>
                <div className="joiners">
                  {active.orders.length ? (
                    active.orders.map((o) => (
                      <span key={o.digest} className="joiner">
                        <Avatar address={o.address} size={26} />
                        <span className="num">{short(o.address)}</span> · {o.size} USDC · {o.status}
                      </span>
                    ))
                  ) : (
                    <span className="muted">Nobody in yet. Be first.</span>
                  )}
                </div>
                {joined ? (
                  <button className={`btn btn-go btn-big ${outOfBand ? 'btn-off' : ''}`} disabled={busy || mineIn || outOfBand} onClick={oneTap}>
                    {busy ? 'Checking Predict…' : mineIn ? "You're in" : outOfBand ? 'Entry closed' : `${liveMode ? 'Tap in' : 'Dry-run tap in'} · ${size} USDC`}
                    {boosted && !mineIn && <span className="boost">×1.5 streak</span>}
                  </button>
                ) : (
                  <p className="hint">Join the crew (right) to tap in on this call.</p>
                )}
                <Recalled ids={active.recalled} />
              </div>
            ) : (
              <div className="hero-body">
                <span className="tag">No live call</span>
                <p className="eyebrow">{crew.name} is ready</p>
                <h1>Post the first call</h1>
                <p className="sub">Pick a live BTC market, above or below a strike, and say why. The crew gets one tap each before it closes.</p>
                <a className="btn btn-go btn-big" href="#make-a-call">
                  Post a call <Icon name="up" size={20} />
                </a>
              </div>
            )}
          </section>

          <div className="modes">
            <button className="mode mode-quick card" onClick={() => pickCadence(1)}>
              <img src="/art/v2/nakama-card-quick.webp" alt="" width={200} height={200} />
              <span>
                <small>Quick call</small>
                <b>1-minute BTC</b>
                <em>Fast and loud. One round.</em>
                <span className="mode-chip num">{next1 ? `closes ${clock(next1.expiryMs)}` : 'next opens soon'}</span>
              </span>
              <i aria-hidden="true">→</i>
            </button>
            <button className="mode mode-battle card" onClick={() => pickCadence(5)}>
              <img src="/art/v2/nakama-card-battle.webp" alt="" width={200} height={200} />
              <span>
                <small>Crew call</small>
                <b>5-minute BTC</b>
                <em>Time to rally the whole crew.</em>
                <span className="mode-chip num">{next5 ? `closes ${clock(next5.expiryMs)}` : 'next opens soon'}</span>
              </span>
              <i aria-hidden="true">→</i>
            </button>
          </div>

          <aside className="player card" aria-label="Your player">
            {owner ? (
              <span className="player-face">
                <Avatar address={owner} size={84} />
              </span>
            ) : (
              <img className="player-face-img" src="/art/v2/nakama-avatar-1.webp" alt="" width={84} height={84} />
            )}
            <p className="eyebrow">Your nakama</p>
            <b className="player-name num">{owner ? short(owner) : 'Connect to play'}</b>
            <div className="badges">
              <span>{me ? `${me.wins}/${me.calls} won` : 'Unranked'}</span>
              {me && me.streak > 0 ? <span className="hot">🔥 {me.streak}</span> : <span>0 streak</span>}
            </div>
            <div className="player-stats">
              <span>
                <b className="num">{forward != null ? usd(forward) : '—'}</b>
                <small>BTC now</small>
              </span>
              <span>
                <b className="num">{crew ? crew.members.length : '—'}</b>
                <small>Crew</small>
              </span>
            </div>
            <div className="connect">
              <ConnectButton />
            </div>
            {crew && (
              <div className="player-actions">
                {!joined ? (
                  <button className="btn btn-blue" disabled={!owner || busy} onClick={join}>
                    <Icon name="plus" size={16} /> {account ? 'Join this crew' : viewingAs ? 'Join preview crew' : 'Add an address to join'}
                  </button>
                ) : (
                  <span className="joined">✓ {account ? "You're in this crew" : 'In the crew'}</span>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${location.origin}/?crew=${crew.id}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Invite copied' : 'Copy invite link'}
                </button>
              </div>
            )}
            {viewAs}
          </aside>

          <section className="record card" aria-label={crew ? "Crew record" : 'Live now'}>
            <p className="record-title">
              <span>{crew ? `${crew.name} · crew record` : "Today's markets"}</span>
            </p>
            <div className="tiles">
              {crew ? (
                <>
                  <Tile icon="trophy" tone="green" value={String(crewWins)} label="Calls won" />
                  <Tile icon="fire" tone="sun" value={String(bestStreak)} label="Best streak" />
                  <Tile icon="gem" tone="grape" value={settledCalls.length ? `${Math.round((crewWins / settledCalls.length) * 100)}%` : '—'} label="Hit rate" />
                  <Tile icon="megaphone" tone="sky" value={String(crew.calls.length)} label="Calls posted" />
                </>
              ) : (
                <>
                  <Tile icon="coin" tone="green" value={forward != null ? usd(forward) : '—'} label="BTC forward" />
                  <Tile icon="stopwatch" tone="sun" value={next1 ? clock(next1.expiryMs) : '—'} label="Next 1-min close" />
                  <Tile icon="shield" tone="grape" value="15–50%" label="Predict entry band" />
                  <Tile icon="gem" tone="sky" value="2 USDC" label="Min tap" />
                </>
              )}
            </div>
          </section>
        </main>
      )}

      <div className="below">
        {tapReceipt}
        {setupNotice}

        {crew && latest?.status === 'settled' && (
          <section className={`card reveal ${latest.orders.some((o) => o.hit) ? 'reveal-win' : 'reveal-loss'}`}>
            <img src={latest.orders.some((o) => o.hit) ? '/art/v2/nakama-mascot-cheer.webp' : '/art/v2/nakama-mascot-sad.webp'} alt="" width={120} height={120} />
            <div>
              <p className="eyebrow">Last call settled</p>
              <h2>
                {latest.orders.filter((o) => o.hit).length} won · {latest.orders.length} joined
              </h2>
              {latest.orders.map((o) => (
                <div key={o.digest} className={`result ${o.hit ? 'win' : 'loss'}`}>
                  <Avatar address={o.address} size={28} />
                  <span className="num">{short(o.address)}</span>
                  <b>{o.hit ? 'WIN' : 'LOSS'}</b>
                  <span className="num">{o.pnl == null ? 'pending' : `${signed(o.pnl)} USDC`}</span>
                  <span className="links">
                    <a href={`https://suiscan.xyz/mainnet/tx/${o.digest}`} target="_blank" rel="noreferrer">order</a>
                    {o.fillDigest && <a href={`https://suiscan.xyz/mainnet/tx/${o.fillDigest}`} target="_blank" rel="noreferrer">fill</a>}
                    {o.payoutDigest && <a href={`https://suiscan.xyz/mainnet/tx/${o.payoutDigest}`} target="_blank" rel="noreferrer">payout</a>}
                  </span>
                </div>
              ))}
              <Recalled ids={latest.memoryBlobId ? [latest.memoryBlobId] : []} />
            </div>
          </section>
        )}

        {crew && (
          <section className="card host" id="make-a-call" aria-label="Make a call">
            <div className="host-side">
              <p className="eyebrow">Post a call</p>
              <h2>Choose your call</h2>
              <p>Pick a live BTC market and a side. Predict prices the strike live; only calls inside its 15–50% entry band can be joined.</p>
              {composer?.hot && (
                <div className="hot">
                  <b>Crew’s hot setup:</b> {composer.hot.setup.cadence}m {composer.hot.setup.direction.toUpperCase()}, won {composer.hot.wins} of {composer.hot.calls}
                  <Recalled ids={composer.hot.blobIds} />
                </div>
              )}
              <img src="/art/v2/nakama-card-host.webp" alt="" width={220} height={220} />
            </div>
            <div className="host-form">
              <div className="seg" role="radiogroup" aria-label="Market">
                {openMarkets.length === 0 && <span className="muted">No BTC market open right now</span>}
                {[next1, next5].filter((m): m is Market => Boolean(m)).map((m) => (
                  <button key={m.id} role="radio" aria-checked={m.id === marketId} className={m.id === marketId ? 'on' : ''} onClick={() => setMarketId(m.id)}>
                    {m.cadence === 1 ? 'Quick · 1 min' : 'Crew · 5 min'} <span className="num">{clock(m.expiryMs)}</span>
                  </button>
                ))}
              </div>
              <div className="dirs" role="radiogroup" aria-label="Direction">
                {(['up', 'down', 'range'] as const).map((d) => (
                  <button key={d} role="radio" aria-checked={direction === d} className={`dir dir-${d} ${direction === d ? 'on' : ''}`} onClick={() => setDirection(d)}>
                    {d !== 'range' && <img src={`/art/v2/nakama-icon-${d === 'up' ? 'rocket-up' : 'anchor-down'}.webp`} alt="" width={30} height={30} />}
                    {d === 'up' ? 'Above' : d === 'down' ? 'Below' : 'Range ↔'}
                  </button>
                ))}
              </div>
              <div className={`grid2 ${direction === 'range' ? '' : 'one'}`}>
                <label className="field">
                  <span>Strike (USD)</span>
                  <input className="num" type="number" step="1" inputMode="numeric" value={strike} placeholder={String(suggestedStrike ?? '')} onChange={(e) => setStrike(e.target.value)} />
                </label>
                {direction === 'range' && (
                  <label className="field">
                    <span>Upper (USD)</span>
                    <input className="num" type="number" step="1" inputMode="numeric" value={upper} onChange={(e) => setUpper(e.target.value)} />
                  </label>
                )}
              </div>
              {draftOdds?.probability != null ? (
                <p className={`odds-hint ${draftOutOfBand ? 'out' : 'in'}`} aria-live="polite">
                  <Icon name={draftOutOfBand ? 'alert' : 'check'} size={16} /> Predict odds at {usd(Number(strikeValue))}: <b className="num">{pct(draftOdds.probability)}%</b>
                  {draftOutOfBand ? ' · outside the entry band, nobody could join. Move it nearer the money.' : ' · inside the entry band, the crew can join'}
                </p>
              ) : !strike && suggestedStrike != null ? (
                <p className="odds-hint">Suggested strike from the live forward: {usd(suggestedStrike)}</p>
              ) : null}
              <label className="field">
                <span>Why</span>
                <input maxLength={280} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What do you see?" />
              </label>
              <button className="btn btn-go btn-big" disabled={!joined || busy || !marketId || !why.trim() || draftOutOfBand} onClick={postCall}>
                Post call to the crew <Icon name="up" size={18} />
              </button>
              {!joined && <p className="hint">Join the crew to post a call.</p>}
            </div>
          </section>
        )}

        {crew && (
          <section className="card scoreboard" id="board" aria-label="Crew scoreboard">
            <header>
              <img src="/art/v2/nakama-icon-trophy.webp" alt="" width={48} height={48} />
              <div>
                <h2>Crew scoreboard</h2>
                <p>{status?.memoryConfigured ? 'From Walrus Memory and settled calls' : 'From on-chain Predict history'}</p>
              </div>
            </header>
            {board.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="r">Won</th>
                    <th className="r">Streak</th>
                    <th className="r">P&amp;L (USDC)</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((m) =>
                    !status?.memoryConfigured && !m.history ? (
                      <tr key={m.address} aria-busy="true">
                        <td>
                          <span className="who">
                            <Avatar address={m.address} size={30} />
                            <span className="num">{short(m.address)}</span>
                          </span>
                        </td>
                        <td colSpan={3} className="muted">
                          Loading history…
                        </td>
                      </tr>
                    ) : (
                      <tr key={m.address} className={m.address === owner ? 'me' : ''}>
                        <td>
                          <span className="who">
                            <Avatar address={m.address} size={30} />
                            <span className="num">{short(m.address)}</span>
                            {m.address === leader && <img className="crown" src="/art/v2/nakama-icon-crown.webp" alt="Crew leader by P&L" width={24} height={24} />}
                          </span>
                        </td>
                        <td className="r num">
                          {m.wins}/{m.calls}
                        </td>
                        <td className="r">{m.streak > 0 ? <span className="streak">🔥 {m.streak}</span> : <span className="muted">0</span>}</td>
                        <td className={`r num ${m.pnl > 0 ? 'pos' : m.pnl < 0 ? 'neg' : ''}`}>{signed(m.pnl)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <div className="empty">
                <img src="/art/v2/nakama-empty.webp" alt="" width={140} height={140} />
                <p>Quiet crew. Join, then share the invite.</p>
              </div>
            )}
            <div className="playbook">
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
                <p className="muted">The playbook is written to Walrus every five settled calls.</p>
              )}
              <button
                className="btn btn-ghost"
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
            </div>
          </section>
        )}

        {account && crew && <FundCard owner={account.address.toLowerCase()} writesOn={writesOn} fork={forkMode} kit={kit} />}

        <section className="how" id="how" aria-label="How a crew call works">
          <h2>How a crew call works</h2>
          <div className="how-grid">
            {[
              ['megaphone', 'Someone calls it', 'Pick a live BTC market, above or below a strike, and say why. Predict odds show before you post.'],
              ['stopwatch', 'The crew taps in', 'Each friend gets one tap before the market closes. Every order is quoted and simulated first.'],
              ['shield', 'Everyone signs their own', 'No pooled funds. Each order is signed in that member’s own wallet, from their own Predict account.'],
              ['trophy', 'The board keeps score', 'Wins, streaks and P&L in USDC from Sui mainnet, with every call remembered on Walrus.'],
            ].map(([icon, title, body], i) => (
              <article key={icon} className={`how-card how-${i}`}>
                <img src={`/art/v2/nakama-icon-${icon}.webp`} alt="" width={72} height={72} />
                <span className="n">{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card markets" aria-label="Live DeepBook Predict markets">
          <header>
            <h2>Live DeepBook Predict markets</h2>
            <span className="muted">via {status?.rpc ?? '…'}</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th className="r">Forward</th>
                <th className="r hide-sm">Above strike</th>
                <th className="r hide-sm">Below strike</th>
                <th className="r">Closes in</th>
              </tr>
            </thead>
            <tbody>
              {openMarkets.length ? (
                [...openMarkets]
                  .sort((a, b) => a.expiryMs - b.expiryMs)
                  .slice(0, 6)
                  .map((m) => (
                    <tr key={m.id}>
                      <td>BTC · {m.cadence} min</td>
                      <td className="r num">{m.forward != null ? usd(m.forward) : '—'}</td>
                      <td className="r num hide-sm">{m.suggestedStrike != null ? usd(m.suggestedStrike) : '—'}</td>
                      <td className="r num hide-sm">{m.suggestedStrikeDown != null ? usd(m.suggestedStrikeDown) : '—'}</td>
                      <td className="r num">{clock(m.expiryMs)}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="muted">
                    No open BTC market right now. New ones open every minute.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <footer className="foot">
        <img src="/art/v2/nakama-mascot.webp" alt="" width={28} height={28} />
        <span>
          <b>NAKAMA</b> 仲間 · DeepBook Predict on Sui mainnet · memory on Walrus · chain reads via {status?.rpc ?? 'configured RPC'} · members sign their own orders · art generated with ChatGPT
        </span>
      </footer>
    </div>
  );
}
