import type { N } from '../state';
import { CallBuilder, CrewCard, CrewState, Duo, EventRow, FundCard, LiveCall, PlayerCard, Receipts, RecentCalls, ResultCard, SetupNotice, TapButton, Toast, callTitle, crewEvents } from '../parts';
import { ModeBadge } from '../hud';
import { CrewAvatar, Ic, Link, SuiMark, TokenLogo, short, usd } from '../ui';

export function Lobby({ n }: { n: N }) {
  const crew = n.crew;
  return (
    <main className="lobby2" data-film="lobby">
      <section className="greet">
        <div>
          <p className="greet-k">{n.owner ? `Hey ${short(n.owner)}` : 'Welcome to Nakama'} · {crew ? crew.name : 'Sui mainnet'}</p>
          <h1>Your crew. One BTC call. <span className="hl">Everyone taps in.</span></h1>
        </div>
        <div className="greet-marks">
          <span className="mark-chip"><SuiMark size={16} />Sui mainnet</span>
          <span className="mark-chip"><TokenLogo sym="BTC" size={18} />DeepBook Predict</span>
          {crew?.readOnlyDemo && <span className="mark-chip warn"><Ic name="eye" size={14} />Preview crew · read-only</span>}
        </div>
      </section>
      <SetupNotice n={n} />
      <CrewState n={n} />
      {!n.loadingCrew && !n.crewFailed && (
        <>
          <div className="l2-grid">
            {crew ? <ThreadHero n={n} /> : <StartHero n={n} />}
            <div className="l2-side">
              <PlayerCard n={n} />
              <CrewCard n={n} />
              <Duo n={n} />
              <FundCard n={n} />
            </div>
          </div>
          <ResultCard n={n} />
          <Receipts n={n} />
          {crew && (
            <div className="l2-bottom">
              <CallBuilder n={n} />
              <RecentCalls n={n} />
            </div>
          )}
        </>
      )}
      <footer className="lobby-foot">
        <span><b>NAKAMA</b> 仲間 · DeepBook Predict on Sui mainnet · memory on Walrus <ModeBadge n={n} /></span>
        <span>Members sign their own orders · art generated with ChatGPT · MIT · © 2026 Nivesh Gajengi</span>
      </footer>
    </main>
  );
}

/** The hero is the crew's own room: header, the live call card, the last real events and one button. */
function ThreadHero({ n }: { n: N }) {
  const crew = n.crew!;
  const events = crewEvents(crew, n.now).filter((e) => e.kind !== 'call' || e.call !== n.active).slice(-4);
  return (
    <section className="thread-hero c3" aria-label={`${crew.name} crew room`}>
      <header className="th-head">
        <CrewAvatar size="lg" />
        <div className="th-id">
          <h2>{crew.name}</h2>
          <span><i className="live-dot" />{crew.members.length} member{crew.members.length === 1 ? '' : 's'} · {crew.calls.length} call{crew.calls.length === 1 ? '' : 's'}{crew.readOnlyDemo ? ' · preview' : ''}</span>
        </div>
        <div className="th-nav" title="BTC forward price from DeepBook Predict">
          <span className="th-nav-v"><TokenLogo sym="BTC" size={22} />{n.forward != null ? usd(n.forward) : '–'}</span>
          <small>BTC now · live</small>
        </div>
      </header>
      <div className="th-body">
        {n.active ? (
          <LiveCall n={n} call={n.active} />
        ) : (
          <div className="th-off">
            <b>No live call.</b> {crew.members.length ? 'Post one: pick a BTC market, a side and a strike. Everyone gets one tap before it closes.' : 'Join the crew, then share the invite link.'}
            {n.latest && <span className="th-last"> Last call: <b>{callTitle(n.latest)}</b> · {n.latest.status}</span>}
          </div>
        )}
        <Toast n={n} />
        {events.length > 0 && (
          <div className="th-msgs">{events.map((e) => <EventRow key={e.key} e={e} n={n} />)}</div>
        )}
      </div>
      <div className="th-foot">
        <Link to="/room" className="th-fake">Say something to {crew.name}, or post a call…</Link>
        <TapButton n={n} />
      </div>
    </section>
  );
}

/** No crew yet: name one and start. */
function StartHero({ n }: { n: N }) {
  return (
    <section className="thread-hero c3" id="start" aria-label="Start your crew" data-film="start">
      <header className="th-head">
        <CrewAvatar size="lg" />
        <div className="th-id"><h2>Start a crew</h2><span><i className="live-dot" />Live 1 and 5-minute BTC markets</span></div>
        <div className="th-nav"><span className="th-nav-v"><TokenLogo sym="BTC" size={22} />{n.forward != null ? usd(n.forward) : '–'}</span><small>BTC now · live</small></div>
      </header>
      <div className="th-body start-body">
        <img className="start-art" src="/art/v2/nakama-og.webp" alt="The Nakama crew and the lucky cat" />
        <ol className="start-steps">
          <li><b>1</b>Name your crew and share the link.</li>
          <li><b>2</b>A friend posts a BTC call.</li>
          <li><b>3</b>Everyone taps in once, 2 USDC each.</li>
        </ol>
        <Toast n={n} />
      </div>
      <form className="th-foot" onSubmit={(e) => { e.preventDefault(); if (n.name.trim()) n.create(); }}>
        <input className="th-fake th-input" placeholder="Crew name, e.g. Night Owls" aria-label="Crew name" value={n.name} maxLength={40} onChange={(e) => n.setName(e.target.value)} data-film="crew-name" />
        <button className="b3" disabled={n.busy || !n.name.trim()} data-film="start-crew">START A CREW <Ic name="arrow" size={18} /></button>
      </form>
      {!n.account && <p className="fine th-hint">{n.viewingAs ? 'No wallet: this becomes a read-only preview crew.' : 'Connect a wallet, or view as a public address (right).'}</p>}
    </section>
  );
}
