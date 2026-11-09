import type { ReactNode } from 'react';

export const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;

// A member's face is derived from their own Sui address: one of the crew portraits, on a ring in a colour from its bytes.
export function Avatar({ address, size = 40, ring = false }: { address: string; size?: number; ring?: boolean }) {
  const hex = address.replace(/^0x/, '');
  const h1 = parseInt(hex.slice(0, 6), 16) % 360;
  const n = (parseInt(hex.slice(6, 10), 16) % 4) + 1;
  return (
    <span className={`avatar ${ring ? 'avatar-ring' : ''}`} aria-hidden="true" style={{ width: size, height: size, background: `hsl(${h1} 90% 62%)` }}>
      <img src={`/art/v2/nakama-avatar-${n}.webp`} alt="" width={size} height={size} />
    </span>
  );
}

const paths: Record<string, ReactNode> = {
  up: <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  down: <path d="M12 5v14m0 0 6-6m-6 6-6-6" />,
  range: <path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  link: <path d="M14 5h5v5m0-5-8 8M10 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2.5" />
      <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8" />
    </>
  ),
  alert: <path d="M12 8v5m0 3.5v.01M10.3 4.6 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />,
  key: <path d="M14.5 9.5a4 4 0 1 1-1.2 2.9L5 20.5H3.5V19l1-1H6v-1.5h1.5V15l3.3-3.3m3.7-2.2h.01" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />,
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// Seconds left in the market's window, drawn as a ring. The window is the market cadence (1 or 5 minutes).
export function Ring({ seconds, total }: { seconds: number; total: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  const urgent = seconds <= 30;
  return (
    <div className={`ring ${urgent ? 'ring-urgent' : ''}`} role="timer" aria-label={`${seconds} seconds until the market closes`}>
      <svg viewBox="0 0 72 72" width="76" height="76" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="ring-track" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className="ring-label">
        <b className="timer num">{seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`}</b>
        <small>left</small>
      </span>
    </div>
  );
}

const STICKERS = ['fire', 'rocket', 'skull', 'handshake', 'clock', 'crown', 'target', 'moon'] as const;
/** Die-cut sticker art. Decorative unless a label is given. */
export function Sticker({ name, className = '', label }: { name: string; className?: string; label?: string }) {
  if (!(STICKERS as readonly string[]).includes(name)) return null;
  return (
    <img
      className={`stk ${className}`}
      src={`/art/nakama-sticker-${name}.webp`}
      alt={label ?? ''}
      title={label}
      width={96}
      height={96}
      draggable={false}
    />
  );
}
