import { useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, H1, Kicker, Mono, Pill } from '../components/ui';
import { api, inviteUrl } from '../lib/api';
import type { Crew } from '../lib/types';
import { useApp } from '../lib/store';
import { C, art, pick, short } from '../lib/theme';

/** "Show my crew QR": a crewmate scans it in Nakama (or opens the link in a browser). */
export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const url = inviteUrl(id);
  const [crew, setCrew] = useState<Crew | null>(null);
  useEffect(() => { api<Crew>(`/crews/${id}`).then(setCrew).catch(() => {}); }, [id]);
  const name = crew?.name ?? app.crews.find((c) => c.id === id)?.name ?? `crew ${id}`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Crew</H1>
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
        {crew ? (
          <Card style={{ gap: 10 }}>
            <Kicker>{crew.members.length} members · {crew.public ? 'public' : 'private'}</Kicker>
            {crew.members.map((m, i) => (
              <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image source={pick(art.avatars, m)} style={{ width: 34, height: 34, borderRadius: 17 }} />
                <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '600', flex: 1 }}>{m.toLowerCase() === app.address?.toLowerCase() ? 'You' : short(m)}</Text>
                {i === 0 ? <Text style={{ color: C.ink3, fontSize: 13 }}>founder</Text> : null}
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
