import { useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Card, ErrorNote, H1, Kicker, Pill } from '../components/ui';
import { crewIdFrom } from '../lib/api';
import { C, F } from '../lib/theme';

/** Scan a crew invite QR (or paste the invite link), then open the crew's join screen. */
export default function Scan() {
  const router = useRouter();
  const [perm, request] = useCameraPermissions();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const go = (text: string) => {
    const id = crewIdFrom(text);
    if (!id) return setError(`That isn't a Nakama invite: ${text.slice(0, 60)}`);
    if (done.current) return;
    done.current = true;
    router.replace({ pathname: '/join/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H1>Join with QR</H1>
          <Pill title="Close" size="sm" tone="ghost" onPress={() => router.back()} />
        </View>
        <Card style={{ padding: 10 }}>
          {perm?.granted ? (
            <View style={{ height: 320, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' }}>
              <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => go(r.data)} />
              <View pointerEvents="none" style={{ position: 'absolute', left: 50, right: 50, top: 50, bottom: 50, borderRadius: 24, borderWidth: 4, borderColor: C.butter }} />
            </View>
          ) : (
            <View style={{ padding: 14, gap: 10 }}>
              <Body>Nakama needs the camera to read a crewmate's invite QR. Nothing is recorded.</Body>
              <Pill title={perm?.canAskAgain === false ? 'Camera blocked in settings' : 'Allow camera'} disabled={perm?.canAskAgain === false} onPress={() => request()} />
            </View>
          )}
        </Card>
        <Kicker>Or paste an invite link</Kicker>
        <TextInput value={link} onChangeText={setLink} placeholder="https://…/?crew=ab12cd34" placeholderTextColor={C.ink3} autoCapitalize="none" autoCorrect={false}
          style={{ height: 52, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: C.edge, paddingHorizontal: 14, fontWeight: '600', fontSize: 15, color: C.ink }} />
        {error ? <ErrorNote text={error} /> : null}
        <Pill title="Open invite" disabled={!link.trim()} onPress={() => go(link)} />
      </ScrollView>
    </SafeAreaView>
  );
}
