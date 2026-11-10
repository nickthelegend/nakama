import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, ErrorNote, H1, Kicker, Pill, useBusy } from '../components/ui';
import { api, pct, usd } from '../lib/api';
import { useApp } from '../lib/store';
import { C, F, art } from '../lib/theme';
import type { Market, Odds } from '../lib/types';

/** Post a call: side, strike and why on a live BTC Predict market, with the live 15–50% entry band. */
export default function PostCall() {
  const app = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; why?: string }>();
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [marketId, setMarketId] = useState<string | null>(null);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [strike, setStrike] = useState('');
  const [why, setWhy] = useState(params.why ?? '');
  const [odds, setOdds] = useState<Odds | null>(null);
  const [oddsErr, setOddsErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const post = useBusy();

  useEffect(() => {
    api<{ markets: Market[] }>('/markets')
      .then((r) => {
        const open = r.markets.filter((m) => m.expiryMs > Date.now() + 25000 && !m.mintPaused).sort((a, b) => a.expiryMs - b.expiryMs);
        setMarkets(open);
        const first = open.find((m) => m.referencePrice || m.suggestedStrike) ?? open[0];
        if (first) setMarketId(first.id);
      })
      .catch((e) => setLoadErr(e.message));
  }, []);
  const market = useMemo(() => markets?.find((m) => m.id === marketId) ?? null, [markets, marketId]);
  useEffect(() => {
    if (!market) return;
    const s = dir === 'down' ? market.suggestedStrikeDown ?? market.suggestedStrike : market.suggestedStrike;
    const ref = s ?? market.forward ?? market.referencePrice;
    if (ref) setStrike(String(Math.round(ref)));
  }, [market?.id, dir]);

  useEffect(() => {
    setOdds(null);
    setOddsErr(null);
    const k = Number(strike);
    if (!market || !Number.isFinite(k) || k <= 0) return;
    const t = setTimeout(() => {
      api<Odds>(`/odds?marketId=${market.id}&direction=${dir}&strike=${k}`).then(setOdds).catch((e) => setOddsErr(e.message));
    }, 350);
    return () => clearTimeout(t);
  }, [market?.id, dir, strike]);

  const nudge = (d: number) => setStrike((v) => String(Math.max(1, Math.round(Number(v || 0) + d))));
  const canPost = !!market && !!why.trim() && !!odds?.inBand;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Post a call</H1>
          <Pill title="Close" size="sm" tone="ghost" onPress={() => router.back()} />
        </View>
        {loadErr ? <ErrorNote text={loadErr} /> : null}
        {!markets && !loadErr ? <Body faint>Reading live BTC markets from DeepBook Predict…</Body> : null}
        {markets && markets.length === 0 ? <ErrorNote text="No BTC market is open right now. New 1m and 5m markets open every minute; try again shortly." /> : null}

        {markets && markets.length > 0 ? (
          <>
            <Kicker>Market</Kicker>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {markets.slice(0, 6).map((m) => {
                const on = m.id === marketId;
                const secs = Math.round((m.expiryMs - Date.now()) / 1000);
                return (
                  <Pressable key={m.id} onPress={() => setMarketId(m.id)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? C.plum : '#fff', borderWidth: 2, borderColor: on ? C.plum : C.edge }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: on ? '#fff' : C.plum }}>BTC {m.cadence}m</Text>
                    <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: on ? '#e7d8ef' : C.ink3 }}>ends in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Kicker>Side</Kicker>
            <View style={{ flexDirection: 'row', gap: 6, padding: 6, borderRadius: 22, backgroundColor: C.panel3 }}>
              {(['up', 'down'] as const).map((d) => (
                <Pressable key={d} onPress={() => setDir(d)} style={{ flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: dir === d ? C.coral : 'transparent', borderBottomWidth: dir === d ? 4 : 0, borderBottomColor: C.coralEdge }}>
                  <Image source={d === 'up' ? art.rocket : art.anchor} style={{ width: 26, height: 26 }} />
                  <Text style={{ fontFamily: F.display, fontSize: 17, color: dir === d ? '#fff' : C.ink2 }}>{d === 'up' ? 'Above' : 'Below'}</Text>
                </Pressable>
              ))}
            </View>

            <Kicker>Strike (USD)</Kicker>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pill title="−50" size="sm" tone="ghost" onPress={() => nudge(-50)} />
              <TextInput value={strike} onChangeText={(t) => setStrike(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad"
                style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: C.edge, textAlign: 'center', fontFamily: F.display, fontSize: 22, color: C.plum }} />
              <Pill title="+50" size="sm" tone="ghost" onPress={() => nudge(50)} />
            </View>
            {market?.referencePrice ? <Body faint>Reference price {usd(market.referencePrice)}</Body> : null}

            <Card face={odds ? (odds.inBand ? C.mintSoft : C.pinkSoft) : C.panel} edge={odds ? (odds.inBand ? '#b6ebd2' : '#f3b5d6') : C.edge} style={{ gap: 8 }}>
              <Kicker>Live Predict odds</Kicker>
              {odds && odds.probability != null ? (
                <>
                  <View style={{ height: 14, borderRadius: 7, backgroundColor: 'rgba(59,31,74,0.08)', overflow: 'hidden' }}>
                    <View style={{ position: 'absolute', left: `${odds.band.min * 100}%`, width: `${(odds.band.max - odds.band.min) * 100}%`, top: 0, bottom: 0, backgroundColor: 'rgba(61,220,151,0.45)' }} />
                    <View style={{ position: 'absolute', left: `${Math.min(99, odds.probability * 100)}%`, width: 4, top: 0, bottom: 0, backgroundColor: odds.inBand ? C.mintInk : C.pinkInk }} />
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: odds.inBand ? C.mintInk : C.pinkInk }}>
                    {pct(odds.probability)}% · {odds.inBand ? 'inside the 15–50% entry band' : 'outside the 15–50% band, Predict would refuse every tap'}
                  </Text>
                </>
              ) : oddsErr ? <ErrorNote text={oddsErr} /> : <Body faint>Reading the pricer…</Body>}
            </Card>

            <Kicker>Why</Kicker>
            <TextInput value={why} onChangeText={setWhy} placeholder="e.g. Green minute, momentum into the close" placeholderTextColor={C.ink3} maxLength={280} multiline
              style={{ minHeight: 70, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: C.edge, padding: 14, fontFamily: F.bodySemi, fontSize: 15, color: C.ink, textAlignVertical: 'top' }} />
            {post.error ? <ErrorNote text={post.error} /> : null}
            <Pill title="Post call to the crew" size="xl" icon={art.megaphone} busy={post.busy} disabled={!canPost}
              onPress={() => post.run(async () => {
                await api(`/crews/${params.id}/calls`, { caller: app.address, marketId: market!.id, direction: dir, strike: Number(strike), why: why.trim() }, 60000);
                router.back();
              })} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
