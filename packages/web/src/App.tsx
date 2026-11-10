import { useEffect, useState } from 'react';
import { useNakama, type N } from './state';
import { Hud, PhoneTabs } from './hud';
import { Landing } from './pages/Landing';
import { Shell } from './pages/Shell';
import { Board } from './pages/Board';
import { TxPage } from './pages/TxPage';

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
  const shell = path === '/app' || path === '/room';
  if (shell) page = <Shell n={n} />;
  else if (path === '/board') page = <Board n={n} />;
  else if (path === '/tx') page = <TxPage n={n} />;
  else page = <Landing n={n} />;
  return (
    <div className={shell ? 'frame' : undefined}>
      {n.demoSigner && (
        <div className="demo-signer-badge" role="status">
          Demo signer · server-held demo key · {String(n.status?.rpc ?? '').includes('LOCAL FORK') ? 'LOCAL FORK of Sui mainnet · no real funds' : 'real mainnet funds'}
        </div>
      )}
      <Hud path={path} n={n} />
      {page}
      {path !== '/' && !shell && <PhoneTabs path={path} />}
    </div>
  );
}
