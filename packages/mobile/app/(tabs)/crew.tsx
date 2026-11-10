import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Empty, ErrorNote, Pill, Skeleton } from '../../components/ui';
import { TAB_SPACE } from '../../components/TabBar';
import { api, dirWord, usd } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, art, pick, short } from '../../lib/theme';
import type { Crew } from '../../lib/types';

/** Your crews: one card each with members, a Live pill and the last message. Tapping opens the full-screen room. */
export default function Crews() {
  const app = useApp();
  const router = useRouter();
  const [crews, setCrews] = useState<Crew[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = app.address ?? '';

  const load = useCallback(async () => {
    try {
      const list = await Promise.all(app.crews.map((k) => api<Crew>(`/crews/${k.id}`).catch(() => null)));
      setCrews(list.filter((c): c is Crew => !!c));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [app.crews, app.base]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]));

  const now = Date.now();
  const sorted = [...(crews ?? [])].sort((a, b) => {
    const la = a.calls.some((x) => x.status === 'live' && x.expiryMs > now) ? 1 : 0;
    const lb = b.calls.some((x) => x.status === 'live' && x.expiryMs > now) ? 1 : 0;
    return lb - la || (b.calls.at(-1)?.createdAt ?? b.createdAt ?? '').localeCompare(a.calls.at(-1)?.createdAt ?? a.createdAt ?? '');
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: TAB_SPACE + 10 }} refreshControl={<RefreshControl tintColor="#fff" refreshing={false} onRefresh={load} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.7 }}>Crews</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pill title="+ New" tone="ghost" size="sm" onPress={() => router.push('/create')} />
            <Pill title="Join" tone="white" size="sm" onPress={() => router.push('/scan')} />
          </View>
        </View>
        {error ? <ErrorNote text={error} /> : null}
        {crews === null && app.crews.length ? <Skeleton rows={3} /> : null}
        {!app.crews.length || (crews && !crews.length) ? (
          <View style={{ backgroundColor: C.surface, borderRadius: 26 }}>
            <Empty title="No crews yet" body="Start a crew for your friends, or join one with an invite QR or link." action={<Pill title="Create a crew" onPress={() => router.push('/create')} style={{ marginTop: 6 }} />} />
          </View>
        ) : null}
        {sorted.map((c) => {
          const live = c.calls.filter((x) => x.status === 'live' && x.expiryMs > now).at(-1);
          const last = c.calls.at(-1);
          const left = live ? Math.max(0, Math.round((live.expiryMs - now) / 1000)) : 0;
          return (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/room/[id]', params: { id: c.id } })}
              style={({ pressed }) => ({ backgroundColor: pressed ? C.surface2 : C.surface, borderRadius: 26, padding: 16, gap: 12, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Image source={pick(art.crews, c.id)} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.surface3 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {c.members.slice(0, 4).map((m, i) => (
                        <Image key={m} source={pick(art.avatars, m)} style={{ width: 20, height: 20, borderRadius: 10, marginLeft: i ? -6 : 0, borderWidth: 1.5, borderColor: C.surface }} />
                      ))}
                    </View>
                    <Text style={{ color: C.ink2, fontSize: 13.5 }}>{c.members.length} member{c.members.length === 1 ? '' : 's'} · {c.public ? 'public' : 'private'}</Text>
                  </View>
                </View>
                {live ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.down }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Live {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: last ? C.ink2 : C.ink3, fontSize: 14.5 }} numberOfLines={1}>
                {last
                  ? `${last.caller.toLowerCase() === me.toLowerCase() ? 'You' : short(last.caller)}: BTC ${dirWord(last.setup.direction)} ${usd(last.strike)} · “${last.why}”`
                  : 'No calls yet · open the room to post the first'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
