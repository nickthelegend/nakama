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
type Status = { rpc: string; memoryNetwork: string; memoryConfigured: boolean; mainnetWrites: boolean; setup: string[] };
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
  const [heroVideo, setHeroVideo] = useState<'loading' | 'ready' | 'failed'>('loading');
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
      if (!status?.mainnetWrites || viewingAs || crew.readOnlyDemo)
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

  // Hero parallax: the art and stickers drift a few pixels with the pointer (off under reduced motion via CSS).
  const parallax = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const parallaxReset = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--px', '0');
    e.currentTarget.style.setProperty('--py', '0');
  };

  const size = Math.max(2, suggestion?.member?.size ?? 2);
  const boosted = suggestion?.member?.multiplier === 1.5;
  const liveMode = !!status?.mainnetWrites && !viewingAs && !crew?.readOnlyDemo;
  const suggestedStrike = (direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? null;
  const loadingCrew = !!crewId && !crew && !message;
  const crewFailed = !!crewId && !crew && !!message;

  const dirWord = (d: Direction) => (d === 'up' ? 'above' : d === 'down' ? 'below' : 'between');

  const addRow = (
    <div className="row add-row">
      <input
        aria-label="Sui address to view as"
        placeholder="0x… Sui address"
        value={viewInput}
        onChange={(e) => setViewInput(e.target.value)}
      />
      <button
        className="btn btn-ink"
        disabled={!/^0x[0-9a-f]{64}$/i.test(viewInput)}
        onClick={() => {
          const a = viewInput.toLowerCase();
          selectView(a, [...new Set([...viewAddresses, a])].slice(0, 4));
          setViewInput('');
        }}
      >
        View as
      </button>
    </div>
  );

  const viewAs = !account && (
    <section className="card viewas" aria-label="View as address">
      <div className="viewas-head">
        <span className="viewas-icon">
          <Icon name="eye" size={18} />
        </span>
        <div>
          <h2 className="viewas-title">{crew ? 'Switch member' : 'Preview without a wallet'}</h2>
          {viewingAs ? (
            <p className="viewing">
              Viewing as <b className="num">{short(viewingAs)}</b> <span className="ro">read-only, not your wallet</span>
            </p>
          ) : (
            <p className="muted small">Paste a public Sui address that trades on Predict to look around read-only. Nothing gets signed.</p>
          )}
        </div>
      </div>
      {viewAddresses.length > 0 && (
        <div className="chips" role="group" aria-label="Switch member">
          {viewAddresses.map((a) => (
            <button key={a} className="ghost-btn chip" aria-pressed={a === viewingAs} onClick={() => selectView(a)}>
              <Avatar address={a} size={26} />
              <span className="num">{short(a)}</span>
            </button>
          ))}
        </div>
      )}
      {viewAddresses.length < 4 &&
        (crew && viewAddresses.length > 0 ? (
          <details className="add-more">
            <summary>
              <Icon name="plus" size={16} /> Add another address
            </summary>
            {addRow}
          </details>
        ) : (
          addRow
        ))}
    </section>
  );

  const setupNotice = status?.setup.length ? (
    <section className="setup" aria-label="Setup required">
      <span className="setup-icon">
        <Icon name="key" size={18} />
      </span>
      <div>
        <b>Setup required</b>
        <p>
          {status.setup.map((x) => (
            <code key={x}>{x.replace('Setup required: ', '')}</code>
          ))}
        </p>
        <p className="setup-note">Crew memory and the playbook go to Walrus Memory once these keys exist.</p>
      </div>
    </section>
  ) : null;

  const tapReceipt = tapResult ? (
    <section className="toast receipt receipt-ok" role="status">
      <span className="burst" aria-hidden="true" />
      <Sticker name="handshake" className="receipt-sticker" />
      <div className="receipt-head">
        <span className="receipt-badge">
          <Icon name="check" size={22} />
        </span>
        <div>
          <b>Dry-run success</b>
          <span>
            for <span className="num">{short(tapResult.address)}</span> · No order submitted.
          </span>
        </div>
      </div>
      <dl className="receipt-rows">
        <div>
          <dt>Total debit</dt>
          <dd className="num">{tapResult.totalDebit.toFixed(2)} USDC</dd>
        </div>
        <div>
          <dt>Includes fee</dt>
          <dd className="num">{tapResult.orderFee.toFixed(2)} USDC</dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd>Not submitted (dry run)</dd>
        </div>
      </dl>
    </section>
  ) : message ? (
    <section
      className={`toast ${/^(Predict refused|Dry-run (?!success))/.test(message) ? 'toast-bad' : /^(Order queued|Invite)/.test(message) ? 'toast-ok' : 'toast-info'}`}
      role="status"
    >
      {/^(Predict refused|Dry-run (?!success))/.test(message) ? (
        <Sticker name="skull" className="toast-sticker" />
      ) : (
        <Icon name={/^(Order queued|Invite)/.test(message) ? 'check' : 'alert'} size={18} />
      )}
      <span>{message}</span>
    </section>
  ) : null;

  return (
    <div className="shell">
      {account && wallet?.name === DEMO_WALLET_NAME && (
        <div className="demo-signer-badge" role="status">Demo signer · server-held demo key · {String(status?.rpc ?? '').includes('LOCAL FORK') ? 'LOCAL FORK of Sui mainnet · no real funds' : 'real mainnet funds'}</div>
      )}
      <header className="topbar">
        <a className="brand" href="/" aria-label="Nakama home">
          <img src="/art/nakama-mark.webp" alt="" width={40} height={40} />
          <span className="brand-name">Nakama</span>
          <span className="brand-jp" lang="ja">
            仲間
          </span>
        </a>
        <div className="strip" aria-label="Connection status">
          <span className={`pill ${status?.rpc?.startsWith('dev') ? 'pill-warn' : ''}`}>
            <i />
            {status?.rpc ?? 'checking chain'}
          </span>
          <span className="pill">
            <i />
            {status?.memoryNetwork ?? 'Walrus mainnet'}
          </span>
          <span className={`pill ${status?.mainnetWrites ? 'pill-live' : 'pill-dry'}`}>
            <i />
            {status?.mainnetWrites ? 'REAL USDC' : 'DRY-RUN'}
          </span>
        </div>
        <div className="connect">
          <ConnectButton />
        </div>
      </header>

      {loadingCrew ? (
        <main className="state-page" aria-busy="true">
          <img src="/art/nakama-loading.webp" alt="" width={140} height={140} className="bob" />
          <h1>Finding your crew…</h1>
          <p className="muted">Loading the crew and live Predict markets.</p>
        </main>
      ) : crewFailed ? (
        <main className="state-page">
          <img src="/art/nakama-empty-crew.webp" alt="" width={160} height={160} />
          <h1>Couldn't open this crew</h1>
          <p className="state-error" role="alert">
            {message}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              localStorage.removeItem('nakama-crew');
              location.href = '/';
            }}
          >
            Start a new crew
          </button>
        </main>
      ) : !crew ? (
        <main className="landing" id="top">
          <section className="hero">
            <div className="hero-copy">
              <span className="kicker">
                <Icon name="spark" size={15} /> Live BTC calls · DeepBook Predict on Sui
              </span>
              <h1>
                Call it together.
                <br />
                <span>Win together.</span>
              </h1>
              <p className="lede">
                Someone in your crew spots a move and posts a 1- or 5-minute BTC call. Everyone gets one tap to join
                before it closes, and each friend signs their own order.
              </p>
              <section className="card start" aria-label="Start your crew">
                <div className="start-head">
                  <div>
                    <h2>Start your crew</h2>
                    <p className="muted small">Pick a name, then share the invite link with your friends.</p>
                  </div>
                  <span className="art-pile" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <img key={n} src={`/art/nakama-avatar-${n}.webp`} alt="" width={44} height={44} />
                    ))}
                    <i>+</i>
                  </span>
                </div>
                <div className="row">
                  <input placeholder="Crew name" aria-label="Crew name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
                  <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={create}>
                    Create crew
                  </button>
                </div>
                {!account && (
                  <p className="hint">
                    {viewingAs
                      ? 'No wallet connected, so this will be a read-only preview crew.'
                      : 'No wallet connected: connect one, or preview as a public address below.'}
                  </p>
                )}
              </section>
              {tapReceipt}
              {viewAs}
            </div>
            <figure className="hero-art" onPointerMove={parallax} onPointerLeave={parallaxReset}>
              <div className="hero-frame">
              <img
                className="hero-img"
                src="/art/nakama-hero.webp"
                alt="Four friends on a rooftop at night point together at a glowing arrow in the sky"
                width={1536}
                height={1024}
              />
              {/* Optional loop over the poster; if the file is missing or motion is reduced, the poster image stays. */}
              {heroVideo !== 'failed' && (
                <video
                  className={`hero-video ${heroVideo === 'ready' ? 'ready' : ''}`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/art/nakama-hero.webp"
                  src="/art/nakama-hero-loop.mp4"
                  aria-hidden="true"
                  onError={() => setHeroVideo('failed')}
                  onLoadedData={() => setHeroVideo('ready')}
                />
              )}
                <span className="halftone" aria-hidden="true" />
              </div>
              <img className="sticker sticker-a" src="/art/nakama-object-1.webp" alt="" width={150} height={150} />
              <img className="sticker sticker-b" src="/art/nakama-object-2.webp" alt="" width={130} height={130} />
              <Sticker name="rocket" className="sticker sticker-c" />
              <Sticker name="clock" className="sticker sticker-d" />
              <figcaption>
                <span className="bubble bubble-call">
                  <img className="bubble-face" src="/art/nakama-avatar-2.webp" alt="" width={28} height={28} />
                  <Icon name="up" size={16} /> “BTC above the strike, 5 min. Who's in?”
                </span>
                <span className="bubble bubble-reply">
                  One tap each. Everyone signs their own.
                  <img className="bubble-face" src="/art/nakama-avatar-4.webp" alt="" width={28} height={28} />
                </span>
              </figcaption>
            </figure>
          </section>
          {setupNotice}

          <header className="steps-head">
            <p className="eyebrow">How it works</p>
            <h2>One call, one tap each, one scoreboard</h2>
          </header>
          <section className="steps" aria-label="How a crew call works">
            {[
              ['nakama-call-hype', '1', 'Someone calls it', 'Pick a live BTC market, above or below a strike, and say why. Predict odds show under the strike before you post.', 'rocket'],
              ['nakama-tap-in', '2', 'The crew taps in', 'Each friend gets one tap before the market closes. Every order is quoted and simulated first.', 'clock'],
              ['nakama-phone-crew', '3', 'Everyone signs their own', 'No pooled funds. Each order is signed in that member’s own wallet, from their own Predict account.', 'handshake'],
              ['nakama-film-bg-1', '4', 'The board keeps score', 'Each member’s real Predict record from Sui mainnet: wins, P&L in USDC and streaks, with Suiscan links.', 'fire'],
            ].map(([art, n, title, body, stk]) => (
              <article className="step card" key={n} style={{ ['--i' as string]: Number(n) - 1 }}>
                <div className="step-art">
                  <img src={`/art/${art}.webp`} alt="" width={1536} height={1024} loading="lazy" />
                  <Sticker name={stk} className="step-sticker" />
                </div>
                <div>
                  <span className="step-n">{n}</span>
                  <h3>{title}</h3>
                  <p className="muted">{body}</p>
                </div>
              </article>
            ))}
          </section>
          <section className="cta-band" aria-label="Bring your crew">
            <img src="/art/nakama-film-bg-2.webp" alt="" width={1536} height={1024} loading="lazy" />
            <div>
              <h2>Calls are better with your nakama</h2>
              <p>Name a crew, share one link, and make the next BTC call together.</p>
              <a className="btn btn-sun" href="#top">
                Start your crew <Icon name="up" size={16} />
              </a>
            </div>
          </section>
        </main>
      ) : (
        <main className="crew-layout">
          <aside className="rail">
            <section className="card crew-head">
              <div className="crew-banner">
                <img src="/art/nakama-banner.webp" alt="" width={1536} height={512} />
                <span className="halftone" aria-hidden="true" />
              </div>
              <img className="crew-emblem" src="/art/nakama-crew-emblem.webp" alt="" width={84} height={84} />
              <div className="crew-head-body">
                <p className="eyebrow">Your crew · BTC/USD</p>
                <h1>{crew.name}</h1>
                <div className="crew-meta">
                  {crew.readOnlyDemo && <span className="badge-preview">preview crew</span>}
                  <span>
                    {crew.members.length} {crew.members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
                {crew.members.length > 0 && (
                  <div className="facepile" aria-label="Members">
                    {crew.members.map((m) => (
                      <span key={m} title={m}>
                        <Avatar address={m} size={36} ring />
                      </span>
                    ))}
                  </div>
                )}
                <div className="crew-actions">
                  <button
                    className="ghost-btn btn-soft"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${location.origin}/?crew=${crew.id}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Link copied' : 'Copy invite'}
                  </button>
                  {!joined && (
                    <button className="btn btn-primary" disabled={!owner || busy} onClick={join}>
                      <Icon name="plus" size={16} />
                      {account ? 'Join with wallet' : viewingAs ? 'Join preview crew' : 'Enter an address to join'}
                    </button>
                  )}
                  {joined && (
                    <span className="joined-tag">
                      <Sticker name="handshake" className="inline-sticker" /> {account ? "You're in this crew" : 'In the crew'}
                    </span>
                  )}
                </div>
              </div>
            </section>
            {viewAs}
            {setupNotice}
          </aside>

          <section className="thread" aria-label="Crew calls">
            {active ? (
              <article className={`card call ${outOfBand ? 'call-closed' : ''}`} key={active.id}>
                <header className="call-head">
                  <span className="halftone" aria-hidden="true" />
                  <Avatar address={active.caller} size={44} />
                  <div className="call-who">
                    <b className="num">{short(active.caller)}</b>
                    {active.caller === owner && <span className="you">you</span>}
                    <span className="muted small">called it</span>
                  </div>
                  <span className="live-pill">
                    <i /> Live · {active.setup.cadence} min
                  </span>
                </header>
                <div className="call-body">
                  <div className="call-main">
                    <p className="call-kicker">BTC/USD at market close</p>
                    <h2 className={`call-dir dir-${active.setup.direction}`}>
                      <span className="dir-badge">
                        <Icon name={active.setup.direction} size={22} />
                        <Sticker name={active.setup.direction === 'up' ? 'rocket' : 'target'} className="dir-sticker" />
                      </span>
                      <span>
                        {active.setup.direction === 'range'
                          ? `BTC between ${usd(active.strike)}–${usd(active.upper ?? active.strike)}`
                          : `BTC ${dirWord(active.setup.direction)} ${usd(active.strike)}`}
                      </span>
                    </h2>
                    {active.why && <p className="why">“{active.why}”</p>}
                  </div>
                  <div className="ring-wrap">
                    <Ring seconds={secondsLeft(active.expiryMs)} total={active.setup.cadence * 60} />
                    <Sticker name="clock" className={`ring-sticker ${secondsLeft(active.expiryMs) <= 30 ? 'urgent' : ''}`} />
                  </div>
                </div>
                {status?.memoryConfigured && (
                  <p className="muted small">
                    Crew is {active.crewRecord?.wins ?? 0}/{active.crewRecord?.calls ?? 0} on this setup{' '}
                    {active.crewRecord?.cold && <b className="cold">COLD SETUP</b>}
                  </p>
                )}
                <Recalled ids={active.recalled} />
                {odds?.probability != null ? (
                  <div className={`odds ${outOfBand ? 'odds-out' : 'odds-in'}`} aria-live="polite">
                    <div className="odds-top">
                      <span className="odds-label">Predict odds now</span>
                      <b className="odds-value num">{pct(odds.probability)}%</b>
                    </div>
                    <div className="odds-bar" aria-hidden="true">
                      <span className="odds-band" style={{ left: `${odds.band.min * 100}%`, width: `${(odds.band.max - odds.band.min) * 100}%` }} />
                      <span className="odds-dot" style={{ left: `${Math.min(100, Math.max(0, odds.probability * 100))}%` }} />
                    </div>
                    <div className="odds-scale" aria-hidden="true">
                      <span>0%</span>
                      <span style={{ left: `${odds.band.min * 100}%` }}>{odds.band.min * 100}%</span>
                      <span style={{ left: `${odds.band.max * 100}%` }}>{odds.band.max * 100}%</span>
                      <span>100%</span>
                    </div>
                    <p className="odds-note">
                      {pct(odds.probability)}% Predict odds now
                      {outOfBand
                        ? ` · outside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band, so Predict won't take new taps on this strike`
                        : ` · inside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band`}
                    </p>
                  </div>
                ) : !oddsError && active.setup.direction !== 'range' ? (
                  <div className="odds-loading" aria-busy="true">
                    <span className="skeleton" /> Reading Predict odds…
                  </div>
                ) : null}
                {oddsError && <p className="state-error small">Live odds unavailable: {oddsError}</p>}
                <div className="joiners">
                  <span className="joiners-label">In on this call</span>
                  {active.orders.length ? (
                    active.orders.map((o) => (
                      <span key={o.digest} className="joiner">
                        <Avatar address={o.address} size={22} />
                        <span className="num">{short(o.address)}</span> · {o.size} USDC · {o.status}
                      </span>
                    ))
                  ) : (
                    <span className="muted small">Nobody in yet</span>
                  )}
                </div>
                {joined ? (
                  <button className={`tap ${outOfBand ? 'tap-closed' : ''}`} disabled={busy || mineIn || outOfBand} onClick={oneTap}>
                    {busy ? (
                      <>
                        <span className="spinner" /> Checking Predict…
                      </>
                    ) : mineIn ? (
                      <>
                        <Sticker name="handshake" className="inline-sticker" /> You're in
                      </>
                    ) : outOfBand ? (
                      <>
                        <img className="tap-door" src="/art/nakama-entry-closed.webp" alt="" width={56} height={56} /> Entry closed
                      </>
                    ) : (
                      <>
                        {liveMode ? 'Tap in' : 'Dry-run tap in'} · {size} USDC
                        {boosted && <span className="boost">×1.5 streak</span>}
                      </>
                    )}
                  </button>
                ) : (
                  <p className="hint">Join the crew to tap in on this call.</p>
                )}
                <p className="muted small">Minimum 2 USDC. Predict takes a 0.02 USDC fee and rounds to whole lots.</p>
                {status?.memoryConfigured && suggestion?.member && (
                  <p className="muted small">
                    Your record from Walrus Memory {suggestion.member.record.wins}/{suggestion.member.record.calls} · {suggestion.member.streak} win
                    streak
                  </p>
                )}
              </article>
            ) : (
              <section className="card call-empty">
                <div className="empty-art">
                  <img src="/art/nakama-empty-crew.webp" alt="" width={150} height={150} />
                  <Sticker name="moon" className="empty-sticker" />
                </div>
                <div>
                  <h2>No live call</h2>
                  <p className="muted">Post one below. Your crew gets one tap to join before the market closes.</p>
                  <a className="empty-cta" href="#make-a-call">
                    Make a call <Icon name="down" size={16} />
                  </a>
                </div>
              </section>
            )}

            {tapReceipt}

            {latest?.status === 'settled' && (
              <section className="card reveal">
                <header className="reveal-head">
                  <h2>Settled</h2>
                  <p className="big">
                    {latest.orders.filter((o) => o.hit).length} won · {latest.orders.length} joined
                  </p>
                </header>
                {latest.orders.map((o) => (
                  <div key={o.digest} className={`result ${o.hit ? 'win' : 'loss'}`}>
                    <Avatar address={o.address} size={32} />
                    <span className="num">{short(o.address)}</span>
                    <b className="result-tag">
                      {o.hit ? <Sticker name="fire" className="inline-sticker" /> : <Sticker name="skull" className="inline-sticker" />}
                      {o.hit ? 'WIN' : 'LOSS'}
                    </b>
                    <span className="num">{o.pnl == null ? 'pending' : `${signed(o.pnl)} USDC`}</span>
                    <span className="links">
                      <a className="link-pill" href={`https://suiscan.xyz/mainnet/tx/${o.digest}`} target="_blank" rel="noreferrer">
                        order <Icon name="link" size={13} />
                      </a>
                      {o.fillDigest && (
                        <a className="link-pill" href={`https://suiscan.xyz/mainnet/tx/${o.fillDigest}`} target="_blank" rel="noreferrer">
                          fill <Icon name="link" size={13} />
                        </a>
                      )}
                      {o.payoutDigest && (
                        <a className="link-pill" href={`https://suiscan.xyz/mainnet/tx/${o.payoutDigest}`} target="_blank" rel="noreferrer">
                          payout <Icon name="link" size={13} />
                        </a>
                      )}
                    </span>
                  </div>
                ))}
                <Recalled ids={latest.memoryBlobId ? [latest.memoryBlobId] : []} />
              </section>
            )}

            <section className="card composer" id="make-a-call" aria-label="Make a call">
              <header className="composer-head">
                {owner ? <Avatar address={owner} size={40} /> : <span className="avatar avatar-empty" aria-hidden="true" />}
                <div>
                  <h2>Make a call</h2>
                  <p className="muted small">Your crew gets one tap to join before the market closes.</p>
                </div>
              </header>
              {composer?.hot && (
                <div className="hot">
                  <b>Crew’s hot setup</b> {composer.hot.setup.cadence}m {composer.hot.setup.direction.toUpperCase()}, won {composer.hot.wins} of{' '}
                  {composer.hot.calls}
                  <Recalled ids={composer.hot.blobIds} />
                </div>
              )}
              <label className="field">
                <span>Market</span>
                <select value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                  {openMarkets.length === 0 && <option value="">No BTC market open right now</option>}
                  {openMarkets.map((m) => (
                    <option key={m.id} value={m.id}>
                      BTC {m.cadence} min · closes in {secondsLeft(m.expiryMs)}s
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <span id="dir-label">Direction</span>
                <div className="dirs" role="radiogroup" aria-labelledby="dir-label">
                  {(['up', 'down', 'range'] as const).map((d) => (
                    <button
                      key={d}
                      role="radio"
                      aria-checked={direction === d}
                      className={`dir dir-${d} ${direction === d ? 'on' : ''}`}
                      onClick={() => setDirection(d)}
                    >
                      {d === 'up' ? 'Above ↑' : d === 'down' ? 'Below ↓' : 'Range ↔'}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`strike-row ${direction === 'range' ? 'two' : ''}`}>
                <label className="field">
                  <span>Strike (USD)</span>
                  <input
                    className="num"
                    type="number"
                    step="1"
                    inputMode="numeric"
                    value={strike}
                    placeholder={String(suggestedStrike ?? '')}
                    onChange={(e) => setStrike(e.target.value)}
                  />
                  <Sticker name="target" className="field-sticker" />
                </label>
                {direction === 'range' && (
                  <label className="field">
                    <span>Upper (USD)</span>
                    <input className="num" type="number" step="1" inputMode="numeric" value={upper} onChange={(e) => setUpper(e.target.value)} />
                  </label>
                )}
              </div>
              {!strike && suggestedStrike != null && <p className="field-note">Suggested strike from the live forward: {usd(suggestedStrike)}</p>}
              {draftOdds?.probability != null ? (
                <p className={`odds-hint ${draftOutOfBand ? 'odds-hint-out' : 'odds-hint-in'}`} aria-live="polite">
                  <Icon name={draftOutOfBand ? 'alert' : 'check'} size={17} />
                  <span>
                    Predict odds at {usd(Number(strikeValue))}: <b className="num">{pct(draftOdds.probability)}%</b>
                    {draftOutOfBand
                      ? ` · outside the ${draftOdds.band.min * 100}–${draftOdds.band.max * 100}% entry band, so nobody could join. Move it nearer the money.`
                      : ` · inside the entry band, the crew can join`}
                  </span>
                </p>
              ) : direction !== 'range' && Number(strikeValue) > 0 ? (
                <p className="odds-pending" aria-busy="true">
                  <span className="skeleton" /> Reading Predict odds…
                </p>
              ) : null}
              <label className="field">
                <span>Why</span>
                <input maxLength={280} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What do you see?" />
              </label>
              {status?.memoryConfigured && (
                <p className="muted small">
                  Crew record on this setup: {composer?.record.wins ?? 0}/{composer?.record.calls ?? 0}
                </p>
              )}
              <button className="btn btn-primary btn-post" disabled={!joined || busy || !marketId || !why.trim() || draftOutOfBand} onClick={postCall}>
                Post call to the crew
              </button>
              {!joined && <p className="hint">Join the crew to post a call.</p>}
            </section>
          </section>

          <aside className="board-col">
            <section className="card board-card" aria-label="Crew board">
              <header className="board-head">
                <img className="podium" src="/art/nakama-board-podium.webp" alt="" width={72} height={72} />
                <div>
                  <h2>Crew board</h2>
                  <p className="muted small">{status?.memoryConfigured ? 'from Walrus Memory' : 'from on-chain history · recent queue events'}</p>
                </div>
              </header>
              {board.length ? (
                <ol className="members">
                  {board.map((m) =>
                    !status?.memoryConfigured && !m.history ? (
                      <li className="member member-loading" key={m.address} aria-busy="true">
                        <div className="member-top">
                          <Avatar address={m.address} size={40} />
                          <span className="num">{short(m.address)}</span>
                          <span className="muted small">Loading history…</span>
                        </div>
                        <span className="skeleton skeleton-wide" />
                      </li>
                    ) : (
                      <li className={`member ${m.address === leader ? 'member-lead' : ''}`} key={m.address}>
                        <div className="member-top">
                          <span className="avatar-slot">
                            <Avatar address={m.address} size={40} />
                            {m.address === leader && <Sticker name="crown" className="crown" label="Crew leader by P&L" />}
                          </span>
                          <div className="member-id">
                            <span className="num">{short(m.address)}</span>
                            {m.address === owner && <span className="you">viewing</span>}
                          </div>
                          <div className="member-pnl">
                            <b className={`num ${m.pnl > 0 ? 'pos' : m.pnl < 0 ? 'neg' : ''}`}>{signed(m.pnl)}</b>
                            <small>USDC P&amp;L</small>
                          </div>
                        </div>
                        <div className="member-stats">
                          <span>
                            <b className="num">{m.wins}</b>/{m.calls} won
                          </span>
                          {m.streak > 0 && (
                            <span className="streak">
                              <Sticker name="fire" className="inline-sticker" />
                              {m.streak} win streak
                            </span>
                          )}
                        </div>
                        <div className="winbar" aria-hidden="true">
                          <span style={{ width: `${m.calls ? (m.wins / m.calls) * 100 : 0}%` }} />
                        </div>
                        {m.history?.trades.slice(0, 2).map((trade) => (
                          <div className="trade" key={trade.digests.fill}>
                            <span className="trade-text">
                              <span className={`side side-${trade.side ?? 'na'}`}>{trade.side ?? 'Predict'}</span>
                              {trade.strike == null ? '' : <span className="num">{usd(trade.strike)}</span>}
                              <span>· {trade.result} ·</span>
                              <span className="num">{trade.pnl == null ? 'pending' : `${signed(trade.pnl)} USDC`}</span>
                            </span>
                            <span className="links">
                              <a className="link-pill" href={`https://suiscan.xyz/mainnet/tx/${trade.digests.fill}`} target="_blank" rel="noreferrer">
                                fill <Icon name="link" size={13} />
                              </a>
                              {trade.digests.payout && (
                                <a className="link-pill" href={`https://suiscan.xyz/mainnet/tx/${trade.digests.payout}`} target="_blank" rel="noreferrer">
                                  payout <Icon name="link" size={13} />
                                </a>
                              )}
                            </span>
                          </div>
                        ))}
                        {m.history && !m.history.complete && <p className="muted tiny">Recent history shown</p>}
                      </li>
                    ),
                  )}
                </ol>
              ) : (
                <div className="board-empty">
                  <div className="empty-art">
                    <img src="/art/nakama-empty-crew.webp" alt="" width={120} height={120} />
                    <Sticker name="moon" className="empty-sticker" />
                  </div>
                  <p className="muted">Quiet crew. Join, then share the invite.</p>
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
                  <p className="muted small">The playbook is written to Walrus every five settled calls.</p>
                )}
                <button
                  className="ghost-btn btn-soft"
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
          </aside>
        </main>
      )}

      <footer className="foot">
        DeepBook Predict on Sui mainnet · memory on Walrus · chain reads via {status?.rpc ?? 'configured RPC'} · wallet members sign their own
        orders · art generated with ChatGPT
      </footer>
    </div>
  );
}
