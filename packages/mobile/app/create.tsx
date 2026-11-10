import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/T';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorNote, Pill, useBusy } from '../components/ui';
import { InfoButton, InfoLine } from '../components/InfoSheet';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { C, art } from '../lib/theme';
import type { Crew } from '../lib/types';

/** New crew: a name, public or private, one button. */
export default function CreateCrew() {
  const app = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPublic, setPublic] = useState(false);
  const { busy, error, run } = useBusy();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 20, gap: 18, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pill title="Cancel" size="sm" tone="ghost" onPress={() => router.back()} />
          <InfoButton title="Crews">
            <InfoLine>Public crews are listed on everyone’s home screen. Private crews are reachable only by your invite QR or link.</InfoLine>
            <InfoLine>You join your own crew straight away. Joining is free; each call someone taps into costs them 2 USDC from their own wallet.</InfoLine>
          </InfoButton>
        </View>
        <Image source={art.emptyCrew} style={{ width: 170, height: 170, alignSelf: 'center' }} contentFit="contain" />
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 }}>New crew</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Crew name" placeholderTextColor={C.ink3} maxLength={60} autoFocus
          style={{ height: 58, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, paddingHorizontal: 18, fontSize: 19, fontWeight: '600', color: '#fff' }} />
        <View style={{ flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: C.surface2 }}>
          {([[false, 'Private'], [true, 'Public']] as const).map(([v, t]) => (
            <Pressable key={t} onPress={() => setPublic(v)} style={{ flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isPublic === v ? '#f5f5f5' : 'transparent' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isPublic === v ? '#141414' : C.ink2 }}>{t}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <ErrorNote text={error} /> : null}
        <Pill title="Create" size="xl" busy={busy} disabled={!name.trim()} onPress={() => run(async () => {
          const c = await api<Crew>('/crews', { name: name.trim(), public: isPublic });
          await api<Crew>(`/crews/${c.id}/join`, { address: app.address });
          await app.rememberCrew({ id: c.id, name: c.name });
          await app.setActiveCrew(c.id);
          router.back();
          router.push({ pathname: '/room/[id]', params: { id: c.id } });
        })} />
      </View>
    </SafeAreaView>
  );
}
