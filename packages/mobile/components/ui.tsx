import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { C, F, art } from '../lib/theme';

/** Rounded charcoal surface. `edge` is kept for call sites that used the old 3D edge; it is ignored. */
export function Card({ children, style, face = C.surface }: { children: ReactNode; style?: StyleProp<ViewStyle>; edge?: string; face?: string }) {
  return <View style={[s.card, { backgroundColor: face }, style]}>{children}</View>;
}

type Tone = 'coral' | 'plum' | 'butter' | 'mint' | 'off' | 'ghost' | 'white' | 'black';
const tones: Record<Tone, { face: string; ink: string; border?: string }> = {
  coral: { face: C.coral, ink: '#fff' },
  white: { face: '#f5f5f5', ink: '#141414' },
  plum: { face: '#f5f5f5', ink: '#141414' },
  butter: { face: '#f5f5f5', ink: '#141414' },
  black: { face: '#141414', ink: '#fff' },
  mint: { face: C.up, ink: '#06210f' },
  off: { face: C.surface3, ink: C.ink3 },
  ghost: { face: 'transparent', ink: C.ink, border: C.line2 },
};

/** Pill button with a soft press (scale + haptic). */
export function Pill({ title, onPress, tone = 'coral', busy, disabled, size = 'md', icon, right, style }: {
  title: string; onPress?: () => unknown; tone?: Tone; busy?: boolean; disabled?: boolean; size?: 'sm' | 'md' | 'xl'; icon?: any; right?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = tones[disabled ? 'off' : tone];
  const h = size === 'sm' ? 40 : size === 'xl' ? 58 : 50;
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
        <View style={[s.pill, { height: h, backgroundColor: t.face, paddingHorizontal: size === 'sm' ? 16 : 22, borderWidth: t.border ? 1 : 0, borderColor: t.border, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}>
          {busy ? <ActivityIndicator color={t.ink} /> : icon ? <Image source={icon} style={{ width: size === 'sm' ? 20 : 26, height: size === 'sm' ? 20 : 26 }} /> : null}
          <Text style={[s.pillText, { color: t.ink, fontSize: size === 'sm' ? 15 : size === 'xl' ? 18 : 16 }]} numberOfLines={1}>{title}</Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ text, tone = 'plum', style }: { text: string; tone?: 'plum' | 'coral' | 'butter' | 'mint' | 'pink'; style?: StyleProp<ViewStyle> }) {
  const m = {
    plum: [C.surface3, C.ink2], coral: [C.coralSoft, C.coralInk], butter: [C.butterSoft, C.butterInk], mint: [C.upSoft, C.mintInk], pink: [C.downSoft, C.pinkInk],
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: m[0] }, style]}>
      <Text style={[s.chipText, { color: m[1] }]}>{text}</Text>
    </View>
  );
}

/** "nakama." wordmark with the lucky cat. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Image source={art.mascot} style={{ width: size * 1.15, height: size * 1.15 }} contentFit="contain" />
      <Text style={{ fontFamily: F.wordmark, fontSize: size, lineHeight: size * 1.25, color: '#fff', includeFontPadding: false }}>
        nakama<Text style={{ color: C.coral }}>.</Text>
      </Text>
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

/** Designed empty / setup / error state with the lucky cat. */
export function Empty({ title, body, mood = 'sleep', action }: { title: string; body?: string; mood?: 'sleep' | 'sad' | 'cheer'; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 12, gap: 8 }}>
      <Image source={mood === 'sad' ? art.sad : mood === 'cheer' ? art.cheer : art.empty} style={{ width: 120, height: 120 }} contentFit="contain" />
      <H2 style={{ textAlign: 'center' }}>{title}</H2>
      {body ? <Body style={{ textAlign: 'center' }}>{body}</Body> : null}
      {action}
    </View>
  );
}

/** Loading row: skeleton bars instead of a bare spinner. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ height: 68, borderRadius: 22, backgroundColor: C.surface, opacity: 1 - i * 0.22 }} />
      ))}
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
  card: { borderRadius: 28, padding: 18 },
  pill: { borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pillText: { fontWeight: '700', letterSpacing: -0.2 },
  chip: { alignSelf: 'flex-start', height: 28, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  chipText: { fontWeight: '600', fontSize: 13 },
  h1: { fontWeight: '700', fontSize: 30, lineHeight: 36, color: C.ink, letterSpacing: -0.6 },
  h2: { fontWeight: '700', fontSize: 20, lineHeight: 25, color: C.ink, letterSpacing: -0.3 },
  kicker: { fontWeight: '600', fontSize: 13, letterSpacing: 0.2, color: C.ink3 },
  body: { fontWeight: '400', fontSize: 15, lineHeight: 21, color: C.ink2 },
  mono: { fontFamily: F.mono, fontSize: 12, color: C.ink2 },
  err: { backgroundColor: C.downSoft, borderRadius: 16, padding: 12 },
  errText: { fontWeight: '600', color: C.pinkInk, fontSize: 14, lineHeight: 19 },
});
