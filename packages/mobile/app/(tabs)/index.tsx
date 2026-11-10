import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Empty, ErrorNote, Pill, Skeleton, Wordmark } from '../../components/ui';
import { CallCard } from '../../components/CallCard';
import { TAB_SPACE } from '../../components/TabBar';
import { api, dirWord, usd } from '../../lib/api';
import { balances } from '../../lib/sui';
import { useApp } from '../../lib/store';
import { C, art, pick } from '../../lib/theme';
import type { Crew, Room } from '../../lib/types';

const W = Dimensions.get('window').width;
const CARD_W = W - 52;
type Filter = 'All' | 'Public' | 'Private' | 'Live';
type Row = { id: string; name: string; members: number; calls: number; isPublic: boolean; mine: boolean; live: string | null };

export default function Home() {
  const app = useApp();
  const router = useRouter();
  const [mine, setMine] = useState<Record<string, Crew>>({});
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [page, setPage] = useState(0);
  const me = app.address ?? '';

  const load = useCallback(async () => {
    try {
      const [r, ...cs] = await Promise.all([
        api<{ rooms: Room[] }>('/crews'),
        ...app.crews.map((k) => api<Crew>(`/crews/${k.id}`).catch(() => null)),
      ]);
      setRooms((r as { rooms: Room[] }).rooms);
      const map: Record<string, Crew> = {};
      for (const c of cs as (Crew | null)[]) if (c) map[c.id] = c;
      setMine(map);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    if (me) balances(me).then((b) => setUsdc(b.usdc)).catch(() => {});
  }, [app.base, app.crews, me]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]));

  const open = async (id: string, name: string) => {
    await app.rememberCrew({ id, name });
    await app.setActiveCrew(id);
    router.push({ pathname: '/room/[id]', params: { id } });
  };

  // Live calls across my crews, soonest expiry first.
  const live = useMemo(() => {
    const now = Date.now();
    return Object.values(mine)
      .flatMap((c) => c.calls.filter((x) => x.status === 'live' && x.expiryMs > now).map((x) => ({ x, c })))
      .sort((a, b) => a.x.expiryMs - b.x.expiryMs);
  }, [mine]);

  const rows: Row[] = useMemo(() => {
    const now = Date.now();
    const out = new Map<string, Row>();
    for (const c of Object.values(mine)) {
      const l = c.calls.filter((x) => x.status === 'live' && x.expiryMs > now).at(-1);
      out.set(c.id, { id: c.id, name: c.name, members: c.members.length, calls: c.calls.length, isPublic: !!c.public, mine: true, live: l ? `BTC ${dirWord(l.setup.direction)} ${usd(l.strike)}` : null });
    }
    for (const r of rooms ?? [])
      if (!out.has(r.id))
        out.set(r.id, { id: r.id, name: r.name, members: r.members, calls: r.calls, isPublic: true, mine: false, live: r.live && r.live.expiryMs > now ? `BTC ${dirWord(r.live.direction)} ${usd(r.live.strike)}` : null });
    return [...out.values()];
  }, [mine, rooms]);
  const shown = rows.filter((r) => filter === 'All' || (filter === 'Public' ? r.isPublic : filter === 'Private' ? !r.isPublic : !!r.live));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_SPACE + 10 }}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={false} onRefresh={load} />}
      >
        {/* header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark />
          <Pressable accessibilityLabel="Find a crew" onPress={() => router.push('/scan')} hitSlop={12}>
            <Svg width={28} height={28} viewBox="0 0 24 24"><Circle cx={11} cy={11} r={7} stroke="#fff" strokeWidth={2} fill="none" /><Path d="m16.5 16.5 4 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" /></Svg>
          </Pressable>
        </View>

        {/* balance */}
        <View style={{ paddingHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.ink2, fontSize: 17, fontWeight: '500' }}>Balance</Text>
            <Text style={{ color: '#fff', fontSize: 36, fontWeight: '700', letterSpacing: -1 }}>
              {usdc == null ? '$–' : `$${usdc.toFixed(2).split('.')[0]}`}
              <Text style={{ color: C.ink2 }}>{usdc == null ? '' : `.${usdc.toFixed(2).split('.')[1]}`}</Text>
            </Text>
            <Text style={{ color: C.ink3, fontSize: 12.5, fontWeight: '500' }}>USDC in your wallet · Sui mainnet</Text>
          </View>
          <Pill title="Deposit" tone="white" onPress={() => router.navigate('/(tabs)/wallet')} style={{ marginBottom: 14 }} />
        </View>

        {/* featured live calls */}
        <View style={{ marginTop: 18 }}>
          {live.length ? (
            <>
              <ScrollView
                horizontal
                decelerationRate="fast"
                snapToInterval={CARD_W + 12}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12)))}
              >
                {live.map(({ x, c }) => (
                  <View key={x.id} style={{ width: CARD_W }}>
                    <CallCard
                      featured
                      call={x}
                      me={me}
                      member={c.members.some((m) => m.toLowerCase() === me.toLowerCase())}
                      crewName={c.name}
                      members={c.members.length}
                      past={c.calls.filter((y) => y.status === 'settled')}
                      onChanged={load}
                      onOpen={() => open(c.id, c.name)}
                    />
                  </View>
                ))}
              </ScrollView>
              {live.length > 1 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  {live.map((l, i) => <View key={l.x.id} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? '#fff' : C.surface3 }} />)}
                </View>
              ) : null}
            </>
          ) : (
            <View style={{ marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 30, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image source={art.empty} style={{ width: 92, height: 92 }} contentFit="contain" />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }}>No live calls</Text>
                <Body>{app.crews.length ? 'Your crews are quiet. Post a call and everyone gets pinged.' : 'Join a crew to see its live BTC calls here.'}</Body>
              </View>
            </View>
          )}
        </View>

        {/* crews */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.6 }}>Crews</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pill title="+ New" tone="ghost" size="sm" onPress={() => router.push('/create')} />
              <Pill title="Scan QR" tone="ghost" size="sm" onPress={() => router.push('/scan')} />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(['All', 'Public', 'Private', 'Live'] as Filter[]).map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: 'center', backgroundColor: filter === f ? '#f5f5f5' : 'transparent', borderWidth: 1, borderColor: filter === f ? '#f5f5f5' : C.line2 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: filter === f ? '#141414' : '#fff' }}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {error ? <ErrorNote text={error} /> : null}
          {rooms === null && !error ? <Skeleton /> : null}
          {rooms !== null && shown.length === 0 ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 26 }}>
              <Empty
                title={filter === 'Live' ? 'Nothing live right now' : 'No crews here yet'}
                body={filter === 'All' ? 'Start one, or scan a friend’s invite QR.' : 'Try another filter, or start a crew.'}
                action={<Pill title="Create a crew" onPress={() => router.push('/create')} style={{ marginTop: 6 }} />}
              />
            </View>
          ) : null}
          {shown.length ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 26, overflow: 'hidden' }}>
              {shown.map((r, i) => (
                <Pressable key={r.id} onPress={() => open(r.id, r.name)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingRight: 16, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, backgroundColor: pressed ? C.surface2 : 'transparent' })}>
                  <Image source={pick(art.crews, r.id)} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.surface3 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }} numberOfLines={1}>{r.name}</Text>
                    <Text style={{ color: C.ink2, fontSize: 14 }} numberOfLines={1}>
                      {r.live ?? `${r.members} member${r.members === 1 ? '' : 's'} · ${r.calls} call${r.calls === 1 ? '' : 's'}`}
                      {r.live ? '' : ` · ${r.isPublic ? 'public' : 'private'}`}{r.mine ? ' · joined' : ''}
                    </Text>
                  </View>
                  {r.live ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: C.down }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' }} />
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Live</Text>
                    </View>
                  ) : (
                    <Text style={{ color: C.ink3, fontSize: 22 }}>›</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
