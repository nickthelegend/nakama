import { useEffect, useState } from 'react';
import { useNakama, type N } from './state';
import { Avatar, Brand, Ic, Link, short } from './ui';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Room } from './pages/Room';
import { Board } from './pages/Board';

const PAGES = [
  ['/app', 'Lobby', 'home'],
  ['/room', 'Crew room', 'chat'],
  ['/board', 'Scoreboard', 'trophy'],
] as const;

function TopNav({ path, n }: { path: string; n: N }) {
  const mode = n.writesOn ? (n.forkMode ? 'Fork writes' : 'Real USDC') : 'Dry-run';
  return (
    <header className="nav">
      <div className={`nav-in ${path === '/room' ? 'wide' : ''}`}>
        <Brand />
        <nav className="nav-links" aria-label="Main">
          {PAGES.map(([to, label, icon]) => (
            <Link key={to} to={to} aria-current={path === to ? 'page' : undefined}><Ic name={icon} size={16} />{label}</Link>
          ))}
        </nav>
        <div className="nav-right">
          <span className="net-pill" title={`Chain reads via ${n.status?.rpc ?? '…'}`}><i className={n.status?.rpc === 'unavailable' ? 'off' : ''} />{n.status?.rpc ?? 'Sui mainnet'}</span>
          <span className={`mode-pill ${n.writesOn ? 'on' : ''}`} title={n.writesOn ? 'Orders are signed and sent' : 'Taps are quoted and simulated; nothing is sent'}>{mode}</span>
          {path === '/' ? (
            <Link to="/app" className="btn btn-primary btn-sm">Open app</Link>
          ) : n.owner ? (
            <span className="who" title={n.owner}><Avatar address={n.owner} />{short(n.owner)}</span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PhoneTabs({ path }: { path: string }) {
  return (
    <nav className="tabs tabs-app" aria-label="Pages">
      {PAGES.map(([to, label, icon]) => (
        <Link key={to} to={to} aria-current={path === to ? 'page' : undefined}><Ic name={icon} size={18} />{label.replace('Crew room', 'Room')}</Link>
      ))}
    </nav>
  );
}

export function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  // Old invite links (/?crew=…) and the read-only walkthrough (/?as=…) open the lobby.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (path === '/' && (q.has('crew') || q.has('as'))) {
      history.replaceState(null, '', `/app${location.search}`);
      setPath('/app');
    }
  }, [path]);
  const n = useNakama();
  let page;
  if (path === '/app') page = <Lobby n={n} />;
  else if (path === '/room') page = <Room n={n} />;
  else if (path === '/board') page = <Board n={n} />;
  else page = <Landing n={n} />;
  return (
    <>
      {n.demoSigner && (
        <div className="demo-signer-badge" role="status">
          Demo signer · server-held demo key · {String(n.status?.rpc ?? '').includes('LOCAL FORK') ? 'LOCAL FORK of Sui mainnet · no real funds' : 'real mainnet funds'}
        </div>
      )}
      <TopNav path={path} n={n} />
      {page}
      {path !== '/' && path !== '/room' && <PhoneTabs path={path} />}
    </>
  );
}
