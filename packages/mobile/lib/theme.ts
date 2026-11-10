/** Nakama's web brand ("Kumi" crew room): cream and coral, chunky 3D-edged cards, Baloo 2 headings. */
export const C = {
  plum: '#3b1f4a', plum2: '#2a1436', plum3: '#52305f', plumSoft: '#efe6f5',
  coral: '#ff6f59', coralHi: '#ff8a72', coralSoft: '#ffe6df', coralInk: '#c0402b', coralEdge: '#d4472f',
  butter: '#ffd166', butterSoft: '#fff1cc', butterInk: '#855700', butterEdge: '#e0a92f',
  mint: '#3ddc97', mintSoft: '#d9f7e9', mintInk: '#0e7348', mintEdge: '#1fa46b',
  pink: '#ff8fc7', pinkSoft: '#ffe3f1', pinkInk: '#b02f73',
  cream: '#fff4e6', cream2: '#fbe9d4', sun: '#ffe3a3', sun2: '#fff0cf',
  panel: '#ffffff', panel2: '#fff9f1', panel3: '#f6ece0',
  ink: '#2b1630', ink2: '#5d4a62', ink3: '#8b7a8c',
  line: 'rgba(59,31,74,0.09)', edge: '#ecd9c3', offEdge: '#c4ae96', off: '#dccbb8',
};
export const F = {
  display: 'Baloo2_800ExtraBold', displayBold: 'Baloo2_700Bold',
  body: 'Urbanist_500Medium', bodySemi: 'Urbanist_600SemiBold', bodyBold: 'Urbanist_700Bold',
  mono: 'monospace',
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
