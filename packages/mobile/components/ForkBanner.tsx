import { Text, View } from 'react-native';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';

/** Shown whenever the server runs on a local fork of Sui mainnet, so no screen can be mistaken for mainnet. */
export function ForkBanner() {
  const { rpc } = useApp();
  if (!rpc || !/fork/i.test(rpc)) return null;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.coralSoft, borderWidth: 1, borderColor: 'rgba(255,111,89,0.4)' }}>
      <Text style={{ color: C.coralInk, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{rpc} · no real funds</Text>
    </View>
  );
}
