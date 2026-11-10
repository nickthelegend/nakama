import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Chip, ErrorNote, H1, H2, Kicker, Mono, Pill, useBusy } from '../../components/ui';
import { api, DEFAULT_API, LOCAL_API } from '../../lib/api';
import { balances, type Balances } from '../../lib/sui';
import { signTransactionBytes } from '../../lib/wallet';
import { useApp } from '../../lib/store';
import { C, F, art } from '../../lib/theme';

type Fund = { dryRun: { status: string; error: string | null; rpc: string }; transaction: string | null; mode: string };

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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.sun }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32, backgroundColor: C.cream, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Your wallet</H1>
          <Chip text="Sui mainnet" tone="coral" />
        </View>

        <Card style={{ alignItems: 'center', gap: 12 }}>
          <Kicker>Send SUI and USDC here</Kicker>
          <View style={{ padding: 12, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: C.butter }}>
            {addr ? <QRCode value={addr} size={190} color={C.plum2} backgroundColor="#fff" /> : null}
          </View>
          <Mono style={{ textAlign: 'center', fontSize: 12 }}>{addr}</Mono>
          <Pill title={copied ? 'Copied' : 'Copy address'} size="sm" tone="butter" onPress={async () => { await Clipboard.setStringAsync(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
        </Card>

        <Card face={C.plum} edge="#22102b" style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 20, color: '#fff' }}>Fund your wallet</Text>
            <Image source={art.coin} style={{ width: 40, height: 40 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Balance label="SUI · for gas" value={bal ? bal.sui.toFixed(3) : '…'} ok={gasOk} need="~0.1 SUI" />
            <Balance label="USDC · for taps" value={bal ? bal.usdc.toFixed(2) : '…'} ok={usdcOk} need="2 USDC per tap" />
          </View>
          {balErr ? <ErrorNote text={balErr} /> : null}
          <Text style={{ fontWeight: '500', fontSize: 13.5, color: '#e7d8ef', lineHeight: 19 }}>
            {bal && gasOk && usdcOk
              ? 'Funded. Next, move USDC into your Predict account so taps can fill.'
              : 'Send a little SUI for gas and some USDC (native Sui USDC) to the address above from an exchange or another wallet. Nakama never funds wallets for you.'}
          </Text>
          {bal ? <Text style={{ fontFamily: F.mono, fontSize: 11, color: '#bfa9cc' }}>Read from {bal.source} · {new Date(bal.at).toLocaleTimeString()}</Text> : null}
        </Card>

        <Card style={{ gap: 10 }}>
          <Kicker>Predict account</Kicker>
          <H2>Deposit 3 USDC to trade</H2>
          <Body>DeepBook Predict takes taps from a Predict account, not loose wallet USDC. The server builds the deposit and dry-runs it on mainnet; in live mode this phone signs it.</Body>
          {dep.error ? <ErrorNote text={dep.error} /> : null}
          {fund ? (
            <Card face={fund.dryRun.status === 'success' ? C.mintSoft : C.pinkSoft} edge={fund.dryRun.status === 'success' ? '#b6ebd2' : '#f3b5d6'} style={{ gap: 4 }}>
              <Kicker>Dry-run {fund.dryRun.status} · {fund.mode}</Kicker>
              {fund.dryRun.error ? <Mono style={{ color: C.pinkInk }}>{fund.dryRun.error}</Mono> : null}
              <Mono>via {fund.dryRun.rpc}</Mono>
            </Card>
          ) : null}
          {sent ? <Mono style={{ color: C.mintInk }}>Deposited: {sent}</Mono> : null}
          <Pill title="Check deposit (dry-run)" tone="butter" busy={dep.busy} onPress={() => dep.run(async () => {
            setSent(null);
            const f = await api<Fund>('/fund', { address: addr, amount: 3, create: true }, 60000);
            setFund(f);
            if (f.transaction) {
              const s = await signTransactionBytes(f.transaction);
              setSent((await api<{ digest: string }>('/execute', { bytes: s.bytes, signature: s.signature }, 60000)).digest);
            }
          })} />
        </Card>

        <Card face={C.pinkSoft} edge="#f3b5d6" style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={art.shield} style={{ width: 44, height: 44 }} />
            <View style={{ flex: 1 }}>
              <H2 style={{ fontSize: 18 }}>Back up your key</H2>
              <Body style={{ fontSize: 13 }}>This wallet lives only on this phone. Lose the phone, lose the funds.</Body>
            </View>
          </View>
          <Pill title="Backup and export" tone="plum" size="sm" onPress={() => router.push('/backup')} />
        </Card>

        <Card style={{ gap: 8 }}>
          <Kicker>Server</Kicker>
          <Mono>{app.base}</Mono>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill title="Hosted" size="sm" tone={app.base === DEFAULT_API ? 'coral' : 'ghost'} onPress={() => app.changeBase(DEFAULT_API)} />
            <Pill title="Mac localhost:8817" size="sm" tone={app.base === LOCAL_API ? 'coral' : 'ghost'} onPress={() => app.changeBase(LOCAL_API)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={custom} onChangeText={setCustom} placeholder="https://your-server/api" placeholderTextColor={C.ink3} autoCapitalize="none" autoCorrect={false}
              style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: C.panel3, paddingHorizontal: 12, fontWeight: '600', color: C.ink }} />
            <Pill title="Use" size="sm" tone="ghost" disabled={!/^https?:\/\//.test(custom)} onPress={() => app.changeBase(custom)} />
          </View>
          {app.lastPoll ? <Body faint style={{ fontSize: 12.5 }}>Crew check every 15 s · last {new Date(app.lastPoll.at).toLocaleTimeString()}{app.lastPoll.error ? ` · ${app.lastPoll.error}` : ''}</Body> : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Balance({ label, value, ok, need }: { label: string; value: string; ok: boolean; need: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', gap: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 12, color: '#cdb9d8' }}>{label}</Text>
      <Text style={{ fontWeight: '800', fontSize: 26, color: '#fff' }}>{value}</Text>
      <Text style={{ fontWeight: '600', fontSize: 12, color: ok ? C.mint : C.butter }}>{ok ? 'Ready' : `Needs ${need}`}</Text>
    </View>
  );
}
