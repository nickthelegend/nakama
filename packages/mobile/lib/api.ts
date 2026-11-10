import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Hosted Nakama server (dry-run: it builds and simulates, it never signs). Override in Wallet → Server, or with EXPO_PUBLIC_NAKAMA_API. */
export const DEFAULT_API = process.env.EXPO_PUBLIC_NAKAMA_API ?? 'https://nakama.201-18-198-162.sslip.io/api';
/** A server on the Mac: the Android emulator reaches it through 10.0.2.2, the iOS Simulator through localhost. */
export const LOCAL_API = Platform.OS === 'android' ? 'http://10.0.2.2:8817' : 'http://localhost:8817';
const KEY = 'nakama.apiBase';

let base = DEFAULT_API;
export const apiBase = () => base;
export async function loadApiBase() {
  base = (await SecureStore.getItemAsync(KEY)) || DEFAULT_API;
  return base;
}
export async function setApiBase(next: string) {
  base = next.trim().replace(/\/+$/, '') || DEFAULT_API;
  await SecureStore.setItemAsync(KEY, base);
  return base;
}

/** GET when body is undefined, POST JSON otherwise. Server errors come back as readable messages, never as success. */
export async function api<T>(path: string, body?: unknown, timeoutMs = 45000): Promise<T> {
  // A busy proxy answers 429/502/503 for a moment; reads retry twice with a short backoff before failing loudly.
  for (let attempt = 0; ; attempt++) {
    try {
      return await apiOnce<T>(path, body, timeoutMs);
    } catch (e: any) {
      if (body !== undefined || attempt >= 2 || !/HTTP (429|502|503)/.test(String(e?.message))) throw e;
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
}

async function apiOnce<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(`${base}${path}`, {
      signal: ctrl.signal,
      ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch (e: any) {
    throw Error(e?.name === 'AbortError' ? `Server did not answer in ${timeoutMs / 1000}s (${base})` : `Can't reach the Nakama server (${base})`);
  } finally {
    clearTimeout(t);
  }
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw Error(String((j as any).error ?? `HTTP ${r.status}`).replace(/^Error:\s*/, ''));
  return j as T;
}

export const pct = (p: number) => (p < 0.001 ? '<0.1' : (p * 100).toFixed(1));
export const dirWord = (d: string) => (d === 'up' ? 'above' : d === 'down' ? 'below' : 'between');
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Invite link the web app also understands (`/?crew=<id>`), so one QR works for phone and browser. */
export const inviteUrl = (crewId: string) => `${base.replace(/\/api$/, '')}/?crew=${crewId}`;
/** Accepts an invite URL, a nakama:// link or a bare crew id. */
export function crewIdFrom(text: string): string | null {
  const t = text.trim();
  const m = t.match(/[?&]crew=([A-Za-z0-9-]{4,40})/) ?? t.match(/(?:join|crew)\/([A-Za-z0-9-]{4,40})/) ?? t.match(/^([A-Za-z0-9-]{4,40})$/);
  return m ? m[1] : null;
}
