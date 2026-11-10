import { useEffect, useRef, useState } from 'react';
import type { N } from '../state';
import { knownCrews, pct } from '../state';
import { CrewState, EventRow, LiveCall, Playbook, ResultCard, Scoreboard, TapButton, Toast, callTitle, crewEvents } from '../parts';
import { Avatar, CrewAvatar, Ic, Link, OddsBar, TokenLogo, navigate, short, usd } from '../ui';

type Tab = 'crews' | 'chat' | 'call';

/** The crew room: crews on the left, the crew's thread in the middle, the live call and the board on the right. */
export function Room({ n }: { n: N }) {
  const [tab, setTab] = useState<Tab>('chat');
  const crew = n.crew;
  const box = useRef<HTMLDivElement>(null);
  const events = crew ? crewEvents(crew, n.now) : [];
  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [events.length, tab, n.tapResult, n.message]);
  const known = knownCrews();

  const list = (
    <aside className="pane list" aria-label="Crews">
      <div className="list-head">
        <div className="row-between"><h2>Crews</h2><Link to="/board" className="chip chip-butter"><Ic name="trophy" size={13} />Scoreboard</Link></div>
      </div>
      {known.length === 0 ? (
        <p className="mini" style={{ padding: '0 18px' }}>Crews you open in this browser show up here.</p>
      ) : (
        <ul className="crew-list">
          {known.map((k) => (
            <li key={k.id}>
              <a href={`/room?crew=${k.id}`} className="crew-item tone-butter" aria-current={k.id === crew?.id ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(`/room?crew=${k.id}`); setTab('chat'); }}>
                <CrewAvatar />
                <span style={{ minWidth: 0 }}><span className="n" style={{ display: 'block' }}>{k.name}</span><span className="p" style={{ display: 'block' }}>{k.id === crew?.id ? `${crew.members.length} member${crew.members.length === 1 ? '' : 's'} · ${crew.calls.length} call${crew.calls.length === 1 ? '' : 's'}` : `crew ${k.id}`}</span></span>
                <span className="meta">{k.id === crew?.id && n.active ? <span className="badge" aria-label="Live call">LIVE</span> : null}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="list-foot">
        <FirstRun n={n} onTab={setTab} />
        <Link to="/app#start" className="btn btn-sm btn-ghost"><Ic name="plus" size={15} />Start another crew</Link>
      </div>
    </aside>
  );

  if (!crew)
    return (
      <div className="room" data-tab={tab === 'call' ? 'chat' : tab}>
        {list}
        <section className="pane thread">
          <div className="messages">
            <CrewState n={n} />
            {!n.loadingCrew && !n.crewFailed && (
              <div className="empty-art"><div className="img"><img src="/art/v2/nakama-empty.webp" alt="" /></div><h4>No crew open</h4><p>Start a crew in the lobby, or open an invite link.</p><Link to="/app#start" className="b3 b3-sm">START A CREW</Link></div>
            )}
          </div>
        </section>
        <aside className="pane fund" />
        <RoomTabs tab={tab} setTab={setTab} />
      </div>
    );

  return (
    <div className="room" data-tab={tab}>
      {list}
      <section className="pane thread" aria-label={`${crew.name} room`}>
        <div className="thread-head">
          <CrewAvatar />
          <div className="grow">
            <h1>{crew.name}</h1>
            <div className="sub"><span className="live"><i />Live</span>{crew.members.length} member{crew.members.length === 1 ? '' : 's'} · {crew.calls.length} call{crew.calls.length === 1 ? '' : 's'}{crew.readOnlyDemo ? ' · preview crew' : ''}</div>
          </div>
          <span className="avatars hide-sm">{crew.members.map((a) => <Avatar key={a} address={a} />)}</span>
          <button className="btn btn-sm btn-plum thread-tabs" onClick={() => setTab('call')}><Ic name="bolt" size={15} />{n.active ? n.clock(n.active.expiryMs) : 'Call'}</button>
        </div>
        <div className="messages" aria-live="polite" ref={box}>
          <span className="daysep">Crew {crew.id}</span>
          {events.length === 0 && <div className="empty-art"><div className="img"><img src="/art/v2/nakama-empty.webp" alt="" /></div><h4>Quiet in here</h4><p>Join the crew, then post the first BTC call.</p></div>}
          {events.map((e) =>
            e.kind === 'call' && e.call ? (
              <CallBubble key={e.key} n={n} e={e} />
            ) : (
              <EventRow key={e.key} e={e} n={n} />
            ),
          )}
          <Toast n={n} />
        </div>
        <Composer n={n} />
      </section>
      <aside className="pane fund" aria-label="Live call and scoreboard">
        <CallPane n={n} />
        <ResultCard n={n} />
        <Scoreboard n={n} />
        <Playbook n={n} />
      </aside>
      <RoomTabs tab={tab} setTab={setTab} />
    </div>
  );
}

function RoomTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="Sections">
      {([['crews', 'Crews', 'crews'], ['chat', 'Room', 'chat'], ['call', 'Call', 'bolt']] as const).map(([t, l, ic]) => (
        <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}><Ic name={ic} size={19} />{l}</button>
      ))}
    </nav>
  );
}

/** A posted call in the thread: the live one as the full card, older ones as a compact card. */
function CallBubble({ n, e }: { n: N; e: ReturnType<typeof crewEvents>[number] }) {
  const c = e.call!;
  if (c === n.active) return <div className="trade-wrap"><LiveCall n={n} call={c} /></div>;
  const won = c.orders.filter((o) => o.hit).length;
  return (
    <div className={`trade ${e.who === n.owner ? 'mine' : ''}`}>
      <div className={`trade-top ${c.setup.direction === 'down' ? 'sell' : ''}`}>
        <TokenLogo sym="BTC" size={40} />
        <div className="trade-title"><span className="trade-kind">CALL · BY {e.who === n.owner ? 'YOU' : short(e.who).toUpperCase()} · {c.setup.cadence} MIN</span><b>{callTitle(c)}</b></div>
        <span className="status">{c.status === 'settled' ? 'Settled' : c.status === 'live' && c.expiryMs > n.now ? 'Live' : 'Closed'}</span>
      </div>
      <div className="trade-body">
        {c.why && <p className="mini">“{c.why}”</p>}
        <div className="vote-band"><div className="row-between"><span><b>{c.orders.length}</b> tapped in</span><span>{c.status === 'settled' ? <><b>{won}</b> won</> : 'awaiting Pyth'}</span></div></div>
      </div>
    </div>
  );
}

/** The call composer as a chat box: market and side as chips, strike and why in the box, live odds underneath. */
function Composer({ n }: { n: N }) {
  const ready = n.joined && !n.busy && !!n.marketId && !!n.why.trim() && !n.draftOutOfBand;
  if (!n.owner)
    return <div className="composer"><div className="guest-bar"><p><b>Read-only.</b> Connect a wallet or view as a public address in the lobby to join and post.</p><Link to="/app" className="btn btn-primary">Lobby</Link></div></div>;
  if (!n.joined)
    return <div className="composer"><div className="guest-bar"><p><b>You're not in {n.crew?.name} yet.</b> Join to post calls and tap in.</p><TapButton n={n} /></div></div>;
  return (
    <div className="composer" data-film="composer">
      <div className="hints">
        <span className="lbl">Call:</span>
        {[n.next1, n.next5].map((m, i) => m && (
          <button key={m.id} className={`hint tone-${i ? 'mint' : 'butter'} ${m.id === n.marketId ? 'on' : ''}`} aria-pressed={m.id === n.marketId} onClick={() => n.setMarketId(m.id)}>{m.cadence} min · {n.clock(m.expiryMs)}</button>
        ))}
        {(['up', 'down'] as const).map((d) => (
          <button key={d} className={`hint tone-${d === 'up' ? 'coral' : 'pink'} ${n.direction === d ? 'on' : ''}`} aria-pressed={n.direction === d} onClick={() => n.setDirection(d)}>{d === 'up' ? 'Above ↑' : 'Below ↓'}</button>
        ))}
        <Link to="/app#make-a-call" className="hint tone-butter">Range…</Link>
      </div>
      <form className="composer-box" onSubmit={(e) => { e.preventDefault(); if (ready) n.postCall(); }}>
        <span className="strike-in"><TokenLogo sym="BTC" size={22} /><input type="number" step="1" inputMode="numeric" aria-label="Strike in USD" value={n.strike} placeholder={String(n.suggestedStrike ?? 'strike')} onChange={(e) => n.setStrike(e.target.value)} /></span>
        <input value={n.why} onChange={(e) => n.setWhy(e.target.value)} placeholder="Why? What do you see…" aria-label="Why" maxLength={280} />
        <button className="send" aria-label="Post call" disabled={!ready}><Ic name="send" size={19} /></button>
      </form>
      <p className={`composer-note ${n.draftOutOfBand ? 'down' : ''}`}>
        {n.direction === 'range' ? 'Range calls are quoted when the crew taps.'
          : n.draftOdds?.probability != null ? `Predict odds at ${usd(Number(n.strikeValue))}: ${pct(n.draftOdds.probability)}% · ${n.draftOutOfBand ? 'outside the 15–50% entry band, nobody could join' : 'inside the 15–50% entry band'}`
          : n.suggestedStrike != null ? `Suggested strike from the live forward: ${usd(n.suggestedStrike)}` : 'Reading the live BTC markets…'}
      </p>
    </div>
  );
}

/** The right pane's plum hero: the live call with its countdown, odds and the one tap. */
function CallPane({ n }: { n: N }) {
  const a = n.active;
  return (
    <>
      <div className="hero-card" data-film="call-pane">
        <div className="row-between"><span className="label">{a ? `LIVE CALL · ${a.setup.cadence} MIN` : 'NO LIVE CALL'}</span><span className="verify"><i />{n.status?.rpc ?? '…'}</span></div>
        <div className="big">{a ? callTitle(a).replace('BTC ', '') : n.forward != null ? usd(n.forward) : '–'} <small>{a ? 'BTC' : 'BTC now'}</small></div>
        {a ? (
          <>
            <span className="ret"><Ic name="clock" size={14} />{n.clock(a.expiryMs)} left</span>
            {a.setup.direction !== 'range' && n.odds?.probability != null && <OddsBar odds={n.odds} dark />}
          </>
        ) : (
          <p className="sub">Post a call from the box below the room. Everyone gets one tap.</p>
        )}
        <div style={{ marginTop: 14 }}><TapButton n={n} /></div>
      </div>
      <div className="tiles">
        <div className="tile tone-coral"><span className="label">BTC NOW</span><div className="v">{n.forward != null ? usd(n.forward) : '–'}</div></div>
        <div className="tile tone-butter"><span className="label">MEMBERS</span><div className="v">{n.crew?.members.length ?? 0}</div></div>
        <div className="tile tone-mint"><span className="label">CALLS WON</span><div className="v">{n.crewWins}<small> of {n.settledCalls.length}</small></div></div>
        <div className="tile tone-pink"><span className="label">BEST STREAK</span><div className="v">{n.bestStreak}</div></div>
      </div>
      {a && (
        <div className="card">
          <div className="card-head"><h3>Positions</h3><span className="label">THIS CALL</span></div>
          {n.crew!.members.map((m) => {
            const o = a.orders.find((x) => x.address === m);
            return (
              <div key={m} className="holding">
                <Avatar address={m} />
                <span style={{ minWidth: 0 }}><div className="n">{m === n.owner ? 'You' : short(m)}</div><div className="s">{o ? o.status : 'not in yet'}</div></span>
                <span className="amt">{o ? `${o.size} USDC` : '–'}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** The first-run path, checked against real state. */
function FirstRun({ n, onTab }: { n: N; onTab: (t: Tab) => void }) {
  const steps: [string, boolean][] = [
    ['Open a crew', !!n.crew],
    ['Join it', n.joined],
    ['Post a BTC call', !!n.crew?.calls.length],
    ['Everyone taps in', !!n.crew?.calls.some((c) => c.orders.length > 0)],
  ];
  const done = steps.filter((s) => s[1]).length;
  const nowIdx = steps.findIndex((s) => !s[1]);
  return (
    <section className="steps" aria-label="Getting started">
      <h3>Your first call</h3>
      <p>{done} of {steps.length} done</p>
      <div className="bar"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol>{steps.map(([t, ok], i) => <li key={t} className={ok ? 'done' : i === nowIdx ? 'now' : ''}><span className="n">{ok ? '✓' : i + 1}</span>{t}</li>)}</ol>
      {nowIdx >= 0 && n.crew && <button className="btn btn-sm btn-butter" onClick={() => onTab(nowIdx === 1 ? 'call' : 'chat')}>Next step</button>}
    </section>
  );
}
