import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Chip, Empty, ErrorNote, H1, Kicker } from '../../components/ui';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, F, art, pick, short } from '../../lib/theme';
import { TAB_SPACE } from '../../components/TabBar';
import type { Crew, History } from '../../lib/types';

type Row = { address: string; crewCalls: number; crewWins: number; chain: History | null; chainErr: string | null };

/** Who's right: crew results from settled calls, plus each member's on-chain Predict record (decoded fills and payouts). */
export default function Board() {
  const app = useApp();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const id = app.activeCrew;

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
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!crew) return;
    const base: Row[] = crew.members.map((a) => {
      const orders = crew.calls.flatMap((x) => (x.status === 'settled' ? x.orders.filter((o) => o.address === a) : []));
      return { address: a, crewCalls: orders.length, crewWins: orders.filter((o) => o.hit).length, chain: null, chainErr: null };
    });
    setRows(base);
    let alive = true;
    crew.members.forEach((a) =>
      api<History>(`/members/${a}/history`, undefined, 60000)
        .then((h) => alive && setRows((r) => r.map((x) => (x.address === a ? { ...x, chain: h } : x))))
        .catch((e) => alive && setRows((r) => r.map((x) => (x.address === a ? { ...x, chainErr: e.message } : x)))),
    );
    return () => { alive = false; };
  }, [crew?.id, crew?.members.length, crew?.calls.length]);

  const ranked = [...rows].sort((a, b) => b.crewWins - a.crewWins || (b.chain?.record.wins ?? 0) - (a.chain?.record.wins ?? 0));
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: TAB_SPACE + 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={art.podium} style={{ width: 64, height: 64 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <H1>Scoreboard</H1>
            <Body style={{ fontSize: 13 }}>{crew ? crew.name : 'Open a crew to see who is right'}</Body>
          </View>
        </View>
        {error ? <ErrorNote text={error} /> : null}
        {!id ? <Card><Empty title="No crew yet" body="Join or create a crew in Rooms." /></Card> : null}
        {crew && crew.calls.every((x) => x.status !== 'settled') ? (
          <Body faint style={{ fontSize: 13.5 }}>No settled crew calls yet. Crew wins appear once Pyth settles a call; the on-chain record below is each member’s real Predict history.</Body>
        ) : null}
        {ranked.map((r, i) => (
          <Card key={r.address} face={i === 0 && r.crewWins > 0 ? 'rgba(255,111,89,0.14)' : C.surface} edge={i === 0 && r.crewWins > 0 ? C.butterEdge : C.edge} style={{ gap: 8, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 22, color: i === 0 ? C.coral : C.ink3, width: 28 }}>{i + 1}</Text>
              <Image source={pick(art.avatars, r.address)} style={{ width: 42, height: 42, borderRadius: 21 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.plum }}>{r.address.toLowerCase() === app.address?.toLowerCase() ? 'You' : short(r.address)}</Text>
                <Text style={{ fontWeight: '600', fontSize: 12.5, color: C.ink2 }}>Crew: {r.crewWins}/{r.crewCalls} right</Text>
              </View>
              {i === 0 && r.crewWins > 0 ? <Image source={art.crown} style={{ width: 34, height: 34 }} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: C.ink3, fontSize: 13, fontWeight: '600', alignSelf: 'center' }}>On-chain Predict</Text>
              {r.chain ? (
                <>
                  <Chip text={`${r.chain.record.wins}/${r.chain.record.calls} wins`} tone="mint" />
                  <Chip text={`streak ${r.chain.record.streak}`} tone="coral" />
                  {!r.chain.complete ? <Chip text="recent window" /> : null}
                </>
              ) : r.chainErr ? <Text style={{ fontWeight: '600', fontSize: 12, color: C.pinkInk }}>{r.chainErr}</Text> : <Text style={{ fontWeight: '500', fontSize: 12, color: C.ink3 }}>scanning mainnet…</Text>}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
