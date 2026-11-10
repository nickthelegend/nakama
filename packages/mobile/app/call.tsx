import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TokenLogo } from '../components/TabBar';
import { Empty, Body, Card, ErrorNote, H1, Kicker, Pill, useBusy } from '../components/ui';
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
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Predict opens BTC markets in 1m and 5m windows; between windows there can be none, so re-check every 15 s.
  useEffect(() => {
    let alive = true;
    const pull = () =>
      api<{ markets: Market[] }>('/markets')
        .then((r) => {
          if (!alive) return;
          const open = r.markets.filter((m) => m.expiryMs > Date.now() + 25000 && !m.mintPaused).sort((a, b) => a.expiryMs - b.expiryMs);
          setMarkets(open);
          setLoadErr(null);
          setMarketId((cur) => (cur && open.some((m) => m.id === cur) ? cur : (open.find((m) => m.referencePrice || m.suggestedStrike) ?? open[0])?.id ?? null));
        })
        .catch((e) => alive && setLoadErr(e.message));
    pull();
    const t = setInterval(pull, 15000);
    return () => { alive = false; clearInterval(t); };
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
    // The price moves every second, so the band is re-read every 6 s, not only when the strike changes.
    const pull = () => api<Odds>(`/odds?marketId=${market.id}&direction=${dir}&strike=${k}`).then((o) => { setOdds(o); setOddsErr(null); }).catch((e) => setOddsErr(e.message));
    const t = setTimeout(pull, 350);
    const i = setInterval(pull, 6000);
    return () => { clearTimeout(t); clearInterval(i); };
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
        {markets && markets.length === 0 ? <Card style={{ padding: 4 }}><Empty title="No open BTC markets" body="No open BTC markets on DeepBook Predict right now — next check in 15 s." mood="sleep" /></Card> : null}

        {markets && markets.length > 0 ? (
          <>
            <Kicker>Market</Kicker>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {markets.slice(0, 6).map((m) => {
                const on = m.id === marketId;
                const secs = Math.max(0, Math.round((m.expiryMs - Date.now()) / 1000));
                return (
                  <Pressable key={m.id} onPress={() => setMarketId(m.id)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? '#f5f5f5' : C.surface, borderWidth: 1, borderColor: on ? '#f5f5f5' : C.line2 }}>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: on ? '#141414' : '#fff' }}>BTC {m.cadence}m</Text>
                    <Text style={{ fontWeight: '600', fontSize: 12, color: on ? '#5c5c5c' : C.ink3 }}>ends in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingRight: 14, borderRadius: 16, backgroundColor: C.surface2 }}>
              <TokenLogo token="BTC" size={22} />
              <Text style={{ flex: 1, color: C.ink2, fontSize: 13.5, lineHeight: 18 }}>DeepBook Predict lists only BTC markets today; ETH, SUI and more appear when Predict adds them.</Text>
            </View>
            <Kicker>Side</Kicker>
            <View style={{ flexDirection: 'row', gap: 6, padding: 6, borderRadius: 22, backgroundColor: C.panel3 }}>
              {(['up', 'down'] as const).map((d) => (
                <Pressable key={d} onPress={() => setDir(d)} style={{ flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: dir === d ? C.coral : 'transparent', borderBottomWidth: dir === d ? 4 : 0, borderBottomColor: C.coralEdge }}>
                  <Image source={d === 'up' ? art.rocket : art.anchor} style={{ width: 26, height: 26 }} />
                  <Text style={{ fontWeight: '800', fontSize: 17, color: dir === d ? '#fff' : C.ink2 }}>{d === 'up' ? 'Above' : 'Below'}</Text>
                </Pressable>
              ))}
            </View>

            <Kicker>Strike (USD)</Kicker>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pill title="−50" size="sm" tone="ghost" onPress={() => nudge(-50)} />
              <TextInput value={strike} onChangeText={(t) => setStrike(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad"
                style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, textAlign: 'center', fontWeight: '800', fontSize: 22, color: C.plum }} />
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
                  <Text style={{ fontWeight: '800', fontSize: 18, color: odds.inBand ? C.mintInk : C.pinkInk }}>
                    {pct(odds.probability)}% · {odds.inBand ? 'inside the 15–50% entry band' : 'outside the 15–50% band, Predict would refuse every tap'}
                  </Text>
                </>
              ) : oddsErr ? <ErrorNote text={oddsErr} /> : <Body faint>Reading the pricer…</Body>}
            </Card>

            <Kicker>Why</Kicker>
            <TextInput value={why} onChangeText={setWhy} placeholder="e.g. Green minute, momentum into the close" placeholderTextColor={C.ink3} maxLength={280} multiline
              style={{ minHeight: 70, borderRadius: 18, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, padding: 14, fontWeight: '600', fontSize: 15, color: C.ink, textAlignVertical: 'top' }} />
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
