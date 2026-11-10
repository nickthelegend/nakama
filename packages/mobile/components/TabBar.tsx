import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { SvgXml } from 'react-native-svg';
import { C } from '../lib/theme';
import { TOKEN_SVG, type Token } from '../lib/tokens';

/** Bold rounded glyphs drawn for Nakama: chat bubbles, a crew of three, a wallet, a trophy. */
function Glyph({ name, color }: { name: string; color: string }) {
  const p = { stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      {name === 'index' && (
        <>
          <Path {...p} d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5.5l-4 3.5v-3.5a3 3 0 0 1-2.5-3z" />
          <Path {...p} d="M19.5 10.5h1a3 3 0 0 1 3 3v4.5a3 3 0 0 1-2.5 3v3l-3.5-3h-4.5a3 3 0 0 1-2.4-1.2" />
          <Circle cx={9} cy={10} r={1.3} fill={color} />
          <Circle cx={12.5} cy={10} r={1.3} fill={color} />
          <Circle cx={16} cy={10} r={1.3} fill={color} />
        </>
      )}
      {name === 'crew' && (
        <>
          <Circle {...p} cx={14} cy={9} r={3.6} />
          <Path {...p} d="M7.5 22.5c.6-3.6 3.2-5.8 6.5-5.8s5.9 2.2 6.5 5.8" />
          <Circle {...p} cx={6.6} cy={11.6} r={2.6} />
          <Circle {...p} cx={21.4} cy={11.6} r={2.6} />
          <Path {...p} d="M2.8 20.5c.4-2.3 1.9-3.8 4-4.1M25.2 20.5c-.4-2.3-1.9-3.8-4-4.1" />
        </>
      )}
      {name === 'wallet' && (
        <>
          <Path {...p} d="M5 8.5h16.5a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 4 20V8a3 3 0 0 1 3-3h11.5" />
          <Rect {...p} x={16.5} y={12.5} width={7.5} height={5.5} rx={2.2} />
          <Circle cx={19.6} cy={15.25} r={1.3} fill={color} />
        </>
      )}
      {name === 'board' && (
        <>
          <Path {...p} d="M8.5 4.5h11v6a5.5 5.5 0 0 1-11 0z" />
          <Path {...p} d="M8.5 6.5h-3a3.5 3.5 0 0 0 3.6 4.4M19.5 6.5h3a3.5 3.5 0 0 1-3.6 4.4" />
          <Path {...p} d="M14 16v3.5M9.5 23.5h9M11 23.5l.8-4h4.4l.8 4" />
        </>
      )}
    </Svg>
  );
}

const SLOT = 68;
const PAD = 8;
/** Space screens leave at the bottom for the floating tab bar. */
export const TAB_SPACE = 104;

/** Floating glass pill, icons only. The active icon sits in a lighter pill that springs between tabs. */
export function TabBar({ state, navigateToTab, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(state.index * SLOT)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: state.index * SLOT, useNativeDriver: true, damping: 17, stiffness: 230, mass: 0.7 }).start();
  }, [state.index]);
  const width = SLOT * state.routes.length + PAD * 2;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 12), alignItems: 'center' }}>
      <View style={{ width, height: 66, borderRadius: 33, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}>
        <BlurView intensity={40} tint="dark" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(40,40,40,0.62)' }} />
        <Animated.View style={{ position: 'absolute', left: PAD, top: 7, width: SLOT, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.13)', transform: [{ translateX: x }] }} />
        <View style={{ flexDirection: 'row', paddingHorizontal: PAD, height: '100%', alignItems: 'center' }}>
          {state.routes.map((r, i) => {
            const on = state.index === i;
            const label = descriptors[r.key].options.title ?? r.name;
            return (
              <Pressable
                key={r.key}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  if (!on) navigateToTab(r.key);
                }}
                style={{ width: SLOT, height: 66, alignItems: 'center', justifyContent: 'center' }}
              >
                {({ pressed }) => (
                  <View style={{ alignItems: 'center', transform: [{ scale: pressed ? 0.84 : 1 }] }}>
                    <Glyph name={r.name} color={on ? '#fff' : '#8a8a8a'} />
                    <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: on ? C.coral : 'transparent' }} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Real token logo (BTC, SUI, USDC) in a white coin. */
export function TokenLogo({ token, size = 28 }: { token: Token; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <SvgXml xml={TOKEN_SVG[token]} width={size * 0.86} height={size * 0.86} />
    </View>
  );
}
