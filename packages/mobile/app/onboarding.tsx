import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wordmark, Body, Card, ErrorNote, H1, H2, Kicker, Mono, Pill, useBusy } from '../components/ui';
import { askNotificationPermission, useApp } from '../lib/store';
import { C, art, short } from '../lib/theme';

/** Three steps: what Nakama is → create your own wallet on this phone → allow crew-call notifications. */
export default function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState(app.address ? 2 : 0);
  const [notif, setNotif] = useState<boolean | null>(null);
  const { busy, error, run } = useBusy();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.sun }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <Wordmark size={44} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: i === step ? 26 : 10, height: 10, borderRadius: 5, backgroundColor: i <= step ? C.coral : 'rgba(59,31,74,0.15)' }} />
          ))}
        </View>

        {step === 0 && (
          <Card style={{ gap: 12, alignItems: 'center' }}>
            <Image source={art.mascot} style={{ width: 170, height: 170 }} contentFit="contain" />
            <Kicker>A friendly crew wallet</Kicker>
            <H1 style={{ textAlign: 'center' }}>Make BTC calls with your crew</H1>
            <Body style={{ textAlign: 'center' }}>
              A friend posts a call: “BTC above $X in 5 min, because…”. Everyone taps in once with 2 USDC from their own wallet. Nobody pools money. Pyth settles it and the scoreboard keeps score.
            </Body>
            <Pill title="Let's go" size="xl" style={{ alignSelf: 'stretch' }} onPress={() => setStep(1)} />
          </Card>
        )}

        {step === 1 && (
          <Card style={{ gap: 12 }}>
            <Kicker>Step 1 · Your wallet</Kicker>
            <H1>Your own Sui wallet, made on this phone</H1>
            <Body>
              Nakama creates an Ed25519 key here and keeps it in the phone's secure storage (iOS Keychain, Android Keystore). It never goes to our server: when you tap in, this phone signs your own transaction.
            </Body>
            {app.address ? (
              <Card face={C.mintSoft} edge="#b6ebd2" style={{ gap: 4 }}>
                <Kicker>Wallet created</Kicker>
                <Mono>{short(app.address)}</Mono>
              </Card>
            ) : null}
            {error ? <ErrorNote text={error} /> : null}
            {app.address ? (
              <Pill title="Next: notifications" size="xl" onPress={() => setStep(2)} />
            ) : (
              <Pill title="Create my wallet" size="xl" busy={busy} icon={art.shield} onPress={() => run(async () => { await app.createWallet(); })} />
            )}
          </Card>
        )}

        {step === 2 && (
          <Card style={{ gap: 12 }}>
            <Kicker>Step 2 · Heads up</Kicker>
            <H1>Know when your crew calls</H1>
            <Image source={art.megaphone} style={{ width: 96, height: 96, alignSelf: 'center' }} />
            <Body>Calls last 1 or 5 minutes, so Nakama pings you the moment a crewmate posts one, and again when Pyth settles it.</Body>
            {notif === false ? <ErrorNote text="Notifications are off. You can still open crews yourself; turn them on in Settings any time." /> : null}
            {notif === true ? <Body style={{ color: C.mintInk }}>Notifications on.</Body> : null}
            {notif === null ? (
              <Pill title="Allow notifications" size="xl" busy={busy} onPress={() => run(async () => setNotif(await askNotificationPermission()))} />
            ) : null}
            <Pill
              title="Fund my wallet"
              tone={notif === null ? 'ghost' : 'coral'}
              size="xl"
              onPress={async () => {
                await app.finishOnboarding();
                router.replace('/(tabs)/wallet');
              }}
            />
          </Card>
        )}
        <H2 style={{ textAlign: 'center', fontSize: 14, color: C.ink3 }}>Sui mainnet · DeepBook Predict · Walrus Memory</H2>
      </ScrollView>
    </SafeAreaView>
  );
}
