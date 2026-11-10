import { ScrollView, Share, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, H1, Kicker, Mono, Pill } from '../components/ui';
import { inviteUrl } from '../lib/api';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

/** "Show my crew QR": a crewmate scans it in Nakama (or opens the link in a browser). */
export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const url = inviteUrl(id);
  const name = app.crews.find((c) => c.id === id)?.name ?? `crew ${id}`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.sun }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Crew QR</H1>
          <Pill title="Done" size="sm" tone="ghost" onPress={() => router.back()} />
        </View>
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <Kicker>Scan to join</Kicker>
          <H1 style={{ textAlign: 'center' }}>{name}</H1>
          <View style={{ padding: 14, backgroundColor: '#fff', borderRadius: 24, borderWidth: 3, borderColor: C.coral }}>
            <QRCode value={url} size={230} color={C.plum2} backgroundColor="#fff" />
          </View>
          <Mono style={{ textAlign: 'center' }}>{url}</Mono>
          <Body style={{ textAlign: 'center' }}>Crewmates scan this in Nakama → Join with QR. Each one joins with their own wallet.</Body>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pill title="Copy link" size="sm" tone="butter" onPress={() => Clipboard.setStringAsync(url)} />
            <Pill title="Share" size="sm" onPress={() => Share.share({ message: `Join my Nakama crew "${name}": ${url}` })} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
