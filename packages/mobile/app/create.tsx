import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, ErrorNote, H1, Kicker, Pill, useBusy } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { C, F, art } from '../lib/theme';
import type { Crew } from '../lib/types';

export default function CreateCrew() {
  const app = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPublic, setPublic] = useState(true);
  const { busy, error, run } = useBusy();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Create a crew</H1>
          <Pill title="Close" size="sm" tone="ghost" onPress={() => router.back()} />
        </View>
        <Image source={art.host} style={{ width: 150, height: 150, alignSelf: 'center' }} />
        <Kicker>Crew name</Kicker>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Friday night desk" placeholderTextColor={C.ink3} maxLength={60}
          style={{ height: 54, borderRadius: 18, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, paddingHorizontal: 16, fontWeight: '800', fontSize: 18, color: C.plum }} />
        <Kicker>Who can find it</Kicker>
        {([[true, 'Public', 'Listed in Rooms for everyone'], [false, 'Private', 'Only people with your invite QR']] as const).map(([v, t, d]) => (
          <Pressable key={t} onPress={() => setPublic(v)}>
            <Card face={isPublic === v ? C.coralSoft : C.surface} edge={isPublic === v ? C.coralEdge : C.edge} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: C.coral, backgroundColor: isPublic === v ? C.coral : '#fff' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.plum }}>{t}</Text>
                <Body style={{ fontSize: 13 }}>{d}</Body>
              </View>
            </Card>
          </Pressable>
        ))}
        {error ? <ErrorNote text={error} /> : null}
        <Pill title="Create and join" size="xl" busy={busy} disabled={!name.trim()} onPress={() => run(async () => {
          const c = await api<Crew>('/crews', { name: name.trim(), public: isPublic });
          await api<Crew>(`/crews/${c.id}/join`, { address: app.address });
          await app.rememberCrew({ id: c.id, name: c.name });
          await app.setActiveCrew(c.id);
          router.back();
          router.navigate('/(tabs)/crew');
        })} />
      </ScrollView>
    </SafeAreaView>
  );
}
