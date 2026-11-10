import { useEffect, useRef, useState } from 'react';
import type { N } from '../state';
import { pct } from '../state';
import { CallBuilder, CrewCard, CrewState, EventRow, FundCard, LiveCall, MemoryPanel, PlayerCard, Playbook, ResultCard, Scoreboard, SetupNotice, TapButton, Toast, callTitle, crewEvents } from '../parts';
import { ModeBadge } from '../hud';
import { Avatar, CrewAvatar, Ic, OddsBar, TokenLogo, short, usd } from '../ui';

type Tab = 'chat' | 'call' | 'crew' | 'board';

/** The four moves of a round, checked against real state. */
export function steps(n: N): { text: string; done: boolean; target: string; tab: Tab }[] {
  return [
    { text: 'Start or join a crew', done: n.joined, target: n.crew ? 'you' : 'chat-composer', tab: n.crew ? 'crew' : 'chat' },
    { text: 'Someone posts a BTC call', done: !!n.crew?.calls.length, target: 'make-a-call', tab: 'call' },
    { text: 'Everyone taps in with 2 USDC from their own wallet', done: !!n.crew?.calls.some((c) => c.orders.length > 0), target: 'live', tab: 'call' },
    { text: 'Pyth settles it and the scoreboard keeps score', done: n.settledCalls.length > 0, target: 'board', tab: 'board' },
  ];
}

/** The app: the crew chat on the left (always visible), everything you pick from on the right. One screen, no page scroll. */
export function Shell({ n }: { n: N }) {
  const [tab, setTab] = useState<Tab>('chat');
  const crew = n.crew;
  const st = steps(n);
  const now = st.findIndex((s) => !s.done);
  const go = (target: string, t: Tab) => {
    setTab(t);
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <main className="shell" data-tab={tab} data-film="lobby">
      <section className="chat" aria-label={crew ? `${crew.name} crew chat` : 'Crew chat'}>
        <ChatHead n={n} step={now} onStep={() => now >= 0 && go(st[now].target, st[now].tab)} />
        <Thread n={n} />
        <ChatComposer n={n} />
      </section>
      <aside className="side" aria-label="Calls, crew and scoreboard">
        <nav className="side-nav" aria-label="Jump to">
          {([['steps', 'Start here'], ['make-a-call', 'Post a call'], ['live', 'Live call'], ['you', 'You'], ['crew', 'Crew'], ['board', 'Scoreboard'], ['memory', 'Memory']] as const).map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{label}</a>
          ))}
        </nav>
        <div className="side-sec" data-group="call" id="steps">
          <Steps n={n} onGo={go} />
        </div>
        {n.active && (
          <div className="side-sec" data-group="call" id="live">
            <LivePanel n={n} />
          </div>
        )}
        {crew && (
          <div className="side-sec" data-group="call">
            <CallBuilder n={n} compact />
          </div>
        )}
        <div className="side-sec" data-group="crew" id="you">
          <PlayerCard n={n} />
          <FundCard key={n.owner ?? "none"} n={n} />
        </div>
        <div className="side-sec" data-group="crew" id="crew">
          <CrewCard n={n} />
        </div>
        {crew && (
          <div className="side-sec" data-group="board" id="board">
            <ResultCard n={n} />
            <Scoreboard n={n} />
          </div>
        )}
        {crew && (
          <div className="side-sec" data-group="board" id="memory">
            <MemoryPanel n={n} />
            <Playbook n={n} />
          </div>
        )}
        <p className="side-foot">Members sign their own orders · <ModeBadge n={n} /></p>
      </aside>
      <nav className="tabs tabs-shell" aria-label="Sections">
        {([['chat', 'Chat', 'nakama-mascot'], ['call', 'Call', 'nakama-icon-megaphone'], ['crew', 'Crew', 'nakama-icon-shield'], ['board', 'Board', 'nakama-icon-trophy']] as const).map(([t, l, art]) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} data-film={`stab-${t}`}><img src={`/art/v2/${art}.webp`} alt="" />{l}</button>
        ))}
      </nav>
    </main>
  );
}

function ChatHead({ n, step, onStep }: { n: N; step: number; onStep: () => void }) {
  const crew = n.crew;
  const st = steps(n);
  return (
    <header className="chat-head">
      <CrewAvatar />
      <div className="grow">
        <h1>{crew ? crew.name : 'Your crew'}</h1>
        <div className="sub">
          <span className="live"><i />{crew ? 'Live' : 'No crew yet'}</span>
          {crew && <>{crew.members.length} member{crew.members.length === 1 ? '' : 's'} · {crew.calls.length} call{crew.calls.length === 1 ? '' : 's'}{crew.readOnlyDemo ? ' · preview' : ''}</>}
        </div>
      </div>
      {crew && crew.members.length > 0 && <span className="avatars hide-sm">{crew.members.slice(0, 5).map((a) => <Avatar key={a} address={a} />)}</span>}
      {step >= 0 && (
        <button className="step-chip" onClick={onStep} data-film="step-chip">
          <b>Step {step + 1} of 4</b><span>{st[step].text}</span>
        </button>
      )}
    </header>
  );
}

/** The crew thread: joins, calls (the live one as the full card with its tap), taps, results, and the latest receipt. */
function Thread({ n }: { n: N }) {
  const crew = n.crew;
  const box = useRef<HTMLDivElement>(null);
  const events = crew ? crewEvents(crew, n.now) : [];
  // Stay pinned to the newest message while content grows (cards, odds, receipts), unless the reader scrolled up.
  const pinned = useRef(true);
  useEffect(() => { const b = box.current; if (b) b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); pinned.current = true; }, [events.length, n.tapResult, n.message, n.active?.orders.length]);
  useEffect(() => {
    const b = box.current; if (!b) return;
    const ro = new ResizeObserver(() => { if (pinned.current) b.scrollTop = b.scrollHeight; });
    for (const c of Array.from(b.children)) ro.observe(c);
    const mo = new MutationObserver(() => { for (const c of Array.from(b.children)) ro.observe(c); if (pinned.current) b.scrollTop = b.scrollHeight; });
    mo.observe(b, { childList: true });
    const onScroll = () => { pinned.current = b.scrollHeight - b.scrollTop - b.clientHeight < 80; };
    b.addEventListener('scroll', onScroll);
    return () => { ro.disconnect(); mo.disconnect(); b.removeEventListener('scroll', onScroll); };
  }, []);
  return (
    <div className="messages" aria-live="polite" ref={box} data-film="thread">
      <SetupNotice n={n} />
      <CrewState n={n} />
      {!crew && !n.loadingCrew && !n.crewFailed && (
        <div className="welcome" data-film="start">
          <img src="/art/v2/nakama-og.webp" alt="The Nakama crew and the lucky cat" />
          <h2>Your crew. One BTC call. Everyone taps in.</h2>
          <p>Name your crew below to start one, or open a friend's invite link to join theirs.</p>
        </div>
      )}
      {crew && <span className="daysep">Crew {crew.id}</span>}
      {crew && events.length === 0 && <p className="hint-bubble">Nobody's here yet. Join the crew, then share the invite link.</p>}
      {events.map((e) =>
        e.kind === 'call' && e.call ? (
          <div key={e.key} className={`bmsg ${e.who === n.owner ? 'me' : ''}`}>
            <Avatar address={e.who} />
            <div className="bcol">
              <span className="bname">{e.who === n.owner ? 'You' : short(e.who)} · called BTC</span>
              <div className="bubble2">{e.call.why || callTitle(e.call)}</div>
              {e.call === n.active ? (
                <div className="rich">
                  <LiveCall n={n} call={e.call} />
                  <div className="tap-row"><TapButton n={n} xl /></div>
                </div>
              ) : (
                <div className="rich"><PastCall n={n} e={e} /></div>
              )}
            </div>
          </div>
        ) : (
          <EventRow key={e.key} e={e} n={n} />
        ),
      )}
      <div className="receipt"><Toast n={n} /></div>
    </div>
  );
}

function PastCall({ n, e }: { n: N; e: ReturnType<typeof crewEvents>[number] }) {
  const c = e.call!;
  const won = c.orders.filter((o) => o.hit).length;
  return (
    <div className={`trade ${e.who === n.owner ? 'mine' : ''}`} data-film="past-call">
      <div className={`trade-top ${c.setup.direction === 'down' ? 'sell' : ''}`}>
        <TokenLogo sym="BTC" size={40} />
        <div className="trade-title"><span className="trade-kind">CALL · BY {e.who === n.owner ? 'YOU' : short(e.who).toUpperCase()} · {c.setup.cadence} MIN</span><b>{callTitle(c)}</b></div>
        <span className="status">{c.status === 'settled' ? 'Settled' : c.status === 'live' && c.expiryMs > n.now ? 'Live' : 'Closed'}</span>
      </div>
      <div className="trade-body">
        {c.why && <p className="mini">“{c.why}”</p>}
        <div className="vote-band"><div className="row-between"><span><b>{c.orders.length}</b> tapped in</span><span>{c.status === 'settled' ? <><b>{won}</b> won</> : n.forkMode && c.orders.length ? 'queued on the fork' : 'waiting to settle'}</span></div></div>
      </div>
    </div>
  );
}

/** Pinned at the bottom: start a crew, join it, or post a call in plain chat form. */
function ChatComposer({ n }: { n: N }) {
  const ready = n.joined && !n.busy && !!n.marketId && !!n.why.trim() && !n.draftOutOfBand;
  if (!n.crew)
    return (
      <form className="composer composer2" id="chat-composer" onSubmit={(e) => { e.preventDefault(); if (n.name.trim()) n.create(); }}>
        <p className="composer-k"><b>1</b> Start a crew</p>
        <div className="pill">
          <input value={n.name} onChange={(e) => n.setName(e.target.value)} placeholder="Crew name, e.g. Night Owls" aria-label="Crew name" maxLength={40} data-film="crew-name" />
          <button className="b3 b3-sm" disabled={n.busy || !n.name.trim()} data-film="start-crew">START A CREW</button>
        </div>
        <p className="composer-note">{n.account ? 'Your wallet is connected.' : n.viewingAs ? 'No wallet: this becomes a read-only preview crew.' : 'Connect a wallet (top right), or view as a public address in the You panel.'}</p>
      </form>
    );
  if (!n.joined)
    return (
      <div className="composer" id="chat-composer">
        <div className="guest-bar"><p><b>You're not in {n.crew.name} yet.</b> Join to post calls and tap in.</p><TapButton n={n} /></div>
      </div>
    );
  return (
    <div className="composer composer2" id="chat-composer" data-film="composer">
      <div className="call-chips" role="group" aria-label="Your call">
        <span className="seg-mini" role="radiogroup" aria-label="Market">
          {[n.next1, n.next5].map((m, i) => m && (
            <button key={m.id} type="button" aria-pressed={m.id === n.marketId} onClick={() => n.setMarketId(m.id)}>{i ? '5 min' : '1 min'} <small className="mono">{n.clock(m.expiryMs)}</small></button>
          ))}
        </span>
        <span className="seg-mini" role="radiogroup" aria-label="Direction">
          {(['up', 'down'] as const).map((d) => (
            <button key={d} type="button" aria-pressed={n.direction === d} onClick={() => n.setDirection(d)}>{d === 'up' ? '↑ Above' : '↓ Below'}</button>
          ))}
        </span>
        <label className="strike-chip"><TokenLogo sym="BTC" size={20} /><input type="number" step="1" inputMode="numeric" aria-label="Strike in USD" value={n.strike} placeholder={String(n.suggestedStrike ?? 'strike')} onChange={(e) => n.setStrike(e.target.value)} /></label>
        <span className={`odds-chip ${n.draftOutOfBand ? 'out' : n.draftOdds?.probability != null ? 'in' : ''}`} title="Predict odds for this strike; only 15–50% can be joined">
          {n.direction === 'range' ? 'quoted on tap' : n.draftOdds?.probability != null ? `${pct(n.draftOdds.probability)}% odds` : '…'}
        </span>
      </div>
      <form className="pill" onSubmit={(e) => { e.preventDefault(); if (ready) n.postCall(); }}>
        <input value={n.why} onChange={(e) => n.setWhy(e.target.value)} placeholder={`Say why, then send: BTC ${n.direction === 'down' ? 'below' : 'above'} ${n.strikeValue ? usd(Number(n.strikeValue)) : 'the strike'}`} aria-label="Why" maxLength={280} data-film="chat-why" />
        <button className="send" aria-label="Post call" disabled={!ready} data-film="chat-send"><Ic name="send" size={19} /></button>
      </form>
      {n.draftOutOfBand && <p className="composer-note down">Outside the 15–50% entry band: nobody could join. Move the strike nearer the money.</p>}
    </div>
  );
}

/** The round in four plain steps, with the next one lit and a button that takes you there. */
function Steps({ n, onGo }: { n: N; onGo: (target: string, tab: Tab) => void }) {
  const st = steps(n);
  const now = st.findIndex((s) => !s.done);
  return (
    <section className="c3 steps3" aria-label="How a round works" data-film="steps">
      <span className="k">HOW A ROUND WORKS</span>
      <ol>
        {st.map((s, i) => (
          <li key={s.text} className={s.done ? 'done' : i === now ? 'now' : ''}>
            <span className="n">{s.done ? '✓' : i + 1}</span>
            <span className="t">{s.text}</span>
            {i === now && <button className="btn btn-sm btn-primary" onClick={() => onGo(s.target, s.tab)}>{i === 0 ? (n.crew ? 'Join' : 'Start') : i === 1 ? 'Post a call' : i === 2 ? 'Tap in' : 'Scoreboard'}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The live call's details and the tap, mirrored from the card in the chat. */
function LivePanel({ n }: { n: N }) {
  const a = n.active!;
  return (
    <section className="hero-card live-panel" aria-label="Live call" data-film="call-pane">
      <div className="row-between"><span className="label">LIVE CALL · {a.setup.cadence} MIN · BY {a.caller === n.owner ? 'YOU' : short(a.caller).toUpperCase()}</span><span className="ret"><Ic name="clock" size={14} />{n.clock(a.expiryMs)}</span></div>
      <div className="big">{callTitle(a).replace('BTC ', '')} <small>BTC</small></div>
      {a.setup.direction !== 'range' && n.odds?.probability != null && <OddsBar odds={n.odds} dark />}
      <div className="lp-pos">
        {n.crew!.members.map((m) => {
          const o = a.orders.find((x) => x.address === m);
          return <span key={m} className={`lp-seat ${o ? 'in' : ''}`}><Avatar address={m} size={26} />{m === n.owner ? 'You' : short(m)} · {o ? `${o.size} USDC` : 'not in'}</span>;
        })}
      </div>
      <div style={{ marginTop: 12 }}><TapButton n={n} /></div>
    </section>
  );
}
