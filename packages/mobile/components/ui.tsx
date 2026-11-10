import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { C, F, art } from '../lib/theme';

/** Chunky card: white face on a tan 3D edge, like the web's .c3. */
export function Card({ children, style, edge = C.edge, face = C.panel }: { children: ReactNode; style?: StyleProp<ViewStyle>; edge?: string; face?: string }) {
  return (
    <View style={[s.cardEdge, { backgroundColor: edge }]}>
      <View style={[s.card, { backgroundColor: face }, style]}>{children}</View>
    </View>
  );
}

type Tone = 'coral' | 'plum' | 'butter' | 'mint' | 'off' | 'ghost';
const tones: Record<Tone, { face: string; edge: string; ink: string }> = {
  coral: { face: C.coral, edge: C.coralEdge, ink: '#fff' },
  plum: { face: C.plum, edge: '#1f0e29', ink: '#fff' },
  butter: { face: C.butter, edge: C.butterEdge, ink: C.plum2 },
  mint: { face: C.mint, edge: C.mintEdge, ink: '#08311f' },
  off: { face: C.off, edge: C.offEdge, ink: '#6c5a6c' },
  ghost: { face: C.panel, edge: C.edge, ink: C.plum },
};

/** Glossy 3D pill button that presses down into its edge. */
export function Pill({ title, onPress, tone = 'coral', busy, disabled, size = 'md', icon, style }: {
  title: string; onPress?: () => unknown; tone?: Tone; busy?: boolean; disabled?: boolean; size?: 'sm' | 'md' | 'xl'; icon?: any; style?: StyleProp<ViewStyle>;
}) {
  const t = tones[disabled ? 'off' : tone];
  const h = size === 'sm' ? 40 : size === 'xl' ? 60 : 52;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={style}
    >
      {({ pressed }) => (
        <View style={{ borderRadius: 999, backgroundColor: t.edge, paddingBottom: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 }}>
          <View style={[s.pill, { height: h, backgroundColor: t.face, paddingHorizontal: size === 'sm' ? 16 : 22 }]}>
            <View style={s.pillGloss} />
            {busy ? <ActivityIndicator color={t.ink} /> : icon ? <Image source={icon} style={{ width: size === 'sm' ? 22 : 28, height: size === 'sm' ? 22 : 28 }} /> : null}
            <Text style={[s.pillText, { color: t.ink, fontSize: size === 'sm' ? 14 : size === 'xl' ? 19 : 16 }]} numberOfLines={1}>{title}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ text, tone = 'plum', style }: { text: string; tone?: 'plum' | 'coral' | 'butter' | 'mint' | 'pink'; style?: StyleProp<ViewStyle> }) {
  const m = {
    plum: [C.plumSoft, C.plum], coral: [C.coralSoft, C.coralInk], butter: [C.butterSoft, C.butterInk], mint: [C.mintSoft, C.mintInk], pink: [C.pinkSoft, C.pinkInk],
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: m[0] }, style]}>
      <Text style={[s.chipText, { color: m[1] }]}>{text}</Text>
    </View>
  );
}

export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h2, style]}>{children}</Text>;
export const Kicker = ({ children }: { children: ReactNode }) => <Text style={s.kicker}>{children}</Text>;
export const Body = ({ children, style, faint }: { children: ReactNode; style?: StyleProp<TextStyle>; faint?: boolean }) => (
  <Text style={[s.body, faint && { color: C.ink3 }, style]}>{children}</Text>
);
export const Mono = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.mono, style]}>{children}</Text>;

/** Labelled empty / setup / error state with the mascot. */
export function Empty({ title, body, mood = 'sleep', action }: { title: string; body?: string; mood?: 'sleep' | 'sad' | 'cheer'; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 12, gap: 8 }}>
      <Image source={mood === 'sad' ? art.sad : mood === 'cheer' ? art.cheer : art.empty} style={{ width: 132, height: 132 }} contentFit="contain" />
      <H2 style={{ textAlign: 'center' }}>{title}</H2>
      {body ? <Body style={{ textAlign: 'center' }}>{body}</Body> : null}
      {action}
    </View>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <View style={s.err}>
      <Text style={s.errText}>{text}</Text>
    </View>
  );
}

export function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export const s = StyleSheet.create({
  cardEdge: { borderRadius: 28, paddingBottom: 6, shadowColor: C.plum, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  card: { borderRadius: 28, padding: 18, borderWidth: 2, borderColor: 'rgba(59,31,74,0.05)' },
  pill: { borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  pillGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.18)' },
  pillText: { fontFamily: F.display, letterSpacing: 0.3, includeFontPadding: false },
  chip: { alignSelf: 'flex-start', height: 26, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center' },
  chipText: { fontFamily: F.displayBold, fontSize: 12, includeFontPadding: false },
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.plum, includeFontPadding: false },
  h2: { fontFamily: F.display, fontSize: 21, lineHeight: 25, color: C.plum, includeFontPadding: false },
  kicker: { fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: C.coralInk, textTransform: 'uppercase' },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.ink2 },
  mono: { fontFamily: F.mono, fontSize: 12.5, color: C.ink },
  err: { backgroundColor: C.pinkSoft, borderRadius: 16, padding: 12 },
  errText: { fontFamily: F.bodySemi, color: C.pinkInk, fontSize: 14, lineHeight: 19 },
});
