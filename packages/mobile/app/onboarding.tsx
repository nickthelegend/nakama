import { useState } from 'react';
import { Dimensions, View } from 'react-native';
import { Text } from '../components/T';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorNote, Pill, Wordmark, useBusy } from '../components/ui';
import { InfoButton, InfoLine } from '../components/InfoSheet';
import { askNotificationPermission, useApp } from '../lib/store';
import { C, F, art, short } from '../lib/theme';

const H = Dimensions.get('window').height;

/** Three screens, one headline and one button each. Details live behind ⓘ. */
export default function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState(app.address ? 2 : 0);
  const { busy, error, run } = useBusy();

  const finish = async () => {
    await app.finishOnboarding();
    router.replace('/(tabs)/wallet');
  };
  const screens = [
    {
      art: art.onboard1, title: 'Call BTC with your crew', line: 'Everyone taps in 2 USDC from their own wallet.',
      info: [
        'A friend posts a call: “BTC above $X in 5 min, because…”. Each crewmate taps in once with 2 USDC.',
        'Nobody pools money: every tap is your own DeepBook Predict order on Sui mainnet. Pyth settles it, and the scoreboard keeps track of who’s right.',
        'Joins, calls and results are remembered in Walrus Memory.',
      ],
      button: <Pill title="Get started" size="xl" onPress={() => setStep(1)} />,
    },
    {
      art: art.heroPhone, title: 'Make your wallet', line: app.address ? `Ready: ${short(app.address)}` : 'It lives on this phone only.',
      info: [
        'Nakama creates a Sui Ed25519 key on this phone and keeps it in the secure keystore (iOS Keychain, Android Keystore).',
        'The key never goes to a server. When you tap in, the server builds the transaction and this phone signs it.',
        'You can back it up later from Wallet → Back up your key.',
      ],
      button: app.address
        ? <Pill title="Next" size="xl" onPress={() => setStep(2)} />
        : <Pill title="Create wallet" size="xl" busy={busy} onPress={() => run(async () => { await app.createWallet(); })} />,
    },
    {
      art: art.onboard2, title: 'Never miss a call', line: 'Get a ping when your crew calls.',
      info: [
        'Calls last 1 or 5 minutes, so timing matters.',
        'Nakama checks your crews every 15 s while it is open, and in the background when the system allows it, and notifies you about new calls, crewmates tapping in, and settled calls.',
      ],
      button: <Pill title="Turn on notifications" size="xl" busy={busy} onPress={() => run(async () => { await askNotificationPermission(); await finish(); })} />,
    },
  ];
  const s = screens[step];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Image source={s.art} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.62 }} contentFit="cover" transition={250} />
      <LinearGradient colors={['rgba(20,20,20,0.35)', 'rgba(20,20,20,0)', 'rgba(20,20,20,0.85)', C.bg]} locations={[0, 0.25, 0.75, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.62 + 2 }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 }}>
          <Wordmark size={30} />
          <InfoButton title={s.title}>{s.info.map((t) => <InfoLine key={t}>{t}</InfoLine>)}</InfoButton>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 24, paddingBottom: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2].map((i) => <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? C.coral : C.surface3 }} />)}
          </View>
          <Text style={{ color: '#fff', fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1.2 }}>{s.title}</Text>
          <Text style={{ color: C.ink2, fontSize: 17, fontFamily: step === 1 && app.address ? F.mono : undefined }}>{s.line}</Text>
          {error ? <ErrorNote text={error} /> : null}
          <View style={{ marginTop: 10 }}>{s.button}</View>
        </View>
      </SafeAreaView>
    </View>
  );
}
