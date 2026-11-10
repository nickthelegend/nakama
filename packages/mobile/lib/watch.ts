import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { api, dirWord, loadApiBase, usd } from './api';
import { short } from './theme';
import type { Crew } from './types';

/**
 * One crew check, shared by the 15 s foreground poll and the OS background task.
 * It compares each crew with what this phone saw last time and raises local notifications for:
 * a crewmate's new call, a crewmate tapping in, and a call that Pyth settled.
 * The "seen" map lives in secure storage so the foreground and background runs agree.
 */
const SEEN = 'nakama.seen.v2';
const CREWS = 'nakama.crews';
const ADDRESS = 'nakama.lastAddress';
export const TASK = 'nakama-crew-check';

type Seen = Record<string, { s: string; n: number }>;

function notify(title: string, body: string, crewId: string) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { crewId }, ...(Platform.OS === 'android' ? { channelId: 'crew-calls' } : {}) } as any,
    trigger: Platform.OS === 'android' ? ({ channelId: 'crew-calls' } as any) : null,
  });
}

export async function rememberAddress(address: string) {
  await SecureStore.setItemAsync(ADDRESS, address);
  // Start watching from now: from here on, a crewmate's live call counts as new even in a crew joined later.
  if ((await SecureStore.getItemAsync(SEEN)) === null) await SecureStore.setItemAsync(SEEN, '{}');
}

export async function checkCrews(address: string, crewIds: { id: string }[]): Promise<{ notified: number; error: string | null }> {
  const raw = await SecureStore.getItemAsync(SEEN);
  const first = raw === null;
  const seen: Seen = raw ? JSON.parse(raw) : {};
  const me = address.toLowerCase();
  let notified = 0;
  let error: string | null = null;
  for (const k of crewIds) {
    let c: Crew;
    try {
      c = await api<Crew>(`/crews/${k.id}`, undefined, 20000);
    } catch (e: any) {
      error = e.message;
      continue;
    }
    for (const x of c.calls) {
      const prev = seen[x.id];
      const label = `BTC ${dirWord(x.setup.direction)} ${usd(x.strike)}`;
      if (!first && !prev && x.caller.toLowerCase() !== me && x.status === 'live' && x.expiryMs > Date.now()) {
        await notify(`📣 New call in ${c.name}`, `${label} in ${x.setup.cadence}m · “${x.why}” · tap in with 2 USDC`, c.id);
        notified++;
      }
      if (!first && prev) {
        for (const o of x.orders.slice(prev.n)) {
          if (o.address.toLowerCase() === me) continue;
          await notify(`🤝 ${short(o.address)} tapped in`, `${c.name} · ${label} · ${o.size} USDC`, c.id);
          notified++;
        }
        if (prev.s !== 'settled' && x.status === 'settled') {
          const hits = x.orders.filter((o) => o.hit).length;
          await notify(`🏁 Settled in ${c.name}`, `${label}: ${x.orders.length ? `${hits}/${x.orders.length} taps won` : 'no taps'} (Pyth price)`, c.id);
          notified++;
        }
      }
      seen[x.id] = { s: x.status, n: x.orders.length };
    }
  }
  await SecureStore.setItemAsync(SEEN, JSON.stringify(seen));
  return { notified, error };
}

/** Clears what this phone has seen, e.g. after switching servers, so old calls never fire. */
export async function resetSeen() {
  await SecureStore.deleteItemAsync(SEEN);
}

// The OS calls this when it grants background time (iOS BGTaskScheduler / Android WorkManager, at least 15 min apart).
TaskManager.defineTask(TASK, async () => {
  try {
    await loadApiBase();
    const address = await SecureStore.getItemAsync(ADDRESS);
    const crews = JSON.parse((await SecureStore.getItemAsync(CREWS)) ?? '[]');
    if (address && crews.length) await checkCrews(address, crews);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registers the background check. Returns a readable status for the Wallet screen. */
export async function registerBackgroundCheck(): Promise<string> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return 'Background checks unavailable on this device';
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
    return 'Background check registered (the OS decides when, at least 15 min apart)';
  } catch (e: any) {
    return `Background check not available here: ${e?.message ?? e}`;
  }
}
