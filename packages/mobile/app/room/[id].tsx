import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, Empty, ErrorNote, Pill, useBusy } from '../../components/ui';
import { CallCard, Tri } from '../../components/CallCard';
import { ForkBanner } from '../../components/ForkBanner';
import { api, dirWord, usd } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, art, pick, short } from '../../lib/theme';
import type { Call, Crew } from '../../lib/types';

const isLive = (x: Call, now = Date.now()) => x.status === 'live' && x.expiryMs > now;

/** Full-screen crew chat: compact header, the live call pinned as a collapsible banner, bubbles, and a composer above the keyboard. */
export default function Room() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const join = useBusy();
  const scroll = useRef<any>(null);
  const me = app.address ?? '';
  const member = !!crew?.members.some((m) => m.toLowerCase() === me.toLowerCase());

  const load = useCallback(async () => {
    try {
      const c = await api<Crew>(`/crews/${id}`);
      setCrew(c);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id, app.base]);
  useEffect(() => { app.setActiveCrew(id); }, [id]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 5000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(c); };
  }, [load]));

  const live = crew?.calls.filter((x) => isLive(x, now)).at(-1) ?? null;
  const left = live ? Math.max(0, Math.round((live.expiryMs - now) / 1000)) : 0;

  // Thread: joins in order, then calls (taps and results), oldest first. The live call is pinned above, not repeated.
  const items: { key: string; node: React.ReactNode }[] = [];
  crew?.members.forEach((m, i) =>
    items.push({ key: `j${m}`, node: <SystemLine icon={pick(art.avatars, m)} text={`${m.toLowerCase() === me.toLowerCase() ? 'You' : short(m)} joined the crew`} sub={i === 0 ? 'founder' : undefined} /> }),
  );
  crew?.calls.forEach((x) => {
    const mine = x.caller.toLowerCase() === me.toLowerCase();
    items.push({
      key: `c${x.id}`,
      node: (
        <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
          <Text style={{ fontWeight: '600', fontSize: 12, color: C.ink3, marginHorizontal: 10 }}>
            {mine ? 'You' : short(x.caller)}{x.createdAt ? ` · ${new Date(x.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
          <View style={{ maxWidth: '82%' }}><Bubble x={x} mine={mine} live={isLive(x, now)} /></View>
        </View>
      ),
    });
    x.orders.forEach((o) =>
      items.push({ key: `t${o.digest}`, node: <SystemLine icon={pick(art.avatars, o.address)} text={`${o.address.toLowerCase() === me.toLowerCase() ? 'You' : short(o.address)} tapped in · ${o.size} USDC`} /> }),
    );
    if (x.status === 'settled')
      items.push({ key: `r${x.id}`, node: <SystemLine icon={art.trophy} text={`Pyth settled BTC ${dirWord(x.setup.direction)} ${usd(x.strike)}: ${x.orders.filter((o) => o.hit).length}/${x.orders.length} won`} /> });
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
      {/* compact header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, height: 58, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/crew'))} style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={14} height={22} viewBox="0 0 14 22"><Path d="M11 2 3 11l8 9" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <Image source={pick(art.crews, id)} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface3 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{crew?.name ?? 'Loading…'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row' }}>
              {(crew?.members ?? []).slice(0, 4).map((m, i) => (
                <Image key={m} source={pick(art.avatars, m)} style={{ width: 16, height: 16, borderRadius: 8, marginLeft: i ? -5 : 0, borderWidth: 1, borderColor: C.bg }} />
              ))}
            </View>
            <Text style={{ color: C.ink2, fontSize: 12.5 }} numberOfLines={1}>{crew ? `${crew.members.length} · ${crew.public ? 'public' : 'private'}` : ' '}</Text>
          </View>
        </View>
        {live ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: C.down }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
          </View>
        ) : null}
        <Pressable accessibilityLabel="Crew info" hitSlop={8} onPress={() => router.push({ pathname: '/invite', params: { id } })} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9.5} stroke="#fff" strokeWidth={1.8} fill="none" /><Path d="M12 11v6M12 7.5v.01" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" /></Svg>
        </Pressable>
      </View>

      <ForkBanner />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* pinned live call */}
        {live && crew ? (
          <View style={{ paddingHorizontal: 12, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: open ? 0 : 8 }}>
            <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 34 }}>
              <Tri up={live.setup.direction !== 'down'} color={live.setup.direction === 'down' ? C.down : C.up} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 }} numberOfLines={1}>
                Live call · BTC {dirWord(live.setup.direction)} {usd(live.strike)} · {live.orders.length} in
              </Text>
              <Text style={{ color: C.ink2, fontWeight: '600', fontSize: 13 }}>{open ? 'Hide ▴' : 'Show ▾'}</Text>
            </Pressable>
            {open ? (
              <View style={{ marginTop: -2, marginBottom: 8 }}>
                <CallCard call={live} me={me} member={member} onChanged={load} members={crew.members.length} past={crew.calls.filter((y) => y.status === 'settled')} />
              </View>
            ) : null}
          </View>
        ) : null}

        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardDismissMode="interactive">
          {error ? <ErrorNote text={error} /> : null}
          {crew?.readOnlyDemo ? <Chip text="Preview crew · created read-only on the web, signing disabled" tone="butter" /> : null}
          {items.map((i) => <View key={i.key}>{i.node}</View>)}
          {crew && crew.calls.length === 0 ? (
            <Empty title="No calls yet" body="Tap + Call to post the first one: a side and a strike on a live BTC 1m or 5m market." mood="cheer" />
          ) : null}
        </ScrollView>

        {crew && !member ? (
          <View style={{ padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: C.line }}>
            {join.error ? <ErrorNote text={join.error} /> : null}
            <Pill title="Join this crew" size="xl" busy={join.busy} onPress={() => join.run(async () => {
              const c = await api<Crew>(`/crews/${id}/join`, { address: me });
              setCrew(c);
              await app.rememberCrew({ id: c.id, name: c.name });
            })} />
            <Body faint style={{ textAlign: 'center', fontSize: 12.5 }}>Joins with your in-app address {short(me)}. Nothing is paid to join.</Body>
          </View>
        ) : crew ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
            <Pressable accessibilityLabel="New call" onPress={() => { router.push({ pathname: '/call', params: { id, why } }); setWhy(''); }}
              style={({ pressed }) => ({ height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.coral, flexDirection: 'row', alignItems: 'center', gap: 4, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginTop: -2 }}>+</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Call</Text>
            </Pressable>
            <TextInput
              value={why}
              onChangeText={setWhy}
              placeholder="Why BTC moves next…"
              placeholderTextColor={C.ink3}
              maxLength={280}
              multiline
              style={{ flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, fontSize: 15, color: C.ink }}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ x, mine, live }: { x: Call; mine: boolean; live: boolean }) {
  const hits = x.orders.filter((o) => o.hit).length;
  return (
    <View style={{ backgroundColor: mine ? C.coral : C.surface2, borderRadius: 20, borderTopRightRadius: mine ? 6 : 20, borderTopLeftRadius: mine ? 20 : 6, paddingVertical: 10, paddingHorizontal: 14, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Tri up={x.setup.direction !== 'down'} color={mine ? '#fff' : x.setup.direction === 'down' ? C.down : C.up} />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>BTC {dirWord(x.setup.direction)} {usd(x.strike)} · {x.setup.cadence}m</Text>
      </View>
      <Text style={{ color: mine ? '#fff' : C.ink, fontSize: 15, lineHeight: 20 }}>{x.why}</Text>
      <Text style={{ color: mine ? 'rgba(255,255,255,0.8)' : C.ink3, fontSize: 12.5, fontWeight: '600' }}>
        {live ? `Live · ${x.orders.length} tapped in · pinned above` : x.status === 'settled' ? `Settled by Pyth · ${hits}/${x.orders.length} won` : `Closed · ${x.orders.length} tapped in`}
      </Text>
    </View>
  );
}

function SystemLine({ icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, maxWidth: '92%' }}>
      <Image source={icon} style={{ width: 22, height: 22, borderRadius: 11 }} />
      <Text style={{ fontWeight: '500', fontSize: 12.5, color: C.ink2, flexShrink: 1 }}>{text}{sub ? ` · ${sub}` : ''}</Text>
    </View>
  );
}
