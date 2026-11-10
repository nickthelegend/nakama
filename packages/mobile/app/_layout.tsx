import '../lib/polyfills';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold } from '@expo-google-fonts/urbanist';
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
      <Stack.Screen name="call" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: C.bg } }} />
      <Stack.Screen name="invite" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9], sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: C.bg } }} />
      <Stack.Screen name="room/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
    </Stack>
  );
}

export default function Root() {
  const [loaded] = useFonts({ Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold, Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold, SpaceMono_400Regular, SpaceMono_700Bold });
  if (!loaded)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={art.mascot} style={{ width: 160, height: 160 }} />
      </View>
    );
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Gate />
    </AppProvider>
  );
}
