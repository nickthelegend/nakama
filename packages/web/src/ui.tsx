import type { CSSProperties, ReactNode } from 'react';
// Token and network logos, bundled from @web3icons/core (MIT, https://github.com/0xa3k5/web3icons).
// Rendered as <img> data URIs so each SVG's internal gradient ids stay scoped.
import BTC from '@web3icons/core/svgs/tokens/branded/BTC.svg.js';
import SUI from '@web3icons/core/svgs/tokens/branded/SUI.svg.js';
import USDC from '@web3icons/core/svgs/tokens/branded/USDC.svg.js';
import suiNet from '@web3icons/core/svgs/networks/branded/sui.svg.js';
import type { Odds } from './state';
import { pct } from './state';

export const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;

/** Links keep the crew and view-as addresses in the query, so every page shows the same crew. */
export function withQs(path: string) {
  const cur = new URLSearchParams(location.search);
  const [p, hash] = path.split('#');
  const [base, q] = p.split('?');
  const next = new URLSearchParams(q);
  // The landing page stays the landing page: a crew or view-as query there would open the lobby.
  if (base !== '/') for (const k of ['crew', 'as']) if (!next.has(k)) for (const v of cur.getAll(k)) next.append(k, v);
  const s = next.toString();
  return `${base}${s ? `?${s}` : ''}${hash ? `#${hash}` : ''}`;
}
export function navigate(to: string) {
  history.pushState(null, '', withQs(to));
  dispatchEvent(new PopStateEvent('popstate'));
  const hash = to.split('#')[1];
  if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  else window.scrollTo({ top: 0 });
}
type LinkProps = { to: string; children: ReactNode; className?: string; style?: CSSProperties; 'aria-current'?: 'page'; 'aria-label'?: string; title?: string; 'data-film'?: string };
export function Link({ to, children, ...rest }: LinkProps) {
  return <a href={withQs(to)} {...rest} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); }}>{children}</a>;
}

const uri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const TOKENS: Record<string, string> = { BTC: uri(BTC), SUI: uri(SUI), USDC: uri(USDC) };
/** A token logo in a round white chip. */
export function TokenLogo({ sym, size = 28 }: { sym: 'BTC' | 'SUI' | 'USDC'; size?: number }) {
  return (
    <span className={`tlogo ${size < 22 ? 'tlogo-sm' : ''}`} style={{ width: size, height: size }} title={sym} role="img" aria-label={sym}>
      <img src={TOKENS[sym]} alt="" />
    </span>
  );
}
export const SuiMark = ({ size = 18 }: { size?: number }) => <img className="clogo" src={uri(suiNet)} alt="Sui" width={size} height={size} />;
/** Neutral glyph for Walrus Memory (no official mark is bundled). */
export const MemoryGlyph = ({ size = 16 }: { size?: number }) => (
  <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </svg>
);

const hashOf = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const TONES = ['coral', 'butter', 'mint', 'pink'] as const;
/** A member's face comes from their own Sui address: one of the six crew characters on a colour from its bytes. */
export const crewChar = (address: string) => (hashOf(address.toLowerCase()) % 6) + 1;
export const toneOf = (address: string) => TONES[hashOf(address.toLowerCase()) % 4];
export function Avatar({ address, size, lg }: { address: string; size?: number; lg?: boolean }) {
  return (
    <span className={`avatar avatar-m tone-${toneOf(address)} ${lg ? 'avatar-lg' : ''}`} style={size ? { width: size, height: size } : undefined} title={short(address)} aria-hidden>
      <img src={`/art/v2/nakama-crew-${crewChar(address)}.webp`} alt="" />
    </span>
  );
}
/** Every crew is fronted by the lucky cat. */
export function CrewAvatar({ size }: { size?: 'lg' | 'sm' }) {
  return <span className={`crew-av tone-butter ${size ? `crew-av-${size}` : ''}`} aria-hidden><img src="/art/v2/nakama-mascot.webp" alt="" /></span>;
}

const paths: Record<string, string> = {
  send: 'M4 12l16-8-6 16-2.5-6.5L4 12z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5m0 0-6 6m6-6 6 6',
  down: 'M12 5v14m0 0 6-6m-6 6-6-6',
  range: 'M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4',
  chat: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 3.5V17H6a2 2 0 0 1-2-2z',
  crews: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4',
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  plus: 'M12 6v12M6 12h12',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  link: 'M14 5h5v5m0-5-8 8M10 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  key: 'M14.5 9.5a4.5 4.5 0 1 0-3.9 4.46L10 15h-2v2H6v2H3v-3l6.04-6.04A4.5 4.5 0 0 0 14.5 9.5zM15.5 8.5h.01',
  alert: 'M12 8v5m0 3.5v.01M10.3 4.6 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h9',
};
export function Ic({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function Notice({ children, error }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>;
}

/** Set from /status: on a LOCAL FORK, digests open the app's own fork transaction page (SuiScan cannot see them). */
export const net = { fork: false };
export function Tx({ digest, label }: { digest: string; label?: string }) {
  if (net.fork)
    return (
      <a className="hash hash-fork" href={`/tx?d=${digest}`} target="_blank" rel="noreferrer" title={`${label ?? 'transaction'} ${digest} on the LOCAL FORK of Sui mainnet (not on SuiScan)`} data-film="fork-digest">
        <span className="fork-tag">LOCAL FORK</span>{label ? `${label} · ` : ''}{digest.slice(0, 6)}…{digest.slice(-4)}
      </a>
    );
  return (
    <a className="hash" href={`https://suiscan.xyz/mainnet/tx/${digest}`} target="_blank" rel="noreferrer" title={`${label ?? 'transaction'} ${digest} on SuiScan (mainnet)`}>
      {label ? `${label} · ` : ''}{digest.slice(0, 6)}…{digest.slice(-4)}
    </a>
  );
}

/** Walrus blob IDs the app recalled before acting, each linking to Walruscan. */
export function Recalled({ ids, label = 'Recalled from Walrus' }: { ids: string[] | undefined; label?: string }) {
  if (!ids?.length) return null;
  return (
    <div className="recalled" data-film="recalled">
      <span className="recalled-k"><MemoryGlyph size={14} />{label} · {ids.length}</span>
      {ids.slice(0, 4).map((id) => (
        <a key={id} className="blob" target="_blank" rel="noreferrer" href={`https://walruscan.com/mainnet/blob/${id}`}>
          {short(id)} <Ic name="link" size={12} />
        </a>
      ))}
    </div>
  );
}

/** Live Predict odds against the 15–50% entry band. */
export function OddsBar({ odds, dark }: { odds: Odds; dark?: boolean }) {
  const out = odds.inBand === false;
  const p = odds.probability ?? 0;
  return (
    <div className={`odds ${out ? 'odds-out' : 'odds-in'} ${dark ? 'odds-dark' : ''}`} aria-live="polite" data-film="odds">
      <span className="odds-top">
        <small>Predict odds now</small>
        <b className="mono">{pct(p)}%</b>
      </span>
      <span className="odds-bar" aria-hidden="true">
        <span className="odds-band" data-film="odds-band" style={{ left: `${odds.band.min * 100}%`, width: `${(odds.band.max - odds.band.min) * 100}%` }} />
        <span className="odds-dot" style={{ left: `${Math.min(100, Math.max(0, p * 100))}%` }} />
      </span>
      <small className="odds-note">
        {out ? `Outside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band: Predict takes no new taps` : `Inside the ${odds.band.min * 100}–${odds.band.max * 100}% entry band: taps are open`}
      </small>
    </div>
  );
}

/** The Nakama wordmark: the lucky cat plus the name, in the coral game-lobby style. */
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Nakama home">
      <span className="brand-mark"><img src="/art/v2/nakama-mascot.webp" alt="" /></span>
      Nakama<small>仲間</small>
    </Link>
  );
}
