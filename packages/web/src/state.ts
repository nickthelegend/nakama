import { useEffect, useState } from 'react';
import { useCurrentAccount, useCurrentWallet, useDAppKit } from '@mysten/dapp-kit-react';
import { DEMO_WALLET_NAME } from './demo-wallet';
import { net } from './ui';

export type Direction = 'up' | 'down' | 'range';
export type Market = {
  id: string;
  expiryMs: number;
  cadence: 1 | 5;
  forward: number | null;
  referencePrice: number | null;
  suggestedStrike: number | null;
  suggestedStrikeDown: number | null;
};
export type Order = {
  address: string;
  size: number;
  digest: string;
  status: string;
  pnl?: number;
  hit?: boolean;
  fillDigest?: string;
  payoutDigest?: string;
};
export type Call = {
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
  createdAt?: string;
  crewRecord?: { wins: number; calls: number; cold: boolean };
  recalled?: string[];
  memoryBlobId?: string;
};
export type Crew = {
  id: string;
  name: string;
  members: string[];
  calls: Call[];
  readOnlyDemo?: boolean;
  playbook?: { best: string; worst: string; blobId?: string }[];
};
export type Status = { rpc: string; memoryNetwork: string; memoryConfigured: boolean; mainnetWrites: boolean; setup: string[]; fork?: { label?: string; writes?: boolean } | null };
export type History = { complete: boolean; trades: { result: string; side: string | null; strike: number | null; pnl: number | null; digests: { fill: string; payout: string | null } }[]; record: { wins: number; calls: number; streak: number; pnl: number } };
export type MemoryView = {
  record: { wins: number; calls: number; cold: boolean };
  hot: { setup: { cadence: 1 | 5; direction: Direction; strikeDistance: number }; wins: number; calls: number; blobIds: string[] } | null;
  member: { size: number; multiplier: number; streak: number; record: { wins: number; calls: number } } | null;
  recalled: string[];
  memoryError: string | null;
  markets?: Market[];
};
export type PlanResult = {
  quote: { accepting: boolean; refusal?: string; orderFee: number; totalDebit: number };
  dryRun: { status: string; error?: string } | null;
  transaction: string | null;
  mode: string;
  memoryError?: string;
};
export type Odds = { direction: string; probability: number | null; inBand: boolean | null; band: { min: number; max: number }; forward?: number; asOfMs?: number | null; rpc?: string };
export type TapResult = { address: string; totalDebit: number; orderFee: number };
export type BoardRow = { address: string; calls: number; wins: number; pnl: number; streak: number; history: History | null };

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    `/api${path}`,
    body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  );
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw Error(String(j.error ?? `HTTP ${r.status}`).replace(/^Error:\s*/, ''));
  return j as T;
}

export const pct = (p: number) => (p < 0.001 ? '<0.1' : (p * 100).toFixed(1));
export const dirWord = (d: Direction) => (d === 'up' ? 'above' : d === 'down' ? 'below' : 'between');

/** Crews this browser has opened, so the room can list them (the server has no crew index). */
type Known = { id: string; name: string };
export function knownCrews(): Known[] {
  try { return JSON.parse(localStorage.getItem('nakama-crews') ?? '[]') as Known[]; } catch { return []; }
}
function rememberCrew(c: Crew) {
  try {
    const list = knownCrews().filter((k) => k.id !== c.id);
    localStorage.setItem('nakama-crews', JSON.stringify([{ id: c.id, name: c.name }, ...list].slice(0, 12)));
  } catch { /* private mode: the list just stays empty */ }
}

/** Everything the app knows and can do, shared by the lobby, the crew room and the scoreboard. */
export function useNakama() {
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const kit = useDAppKit();
  const [viewAddresses, setViewAddresses] = useState<string[]>(() => {
    const valid = (value: string) => /^0x[0-9a-f]{64}$/i.test(value);
    const query = new URLSearchParams(location.search).getAll('as');
    const saved = JSON.parse(localStorage.getItem('nakama-view-addresses') ?? '[]') as string[];
    return [...new Set([...query, ...saved].filter(valid).map((value) => value.toLowerCase()))].slice(0, 4);
  });
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
  const [marketsError, setMarketsError] = useState<string | null>(null);
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
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recap, setRecap] = useState('');
  const [remembered, setRemembered] = useState('');
  const [histories, setHistories] = useState<Record<string, History>>({});
  const [crewError, setCrewError] = useState<string | null>(null);

  const [crewId, setCrewId] = useState(() => new URLSearchParams(location.search).get('crew') ?? localStorage.getItem('nakama-crew'));
  useEffect(() => {
    const on = () => {
      const q = new URLSearchParams(location.search).get('crew');
      if (q && q !== crewId) setCrewId(q);
    };
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, [crewId]);

  const refresh = async () => {
    const st = await api<Status>('/status');
    net.fork = Boolean(st.fork);
    setStatus(st);
    if (crewId) {
      try {
        const c = await api<Crew>(`/crews/${crewId}`);
        setCrew(c);
        setCrewError(null);
        localStorage.setItem('nakama-crew', c.id);
        rememberCrew(c);
      } catch (e) {
        setCrewError(String((e as Error).message ?? e));
      }
    }
    try {
      const x = await api<{ markets: Market[] }>('/markets');
      setMarkets(x.markets);
      setMarketsError(null);
      setMarketId((v) => (x.markets.some((m) => m.id === v) ? v : (x.markets[0]?.id ?? '')));
    } catch (e) {
      setMarketsError(String((e as Error).message ?? e));
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
    // On a LOCAL FORK there is no member history to scan, so the board counts only this crew's own calls.
    if (!crew || !status || status.memoryConfigured || status.fork) return;
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
      rememberCrew(c);
      // Stay in the page (a reload would drop the connected wallet): switch the crew and update the URL.
      const url = new URL(location.href);
      if (url.pathname === '/') url.pathname = '/app';
      url.searchParams.set('crew', c.id);
      history.pushState(null, '', url);
      dispatchEvent(new PopStateEvent('popstate'));
      setCrew(c);
      setCrewId(c.id);
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

  const size = Math.max(2, suggestion?.member?.size ?? 2);
  const oneTap = () =>
    act(async () => {
      if (!active || !owner || !crew) return;
      const p = await api<PlanResult>(`/calls/${active.id}/plan`, { address: owner, size });
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

  const loadRecap = () =>
    act(async () => {
      if (!crew) return;
      const r = await api<{ text: string }>(`/crews/${crew.id}/recap`);
      setRecap(r.text);
    });

  /** Writes each member's settled on-chain Predict trades to Walrus as result memories (queued on the server). */
  const rememberHistory = () =>
    act(async () => {
      if (!crew) return;
      const r = await api<{ queued: { address: string; trades: number }[] }>(`/crews/${crew.id}/remember-history`, {});
      const n = r.queued.reduce((s, q) => s + q.trades, 0);
      setRemembered(`Queued ${n} settled trade${n === 1 ? '' : 's'} from ${r.queued.length} member${r.queued.length === 1 ? '' : 's'} for Walrus. Each write takes 1 to 5 minutes to certify.`);
    });

  const board: BoardRow[] =
    crew?.members.map((a) => {
      const orders = crew.calls.flatMap((c) => c.orders).filter((o) => o.address === a && o.status === 'settled');
      let streak = 0;
      for (const o of [...orders].reverse()) {
        if (!o.hit) break;
        streak++;
      }
      const history = !status?.memoryConfigured ? histories[a] : null;
      return history
        ? { address: a, ...history.record, history }
        : { address: a, calls: orders.length, wins: orders.filter((o) => o.hit).length, pnl: orders.reduce((n, o) => n + (o.pnl ?? 0), 0), streak, history: null };
    }) ?? [];
  // Crown goes to the member with the best real P&L, only once two or more records are loaded and it is positive.
  const boardLoaded = (m: BoardRow) => Boolean(status?.memoryConfigured || status?.fork || m.history);
  const loaded = board.filter(boardLoaded);
  const best = loaded.length > 1 ? loaded.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const leader = best && best.pnl > 0 ? best.address : null;

  const boosted = suggestion?.member?.multiplier === 1.5;
  const liveMode = writesOn && !viewingAs && !crew?.readOnlyDemo;
  const suggestedStrike = (direction === 'down' ? market?.suggestedStrikeDown : market?.suggestedStrike) ?? null;
  const loadingCrew = !!crewId && !crew && !crewError;
  const crewFailed = !!crewId && !crew && !!crewError;

  const next1 = openMarkets.filter((m) => m.cadence === 1).sort((a, b) => a.expiryMs - b.expiryMs)[0];
  // A 5-minute call needs time for the whole crew to tap in: skip a market with under two minutes left when a later one is open.
  const fives = openMarkets.filter((m) => m.cadence === 5).sort((a, b) => a.expiryMs - b.expiryMs);
  const next5 = fives.find((m) => m.expiryMs - now > 120_000) ?? fives[0];
  // The composer offers the next 1-minute and the next 5-minute market; keep the pick on one of them, same cadence.
  useEffect(() => {
    if (!next1 && !next5) return;
    if (marketId === next1?.id || marketId === next5?.id) return;
    const cur = markets.find((m) => m.id === marketId);
    const pick = cur?.cadence === 1 ? next1 ?? next5 : next5 ?? next1;
    if (pick) setMarketId(pick.id);
  }, [next1?.id, next5?.id, marketId]);
  const forward = markets.find((m) => m.forward != null)?.forward ?? null;
  const clock = (ms: number) => {
    const s = secondsLeft(ms);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const settledCalls = crew?.calls.filter((c) => c.status === 'settled') ?? [];
  const crewWins = settledCalls.filter((c) => c.orders.some((o) => o.hit)).length;
  const bestStreak = board.reduce((n, m) => Math.max(n, m.streak), 0);
  const me = board.find((m) => m.address === owner);
  const demoSigner = !!account && wallet?.name === DEMO_WALLET_NAME;
  const forgetCrew = () => {
    localStorage.removeItem('nakama-crew');
    location.href = '/app';
  };

  return {
    account, kit, owner, viewingAs, viewAddresses, selectView, status, forkMode, writesOn, crew, crewId, markets, marketsError, composer,
    suggestion, name, setName, why, setWhy, marketId, setMarketId, direction, setDirection, strike, setStrike, upper, setUpper,
    message, tapResult, busy, now, recap, remembered, active, latest, joined, mineIn, odds, oddsError, outOfBand, market, strikeValue,
    draftOdds, draftOutOfBand, secondsLeft, openMarkets, create, join, postCall, oneTap, loadRecap, rememberHistory, board, boardLoaded,
    leader, size, boosted, liveMode, suggestedStrike, loadingCrew, crewFailed, crewError, next1, next5, forward, clock, settledCalls,
    crewWins, bestStreak, me, demoSigner, forgetCrew, notify: setMessage,
  };
}
export type N = ReturnType<typeof useNakama>;
