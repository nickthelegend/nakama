import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.cream } }}>
      <Tabs.Screen name="index" options={{ title: 'Rooms' }} />
      <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="board" options={{ title: 'Scoreboard' }} />
    </Tabs>
  );
}
