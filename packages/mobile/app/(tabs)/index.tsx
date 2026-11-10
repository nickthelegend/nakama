import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Chip, Empty, ErrorNote, H2, Kicker, Pill } from '../../components/ui';
import { api, dirWord, usd } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, F, art, pick } from '../../lib/theme';
import type { Room, Status } from '../../lib/types';

export default function Rooms() {
  const app = useApp();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, st] = await Promise.all([api<{ rooms: Room[] }>('/crews'), api<Status>('/status')]);
      setRooms(r.rooms);
      setStatus(st);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [app.base]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]));

  const open = async (id: string, name: string) => {
    await app.rememberCrew({ id, name });
    await app.setActiveCrew(id);
    router.navigate('/(tabs)/crew');
  };
  const mine = new Set(app.crews.map((c) => c.id));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.sun }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16, backgroundColor: C.cream, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image source={art.logo} style={{ width: 132, height: 64 }} contentFit="contain" />
          <Chip text={status ? (status.mainnetWrites ? 'Live mainnet' : 'Dry-run server') : '…'} tone={status?.mainnetWrites ? 'mint' : 'butter'} />
        </View>

        <Card face={C.plum} edge="#22102b" style={{ gap: 10, overflow: 'hidden' }}>
          <Image source={art.quick} style={{ position: 'absolute', right: -16, bottom: -18, width: 130, height: 130, opacity: 0.95 }} />
          <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 27, color: '#fff', maxWidth: '68%' }}>Your crew's BTC calls, one tap to join</Text>
          <Text style={{ fontFamily: F.body, color: '#e7d8ef', maxWidth: '68%', fontSize: 14 }}>Start a crew or scan a friend's invite QR.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pill title="Create crew" size="sm" onPress={() => router.push('/create')} />
            <Pill title="Join with QR" size="sm" tone="butter" onPress={() => router.push('/scan')} />
          </View>
        </Card>

        {app.crews.length > 0 && (
          <View style={{ gap: 10 }}>
            <Kicker>My crews</Kicker>
            {app.crews.map((c) => (
              <RoomRow key={c.id} id={c.id} name={c.name} sub={c.id === app.activeCrew ? 'Open now' : 'Tap to open'} onPress={() => open(c.id, c.name)} />
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Kicker>Public crews</Kicker>
          {error ? <ErrorNote text={error} /> : null}
          {rooms === null && !error ? <Body faint>Loading public crews…</Body> : null}
          {rooms && rooms.length === 0 ? (
            <Card><Empty title="No public crews yet" body="Be the first: create a public crew and it shows up here for everyone." /></Card>
          ) : null}
          {rooms?.map((r) => (
            <RoomRow
              key={r.id}
              id={r.id}
              name={r.name}
              sub={`${r.members} member${r.members === 1 ? '' : 's'} · ${r.calls} call${r.calls === 1 ? '' : 's'}${r.readOnlyDemo ? ' · preview' : ''}`}
              live={r.live && r.live.expiryMs > Date.now() ? `LIVE · BTC ${dirWord(r.live.direction)} ${usd(r.live.strike)} · ${r.live.taps} taps` : null}
              joined={mine.has(r.id)}
              onPress={() => open(r.id, r.name)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoomRow({ id, name, sub, live, joined, onPress }: { id: string; name: string; sub: string; live?: string | null; joined?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${name}`}>
      {({ pressed }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, transform: [{ translateY: pressed ? 3 : 0 }] }}>
          <Image source={pick(art.crews, id)} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.butterSoft }} />
          <View style={{ flex: 1, gap: 3 }}>
            <H2 style={{ fontSize: 18 }}>{name}</H2>
            <Body style={{ fontSize: 13 }}>{sub}</Body>
            {live ? <Chip text={live} tone="coral" /> : null}
          </View>
          {joined ? <Chip text="Mine" tone="mint" /> : <Text style={{ fontFamily: F.display, fontSize: 22, color: C.coral }}>›</Text>}
        </Card>
      )}
    </Pressable>
  );
}
