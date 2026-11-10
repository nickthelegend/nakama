import { Tabs } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, art } from '../../lib/theme';

const icon = (src: any) => ({ focused }: { focused: boolean }) => (
  <View style={{ width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.coralSoft : 'transparent' }}>
    <Image source={src} style={{ width: 28, height: 28, opacity: focused ? 1 : 0.55 }} />
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.cream },
        tabBarActiveTintColor: C.coralInk,
        tabBarInactiveTintColor: C.ink3,
        tabBarLabelStyle: { fontFamily: F.display, fontSize: 12, marginTop: 2 },
        tabBarStyle: {
          height: 66 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 6, backgroundColor: '#fff',
          borderTopWidth: 0, elevation: 18, shadowColor: C.plum, shadowOpacity: 0.12, shadowRadius: 14,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Rooms', tabBarIcon: icon(art.megaphone) }} />
      <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarIcon: icon(art.fire) }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon(art.coin) }} />
      <Tabs.Screen name="board" options={{ title: 'Scoreboard', tabBarIcon: icon(art.trophy) }} />
    </Tabs>
  );
}
