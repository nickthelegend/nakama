import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { api, apiBase, dirWord, loadApiBase, setApiBase, usd } from './api';
import { createWallet, loadWallet } from './wallet';
import type { Crew } from './types';

type Known = { id: string; name: string };
type Ctx = {
  ready: boolean;
  address: string | null;
  onboarded: boolean;
  base: string;
  crews: Known[];
  activeCrew: string | null;
  lastPoll: { at: number; error: string | null } | null;
  createWallet: () => Promise<string>;
  finishOnboarding: () => Promise<void>;
  rememberCrew: (c: { id: string; name: string }) => Promise<void>;
  setActiveCrew: (id: string) => Promise<void>;
  changeBase: (b: string) => Promise<void>;
};
const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(C);
  if (!v) throw Error('useApp outside provider');
  return v;
};

const K = { crews: 'nakama.crews', active: 'nakama.activeCrew', onboarded: 'nakama.onboarded' };
const POLL_MS = 15000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function askNotificationPermission() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('crew-calls', {
      name: 'Crew calls', importance: Notifications.AndroidImportance.HIGH, lightColor: '#FF6F59', vibrationPattern: [0, 180, 80, 180],
    });
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function notify(title: string, body: string, crewId: string) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { crewId }, ...(Platform.OS === 'android' ? { channelId: 'crew-calls' } : {}) } as any,
    trigger: Platform.OS === 'android' ? ({ channelId: 'crew-calls' } as any) : null,
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [base, setBase] = useState(apiBase());
  const [crews, setCrews] = useState<Known[]>([]);
  const [activeCrew, setActive] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Ctx['lastPoll']>(null);
  /** callId -> status seen at the last poll; null until the first poll so old calls never fire. */
  const seen = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    (async () => {
      setBase(await loadApiBase());
      setAddress(await loadWallet());
      setOnboarded((await SecureStore.getItemAsync(K.onboarded)) === '1');
      setCrews(JSON.parse((await SecureStore.getItemAsync(K.crews)) ?? '[]'));
      setActive(await SecureStore.getItemAsync(K.active));
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  const rememberCrew = useCallback(async (c: Known) => {
    setCrews((list) => {
      const next = [{ id: c.id, name: c.name }, ...list.filter((k) => k.id !== c.id)].slice(0, 20);
      SecureStore.setItemAsync(K.crews, JSON.stringify(next));
      return next;
    });
  }, []);
  const setActiveCrew = useCallback(async (id: string) => {
    setActive(id);
    await SecureStore.setItemAsync(K.active, id);
  }, []);

  // Poll every crew this phone belongs to; a new call by someone else or a settled call becomes a local notification.
  // Android keeps the JS timer running while Expo Go stays alive in the background.
  useEffect(() => {
    if (!ready || !address || !crews.length) return;
    let stop = false;
    const tick = async () => {
      const first = seen.current === null;
      const map = seen.current ?? new Map<string, string>();
      let error: string | null = null;
      for (const k of crews) {
        try {
          const c = await api<Crew>(`/crews/${k.id}`, undefined, 20000);
          for (const x of c.calls) {
            const prev = map.get(x.id);
            if (!first && prev === undefined && x.caller.toLowerCase() !== address.toLowerCase() && x.status === 'live')
              notify(`📣 New call in ${c.name}`, `BTC ${dirWord(x.setup.direction)} ${usd(x.strike)} in ${x.setup.cadence}m · "${x.why}" · tap in with 2 USDC`, c.id);
            if (!first && prev && prev !== 'settled' && x.status === 'settled') {
              const hits = x.orders.filter((o) => o.hit).length;
              notify(`🏁 Call settled in ${c.name}`, `BTC ${dirWord(x.setup.direction)} ${usd(x.strike)}: ${x.orders.length ? `${hits}/${x.orders.length} taps won` : 'no taps'} (Pyth price)`, c.id);
            }
            map.set(x.id, x.status);
          }
        } catch (e: any) {
          error = e.message;
        }
      }
      seen.current = map;
      if (!stop) setLastPoll({ at: Date.now(), error });
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [ready, address, crews, base]);

  const value: Ctx = {
    ready, address, onboarded, base, crews, activeCrew, lastPoll,
    createWallet: async () => {
      const a = await createWallet();
      setAddress(a);
      return a;
    },
    finishOnboarding: async () => {
      await SecureStore.setItemAsync(K.onboarded, '1');
      setOnboarded(true);
    },
    rememberCrew,
    setActiveCrew,
    changeBase: async (b) => {
      seen.current = null;
      setBase(await setApiBase(b));
    },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
