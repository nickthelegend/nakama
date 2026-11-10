import type { N } from '../state';
import { MarketsTable } from '../parts';
import { Ic, Link, MemoryGlyph, SuiMark, TokenLogo, usd } from '../ui';

const MOVES = [
  ['coral', 'nakama-card-host', 'Call it', 'A friend posts “BTC above $X in 5 min” and says why. Live Predict odds show before it goes out.'],
  ['butter', 'nakama-card-quick', 'Tap in once', 'Everyone gets one tap before the market closes: 2 USDC each, quoted and dry-run first.'],
  ['mint', 'nakama-icon-shield', 'Sign your own', 'No pooled money. Each order comes from that member’s own wallet and Predict account.'],
  ['pink', 'nakama-icon-trophy', 'Pyth settles', 'The BTC price closes the call. The scoreboard keeps wins, streaks and P&L in USDC.'],
] as const;

const PARTS = [
  ['coral', 'DeepBook Predict', 'Live 1 and 5-minute BTC markets on Sui mainnet. Every tap is a real queued order.'],
  ['butter', '15–50% entry band', 'Predict only takes a new bet while its odds sit in the band, so the composer blocks the rest.'],
  ['mint', 'Pyth settlement', 'The market settles on the Pyth BTC price; payouts land in each member’s Predict account.'],
  ['pink', 'Walrus Memory', 'Every join, call and result is a memory. The crew playbook is recalled with its blob IDs.'],
  ['butter', 'Tatum RPC', 'Markets, odds and fills are read from Sui mainnet through Tatum’s gateway.'],
  ['coral', 'Your own wallet', 'Members sign in their Sui wallet. The server never holds a member’s money.'],
] as const;

export function Landing({ n }: { n: N }) {
  return (
    <main data-film="landing">
      <section className="l-hero">
        <div className="l-hero-in">
          <div>
            <span className="kicker"><b>LIVE</b><SuiMark size={16} />Sui mainnet · <TokenLogo sym="BTC" size={16} />DeepBook Predict · <MemoryGlyph size={14} />Walrus</span>
            <h1>Your group chat makes <em>the call.</em></h1>
            <p className="lead">One friend calls BTC above a price in 5 minutes. Everyone taps in once with <code>2 USDC</code> from their own wallet. Pyth settles it, and the scoreboard remembers who's right.</p>
            <div className="l-cta">
              <Link to="/app" className="b3">OPEN NAKAMA <Ic name="arrow" size={18} /></Link>
              <a href="#how" className="btn btn-lg">How it works</a>
            </div>
          </div>
          <div className="l-art">
            <img src="/art/v2/nakama-og.webp" alt="The Nakama crew and the lucky cat" />
            <span className="l-float f1 tone-mint"><span className="ic"><TokenLogo sym="BTC" size={26} /></span><span>BTC now · live<b>{n.forward != null ? usd(n.forward) : 'reading…'}</b></span></span>
            <span className="l-float f2 tone-butter"><span className="ic"><Ic name="clock" size={18} /></span><span>Next 5-min close<b className="mono">{n.next5 ? n.clock(n.next5.expiryMs) : '–'}</b></span></span>
          </div>
        </div>
      </section>
      <div className="l-stats">
        <div className="l-stat tone-coral"><span className="label">BTC FORWARD</span><div className="v">{n.forward != null ? usd(n.forward) : '–'}</div><span className="s">read live from Predict</span></div>
        <div className="l-stat tone-butter"><span className="label">OPEN MARKETS</span><div className="v">{n.markets.length ? n.openMarkets.length : '–'}</div><span className="s">1 and 5-minute BTC</span></div>
        <div className="l-stat tone-mint"><span className="label">ENTRY BAND</span><div className="v">15–50<small>%</small></div><span className="s">odds Predict accepts</span></div>
        <div className="l-stat tone-pink"><span className="label">ONE TAP</span><div className="v">2 <small>USDC</small></div><span className="s">Predict's minimum order</span></div>
      </div>

      <section className="l-sec" id="how">
        <div className="l-head">
          <div><span className="label">HOW IT WORKS</span><h2>Four moves. No pooled money.</h2></div>
          <p>Nakama is built on what friends already do: one calls it, the rest pile in. The chain keeps the receipts.</p>
        </div>
        <div className="how">
          {MOVES.map(([tone, art, title, body], i) => (
            <article key={title} className={`how-card tone-${tone}`}>
              <div className="art"><img src={`/art/v2/${art}.webp`} alt="" loading="lazy" /></div>
              <div className="in"><span className="n">0{i + 1}</span><h3>{title}</h3><p>{body}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="l-sec">
        <div className="l-head">
          <div><span className="label">LIVE PROOF</span><h2>Read straight from Sui mainnet.</h2></div>
          <p>These markets are open right now on DeepBook Predict, read through {n.status?.rpc ?? 'the configured RPC'}.</p>
        </div>
        <MarketsTable n={n} limit={4} />
      </section>

      <section className="l-sec">
        <div className="l-head">
          <div><span className="label">THE PARTS</span><h2>What each piece does here.</h2></div>
          <p>Named plainly, so you can check each one on SuiScan or Walruscan.</p>
        </div>
        <div className="tech">
          {PARTS.map(([tone, title, body]) => (
            <div key={title} className={`tech-item tone-${tone}`}><h4>{title}</h4><p>{body}</p></div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-in">
          <div className="cta-copy">
            <h2>Start a crew with the people you already text.</h2>
            <p>Name it, share the link, post the first call.</p>
            <div className="l-cta">
              <Link to="/app#start" className="b3">START A CREW <Ic name="arrow" size={18} /></Link>
              <Link to="/board" className="btn btn-butter btn-lg">See the scoreboard</Link>
            </div>
          </div>
          <div className="cta-art"><img src="/art/v2/nakama-mascot-cheer.webp" alt="The lucky cat cheering" /></div>
        </div>
      </section>
      <footer className="footer">
        <span><b>Nakama</b> 仲間 · MIT · Copyright (c) 2026 Nivesh Gajengi</span>
        <span>DeepBook Predict on Sui mainnet · memory on Walrus · art generated with ChatGPT</span>
      </footer>
    </main>
  );
}
