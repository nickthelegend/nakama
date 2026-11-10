import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { api, apiBase, loadApiBase, setApiBase } from './api';
import { checkCrews, registerBackgroundCheck, rememberAddress, resetSeen } from './watch';
import { createWallet, loadWallet } from './wallet';

type Known = { id: string; name: string };
type Ctx = {
  ready: boolean;
  address: string | null;
  onboarded: boolean;
  base: string;
  crews: Known[];
  activeCrew: string | null;
  lastPoll: { at: number; error: string | null } | null;
  bgStatus: string | null;
  rpc: string | null;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [base, setBase] = useState(apiBase());
  const [crews, setCrews] = useState<Known[]>([]);
  const [activeCrew, setActive] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Ctx['lastPoll']>(null);
  const [bgStatus, setBgStatus] = useState<string | null>(null);
  const [rpc, setRpc] = useState<string | null>(null);
  useEffect(() => {
    setRpc(null);
    api<{ rpc: string }>('/status').then((s) => setRpc(s.rpc)).catch(() => setRpc(null));
  }, [base]);

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

  // Foreground: check every crew this phone belongs to every 15 s (new calls, crewmates' taps, settled calls).
  // Background: the same check runs as an OS background task (see lib/watch.ts).
  useEffect(() => {
    if (!ready || !address) return;
    rememberAddress(address);
    registerBackgroundCheck().then(setBgStatus);
  }, [ready, address]);
  useEffect(() => {
    if (!ready || !address || !crews.length) return;
    let stop = false;
    const tick = async () => {
      const r = await checkCrews(address, crews).catch((e) => ({ notified: 0, error: String(e?.message ?? e) }));
      if (!stop) setLastPoll({ at: Date.now(), error: r.error });
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [ready, address, crews, base]);

  const value: Ctx = {
    ready, address, onboarded, base, crews, activeCrew, lastPoll, bgStatus, rpc,
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
      await resetSeen();
      setBase(await setApiBase(b));
    },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
