import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../components/T';
import { useRouter } from 'expo-router';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorNote, Pill, useBusy } from '../components/ui';
import { InfoButton, InfoLine } from '../components/InfoSheet';
import { crewIdFrom } from '../lib/api';
import { C } from '../lib/theme';

/** Join: scan a crew QR live, scan one from a photo, or paste the invite link. Any of them opens the crew. */
export default function Scan() {
  const router = useRouter();
  const [perm, request] = useCameraPermissions();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const photo = useBusy();

  const go = (text: string) => {
    const id = crewIdFrom(text);
    if (!id) return setError(`Not a Nakama invite: ${text.slice(0, 60)}`);
    if (done.current) return;
    done.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({ pathname: '/join/[id]', params: { id } });
  };

  const fromPhoto = () =>
    photo.run(async () => {
      setError(null);
      const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (pick.canceled || !pick.assets?.[0]) return;
      const found = await scanFromURLAsync(pick.assets[0].uri, ['qr']);
      if (!found.length) throw Error('No QR code found in that photo');
      go(found[0].data);
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 20, gap: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pill title="Cancel" size="sm" tone="ghost" onPress={() => router.back()} />
          <InfoButton title="Joining a crew">
            <InfoLine>Point the camera at a crewmate’s crew QR (Crew → ⓘ in their room). A screenshot of the QR works too: use Scan from photo.</InfoLine>
            <InfoLine>Invite links look like https://…/?crew=ab12cd34. You join with your own in-app wallet; joining is free.</InfoLine>
          </InfoButton>
        </View>
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 }}>Join a crew</Text>

        <View style={{ height: 300, borderRadius: 28, overflow: 'hidden', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          {perm?.granted ? (
            <>
              <CameraView style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => go(r.data)} />
              <View pointerEvents="none" style={{ width: 200, height: 200, borderRadius: 28, borderWidth: 4, borderColor: C.coral }} />
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 12, padding: 20 }}>
              <Text style={{ color: C.ink2, fontSize: 15, textAlign: 'center' }}>Scan a crew QR with the camera</Text>
              <Pill title={perm?.canAskAgain === false ? 'Camera off in Settings' : 'Allow camera'} tone="white" disabled={perm?.canAskAgain === false} onPress={() => request()} />
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pill title="Scan from photo" tone="ghost" busy={photo.busy} style={{ flex: 1 }} onPress={fromPhoto} />
          <Pill title="Paste invite" tone="ghost" style={{ flex: 1 }} onPress={async () => {
            const t = (await Clipboard.getStringAsync()).trim();
            if (!t) return setError('Clipboard is empty');
            setLink(t);
            go(t);
          }} />
        </View>
        <TextInput value={link} onChangeText={setLink} onSubmitEditing={() => link.trim() && go(link)} placeholder="…or type a crew code" placeholderTextColor={C.ink3}
          autoCapitalize="none" autoCorrect={false} returnKeyType="go"
          style={{ height: 52, borderRadius: 18, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2, paddingHorizontal: 16, fontSize: 16, color: C.ink }} />
        {error || photo.error ? <ErrorNote text={(error || photo.error)!} /> : null}
      </View>
    </SafeAreaView>
  );
}
