import type { N } from '../state';
import { MemoryPanel, CrewState, MarketsTable, Playbook, ResultCard, Scoreboard } from '../parts';
import { Link } from '../ui';

/** The crew scoreboard: who's actually right, the playbook from Walrus and the open markets. */
export function Board({ n }: { n: N }) {
  const crew = n.crew;
  return (
    <main className="page" data-film="board-page">
      <div className="page-head">
        <div>
          <span className="greet-k">{crew ? crew.name : 'No crew open'} · settled by Pyth</span>
          <h1>Who's actually right</h1>
          <p>Wins, streaks and P&amp;L in USDC for every member. Calls settle on the Pyth BTC price; every result links to SuiScan.</p>
        </div>
        {!crew && <Link to="/app#start" className="b3">START A CREW</Link>}
      </div>
      <CrewState n={n} />
      {crew ? (
        <div className="board-grid">
          <div className="stack">
            <Scoreboard n={n} />
            <ResultCard n={n} />
            <MarketsTable n={n} />
          </div>
          <div className="stack">
            <div className="season-art"><img src="/art/v2/nakama-og.webp" alt="The Nakama crew celebrating with the lucky cat" /></div>
            <MemoryPanel n={n} />
            <Playbook n={n} />
          </div>
        </div>
      ) : !n.loadingCrew && !n.crewFailed ? (
        <div className="c3 empty-wrap"><div className="empty-art"><div className="img"><img src="/art/v2/nakama-empty.webp" alt="" /></div><h4>No crew yet</h4><p>The board fills in once your crew has members.</p></div></div>
      ) : null}
      <div className="rules">
        <div className="rule tone-butter"><span className="label">ENTRY</span><h4>15–50% odds only</h4><p>Predict admits a new bet only while its odds sit in the band. Calls outside it can't be posted.</p></div>
        <div className="rule tone-coral"><span className="label">MONEY</span><h4>No pooled funds</h4><p>Each member signs a 2 USDC order from their own wallet and their own Predict account.</p></div>
        <div className="rule tone-mint"><span className="label">MEMORY</span><h4>Walrus remembers</h4><p>Joins, calls and results are Walrus memories. The playbook is recalled with its blob IDs.</p></div>
      </div>
      {!crew && <div style={{ marginTop: 20 }}><MarketsTable n={n} /></div>}
    </main>
  );
}
