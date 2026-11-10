import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Chip, Empty, ErrorNote, H2, Pill, useBusy } from '../../components/ui';
import { CallCard } from '../../components/CallCard';
import { api, dirWord, usd } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, F, art, pick, short } from '../../lib/theme';
import type { Crew } from '../../lib/types';

/** The crew room: a chat thread of joins, call cards, taps and results, with a call composer at the bottom. */
export default function CrewRoom() {
  const app = useApp();
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const join = useBusy();
  const scroll = useRef<any>(null);
  const id = app.activeCrew;
  const me = app.address ?? '';
  const member = !!crew?.members.some((m) => m.toLowerCase() === me.toLowerCase());

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const c = await api<Crew>(`/crews/${id}`);
      setCrew(c);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id, app.base]);
  useEffect(() => { setCrew(null); }, [id]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]));

  if (!id)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, padding: 16, justifyContent: 'center' }}>
        <Card>
          <Empty
            title="No crew open"
            body="Pick a crew from Rooms, create one, or scan a friend's invite QR."
            action={<View style={{ gap: 10, alignSelf: 'stretch' }}><Pill title="Join with QR" onPress={() => router.push('/scan')} /><Pill title="Create crew" tone="ghost" onPress={() => router.push('/create')} /></View>}
          />
        </Card>
      </SafeAreaView>
    );

  // Thread: members join in order, then calls with their taps and results, oldest first.
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
          <Text style={{ fontFamily: F.displayBold, fontSize: 12, color: C.ink3, marginHorizontal: 8 }}>
            {mine ? 'You called it' : `${short(x.caller)} called it`}{x.createdAt ? ` · ${new Date(x.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
          <View style={{ width: '94%' }}>
            <CallCard call={x} me={me} member={member} onChanged={load} />
          </View>
        </View>
      ),
    });
    if (x.status === 'settled')
      items.push({ key: `r${x.id}`, node: <SystemLine icon={art.trophy} text={`Pyth settled BTC ${dirWord(x.setup.direction)} ${usd(x.strike)}: ${x.orders.filter((o) => o.hit).length}/${x.orders.length} taps won`} /> });
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.sun }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.sun }}>
        <Image source={pick(art.crews, id)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff' }} />
        <View style={{ flex: 1 }}>
          <H2 style={{ fontSize: 20 }} >{crew?.name ?? 'Loading crew…'}</H2>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink2 }} numberOfLines={1}>
            {crew ? `${crew.members.length} members · ${crew.public ? 'public' : 'private'} · crew ${crew.id}` : ' '}
          </Text>
        </View>
        <Pill title="Crew QR" size="sm" tone="ghost" onPress={() => router.push({ pathname: '/invite', params: { id } })} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.cream }}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 20 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {error ? <ErrorNote text={error} /> : null}
          {crew?.readOnlyDemo ? <Chip text="Preview crew · created read-only on the web, signing disabled" tone="butter" /> : null}
          {items.map((i) => <View key={i.key}>{i.node}</View>)}
          {crew && crew.calls.length === 0 ? (
            <Card><Empty title="No calls yet" body="Post the first one below: pick a side and a strike on a live BTC 1m or 5m market." mood="cheer" /></Card>
          ) : null}
        </ScrollView>
        {crew && !member ? (
          <View style={{ padding: 14, backgroundColor: '#fff', gap: 8 }}>
            {join.error ? <ErrorNote text={join.error} /> : null}
            <Pill title="Join this crew" size="xl" busy={join.busy} onPress={() => join.run(async () => {
              const c = await api<Crew>(`/crews/${id}/join`, { address: me });
              setCrew(c);
              await app.rememberCrew({ id: c.id, name: c.name });
            })} />
            <Body faint style={{ textAlign: 'center', fontSize: 12.5 }}>Joins with your in-app address {short(me)}. Nothing is paid to join.</Body>
          </View>
        ) : crew ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line }}>
            <TextInput
              value={why}
              onChangeText={setWhy}
              placeholder="Your call… why BTC moves next"
              placeholderTextColor={C.ink3}
              maxLength={280}
              style={{ flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: C.panel3, paddingHorizontal: 16, fontFamily: F.bodySemi, fontSize: 15, color: C.ink }}
            />
            <Pill title="Call it" size="sm" onPress={() => { router.push({ pathname: '/call', params: { id, why } }); setWhy(''); }} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SystemLine({ icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, backgroundColor: C.panel3, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 14, maxWidth: '92%' }}>
      <Image source={icon} style={{ width: 26, height: 26, borderRadius: 13 }} />
      <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.ink2, flexShrink: 1 }}>{text}{sub ? ` · ${sub}` : ''}</Text>
    </View>
  );
}
