import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Body, Card, Chip, ErrorNote, Kicker, Mono, Pill, useBusy } from './ui';
import { api, dirWord, pct, usd } from '../lib/api';
import { balances, type Balances } from '../lib/sui';
import { signTransactionBytes } from '../lib/wallet';
import { C, F, art, short } from '../lib/theme';
import type { Call, Odds, PlanResult } from '../lib/types';

type Tap =
  | { kind: 'fund'; dry: string; wallet: Balances | null; debit: number | null }
  | { kind: 'dry'; debit: number; fee: number; payout?: number; mode: string; rpc?: string }
  | { kind: 'sent'; digest: string }
  | { kind: 'refused'; reason: string };

const TAP = 2;

export function CallCard({ call, me, member, onChanged }: { call: Call; me: string; member: boolean; onChanged: () => void }) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [odds, setOdds] = useState<Odds | null>(null);
  const [tap, setTap] = useState<Tap | null>(null);
  const { busy, error, run } = useBusy();
  const live = call.status === 'live' && call.expiryMs > now;
  const left = Math.max(0, Math.round((call.expiryMs - now) / 1000));
  const mine = call.orders.some((o) => o.address.toLowerCase() === me.toLowerCase());

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    let alive = true;
    const pull = () => api<Odds>(`/calls/${call.id}/odds`).then((o) => alive && setOdds(o)).catch(() => {});
    pull();
    const o = setInterval(pull, 8000);
    return () => { alive = false; clearInterval(t); clearInterval(o); };
  }, [call.id, live]);

  const tapIn = () =>
    run(async () => {
      setTap(null);
      const p = await api<PlanResult>(`/calls/${call.id}/plan`, { address: me, size: TAP }, 60000);
      if (!p.quote.accepting) return setTap({ kind: 'refused', reason: p.quote.refusal ?? 'Predict refused this tap' });
      if (p.dryRun?.status !== 'success') {
        const wallet = await balances(me).catch(() => null);
        return setTap({ kind: 'fund', dry: p.dryRun?.error || `Dry-run ${p.dryRun?.status ?? 'unavailable'}`, wallet, debit: p.quote.totalDebit });
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

  const side = call.setup.direction;
  const band = odds && odds.probability != null ? odds : null;
  return (
    <Card face={live ? C.plum : C.panel} edge={live ? '#22102b' : C.edge} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={side === 'down' ? art.anchor : art.rocket} style={{ width: 44, height: 44 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: live ? C.butter : C.coralInk }}>
            {live ? `LIVE CALL · ${call.setup.cadence}M MARKET` : call.status === 'settled' ? 'SETTLED' : 'CLOSED'}
          </Text>
          <Text style={{ fontFamily: F.display, fontSize: 21, lineHeight: 24, color: live ? '#fff' : C.plum }}>
            BTC {dirWord(side)} {usd(call.strike)}{call.upper ? `–${usd(call.upper)}` : ''}
          </Text>
        </View>
        {live ? (
          <View style={{ alignItems: 'center', backgroundColor: C.butter, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: C.plum2 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: live ? '#f3e9f7' : C.ink2 }}>“{call.why}” · {short(call.caller)}</Text>

      {live && band ? (
        <View style={{ gap: 6 }}>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: `${band.band.min * 100}%`, width: `${(band.band.max - band.band.min) * 100}%`, top: 0, bottom: 0, backgroundColor: 'rgba(61,220,151,0.35)' }} />
            <View style={{ position: 'absolute', left: `${Math.min(99, band.probability! * 100)}%`, width: 4, top: 0, bottom: 0, backgroundColor: band.inBand ? C.mint : C.pink }} />
          </View>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: '#e7d8ef' }}>
            Predict odds {pct(band.probability!)}% · entry band {band.band.min * 100}–{band.band.max * 100}% {band.inBand ? '· open' : '· entry closed'}
          </Text>
        </View>
      ) : live ? (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: '#cdb9d8' }}>Reading live Predict odds…</Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip text={`${call.orders.length} tapped in`} tone="butter" />
        {call.orders.map((o) => (
          <Chip key={o.digest} text={`${short(o.address)} · ${o.size} USDC${o.hit === true ? ' · won' : o.hit === false ? ' · lost' : ''}`} tone={o.hit ? 'mint' : 'plum'} />
        ))}
      </View>

      {live && member && !mine ? (
        <Pill title={`Tap in · ${TAP} USDC`} size="xl" icon={art.coin} busy={busy} disabled={band ? !band.inBand : false} onPress={tapIn} />
      ) : null}
      {live && !member ? <Body style={{ color: '#e7d8ef' }}>Join the crew to tap in.</Body> : null}
      {mine ? <Chip text="You're in" tone="mint" /> : null}
      {error ? <ErrorNote text={error} /> : null}

      {tap?.kind === 'fund' ? (
        <Card face={C.butterSoft} edge={C.butterEdge} style={{ gap: 6 }}>
          <Kicker>Fund your wallet first</Kicker>
          <Body style={{ color: C.ink }}>
            Wallet on mainnet: {tap.wallet ? `${tap.wallet.usdc.toFixed(2)} USDC · ${tap.wallet.sui.toFixed(3)} SUI` : 'balance unavailable'}. A tap needs {tap.debit ? tap.debit.toFixed(2) : '2.00'} USDC in a Predict account plus SUI for gas.
          </Body>
          <Mono style={{ color: C.pinkInk }}>Predict dry-run: {tap.dry}</Mono>
          <Pill title="Fund my wallet" size="sm" tone="butter" onPress={() => router.navigate('/(tabs)/wallet')} />
        </Card>
      ) : null}
      {tap?.kind === 'dry' ? (
        <Card face={C.mintSoft} edge="#b6ebd2" style={{ gap: 4 }}>
          <Kicker>Dry-run success · no order submitted</Kicker>
          <Body style={{ color: C.ink }}>
            {tap.debit.toFixed(2)} USDC including {tap.fee.toFixed(2)} fee{tap.payout ? ` · pays ${tap.payout.toFixed(2)} if right` : ''}. The server is {tap.mode}, so there were no bytes for this phone to sign.
          </Body>
          {tap.rpc ? <Mono>via {tap.rpc}</Mono> : null}
        </Card>
      ) : null}
      {tap?.kind === 'refused' ? <ErrorNote text={`Predict refused: ${tap.reason}`} /> : null}
      {tap?.kind === 'sent' ? (
        <Card face={C.mintSoft} edge="#b6ebd2" style={{ gap: 4 }}>
          <Kicker>Order queued · signed on this phone</Kicker>
          <Text style={{ fontFamily: F.mono, color: C.mintInk }} onPress={() => Linking.openURL(`https://suiscan.xyz/mainnet/tx/${tap.digest}`)}>{tap.digest}</Text>
        </Card>
      ) : null}
    </Card>
  );
}
