import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';

/**
 * Nakama's web typography on the phone: Baloo 2 for display (headings, buttons, chips, titles),
 * Urbanist for body text, Space Mono for addresses and digests. Every Text and TextInput in the app
 * goes through here, so a style's fontWeight + fontSize picks the family the web would use.
 */
const URBANIST: Record<string, string> = {
  '100': 'Urbanist_400Regular', '200': 'Urbanist_400Regular', '300': 'Urbanist_400Regular', '400': 'Urbanist_400Regular', normal: 'Urbanist_400Regular',
  '500': 'Urbanist_500Medium', '600': 'Urbanist_600SemiBold', '700': 'Urbanist_700Bold', bold: 'Urbanist_700Bold', '800': 'Urbanist_800ExtraBold', '900': 'Urbanist_800ExtraBold',
};
const MONO = new Set(['Menlo', 'monospace', 'SpaceMono_400Regular', 'SpaceMono_700Bold']);

export function family(style: TextStyle): TextStyle {
  const w = String(style.fontWeight ?? '500');
  const size = style.fontSize ?? 15;
  let fontFamily = style.fontFamily;
  if (fontFamily && MONO.has(fontFamily)) fontFamily = w === '700' || w === '800' || w === 'bold' ? 'SpaceMono_700Bold' : 'SpaceMono_400Regular';
  else if (!fontFamily || fontFamily === 'System') {
    const heavy = w === '800' || w === '900';
    const bold = heavy || w === '700' || w === 'bold';
    // Display face for headings, buttons, chips and titles (weight 700+ from 14 px up), like the web's --display.
    if (bold && size >= 14) fontFamily = heavy ? 'Baloo2_800ExtraBold' : 'Baloo2_700Bold';
    else fontFamily = URBANIST[w] ?? 'Urbanist_500Medium';
  }
  // Baloo 2 sits low and tall; keep its line box tight so pills and chips stay centred.
  const isBaloo = fontFamily.startsWith('Baloo');
  return {
    ...style,
    fontFamily,
    fontWeight: undefined,
    ...(isBaloo && !style.lineHeight ? { lineHeight: Math.round(size * 1.28) } : {}),
    ...(isBaloo && style.letterSpacing && style.letterSpacing < -0.3 ? { letterSpacing: -0.3 } : {}),
  };
}

export const Text = forwardRef<any, TextProps>(function Text({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  // A nested span with no type settings inherits its parent's face.
  const typed = flat.fontSize != null || flat.fontWeight != null || flat.fontFamily != null;
  return <RNText ref={ref} {...rest} style={typed ? family(flat) : style} />;
});

export const TextInput = forwardRef<any, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const flat = StyleSheet.flatten(style) ?? {};
  return <RNTextInput ref={ref} {...rest} style={{ ...family({ fontWeight: '600', ...flat }), lineHeight: undefined }} />;
});
