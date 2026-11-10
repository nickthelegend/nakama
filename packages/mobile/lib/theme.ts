/**
 * Nakama mobile: one coherent dark app. Charcoal surfaces, big confident system type,
 * Nakama coral as the only accent, green/red only for up/down, Baloo 2 only in the wordmark.
 */
export const C = {
  bg: '#141414', surface: '#1c1c1c', surface2: '#242424', surface3: '#2c2c2c',
  tint: '#e7e9dd', tintInk: '#141414', tintInk2: '#5c5f55', tintLine: 'rgba(20,20,20,0.08)',
  coral: '#ff6f59', coralHi: '#ff8a72', coralSoft: 'rgba(255,111,89,0.14)', coralInk: '#ff8a72', coralEdge: '#d4472f',
  up: '#2fbf71', upSoft: 'rgba(47,191,113,0.14)', down: '#e5484d', downSoft: 'rgba(229,72,77,0.16)',
  ink: '#f5f5f5', ink2: '#a3a3a3', ink3: '#6b6b6b',
  line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.14)',
  // legacy names kept so every screen maps onto the dark palette
  plum: '#f5f5f5', plum2: '#141414', plum3: '#a3a3a3', plumSoft: '#2c2c2c',
  butter: '#ffd166', butterSoft: 'rgba(255,209,102,0.12)', butterInk: '#ffd166', butterEdge: '#2c2c2c',
  mint: '#2fbf71', mintSoft: 'rgba(47,191,113,0.14)', mintInk: '#3ddc97', mintEdge: '#1fa46b',
  pink: '#e5484d', pinkSoft: 'rgba(229,72,77,0.16)', pinkInk: '#ff6b6f',
  cream: '#141414', cream2: '#1c1c1c', sun: '#141414', sun2: '#1c1c1c',
  panel: '#1c1c1c', panel2: '#222222', panel3: '#262626',
  edge: '#1c1c1c', offEdge: '#2c2c2c', off: '#2c2c2c',
};
/** System sans (SF Pro on iOS) everywhere; Baloo 2 is reserved for the wordmark. */
export const F = {
  wordmark: 'Baloo2_800ExtraBold',
  mono: 'Menlo',
};
export const art = {
  logo: require('../assets/art/nakama-logo.webp'),
  mascot: require('../assets/art/nakama-mascot.webp'),
  cheer: require('../assets/art/nakama-mascot-cheer.webp'),
  sad: require('../assets/art/nakama-mascot-sad.webp'),
  empty: require('../assets/art/nakama-empty.webp'),
  sky: require('../assets/art/nakama-sky.webp'),
  coin: require('../assets/art/nakama-icon-coin.webp'),
  crown: require('../assets/art/nakama-icon-crown.webp'),
  fire: require('../assets/art/nakama-icon-fire.webp'),
  gem: require('../assets/art/nakama-icon-gem.webp'),
  megaphone: require('../assets/art/nakama-icon-megaphone.webp'),
  rocket: require('../assets/art/nakama-icon-rocket-up.webp'),
  anchor: require('../assets/art/nakama-icon-anchor-down.webp'),
  shield: require('../assets/art/nakama-icon-shield.webp'),
  stopwatch: require('../assets/art/nakama-icon-stopwatch.webp'),
  trophy: require('../assets/art/nakama-icon-trophy.webp'),
  quick: require('../assets/art/nakama-card-quick.webp'),
  host: require('../assets/art/nakama-card-host.webp'),
  battle: require('../assets/art/nakama-card-battle.webp'),
  crews: [1, 2, 3, 4, 5, 6].map((n) => [
    require('../assets/art/nakama-crew-1.webp'), require('../assets/art/nakama-crew-2.webp'), require('../assets/art/nakama-crew-3.webp'),
    require('../assets/art/nakama-crew-4.webp'), require('../assets/art/nakama-crew-5.webp'), require('../assets/art/nakama-crew-6.webp'),
  ][n - 1]),
  avatars: [
    require('../assets/art/nakama-avatar-1.webp'), require('../assets/art/nakama-avatar-2.webp'),
    require('../assets/art/nakama-avatar-3.webp'), require('../assets/art/nakama-avatar-4.webp'),
  ],
};
/** Stable picture for an id or address. */
export const pick = <T,>(list: T[], key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
};
export const short = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
