import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ErrorNote, Pill, useBusy } from './ui';
import { TokenLogo } from './TabBar';
import { api, dirWord, pct, usd } from '../lib/api';
import { balances, type Balances } from '../lib/sui';
import { signTransactionBytes } from '../lib/wallet';
import { C, F, art, pick, short } from '../lib/theme';
import type { Call, Odds, PlanResult } from '../lib/types';

type Tap =
  | { kind: 'fund'; dry: string; wallet: Balances | null; debit: number | null }
  | { kind: 'dry'; debit: number; fee: number; payout?: number; mode: string; rpc?: string }
  | { kind: 'sent'; digest: string }
  | { kind: 'refused'; reason: string };

const TAP = 2;

/** Ticking clock and live Predict odds for one call. */
function useLive(call: Call) {
  const [now, setNow] = useState(Date.now());
  const [odds, setOdds] = useState<Odds | null>(null);
  const live = call.status === 'live' && call.expiryMs > now;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    let alive = true;
    const pull = () => api<Odds>(`/calls/${call.id}/odds`).then((o) => alive && setOdds(o)).catch(() => {});
    pull();
    const o = setInterval(pull, 8000);
    return () => { alive = false; clearInterval(t); clearInterval(o); };
  }, [call.id, live]);
  return { now, odds, live, left: Math.max(0, Math.round((call.expiryMs - now) / 1000)) };
}

/** Tap in: server builds and dry-runs the Predict order; in live mode this phone signs it. */
function useTapIn(call: Call, me: string, onChanged: () => void) {
  const [tap, setTap] = useState<Tap | null>(null);
  const b = useBusy();
  const tapIn = () =>
    b.run(async () => {
      setTap(null);
      const p = await api<PlanResult>(`/calls/${call.id}/plan`, { address: me, size: TAP }, 60000);
      if (!p.quote.accepting || p.dryRun?.status !== 'success') {
        const wallet = await balances(me).catch(() => null);
        const why = !p.quote.accepting
          ? `quote refused (${p.quote.refusal ?? 'no reason given'}), so there was nothing to simulate`
          : `${p.dryRun?.status ?? 'unavailable'}: ${p.dryRun?.error || 'the chain returned no reason'}`;
        const unfunded = !wallet || wallet.usdc < TAP + 0.02 || wallet.sui < 0.05;
        return setTap(unfunded ? { kind: 'fund', dry: why, wallet, debit: p.quote.totalDebit || null } : { kind: 'refused', reason: why });
      }
      if (!p.transaction)
        return setTap({ kind: 'dry', debit: p.quote.totalDebit, fee: p.quote.orderFee, payout: p.quote.potentialPayout, mode: p.mode, rpc: p.dryRun.rpc });
      // Live mode: this phone signs the exact bytes the server built for this address; the server only relays them.
      const signed = await signTransactionBytes(p.transaction);
      const sent = await api<{ digest: string }>('/execute', { bytes: signed.bytes, signature: signed.signature }, 60000);
      await api(`/calls/${call.id}/orders`, { address: me, digest: sent.digest }, 60000);
      setTap({ kind: 'sent', digest: sent.digest });
      onChanged();
    });
  return { tap, tapIn, busy: b.busy, error: b.error };
}

const fmtLeft = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`);

function Bell() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" stroke="#141414" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
function Clock() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2" stroke="#141414" strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export const Tri = ({ up, color, size = 12 }: { up: boolean; color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12"><Path d={up ? 'M6 1.5 11 10H1z' : 'M6 10.5 1 2h10z'} fill={color} /></Svg>
);

/**
 * The call card, in the light-tint "featured" finish: asset chip, title, hero art, crew line with the
 * live Predict odds as a green/red split, past results, and a black pill to tap in.
 * Bell and countdown chips sit in a notch over its top edge.
 */
export function CallCard({ call, me, member, onChanged, crewName, members, past = [], featured, onOpen }: {
  call: Call; me: string; member: boolean; onChanged: () => void; crewName?: string; members?: number;
  past?: Call[]; featured?: boolean; onOpen?: () => void;
}) {
  const router = useRouter();
  const { odds, live, left } = useLive(call);
  const { tap, tapIn, busy, error } = useTapIn(call, me, onChanged);
  const mine = call.orders.some((o) => o.address.toLowerCase() === me.toLowerCase());
  const side = call.setup.direction;
  const p = odds?.probability ?? null;
  const settled = call.status === 'settled';
  const hits = call.orders.filter((o) => o.hit).length;

  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ backgroundColor: C.tint, borderRadius: 30, padding: 18, paddingTop: 16, gap: 12, overflow: 'hidden' }}>
        {/* asset chip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: 'rgba(20,20,20,0.07)', borderRadius: 999, paddingLeft: 5, paddingRight: 12, height: 34 }}>
          <TokenLogo token="BTC" size={24} />
          <Text style={{ fontWeight: '600', fontSize: 14, color: C.tintInk }}>BTC · {call.setup.cadence}m</Text>
        </View>
        <Text style={{ fontWeight: '700', fontSize: featured ? 29 : 24, lineHeight: featured ? 33 : 28, letterSpacing: -0.8, color: C.tintInk, paddingRight: 8 }}>
          BTC {dirWord(side)} {usd(call.strike)}{call.upper ? `–${usd(call.upper)}` : ''}
        </Text>
        <Text style={{ fontWeight: '500', fontSize: 15, color: C.tintInk2, marginTop: -6 }} numberOfLines={2}>
          “{call.why}” · {short(call.caller)}{crewName ? ` · ${crewName}` : ''}
        </Text>

        {/* hero */}
        <View style={{ height: featured ? 128 : 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6 }}>
          <Image source={settled ? (hits ? art.cheer : art.sad) : art.mascot} style={{ width: featured ? 132 : 100, height: featured ? 132 : 100 }} contentFit="contain" />
          <Image source={side === 'down' ? art.anchor : art.rocket} style={{ width: featured ? 84 : 64, height: featured ? 84 : 64, opacity: 0.95 }} contentFit="contain" />
          <View style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
            <TokenLogo token="BTC" size={featured ? 96 : 74} />
          </View>
        </View>

        {/* crew + odds */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <View style={{ flexDirection: 'row' }}>
              {(call.orders.length ? call.orders.map((o) => o.address) : [call.caller]).slice(0, 3).map((a, i) => (
                <Image key={a + i} source={pick(art.avatars, a)} style={{ width: 22, height: 22, borderRadius: 11, marginLeft: i ? -7 : 0, borderWidth: 1.5, borderColor: C.tint }} />
              ))}
            </View>
            <Text style={{ fontWeight: '600', fontSize: 14.5, color: C.tintInk }} numberOfLines={1}>
              {call.orders.length} in{members ? ` of ${members}` : ''} · <Text style={{ color: mine ? '#1a8a4f' : C.tintInk2 }}>You {mine ? '▲' : '–'}</Text>
            </Text>
          </View>
          <Text style={{ fontWeight: '600', fontSize: 14.5, color: C.tintInk2 }}>
            {p != null ? <Text style={{ color: '#1a8a4f', fontWeight: '700' }}>{pct(p)}%</Text> : null}{p != null ? ' odds' : live ? 'reading odds…' : settled ? `${hits}/${call.orders.length} won` : 'closed'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, height: 5 }}>
          <View style={{ flex: p != null ? Math.max(0.02, p) : 1, borderRadius: 3, backgroundColor: p != null ? C.up : 'rgba(20,20,20,0.12)' }} />
          {p != null ? <View style={{ flex: Math.max(0.02, 1 - p), borderRadius: 3, backgroundColor: C.down }} /> : null}
        </View>
        {live && odds && odds.inBand === false ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={art.entryClosed} style={{ width: 34, height: 34 }} contentFit="contain" />
            <Text style={{ fontWeight: '600', fontSize: 13, color: '#b3261e', flex: 1 }}>Outside Predict's 15–50% entry band: entry closed for now</Text>
          </View>
        ) : null}

        {/* past + action */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <Text style={{ fontWeight: '500', fontSize: 15, color: C.tintInk2, marginRight: 2 }}>Past</Text>
            {past.slice(-3).map((x) => {
              const won = x.orders.some((o) => o.hit);
              const any = x.orders.length > 0;
              return (
                <View key={x.id} style={{ width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: any ? (won ? 'rgba(47,191,113,0.2)' : 'rgba(229,72,77,0.18)') : 'rgba(20,20,20,0.07)' }}>
                  <Tri up={x.setup.direction !== 'down'} color={any ? (won ? '#1a8a4f' : '#b3261e') : '#8a8a80'} />
                </View>
              );
            })}
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.coral }} />
          </View>
          {live && member && !mine ? (
            <Pill title={`Tap in · ${TAP} USDC`} tone="black" size="md" busy={busy} disabled={odds?.inBand === false} onPress={tapIn} />
          ) : live && !member ? (
            <Pill title="Join crew  →" tone="black" onPress={onOpen} />
          ) : onOpen ? (
            <Pill title={mine ? "You're in  →" : 'Open  →'} tone="black" onPress={onOpen} />
          ) : mine ? (
            <Pill title="You're in ✓" tone="black" disabled />
          ) : null}
        </View>

        {error ? <ErrorNote text={error} /> : null}
        {tap?.kind === 'fund' ? (
          <View style={{ backgroundColor: '#141414', borderRadius: 20, padding: 14, gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: '#fff' }}>Fund your wallet first</Text>
            <Text style={{ fontWeight: '500', fontSize: 14, lineHeight: 19, color: C.ink2 }}>
              Your wallet on mainnet: {tap.wallet ? `${tap.wallet.usdc.toFixed(2)} USDC · ${tap.wallet.sui.toFixed(3)} SUI` : 'balance unavailable'}. A tap needs {tap.debit ? tap.debit.toFixed(2) : '2.00'} USDC in a Predict account, plus SUI for gas.
            </Text>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.pinkInk }}>Predict dry-run: {tap.dry}</Text>
            <Pill title="Deposit" tone="white" size="sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => router.navigate('/(tabs)/wallet')} />
          </View>
        ) : null}
        {tap?.kind === 'dry' ? (
          <View style={{ backgroundColor: '#141414', borderRadius: 20, padding: 14, gap: 4 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.mintInk }}>Dry-run success · no order submitted</Text>
            <Text style={{ fontWeight: '500', fontSize: 14, color: C.ink2 }}>
              {tap.debit.toFixed(2)} USDC including {tap.fee.toFixed(2)} fee{tap.payout ? ` · pays ${tap.payout.toFixed(2)} if right` : ''}. The server is {tap.mode}, so there were no bytes to sign.
            </Text>
          </View>
        ) : null}
        {tap?.kind === 'refused' ? <ErrorNote text={`Predict: ${tap.reason}`} /> : null}
        {tap?.kind === 'sent' ? (
          <Pressable onPress={() => Linking.openURL(`https://suiscan.xyz/mainnet/tx/${tap.digest}`)} style={{ backgroundColor: '#141414', borderRadius: 20, padding: 14 }}>
            <Text style={{ fontWeight: '700', color: C.mintInk }}>Order queued · signed on this phone</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.ink2 }}>{tap.digest}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* notch chips over the top edge */}
      <View style={{ position: 'absolute', top: 0, right: 0, flexDirection: 'row', gap: 8, backgroundColor: C.bg, paddingLeft: 8, paddingBottom: 8, borderBottomLeftRadius: 22 }}>
        <View style={{ height: 40, width: 46, borderRadius: 16, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}><Bell /></View>
        <View style={{ height: 40, borderRadius: 16, backgroundColor: live ? C.tint : C.surface3, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }}>
          {live ? <Clock /> : null}
          <Text style={{ fontWeight: '600', fontSize: 16, color: live ? C.tintInk : C.ink2 }}>{live ? fmtLeft(left) : settled ? 'Settled' : 'Closed'}</Text>
        </View>
      </View>
    </View>
  );
}
