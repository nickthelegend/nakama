import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, Chip, ErrorNote, H1, Kicker, Pill, useBusy } from '../../components/ui';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store';
import { C, art, pick, short } from '../../lib/theme';
import type { Crew } from '../../lib/types';

/** Invite landing: opened from a scanned QR or a nakama://join/<id> link. Shows the crew, then joins with the in-app address. */
export default function JoinCrew() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { busy, error, run } = useBusy();

  useEffect(() => {
    api<Crew>(`/crews/${id}`).then(setCrew).catch((e) => setLoadErr(e.message));
  }, [id]);
  const already = !!crew?.members.some((m) => m.toLowerCase() === (app.address ?? '').toLowerCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.sun }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, flexGrow: 1, justifyContent: 'center' }}>
        <Card style={{ gap: 12, alignItems: 'center' }}>
          <Image source={pick(art.crews, id)} style={{ width: 140, height: 140, borderRadius: 30, backgroundColor: C.butterSoft }} />
          <Kicker>You're invited</Kicker>
          {loadErr ? <ErrorNote text={`Couldn't open crew ${id}: ${loadErr}`} /> : null}
          {!crew && !loadErr ? <Body faint>Opening crew {id}…</Body> : null}
          {crew ? (
            <>
              <H1 style={{ textAlign: 'center' }}>{crew.name}</H1>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Chip text={`${crew.members.length} members`} />
                <Chip text={`${crew.calls.length} calls`} tone="butter" />
                <Chip text={crew.public ? 'public' : 'private'} tone="coral" />
              </View>
              <Body style={{ textAlign: 'center' }}>Join with your in-app wallet {short(app.address ?? '')}. Joining is free; each call you tap into is 2 USDC from your own wallet.</Body>
              {error ? <ErrorNote text={error} /> : null}
              <Pill title={already ? 'Open crew room' : 'Join the crew'} size="xl" busy={busy} style={{ alignSelf: 'stretch' }} onPress={() => run(async () => {
                const c = already ? crew : await api<Crew>(`/crews/${crew.id}/join`, { address: app.address });
                await app.rememberCrew({ id: c.id, name: c.name });
                await app.setActiveCrew(c.id);
                router.replace('/(tabs)/crew');
              })} />
            </>
          ) : null}
          <Pill title="Not now" tone="ghost" size="sm" onPress={() => router.replace('/(tabs)')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
