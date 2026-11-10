import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import type { N } from './state';
import { Avatar, Link, TokenLogo, short, usd } from './ui';

export const PAGES = [
  ['/app', 'Lobby', 'nakama-icon-coin'],
  ['/room', 'Crew room', 'nakama-icon-megaphone'],
  ['/board', 'Scoreboard', 'nakama-icon-trophy'],
] as const;

/** The chunky Nakama lockup: the lucky cat over a 3D wordmark with its 仲間 tag. */
export function Logo() {
  return (
    <Link to="/" className="logo3" aria-label="Nakama home">
      <img className="logo3-cat" src="/art/v2/nakama-mascot.webp" alt="" />
      <span className="logo3-word">NAKAMA</span>
      <span className="logo3-tag" aria-hidden>仲間</span>
    </Link>
  );
}

/** A small countdown ring. */
export function MiniRing({ seconds, total, size = 26 }: { seconds: number; total: number; size?: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <svg className="mini-ring" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r={r} className="mr-track" />
      <circle cx="12" cy="12" r={r} className="mr-fill" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 12 12)" />
    </svg>
  );
}

/** BTC price that flashes green or pink when a new read moves it. */
function BtcChip({ price }: { price: number | null }) {
  const prev = useRef<number | null>(null);
  const [dir, setDir] = useState<'up' | 'down' | ''>('');
  useEffect(() => {
    if (price != null && prev.current != null && price !== prev.current) setDir(price > prev.current ? 'up' : 'down');
    prev.current = price;
  }, [price]);
  return (
    <span className={`hud-chip hud-btc ${dir}`} title="BTC forward price, read live from DeepBook Predict on Sui mainnet" data-film="hud-btc">
      <TokenLogo sym="BTC" size={30} />
      <span className="hc-txt"><small>BTC · LIVE</small><b key={price ?? 0} className="tick">{price != null ? usd(price) : '–'}</b></span>
      {dir && <i className="hc-arrow" aria-hidden>{dir === 'up' ? '▲' : '▼'}</i>}
    </span>
  );
}

/** The game-lobby HUD: logo, chunky tabs, live chips and the player. */
export function Hud({ path, n }: { path: string; n: N }) {
  const a = n.active;
  const timer = a ? { label: 'LIVE CALL', ms: a.expiryMs, total: a.setup.cadence * 60, live: true } : n.next5 ? { label: 'NEXT 5-MIN', ms: n.next5.expiryMs, total: 300, live: false } : null;
  const crew = n.crew;
  return (
    <header className="hud">
      <div className={`net-ribbon ${n.forkMode ? 'fork' : ''}`} data-film="net-ribbon">
        {n.forkMode ? <><b>LOCAL FORK</b> of Sui mainnet · no real funds · {String(n.status?.rpc ?? '').replace('LOCAL FORK of Sui mainnet @ ', '')}</> : <><b>LIVE</b> · Sui mainnet</>}
      </div>
      <div className={`hud-in ${path === '/room' ? 'wide' : ''}`}>
        <Logo />
        <nav className="hud-tabs" aria-label="Main">
          {PAGES.map(([to, label, art]) => (
            <Link key={to} to={to} className="hud-tab" aria-current={path === to ? 'page' : undefined} data-film={`tab-${to.slice(1)}`}>
              <img src={`/art/v2/${art}.webp`} alt="" />{label}
            </Link>
          ))}
        </nav>
        <div className="hud-chips">
          <BtcChip price={n.forward} />
          {timer && (
            <Link to={a ? '/app' : '/app#make-a-call'} className={`hud-chip hud-timer ${timer.live ? 'live' : ''}`} title={a ? 'Time left to tap in on the live call' : 'Next 5-minute BTC market closes in'} data-film="hud-timer">
              <MiniRing seconds={n.secondsLeft(timer.ms)} total={timer.total} size={30} />
              <span className="hc-txt"><small>{timer.label}</small><b className="mono">{n.clock(timer.ms)}</b></span>
            </Link>
          )}
          <Link to={crew ? '/room' : '/app#start'} className="hud-chip hud-crew" title={crew ? `${crew.name}: open the crew room` : 'Start a crew'} data-film="hud-crew">
            <span className="hc-avs">
              {crew && crew.members.length ? crew.members.slice(0, 4).map((m) => <Avatar key={m} address={m} size={28} />) : <img src="/art/v2/nakama-icon-megaphone.webp" alt="" />}
            </span>
            <span className="hc-txt"><small>{crew ? `${crew.members.length} IN CREW` : 'NO CREW YET'}</small><b>{crew ? crew.name : 'Start one'}</b></span>
          </Link>
        </div>
        <div className="hud-player">
          {n.owner && (
            <span className="hud-me" title={n.owner} data-film="hud-player">
              <Avatar address={n.owner} size={40} />
              <span className="hc-txt"><small>{n.account ? 'YOUR WALLET' : 'READ-ONLY'}</small><b className="mono">{short(n.owner)}</b></span>
            </span>
          )}
          {path === '/' ? (
            <Link to="/app" className="b3 b3-sm hud-cta">OPEN APP</Link>
          ) : !n.account ? (
            <span className={`hud-connect ${n.owner ? 'has-owner' : ''}`}><ConnectButton /></span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** The phone tab bar: the same three game tabs, at the bottom. */
export function PhoneTabs({ path }: { path: string }) {
  return (
    <nav className="tabs tabs-app" aria-label="Pages">
      {PAGES.map(([to, label, art]) => (
        <Link key={to} to={to} aria-current={path === to ? 'page' : undefined}><img src={`/art/v2/${art}.webp`} alt="" />{label.replace('Crew room', 'Room')}</Link>
      ))}
    </nav>
  );
}

/** One small honest badge for what a tap does on this server. */
export function ModeBadge({ n }: { n: N }) {
  const live = n.liveMode;
  return (
    <span className={`mode-badge ${live ? 'live' : ''}`} title={live ? 'Taps sign and send a real order' : 'Taps are quoted and simulated on mainnet; nothing is sent'} data-film="mode">
      <i />{live ? (n.forkMode ? 'Fork writes · no real funds' : 'Live · real USDC') : 'Dry-run · nothing is sent'} · via {n.status?.rpc ?? '…'}
    </span>
  );
}
