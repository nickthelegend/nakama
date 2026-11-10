import { useEffect, useMemo } from 'react';
import qrcode from 'qrcode-generator';

const APK = 'https://nakama.201-18-198-162.sslip.io/download/nakama.apk';
const GITHUB = 'https://github.com/nickthelegend/nakama';
const BLOG = 'https://github.com/nickthelegend/nakama/blob/main/docs/BLOG.md';

const SHOTS = [
  ['04-crew-chat', 'The crew chat with a live BTC call'],
  ['06-notification-live-call', 'A notification when a crewmate calls'],
  ['05-join-invite', 'Joining a crew from an invite'],
  ['08-home-featured-live-call', 'Home with the live call'],
  ['02-wallet-fund-qr', 'Your own wallet, made on the phone'],
  ['10-scoreboard', 'The crew scoreboard'],
] as const;

const WHAT = [
  ['coral', 'nakama-icon-shield', 'A crew wallet on your phone', 'Nakama makes a Sui wallet right on your phone. Your keys stay there; nobody pools your money.'],
  ['butter', 'nakama-icon-megaphone', 'One-tap BTC calls', 'A friend calls “BTC above $X in 5 minutes”. Everyone taps in once with 2 USDC on DeepBook Predict.'],
  ['mint', 'nakama-icon-stopwatch', 'Notifications', 'Your phone pings you the moment a crewmate posts a call.'],
  ['pink', 'nakama-icon-trophy', 'A scoreboard that remembers', 'Wins, streaks and every call live on as Walrus memories, so the crew knows who is actually right.'],
] as const;

function Qr({ url }: { url: string }) {
  const svg = useMemo(() => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }, [url]);
  return <div className="dl-qr" role="img" aria-label={`QR code to download the Android app: ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Nakama is a phone app. This site is its landing page and download link. */
export function Site() {
  // The web app is gone: any old path (/app, /room, /rooms, /board, /tx, invite links) lands here.
  useEffect(() => { if (location.pathname !== '/' || location.search) history.replaceState(null, '', '/' + location.hash); }, []);
  return (
    <>
      <header className="site-nav">
        <a href="/" className="logo3" aria-label="Nakama home">
          <img className="logo3-cat" src="/art/v2/nakama-mascot.webp" alt="" />
          <span className="logo3-word">NAKAMA</span>
          <span className="logo3-tag" aria-hidden>仲間</span>
        </a>
        <nav className="site-links" aria-label="Links">
          <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
          <a href={BLOG} target="_blank" rel="noreferrer">Blog</a>
          <a href="#download" className="b3 b3-sm">GET THE APP</a>
        </nav>
      </header>
      <main>
        <section className="l-hero">
          <div className="l-hero-in">
            <div>
              <span className="kicker"><b>APP</b>Android · Sui mainnet · DeepBook Predict · Walrus</span>
              <h1 className="l-h1"><span className="l-line">Your crew.</span> <span className="l-line">One BTC call.</span> <span className="l-line"><em>Everyone taps in.</em></span></h1>
              <p className="lead">Nakama is a phone app for friends who call Bitcoin together. One friend calls it, everyone taps in once with <code>2 USDC</code> from their own wallet, and the crew keeps score.</p>
              <div className="l-cta">
                <a href={APK} className="b3 b3-xl hero-dl" data-film="download">DOWNLOAD FOR ANDROID (APK)</a>
                <a href="#how" className="btn btn-lg">What it is</a>
              </div>
            </div>
            <div className="hero-phones" aria-hidden>
              <img className="hp hp-1" src="/shots/08-home-featured-live-call.webp" alt="" />
              <img className="hp hp-2" src="/shots/06-notification-live-call.webp" alt="" />
            </div>
          </div>
        </section>

        <section className="l-sec" id="how">
          <div className="l-head"><div><span className="label">WHAT IT IS</span><h2>A crew room in your pocket.</h2></div><p>Built for the group chat that already trades together. Each friend signs their own order; nothing is pooled.</p></div>
          <div className="how">
            {WHAT.map(([tone, art, title, body]) => (
              <article key={title} className={`how-card tone-${tone}`}>
                <div className="art"><img src={`/art/v2/${art}.webp`} alt="" /></div>
                <div className="in"><h3>{title}</h3><p>{body}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="l-sec">
          <div className="l-head"><div><span className="label">THE APP</span><h2>See it on a phone.</h2></div><p>Real screens from the app: the crew chat, a live call alert, joining by invite, your wallet and the scoreboard.</p></div>
          <div className="shots">
            {SHOTS.map(([f, alt]) => <figure key={f} className="shot"><img src={`/shots/${f}.webp`} alt={alt} /><figcaption>{alt}</figcaption></figure>)}
          </div>
        </section>

        <section className="l-sec">
          <div className="l-head"><div><span className="label">WHY AN APP</span><h2>Calls last five minutes. Your phone is where you are.</h2></div></div>
          <div className="tech why">
            <div className="tech-item tone-coral"><h4>Background alerts</h4><p>A call closes in 1 or 5 minutes. A notification reaches you even when Nakama is closed, so you never miss the window.</p></div>
            <div className="tech-item tone-butter"><h4>Your own keys</h4><p>The wallet is created on the phone and kept in its secure storage. You sign every tap yourself; the server never holds your money.</p></div>
            <div className="tech-item tone-mint"><h4>Scan to join</h4><p>Friends join your crew by scanning its QR code or opening the invite link.</p></div>
          </div>
        </section>

        <section className="cta-band" id="download">
          <div className="cta-in dl">
            <div className="cta-copy">
              <h2>Get Nakama</h2>
              <p>Scan with your Android phone, or tap the button.</p>
              <div className="l-cta"><a href={APK} className="b3 b3-xl">DOWNLOAD FOR ANDROID (APK)</a></div>
              <p className="ios-line">iOS: run with Expo Go — TestFlight soon.</p>
            </div>
            <div className="dl-side"><Qr url={APK} /></div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <span><b>Nakama</b> 仲間 · MIT · Copyright (c) 2026 Nivesh Gajengi</span>
        <span><a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a> · <a href={BLOG} target="_blank" rel="noreferrer">Blog</a> · DeepBook Predict on Sui mainnet · memory on Walrus · art generated with ChatGPT</span>
      </footer>
    </>
  );
}
