import '../lib/polyfills';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold } from '@expo-google-fonts/urbanist';
import { AppProvider, useApp } from '../lib/store';
import { C, art } from '../lib/theme';

function Gate() {
  const { ready, address, onboarded } = useApp();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === 'onboarding';
    if ((!address || !onboarded) && !inOnboarding) router.replace('/onboarding');
  }, [ready, address, onboarded, segments]);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="scan" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="call" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function Root() {
  const [loaded] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold });
  if (!loaded)
    return (
      <View style={{ flex: 1, backgroundColor: C.sun, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={art.mascot} style={{ width: 160, height: 160 }} />
      </View>
    );
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Gate />
    </AppProvider>
  );
}
