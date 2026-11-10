import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../components/T';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, ErrorNote, H1, Kicker, Pill, useBusy } from '../components/ui';
import { revealSecret } from '../lib/wallet';
import { C, F, art } from '../lib/theme';

/** Export warning, then an explicit reveal of the suiprivkey string. Hidden again when the screen closes. */
export default function Backup() {
  const router = useRouter();
  const [ack, setAck] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const { busy, error, run } = useBusy();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Backup</H1>
          <Pill title="Close" size="sm" tone="ghost" onPress={() => router.back()} />
        </View>
        <Card face={C.pinkSoft} edge="#f3b5d6" style={{ gap: 10 }}>
          <Image source={art.shield} style={{ width: 80, height: 80, alignSelf: 'center' }} />
          <Kicker>Read this first</Kicker>
          {[
            'Your private key is the wallet. Anyone who sees it can take everything in it.',
            'Nakama staff will never ask for it. No crewmate needs it to play.',
            'Write it on paper or put it in a password manager. Never paste it into a chat or a website.',
            'It imports into any Sui wallet (Slush, Suiet) as a suiprivkey string.',
          ].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontWeight: '800', color: C.pinkInk }}>•</Text>
              <Body style={{ flex: 1, color: C.ink }}>{t}</Body>
            </View>
          ))}
        </Card>
        {!secret ? (
          <>
            <Pill title={ack ? '✓ I understand' : 'I understand the risk'} tone={ack ? 'mint' : 'ghost'} onPress={() => setAck(!ack)} />
            {error ? <ErrorNote text={error} /> : null}
            <Pill title="Reveal my private key" tone="plum" disabled={!ack} busy={busy} onPress={() => run(async () => setSecret(await revealSecret()))} />
          </>
        ) : (
          <Card style={{ gap: 10 }}>
            <Kicker>Private key · keep it secret</Kicker>
            <Text selectable style={{ fontFamily: F.mono, fontSize: 13, color: C.ink }}>{secret}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pill title="Copy" size="sm" tone="butter" onPress={() => Clipboard.setStringAsync(secret)} />
              <Pill title="Hide" size="sm" tone="ghost" onPress={() => setSecret(null)} />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
