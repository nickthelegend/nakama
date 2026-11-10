import { useEffect, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import type { Call, Crew, Direction, Market, N, Order } from './state';
import { api, dirWord, pct } from './state';
import { ModeBadge } from './hud';
import { Avatar, Ic, Notice, OddsBar, Recalled, TokenLogo, Tx, crewChar, short, signed, toneOf, usd } from './ui';

export const callTitle = (c: Pick<Call, 'setup' | 'strike' | 'upper'>) =>
  c.setup.direction === 'range' ? `BTC ${usd(c.strike)}–${usd(c.upper ?? c.strike)}` : `BTC ${dirWord(c.setup.direction)} ${usd(c.strike)}`;
const callStatus = (c: Call, now: number): [string, string] =>
  c.status === 'settled' ? ['SETTLED', 'mint'] : c.status === 'live' && c.expiryMs > now ? ['LIVE', 'butter'] : c.status === 'live' ? ['CLOSED', 'pink'] : [c.status.toUpperCase(), 'pink'];

/** The live call, as a chunky coral card: market, strike, countdown, the caller's why, live odds and who's in. */
export function LiveCall({ n, call }: { n: N; call: Call }) {
  const s = n.secondsLeft(call.expiryMs);
  const members = n.crew?.members ?? [];
  const tapped = new Set(call.orders.map((o) => o.address));
  return (
    <div className={`call-card ${n.outOfBand ? 'call-closed' : ''} dir-${call.setup.direction}`} data-film="live-call">
      <div className="cc-top">
        <TokenLogo sym="BTC" size={44} />
        <div className="mt-id">
          <span className="mt-k">LIVE CALL · BY {call.caller === n.owner ? 'YOU' : short(call.caller).toUpperCase()} · {call.setup.cadence}-MIN MARKET</span>
          <b>{callTitle(call)}</b>
        </div>
        <CallRing seconds={s} total={call.setup.cadence * 60} label={n.clock(call.expiryMs)} />
      </div>
      {call.why && <p className="cc-why">“{call.why}”</p>}
      <a className="cc-market" href={`https://suiscan.xyz/mainnet/object/${call.marketId}`} target="_blank" rel="noreferrer" data-film="market-link">DeepBook Predict market {short(call.marketId)} · on SuiScan (Sui mainnet)</a>
      <div className="cc-odds">
        {call.setup.direction === 'range' ? (
          <small className="faint">Range calls have no single-strike odds; Predict quotes them when you tap.</small>
        ) : n.odds?.probability != null ? (
          <OddsBar odds={n.odds} />
        ) : n.oddsError ? (
          <small className="bad-ink">Live odds unavailable: {n.oddsError}</small>
        ) : (
          <small className="faint">Reading Predict odds…</small>
        )}
      </div>
      <div className="mt-seats" data-film="taps" aria-label={`${tapped.size} of ${members.length} tapped in`}>
        <span className="mt-v">{tapped.size}/{members.length || 0} tapped in</span>
        {members.map((a) => <i key={a} className={tapped.has(a) ? 'on' : ''} title={`${short(a)} ${tapped.has(a) ? 'is in' : 'not in yet'}`} />)}
      </div>
      {call.orders.length > 0 && (
        <div className="cc-orders">
          {call.orders.map((o) => (
            <span key={o.digest} className="cc-order"><Avatar address={o.address} size={24} /><b>{short(o.address)}</b> {o.size} USDC · {o.status} <Tx digest={o.digest} label="order" /></span>
          ))}
        </div>
      )}
      <Recalled ids={call.recalled} />
      {n.forkMode && call.orders.length > 0 && (
        <p className="cc-fork" data-film="fork-limit">On the fork these orders stay <b>queued</b>: fills and Pyth settlement need DeepBook’s keeper, which only runs on mainnet.</p>
      )}
      <ModeBadge n={n} />
    </div>
  );
}

/** The call's countdown as a chunky ring that drains, and pulses in the last 30 seconds. */
function CallRing({ seconds, total, label }: { seconds: number; total: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <div className={`ring3 ${seconds <= 30 ? 'urgent' : ''}`} role="timer" aria-label={`${seconds} seconds until the market closes`} data-film="ring">
      <svg viewBox="0 0 72 72" width="76" height="76" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="ring3-track" />
        <circle cx="36" cy="36" r={r} className="ring3-fill" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 36 36)" />
      </svg>
      <span><b className="mono">{label}</b><small>left</small></span>
    </div>
  );
}

/** The one primary action for the live call. */
export function TapButton({ n, xl }: { n: N; xl?: boolean }) {
  const a = n.active;
  if (!n.crew) return null;
  if (!n.joined)
    return (
      <button className={`b3 b3-plum ${xl ? 'b3-xl' : ''}`} disabled={!n.owner || n.busy} onClick={n.join} data-film="join-btn">
        <Ic name="plus" size={18} />{n.owner ? (n.account ? 'JOIN THIS CREW' : 'JOIN THE PREVIEW CREW') : 'CONNECT TO JOIN'}
      </button>
    );
  if (!a) return <a className={`b3 ${xl ? 'b3-xl' : ''}`} href="#make-a-call" data-film="post-btn">POST A CALL <Ic name="arrow" size={18} /></a>;
  return (
    <button className={`b3 ${xl ? 'b3-xl' : ''} ${n.outOfBand || n.mineIn ? 'b3-off' : ''}`} disabled={n.busy || n.mineIn || n.outOfBand} onClick={n.oneTap} data-film="tap-btn">
      {n.busy ? 'CHECKING PREDICT…' : n.mineIn ? "YOU'RE IN" : n.outOfBand ? 'ENTRY CLOSED' : `${n.liveMode ? 'TAP IN' : 'DRY-RUN TAP IN'} · ${n.size} USDC`}
      {n.boosted && !n.mineIn && <span className="boost">×1.5 streak</span>}
    </button>
  );
}

/** The result of the last tap or action: a dry-run receipt, an order, or a readable error. */
export function Toast({ n }: { n: N }) {
  if (n.tapResult)
    return (
      <div className="toast3 ok" role="status" data-film="tap-result">
        <img src="/art/v2/nakama-mascot-cheer.webp" alt="" />
        <span><b>Dry-run success · no order sent</b><small><span className="mono">{short(n.tapResult.address)}</span> would pay <b className="mono">{n.tapResult.totalDebit.toFixed(2)} USDC</b> (fee <span className="mono">{n.tapResult.orderFee.toFixed(2)}</span> USDC)</small></span>
      </div>
    );
  if (!n.message) return null;
  const bad = /^(Predict refused|Dry-run (?!success))/.test(n.message);
  const ok = /^(Order queued|Deposited)/.test(n.message);
  return (
    <div className={`toast3 ${bad ? 'bad' : ok ? 'ok' : ''}`} role="status" data-film="toast">
      <img src={bad ? '/art/v2/nakama-mascot-sad.webp' : ok ? '/art/v2/nakama-mascot-cheer.webp' : '/art/v2/nakama-mascot.webp'} alt="" />
      <span>{ok && /^Order queued: (\S+)$/.test(n.message) ? <><b>Order queued{n.forkMode ? ' on the LOCAL FORK' : ''}</b><small>Signed in your own wallet · <Tx digest={n.message.split(': ')[1]} label="order" /></small></> : ok && /^Deposited.*: (\S+)$/.test(n.message) ? <><b>{n.message.split(': ')[0]}</b><small>Into your own Predict account · <Tx digest={n.message.split(': ')[1]} label="deposit" /></small></> : <small>{n.message}</small>}</span>
    </div>
  );
}

type Ev = { key: string; kind: 'join' | 'call' | 'tap' | 'result' | 'closed'; who: string; call?: Call; order?: Order };
/** The crew's story as chat events, built from real crew data: joins, calls, taps and settled results. */
export function crewEvents(crew: Crew, now: number): Ev[] {
  const out: Ev[] = crew.members.map((a) => ({ key: `j${a}`, kind: 'join', who: a }));
  for (const c of crew.calls) {
    out.push({ key: `c${c.id}`, kind: 'call', who: c.caller, call: c });
    for (const o of c.orders) out.push({ key: `t${o.digest}`, kind: 'tap', who: o.address, call: c, order: o });
    for (const o of c.orders) if (o.status === 'settled') out.push({ key: `r${o.digest}`, kind: 'result', who: o.address, call: c, order: o });
    if (c.orders.length === 0 && (c.status === 'expired' || (c.status === 'live' && c.expiryMs <= now))) out.push({ key: `x${c.id}`, kind: 'closed', who: c.caller, call: c });
  }
  return out;
}

export function EventRow({ e, n }: { e: Ev; n: N }) {
  const who = e.who === n.owner ? 'You' : short(e.who);
  if (e.kind === 'call' && e.call)
    return (
      <div className={`th-msg ${e.who === n.owner ? 'mine' : ''}`}>
        <Avatar address={e.who} />
        <span className="th-bubble"><b>{who}</b> <span className="mono cmd3">{callTitle(e.call)} · {e.call.setup.cadence}m</span>{e.call.why ? ` ${e.call.why}` : ''}</span>
      </div>
    );
  const tone = e.kind === 'join' ? 'butter' : e.kind === 'tap' ? 'coral' : e.kind === 'closed' ? 'pink' : e.order?.hit ? 'mint' : 'pink';
  return (
    <div className={`th-event tone-${tone}`}>
      <Avatar address={e.who} />
      <span>
        {e.kind === 'closed' ? <><b>{who === 'You' ? 'Your' : `${who}'s`}</b> call closed with nobody in</> : <><b>{who}</b>{' '}</>}
        {e.kind === 'join' && 'joined the crew'}
        {e.kind === 'tap' && `tapped in · ${e.order!.size} USDC`}
        {e.kind === 'result' && (e.order!.hit ? `won ${e.order!.pnl != null ? `${signed(e.order!.pnl)} USDC` : ''}` : `lost ${e.order!.pnl != null ? `${signed(e.order!.pnl)} USDC` : ''}`)}
      </span>
      {e.kind === 'tap' && <Tx digest={e.order!.digest} />}
      {e.kind === 'result' && (e.order!.payoutDigest ? <Tx digest={e.order!.payoutDigest} /> : e.order!.fillDigest ? <Tx digest={e.order!.fillDigest} /> : null)}
    </div>
  );
}

/** Your player: who you are in this crew, your record, the wallet and the read-only switcher. */
export function PlayerCard({ n }: { n: N }) {
  const [copied, setCopied] = useState(false);
  const crew = n.crew;
  const copy = () => {
    if (!crew) return;
    void navigator.clipboard?.writeText(`${location.origin}/app?crew=${crew.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 8000);
  };
  return (
    <aside className="player2 c3" aria-label="Your player" data-film="player">
      <span className={`p2-av ${n.owner ? `tone-${toneOf(n.owner)}` : 'tone-butter'}`}><img src={n.owner ? `/art/v2/nakama-crew-${crewChar(n.owner)}.webp` : '/art/v2/nakama-mascot.webp'} alt="" /></span>
      <div className="p2-main">
        <span className="k">YOUR NAKAMA</span>
        <b className="p2-name">{n.owner ? short(n.owner) : 'Connect to play'}</b>
        <span className="chips3">
          <span className="chip3"><Ic name="crews" size={12} />{crew && n.joined ? crew.name : 'No crew yet'}</span>
          <span className="chip3"><Ic name={n.account ? 'key' : 'eye'} size={12} />{n.account ? 'Your wallet' : n.viewingAs ? 'Read-only view' : 'No wallet yet'}</span>
        </span>
      </div>
      <div className="p2-stats">
        <span><small>Won</small><b>{n.me && n.boardLoaded(n.me) ? `${n.me.wins}/${n.me.calls}` : '–'}</b></span>
        <span><small>Streak</small><b>{n.me && n.boardLoaded(n.me) ? n.me.streak : '–'}</b></span>
        <span><small>P&amp;L (USDC)</small><b className={n.me && n.me.pnl > 0 ? 'up' : n.me && n.me.pnl < 0 ? 'down' : ''}>{n.me && n.boardLoaded(n.me) ? signed(n.me.pnl) : '–'}</b></span>
      </div>
      {crew && !n.joined && <TapButton n={n} />}
      {crew && n.joined && (
        <button className="b3 b3-plum" onClick={copy} data-film="invite" data-invite={`${location.origin}/app?crew=${crew.id}`}><Ic name={copied ? 'check' : 'copy'} size={16} />{copied ? 'INVITE COPIED' : 'COPY INVITE LINK'}</button>
      )}
      {crew && n.joined && copied && <span className="invite-url mono" data-film="invite-url">{`${location.origin}/app?crew=${crew.id}`}</span>}
      <div className="connect"><ConnectButton /></div>
      {!n.account && <ViewAs n={n} />}
    </aside>
  );
}

function ViewAs({ n }: { n: N }) {
  const [input, setInput] = useState('');
  const valid = /^0x[0-9a-f]{64}$/i.test(input);
  return (
    <div className="viewas">
      <span className="viewas-k"><Ic name="eye" size={14} />{n.viewingAs ? 'Viewing read-only as' : 'No wallet? Look around read-only'}</span>
      {n.viewAddresses.length > 0 && (
        <div className="chips-row" role="group" aria-label="Switch member">
          {n.viewAddresses.map((a) => (
            <button key={a} className="vchip" aria-pressed={a === n.viewingAs} onClick={() => n.selectView(a)}>
              <Avatar address={a} size={22} /><span className="mono">{short(a)}</span>
            </button>
          ))}
        </div>
      )}
      {n.viewAddresses.length < 4 && (
        <form className="addr-row" onSubmit={(e) => { e.preventDefault(); if (!valid) return; const a = input.toLowerCase(); n.selectView(a, [...new Set([...n.viewAddresses, a])].slice(0, 4)); setInput(''); }}>
          <input className="input" aria-label="Sui address to view as" placeholder="0x… any Sui address" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn btn-plum btn-sm" disabled={!valid}>View</button>
        </form>
      )}
    </div>
  );
}

/** The crew as its members: one character each, with their position on the live call or their record. */
export function CrewCard({ n }: { n: N }) {
  const crew = n.crew;
  return (
    <section className="crew2 c3" aria-label="The crew" data-film="members">
      <div className="row-between"><span className="k">THE CREW</span><span className="chip3">everyone signs their own</span></div>
      {!crew || crew.members.length === 0 ? (
        <p className="mini" style={{ marginTop: 10 }}>{crew ? 'Nobody yet. Join, then share the invite link.' : 'Start a crew, then share the invite link with friends.'}</p>
      ) : (
        <div className="members2">
          {crew.members.map((a) => {
            const o = n.active?.orders.find((x) => x.address === a);
            const row = n.board.find((m) => m.address === a);
            return (
              <div key={a} className="m2">
                <span className={`m2-av tone-${toneOf(a)}`}><img src={`/art/v2/nakama-crew-${crewChar(a)}.webp`} alt="" />{a === n.leader && <i title="Crew leader by P&L"><img src="/art/v2/nakama-icon-crown.webp" alt="Crew leader" /></i>}</span>
                <b>{a === n.owner ? 'You' : short(a)}</b>
                <small>{n.active ? (o ? `in · ${o.size} USDC` : 'not in yet') : row && n.boardLoaded(row) ? `${row.wins}/${row.calls} won` : 'loading record…'}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Quick (1-minute) and crew (5-minute) BTC markets, each with its live countdown. */
export function Duo({ n }: { n: N }) {
  const pick = (m: Market | undefined) => {
    if (m) n.setMarketId(m.id);
    document.getElementById(n.crew ? 'make-a-call' : 'start')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <div className="duo">
      <button className="duo-card c3 duo-butter" onClick={() => pick(n.next1)} data-film="quick">
        <span className="row" style={{ gap: 8 }}><img className="duo-ic" src="/art/v2/nakama-card-quick.webp" alt="" /><span className="duo-cmd mono">{n.next1 ? `closes ${n.clock(n.next1.expiryMs)}` : 'next opens soon'}</span></span>
        <b>Quick call</b><small>1-minute BTC. Fast and loud.</small>
      </button>
      <button className="duo-card c3 duo-mint" onClick={() => pick(n.next5)} data-film="crew-call">
        <span className="row" style={{ gap: 8 }}><img className="duo-ic" src="/art/v2/nakama-card-battle.webp" alt="" /><span className="duo-cmd mono">{n.next5 ? `closes ${n.clock(n.next5.expiryMs)}` : 'next opens soon'}</span></span>
        <b>Crew call</b><small>5-minute BTC. Rally everyone.</small>
      </button>
    </div>
  );
}

/** The crew record as a till receipt, then each tap and result as a ticket. */
export function Receipts({ n }: { n: N }) {
  const crew = n.crew;
  const orders = crew ? crew.calls.flatMap((c) => c.orders.map((o) => ({ o, c }))).reverse().slice(0, 10) : [];
  return (
    <section className="receipts2" aria-label={crew ? 'Crew record' : 'Live markets'}>
      <div className="till">
        <span className="till-h">NAKAMA 仲間{crew ? ` · ${crew.name.toUpperCase()}` : ''}</span>
        <span className="till-c"><small>BTC NOW</small><b className="row" style={{ gap: 6 }}><TokenLogo sym="BTC" size={20} />{n.forward != null ? usd(n.forward) : '–'}</b></span>
        {crew ? (
          <>
            <span className="till-c"><small>CALLS</small><b>{crew.calls.length}</b></span>
            <span className="till-c"><small>CALLS WON</small><b>{n.crewWins}</b></span>
            <span className="till-c"><small>HIT RATE</small><b>{n.settledCalls.length ? `${Math.round((n.crewWins / n.settledCalls.length) * 100)}%` : '–'}</b></span>
            <span className="till-c"><small>BEST STREAK</small><b>{n.bestStreak}</b></span>
            <span className="till-c"><small>MEMBERS</small><b>{crew.members.length}</b></span>
          </>
        ) : (
          <>
            <span className="till-c"><small>NEXT 1-MIN</small><b>{n.next1 ? n.clock(n.next1.expiryMs) : '–'}</b></span>
            <span className="till-c"><small>NEXT 5-MIN</small><b>{n.next5 ? n.clock(n.next5.expiryMs) : '–'}</b></span>
            <span className="till-c"><small>ENTRY BAND</small><b>15–50%</b></span>
            <span className="till-c"><small>MIN TAP</small><b className="row" style={{ gap: 6 }}><TokenLogo sym="USDC" size={20} />2</b></span>
          </>
        )}
        <span className={`stamp ${n.status?.memoryConfigured && !n.forkMode ? '' : 'bad'}`} title={n.forkMode ? 'Nothing from the LOCAL FORK is written to Walrus mainnet' : n.status?.memoryConfigured ? 'Joins, calls and results are written to Walrus Memory mainnet' : 'Walrus Memory keys are not set on this server'} data-film="memory-stamp">
          {n.forkMode ? 'WALRUS: NOT WRITTEN ON FORK' : n.status?.memoryConfigured ? 'WALRUS MEMORY ON' : 'MEMORY: SETUP REQUIRED'}
        </span>
      </div>
      {orders.length > 0 && (
        <div className="tickets" role="list" aria-label="Latest taps and results">
          {orders.map(({ o, c }) => {
            const [k, tone] = o.status === 'settled' ? (o.hit ? ['WIN', 'mint'] : ['LOSS', 'pink']) : ['TAP IN', 'coral'];
            return (
              <div key={o.digest} className={`ticket tk-${tone}`} role="listitem">
                <span className="tk-k">{k} · {callTitle(c).replace('BTC ', '')}</span>
                <span className="row" style={{ gap: 6 }}><Avatar address={o.address} /><b>{short(o.address)}</b></span>
                <span className="tk-amt"><TokenLogo sym="USDC" size={16} />{o.status === 'settled' && o.pnl != null ? `${signed(o.pnl)} USDC` : `${o.size} USDC · ${o.status}`}</span>
                <span className="tk-b"><Tx digest={o.payoutDigest ?? o.digest} label={o.payoutDigest ? 'payout' : 'order'} /></span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Pyth settled the last call: a big cheer or a big cry, then who won, who lost, every SuiScan link and its Walrus memory. */
export function ResultCard({ n }: { n: N }) {
  const c = n.latest;
  if (!c || c.status !== 'settled') return null;
  const winners = c.orders.filter((o) => o.hit).length;
  const won = winners > 0;
  const net = c.orders.reduce((s, o) => s + (o.pnl ?? 0), 0);
  return (
    <section className={`c3 reveal3 ${won ? 'win' : 'loss'}`} aria-label="Last call settled" data-film="result">
      <div className="fx" aria-hidden>{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
      <div className="reveal-cat">
        <img src={won ? '/art/v2/nakama-mascot-cheer.webp' : '/art/v2/nakama-mascot-sad.webp'} alt={won ? 'The lucky cat cheers' : 'The lucky cat cries'} />
      </div>
      <div className="reveal-body">
        <span className="k">LAST CALL SETTLED · PYTH PRICE · {callTitle(c).toUpperCase()}</span>
        <h2 className="reveal-big">{won ? (winners === c.orders.length ? 'THE CREW WON!' : `${winners} OF ${c.orders.length} WON!`) : 'NOT THIS TIME'}</h2>
        <p className="reveal-net">Crew net <b className={net > 0 ? 'up' : net < 0 ? 'down' : ''}>{signed(net)} USDC</b> · {c.orders.length} tapped in</p>
        {c.orders.map((o) => (
          <div key={o.digest} className={`result3 ${o.hit ? 'win' : 'loss'}`}>
            <Avatar address={o.address} size={30} />
            <span className="mono">{short(o.address)}</span>
            <b>{o.hit ? 'WIN' : 'LOSS'}</b>
            <span className="mono">{o.pnl == null ? 'pending' : `${signed(o.pnl)} USDC`}</span>
            <span className="links"><Tx digest={o.digest} label="order" />{o.fillDigest && <Tx digest={o.fillDigest} label="fill" />}{o.payoutDigest && <Tx digest={o.payoutDigest} label="payout" />}</span>
          </div>
        ))}
        <Recalled ids={c.memoryBlobId ? [c.memoryBlobId] : []} label="Written to Walrus" />
      </div>
    </section>
  );
}

/** Post a call: market, side, strike and why. Live Predict odds block anything outside the 15–50% band. */
export function CallBuilder({ n, compact }: { n: N; compact?: boolean }) {
  const dirs: [Direction, string][] = [['up', 'Above'], ['down', 'Below'], ['range', 'Range']];
  const ready = n.joined && !n.busy && !!n.marketId && !!n.why.trim() && !n.draftOutOfBand;
  return (
    <section className={`builder2 c3 ${compact ? 'compact' : ''}`} id="make-a-call" aria-label="Post a call" data-film="builder">
      <div className="sec-head"><div><span className="k">POST A CALL</span><h2>Build your call</h2></div></div>
      {!compact && <p className="mini">Pick a live BTC market, a side and a strike, then say why. The crew gets one tap each before it closes.</p>}
      {n.composer?.hot && (
        <div className="hot3">
          <b>Crew’s hot setup:</b> {n.composer.hot.setup.cadence}m {n.composer.hot.setup.direction === 'up' ? 'above' : n.composer.hot.setup.direction === 'down' ? 'below' : 'range'}, won {n.composer.hot.wins} of {n.composer.hot.calls}
          <Recalled ids={n.composer.hot.blobIds} />
        </div>
      )}
      <div className="seg3" role="radiogroup" aria-label="Market">
        {[n.next1, n.next5].map((m, i) => (
          <button key={i} role="radio" aria-checked={!!m && m.id === n.marketId} aria-pressed={!!m && m.id === n.marketId} disabled={!m} onClick={() => m && n.setMarketId(m.id)}>
            {i === 0 ? 'Quick · 1 min' : 'Crew · 5 min'} <span className="mono seg-t">{m ? n.clock(m.expiryMs) : 'soon'}</span>
          </button>
        ))}
      </div>
      <div className="seg3 seg3-3" role="radiogroup" aria-label="Direction">
        {dirs.map(([d, label]) => (
          <button key={d} role="radio" aria-checked={n.direction === d} aria-pressed={n.direction === d} onClick={() => n.setDirection(d)}>
            <Ic name={d === 'up' ? 'up' : d === 'down' ? 'down' : 'range'} size={16} />{label}
          </button>
        ))}
      </div>
      <div className="fields3">
        <label>
          <span>STRIKE (USD)</span>
          <span className="logo-select"><span className="ls-logo"><TokenLogo sym="BTC" size={26} /></span>
            <input className="input3" type="number" step="1" inputMode="numeric" value={n.strike} placeholder={String(n.suggestedStrike ?? '')} onChange={(e) => n.setStrike(e.target.value)} />
          </span>
        </label>
        {n.direction === 'range' ? (
          <label><span>UPPER (USD)</span><input className="input3 plain" type="number" step="1" inputMode="numeric" value={n.upper} onChange={(e) => n.setUpper(e.target.value)} /></label>
        ) : (
          <label><span>STAKE EACH</span><span className="logo-select"><span className="ls-logo"><TokenLogo sym="USDC" size={26} /></span><input className="input3" value="2 USDC (min)" readOnly aria-readonly /></span></label>
        )}
        <label className="span2"><span>WHY</span><input className="input3 plain" maxLength={280} value={n.why} onChange={(e) => n.setWhy(e.target.value)} placeholder="What do you see?" data-film="why" /></label>
      </div>
      <div className={`cmd-preview ${n.draftOutOfBand ? 'out' : n.draftOdds?.probability != null ? 'in' : ''}`} aria-live="polite" data-film="draft-odds">
        <span className="k">PREDICT ODDS{Number(n.strikeValue) ? ` AT ${usd(Number(n.strikeValue))}` : ''}</span>
        {n.direction === 'range' ? (
          <b className="cp-note">Quoted when the crew taps</b>
        ) : n.draftOdds?.probability != null ? (
          <b className="mono">{pct(n.draftOdds.probability)}% <span className="cp-note">{n.draftOutOfBand ? '· outside 15–50%, nobody could join. Move it nearer the money.' : '· inside 15–50%, the crew can join'}</span></b>
        ) : n.suggestedStrike != null && !n.strike ? (
          <b className="cp-note">Suggested from the live forward: {usd(n.suggestedStrike)}</b>
        ) : (
          <b className="cp-note">{n.openMarkets.length ? 'Reading…' : 'No BTC market open right now'}</b>
        )}
      </div>
      <button className={`b3 b3-xl ${ready ? '' : 'b3-off'}`} disabled={!ready} onClick={n.postCall} data-film="post-call">
        POST CALL TO THE CREW <Ic name="arrow" size={20} />
      </button>
      {!n.joined && <p className="fine">Join the crew to post a call.</p>}
    </section>
  );
}

/** Every call this crew has posted, newest first. */
export function RecentCalls({ n, limit = 5 }: { n: N; limit?: number }) {
  const calls = [...(n.crew?.calls ?? [])].reverse().slice(0, limit);
  return (
    <section className="c3 calls2" aria-label="Recent calls">
      <div className="sec-head"><div><span className="k">DEEPBOOK PREDICT · SUI MAINNET</span><h2>Recent calls</h2></div></div>
      {calls.length === 0 ? (
        <div className="empty-art"><div className="img"><img src="/art/v2/nakama-empty.webp" alt="" /></div><h4>No calls yet</h4><p>Post the first one. Everyone gets one tap before the market closes.</p></div>
      ) : (
        <div className="calls">
          {calls.map((c, i) => {
            const [st, tone] = callStatus(c, n.now);
            const won = c.orders.filter((o) => o.hit).length;
            return (
              <div key={c.id} className={`call2 ${i % 2 ? 'odd' : ''}`}>
                <TokenLogo sym="BTC" size={34} />
                <span className="c2-main"><span className={`side3 ${c.setup.direction}`}>{callTitle(c).replace('BTC ', '').toUpperCase()}</span><small>{c.setup.cadence} min · by {c.caller === n.owner ? 'you' : short(c.caller)}</small></span>
                <span className="call-legs">{c.orders.length} in{c.status === 'settled' ? ` · ${won} won` : ''}</span>
                <span className={`st3 st3-${tone}`}>{st}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Wins, streaks and P&L in USDC, from Walrus Memory and settled calls, or from on-chain Predict history. */
export function Scoreboard({ n }: { n: N }) {
  const rows = [...n.board].sort((a, b) => b.pnl - a.pnl);
  return (
    <section className="c3 score3" id="board" aria-label="Crew scoreboard" data-film="scoreboard">
      <div className="sec-head">
        <div><span className="k">{n.forkMode ? 'FROM THIS CREW’S CALLS ON THE LOCAL FORK' : n.status?.memoryConfigured ? 'FROM WALRUS MEMORY AND SETTLED CALLS' : 'FROM ON-CHAIN PREDICT HISTORY'}</span><h2>Crew scoreboard</h2></div>
        <img className="sec-ic" src="/art/v2/nakama-icon-trophy.webp" alt="" />
      </div>
      {rows.length === 0 ? (
        <div className="empty-art"><div className="img"><img src="/art/v2/nakama-empty.webp" alt="" /></div><h4>Quiet crew</h4><p>Join, then share the invite link.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th className="hide-sm">#</th><th>Member</th><th className="num">Won</th><th className="num hide-sm">Streak</th><th className="num">P&amp;L (USDC)</th></tr></thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.address} className={m.address === n.owner ? 'me' : ''}>
                  <td className="hide-sm"><span className="rank-n">{i + 1}</span></td>
                  <td><span className="row" style={{ gap: 8 }}><Avatar address={m.address} /><span className="mono">{m.address === n.owner ? 'You' : short(m.address)}</span>{m.address === n.leader && <img className="crown" src="/art/v2/nakama-icon-crown.webp" alt="Crew leader by P&L" />}</span></td>
                  {n.boardLoaded(m) ? (
                    <>
                      <td className="num">{m.wins}/{m.calls}</td>
                      <td className="num hide-sm">{m.streak > 0 ? <span className="streak3"><img src="/art/v2/nakama-icon-fire.webp" alt="" />{m.streak}</span> : 0}</td>
                      <td className={`num ${m.pnl > 0 ? 'up' : m.pnl < 0 ? 'down' : ''}`}>{signed(m.pnl)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="faint" aria-busy="true">Loading history…</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!n.status?.memoryConfigured && rows.some((m) => m.history && !m.history.complete) && <p className="fine">Recent on-chain window only; not an all-time record.</p>}
    </section>
  );
}

/** What works for this crew, recalled from Walrus, plus the recap and the history write. */
export function Playbook({ n }: { n: N }) {
  const crew = n.crew;
  if (!crew) return null;
  return (
    <section className="c3 playbook3" aria-label="Crew playbook">
      <div className="sec-head"><div><span className="k">CREW MEMORY · WALRUS</span><h2>Playbook</h2></div><img className="sec-ic" src="/art/v2/nakama-icon-shield.webp" alt="" /></div>
      {crew.playbook?.length ? (
        crew.playbook.map((p, i) => (
          <div key={i} className="play3">
            <p><b className="up">Works:</b> {p.best}</p>
            <p><b className="down">Weak:</b> {p.worst}</p>
            <Recalled ids={p.blobId ? [p.blobId] : []} />
          </div>
        ))
      ) : (
        <p className="mini">The playbook is written to Walrus every five settled calls.</p>
      )}
      <div className="play-actions">
        <button className="btn btn-plum" disabled={n.busy} onClick={n.loadRecap}><Ic name="book" size={16} />Recap from crew memory</button>
        <button className="btn" disabled={n.busy || !!crew.readOnlyDemo} onClick={n.rememberHistory} title={crew.readOnlyDemo ? 'Preview crews write nothing to Walrus' : 'Writes members’ settled Predict trades to Walrus'}>
          <Ic name="plus" size={16} />Remember members’ settled trades
        </button>
      </div>
      {crew.readOnlyDemo && <p className="fine">Preview crew: nothing is written to Walrus.</p>}
      {n.recap && <p className="recap3">{n.recap}</p>}
      {n.remembered && <Notice>{n.remembered}</Notice>}
    </section>
  );
}

/** Open DeepBook Predict BTC markets, read live from Sui mainnet. */
export function MarketsTable({ n, limit = 6 }: { n: N; limit?: number }) {
  return (
    <section className="c3 markets3" aria-label="Live DeepBook Predict markets" data-film="markets">
      <div className="sec-head"><div><span className="k">LIVE · VIA {String(n.status?.rpc ?? '…').toUpperCase()}</span><h2>Open BTC markets</h2></div></div>
      {n.marketsError && <Notice error>Markets unavailable: {n.marketsError}</Notice>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Market</th><th className="num">Forward</th><th className="num hide-sm">Above strike</th><th className="num hide-sm">Below strike</th><th className="num">Closes in</th></tr></thead>
          <tbody>
            {n.openMarkets.length ? (
              [...n.openMarkets].sort((a, b) => a.expiryMs - b.expiryMs).slice(0, limit).map((m) => (
                <tr key={m.id}>
                  <td><span className="row" style={{ gap: 8 }}><TokenLogo sym="BTC" size={24} />BTC · {m.cadence} min</span></td>
                  <td className="num">{m.forward != null ? usd(m.forward) : '–'}</td>
                  <td className="num hide-sm">{m.suggestedStrike != null ? usd(m.suggestedStrike) : '–'}</td>
                  <td className="num hide-sm">{m.suggestedStrikeDown != null ? usd(m.suggestedStrikeDown) : '–'}</td>
                  <td className="num">{n.clock(m.expiryMs)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="faint">{n.markets.length || n.marketsError ? 'No open BTC market right now. New ones open every minute.' : 'Reading markets…'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** A member funds their own Predict account (the queue debits orders from it). Dry-run first; signing only when
 *  the server allows writes (real USDC on mainnet, or the LOCAL FORK). */
export function FundCard({ n }: { n: N }) {
  const owner = n.account?.address.toLowerCase();
  const [amount, setAmount] = useState('3');
  const [create, setCreate] = useState(true);
  const [plan, setPlan] = useState<{ dryRun: { status: string; error: string | null }; transaction: string | null } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!owner || !n.crew) return null;
  const go = async (fn: () => Promise<void>) => { setBusy(true); setNote(''); try { await fn(); } catch (e) { setNote(String((e as Error).message ?? e).replace(/^Error:\s*/, '')); } finally { setBusy(false); } };
  const dry = () => go(async () => { setPlan(await api('/fund', { address: owner, amount: Number(amount), create })); });
  const sign = () => go(async () => {
    if (!plan?.transaction) return;
    const signedTx = await n.kit.signTransaction({ transaction: plan.transaction });
    const sent = await api<{ digest: string }>('/execute', { bytes: signedTx.bytes, signature: signedTx.signature });
    const msg = `Deposited${n.forkMode ? ' on the LOCAL FORK' : ''}: ${sent.digest}`;
    setPlan(null); setNote(msg); n.notify(msg);
  });
  return (
    <section className="c3 fund3" aria-label="Fund your Predict account">
      <span className="k">YOUR PREDICT ACCOUNT</span>
      <h3>Fund it once</h3>
      <p className="mini">Taps debit your own Predict account. Create it and deposit in one signed transaction.</p>
      <div className="fund-row">
        <label className="field"><span className="label">Deposit (USDC)</span><input className="input mono" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setPlan(null); }} aria-label="Deposit USDC" /></label>
        <label className="check"><input type="checkbox" checked={create} onChange={(e) => { setCreate(e.target.checked); setPlan(null); }} /> Create the account too</label>
      </div>
      <button className="btn btn-plum" disabled={busy || !(Number(amount) >= 1)} onClick={dry}>{busy && !plan ? 'Checking…' : 'Dry-run the deposit'}</button>
      {plan && <p className={`mini ${plan.dryRun.status === 'success' ? '' : 'down'}`}>Dry-run {plan.dryRun.status}{plan.dryRun.error ? `: ${plan.dryRun.error}` : ''}</p>}
      {plan?.transaction && n.writesOn && (
        <button className="b3" disabled={busy} onClick={sign}>{busy ? 'Signing…' : n.forkMode ? 'Sign and deposit (local fork, no real funds)' : 'Sign and deposit real USDC'}</button>
      )}
      {note && (/^Deposited.*: (\S+)$/.test(note)
        ? <p className="mini fund-ok" data-film="fund-digest"><b>{note.split(': ')[0]}</b> <Tx digest={note.split(': ')[1]} label="deposit" /></p>
        : <p className="mini" style={{ overflowWrap: 'anywhere' }}>{note}</p>)}
    </section>
  );
}

export function SetupNotice({ n }: { n: N }) {
  if (n.forkMode)
    return (
      <div className="fork-note" role="status" data-film="fork-note">
        <b>LOCAL FORK of Sui mainnet · no real funds.</b> Real DeepBook Predict code runs on a copy of mainnet. Walrus memories are <b>not written on the fork</b>, so nothing here is remembered.
      </div>
    );
  if (!n.status?.setup.length) return null;
  return (
    <Notice>
      <b>Setup required:</b> {n.status.setup.map((x) => <code key={x} className="code3">{x.replace('Setup required: ', '')}</code>)} Crew memory goes to Walrus once these keys exist.
    </Notice>
  );
}

export function CrewState({ n }: { n: N }) {
  if (n.loadingCrew)
    return (
      <div className="state3" aria-busy="true"><img src="/art/v2/nakama-mascot.webp" alt="" className="bob" /><h1>Finding your crew…</h1><p>Loading the crew and live Predict markets.</p></div>
    );
  if (n.crewFailed)
    return (
      <div className="state3">
        <img src="/art/v2/nakama-mascot-sad.webp" alt="" />
        <h1>Couldn't open this crew</h1>
        <p className="down" role="alert">{n.crewError}</p>
        <button className="b3" onClick={n.forgetCrew}>START A NEW CREW</button>
      </div>
    );
  return null;
}

type MemoryRow = { namespace: string; blobId: string; memory: { kind: string; address?: string; hit?: boolean; pnl?: number; size?: number; callId?: string; createdAt: string; best?: string; why?: string } };
/** Every Walrus memory of this crew and its members, recalled live from Walrus mainnet with blob IDs. Read-only. */
export function MemoryPanel({ n }: { n: N }) {
  const crew = n.crew;
  const [rows, setRows] = useState<MemoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setRows(null); setErr(null);
    if (!crew || n.forkMode) return;
    api<{ memories: MemoryRow[] }>(`/crews/${crew.id}/memories`).then((r) => setRows(r.memories)).catch((e) => setErr(String(e.message ?? e)));
  }, [crew?.id, n.forkMode]);
  if (!crew) return null;
  const wins = rows?.filter((r) => r.memory.kind === 'result' && r.memory.hit).length ?? 0;
  const results = rows?.filter((r) => r.memory.kind === 'result').length ?? 0;
  return (
    <section className="c3 mem3" aria-label="Crew memory on Walrus" data-film="memories">
      <div className="sec-head">
        <div><span className="k">{n.forkMode ? 'WALRUS MEMORY · LOCAL FORK' : 'WALRUS MEMORY · SUI MAINNET · RECALLED LIVE'}</span><h2>{n.forkMode ? 'Not written on the fork' : rows ? `${rows.length} crew memories` : 'Crew memory'}</h2></div>
        <img className="sec-ic" src="/art/v2/nakama-icon-gem.webp" alt="" />
      </div>
      {n.forkMode ? (
        <p className="mini">This crew lives on a LOCAL FORK, so its joins, calls and results are <b>not</b> written to Walrus mainnet. On mainnet every one becomes a memory.</p>
      ) : err ? (
        <p className="mini down">{err}</p>
      ) : !rows ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : rows.length === 0 ? (
        <p className="mini">No memories yet. Joins, calls and settled results are written here.</p>
      ) : (
        <>
          <p className="mini">Joins and settled Predict trades, each a blob on Walrus mainnet{results ? ` · ${wins} of ${results} trades won` : ''}.</p>
          <div className="mem-list">
            {rows.map((r) => {
              const m = r.memory;
              const fill = m.callId?.startsWith('chain:') ? m.callId.slice(6) : null;
              const [tag, tone] = m.kind === 'membership' ? ['JOINED', 'butter'] : m.kind === 'result' ? (m.hit ? ['WIN', 'mint'] : ['LOSS', 'pink']) : [m.kind.toUpperCase(), 'coral'];
              return (
                <div key={r.blobId} className={`mem tone-${tone}`} data-film="memory">
                  <span className="mem-tag">{tag}</span>
                  {m.address && <Avatar address={m.address} size={26} />}
                  <span className="mem-main"><b className="mono">{m.address ? short(m.address) : r.namespace}</b><small>{m.kind === 'result' ? `${m.size ?? ''} USDC · ${m.pnl != null ? signed(m.pnl) : ''} USDC` : m.kind === 'membership' ? 'joined the crew' : (m.best ?? m.why ?? '')} · {new Date(m.createdAt).toISOString().slice(0, 10)}</small></span>
                  <span className="mem-links">
                    <a className="blob" href={`https://walruscan.com/mainnet/blob/${r.blobId}`} target="_blank" rel="noreferrer" data-film="memory-blob">{short(r.blobId)} <Ic name="link" size={12} /></a>
                    {fill && <a className="hash" href={`https://suiscan.xyz/mainnet/tx/${fill}`} target="_blank" rel="noreferrer" data-film="memory-fill">fill · {fill.slice(0, 6)}…</a>}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
