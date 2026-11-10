import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, ErrorNote, Mono, Pill, useBusy } from '../../components/ui';
import { TAB_SPACE, TokenLogo } from '../../components/TabBar';
import { api, DEFAULT_API, LOCAL_API } from '../../lib/api';
import { balances, type Balances } from '../../lib/sui';
import { signTransactionBytes } from '../../lib/wallet';
import { useApp } from '../../lib/store';
import { C, F, art } from '../../lib/theme';

type Fund = { dryRun: { status: string; error: string | null; rpc: string }; transaction: string | null; mode: string };
const isUrl = (t: string) => t.startsWith('http://') || t.startsWith('https://');

export default function Wallet() {
  const app = useApp();
  const router = useRouter();
  const [bal, setBal] = useState<Balances | null>(null);
  const [balErr, setBalErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fund, setFund] = useState<Fund | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const dep = useBusy();
  const addr = app.address ?? '';

  const load = useCallback(async () => {
    if (!addr) return;
    try {
      setBal(await balances(addr));
      setBalErr(null);
    } catch (e: any) {
      setBalErr(e.message);
    }
  }, [addr]);
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]));

  const gasOk = (bal?.sui ?? 0) >= 0.05;
  const usdcOk = (bal?.usdc ?? 0) >= 2.02;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: TAB_SPACE + 10 }}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={false} onRefresh={load} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.7 }}>Wallet</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: C.surface2 }}>
            <TokenLogo token="SUI" size={20} />
            <Text style={{ color: C.ink2, fontWeight: '600', fontSize: 13 }}>Sui mainnet</Text>
          </View>
        </View>

        <View>
          <Text style={{ color: C.ink2, fontSize: 17, fontWeight: '500' }}>Ready for taps</Text>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '700', letterSpacing: -1.2 }}>{bal ? `$${bal.usdc.toFixed(2)}` : '$–'}</Text>
          <Text style={{ color: C.ink3, fontSize: 13 }}>{bal ? `Read from ${bal.source} · ${new Date(bal.at).toLocaleTimeString()}` : balErr ?? 'Reading mainnet…'}</Text>
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 26, overflow: 'hidden' }}>
          <TokenRow token="USDC" note={usdcOk ? 'Ready · 2 USDC per tap' : 'Needs 2 USDC per tap'} ok={usdcOk} value={bal ? bal.usdc.toFixed(2) : '–'} />
          <TokenRow token="SUI" note={gasOk ? 'Ready for gas' : 'Needs ~0.1 SUI for gas'} ok={gasOk} value={bal ? bal.sui.toFixed(3) : '–'} border />
        </View>
        {balErr ? <ErrorNote text={balErr} /> : null}

        <View style={{ backgroundColor: C.surface, borderRadius: 30, padding: 20, gap: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.4, alignSelf: 'flex-start' }}>Deposit</Text>
          <Text style={{ color: C.ink2, fontSize: 15, lineHeight: 21, alignSelf: 'flex-start' }}>
            Send a little SUI for gas and native Sui USDC to this address from an exchange or another wallet. Nakama never funds wallets for you.
          </Text>
          <View style={{ padding: 14, borderRadius: 26, backgroundColor: '#fff' }}>
            {addr ? <QRCode value={addr} size={196} color="#141414" backgroundColor="#fff" /> : null}
          </View>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.ink2, textAlign: 'center' }}>{addr}</Text>
          <Pill title={copied ? 'Copied' : 'Copy address'} tone="white" onPress={async () => { await Clipboard.setStringAsync(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 26, padding: 20, gap: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Predict account</Text>
          <Body>DeepBook Predict takes taps from a Predict account, not loose wallet USDC. The server builds a 3 USDC deposit and dry-runs it on mainnet; in live mode this phone signs it.</Body>
          {dep.error ? <ErrorNote text={dep.error} /> : null}
          {fund ? (
            <View style={{ backgroundColor: fund.dryRun.status === 'success' ? C.upSoft : C.downSoft, borderRadius: 18, padding: 12, gap: 4 }}>
              <Text style={{ color: fund.dryRun.status === 'success' ? C.mintInk : C.pinkInk, fontWeight: '700' }}>Dry-run {fund.dryRun.status} · {fund.mode}</Text>
              {fund.dryRun.error ? <Mono style={{ color: C.pinkInk }}>{fund.dryRun.error}</Mono> : null}
              <Mono>via {fund.dryRun.rpc}</Mono>
            </View>
          ) : null}
          {sent ? <Mono style={{ color: C.mintInk }}>Deposited: {sent}</Mono> : null}
          <Pill title="Check deposit (dry-run)" tone="ghost" busy={dep.busy} onPress={() => dep.run(async () => {
            setSent(null);
            const f = await api<Fund>('/fund', { address: addr, amount: 3, create: true }, 60000);
            setFund(f);
            if (f.transaction) {
              const s = await signTransactionBytes(f.transaction);
              setSent((await api<{ digest: string }>('/execute', { bytes: s.bytes, signature: s.signature }, 60000)).digest);
            }
          })} />
        </View>

        <Pressable onPress={() => router.push('/backup')} style={({ pressed }) => ({ backgroundColor: C.surface, borderRadius: 26, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.85 : 1 })}>
          <Image source={art.shield} style={{ width: 46, height: 46 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Back up your key</Text>
            <Text style={{ color: C.ink2, fontSize: 14 }}>This wallet lives only on this phone.</Text>
          </View>
          <Text style={{ color: C.ink3, fontSize: 22 }}>›</Text>
        </Pressable>

        <View style={{ backgroundColor: C.surface, borderRadius: 26, padding: 18, gap: 10 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Server</Text>
          <Mono>{app.base}</Mono>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill title="Hosted" size="sm" tone={app.base === DEFAULT_API ? 'white' : 'ghost'} onPress={() => app.changeBase(DEFAULT_API)} />
            <Pill title="Mac localhost:8817" size="sm" tone={app.base === LOCAL_API ? 'white' : 'ghost'} onPress={() => app.changeBase(LOCAL_API)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={custom} onChangeText={setCustom} placeholder="https://your-server/api" placeholderTextColor={C.ink3} autoCapitalize="none" autoCorrect={false}
              style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: C.surface2, paddingHorizontal: 12, color: C.ink, fontSize: 15 }} />
            <Pill title="Use" size="sm" tone="ghost" disabled={!isUrl(custom)} onPress={() => app.changeBase(custom)} />
          </View>
          {app.lastPoll ? <Body faint style={{ fontSize: 12.5 }}>Crew check every 15 s · last {new Date(app.lastPoll.at).toLocaleTimeString()}{app.lastPoll.error ? ` · ${app.lastPoll.error}` : ''}</Body> : null}
          {app.bgStatus ? <Body faint style={{ fontSize: 12.5 }}>{app.bgStatus}</Body> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TokenRow({ token, note, ok, value, border }: { token: 'SUI' | 'USDC'; note: string; ok: boolean; value: string; border?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderTopWidth: border ? 1 : 0, borderTopColor: C.line }}>
      <TokenLogo token={token} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{token}</Text>
        <Text style={{ color: ok ? C.mintInk : C.ink2, fontSize: 13.5 }}>{note}</Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
