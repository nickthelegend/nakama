import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from './ui';
import { C } from '../lib/theme';

/** Small ⓘ button that opens a bottom sheet with the details a screen leaves out. */
export function InfoButton({ title, children, size = 36 }: { title: string; children: ReactNode; size?: number }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable accessibilityLabel={`About: ${title}`} hitSlop={10} onPress={() => setOpen(true)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9.5} stroke="#fff" strokeWidth={1.8} fill="none" /><Path d="M12 11v6M12 7.5v.01" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" /></Svg>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: insets.bottom + 16, gap: 12, maxHeight: '70%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.surface3, marginTop: -8 }} />
          <Text style={{ color: '#fff', fontSize: 21, fontWeight: '700' }}>{title}</Text>
          <ScrollView contentContainerStyle={{ gap: 10 }}>{children}</ScrollView>
          <Pill title="Got it" tone="white" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

export const InfoLine = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: C.ink2, fontSize: 15, lineHeight: 21 }}>{children}</Text>
);
