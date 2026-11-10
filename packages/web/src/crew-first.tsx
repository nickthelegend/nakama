import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import type { N, Room } from './state';
import { callTitle, TapButton } from './parts';
import { Ic, TokenLogo } from './ui';

export const inviteUrl = (id: string) => `${location.origin}/app?crew=${id}`;

/** Share the crew: the invite link, a copy button and a QR code a friend can scan with their phone. */
export function InviteCard({ n, compact }: { n: N; compact?: boolean }) {
  const crew = n.crew;
  const [copied, setCopied] = useState(false);
  const url = crew ? inviteUrl(crew.id) : '';
  const svg = useMemo(() => {
    if (!url) return '';
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }, [url]);
  if (!crew) return null;
  const copy = () => {
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 8000);
  };
  return (
    <section className={`c3 invite3 ${compact ? 'compact' : ''}`} aria-label="Invite your crew" data-film="invite-card">
      <div className="inv-qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" data-film="invite-qr" />
      <div className="inv-main">
        <span className="k">{crew.public ? 'PUBLIC ROOM · ANYONE CAN JOIN' : 'PRIVATE CREW · INVITE OR QR ONLY'}</span>
        <h3>Invite your crew</h3>
        <p className="mini">Friends scan the code or open the link, then join with their own wallet.</p>
        <span className="inv-url mono" data-film="invite-url">{url}</span>
        <button className="b3 b3-sm" onClick={copy} data-film="invite" data-invite={url}><Ic name={copied ? 'check' : 'copy'} size={16} />{copied ? 'LINK COPIED' : 'COPY INVITE LINK'}</button>
      </div>
    </section>
  );
}

/** Start a crew: a name, public or private, one button. */
export function StartCrew({ n }: { n: N }) {
  return (
    <form className="c3 start3" id="start" onSubmit={(e) => { e.preventDefault(); if (n.name.trim()) n.create(); }} data-film="start">
      <span className="k">STEP 1 · START A CREW</span>
      <h3>Name your crew</h3>
      <div className="pill">
        <input value={n.name} onChange={(e) => n.setName(e.target.value)} placeholder="e.g. Night Owls" aria-label="Crew name" maxLength={40} data-film="crew-name" />
        <button className="b3 b3-sm" disabled={n.busy || !n.name.trim()} data-film="start-crew">START</button>
      </div>
      <div className="vis" role="radiogroup" aria-label="Who can join">
        <button type="button" aria-pressed={n.isPublic} onClick={() => n.setIsPublic(true)} data-film="vis-public"><b>Public room</b><small>Listed in Rooms; anyone can join</small></button>
        <button type="button" aria-pressed={!n.isPublic} onClick={() => n.setIsPublic(false)} data-film="vis-private"><b>Private crew</b><small>Only your invite link or QR</small></button>
      </div>
      <p className="fine">{n.account ? 'Your wallet is connected.' : n.viewingAs ? 'No wallet: this becomes a read-only preview crew.' : 'Connect a wallet first (top right), or look around read-only.'}</p>
    </form>
  );
}

/** Public rooms you can open and join: members, and the live call if there is one. */
export function Rooms({ n }: { n: N }) {
  const rooms = n.rooms;
  return (
    <section className="c3 rooms3" id="rooms" aria-label="Public rooms" data-film="rooms">
      <div className="sec-head"><div><span className="k">PUBLIC ROOMS · LIVE</span><h2>Rooms</h2></div><img className="sec-ic" src="/art/v2/nakama-icon-megaphone.webp" alt="" /></div>
      {!rooms ? <div className="skeleton" style={{ height: 90 }} />
        : rooms.length === 0 ? <p className="mini">No public rooms yet. Start one, and it shows up here.</p>
        : (
          <div className="room-list">
            {rooms.map((r) => <RoomRow key={r.id} n={n} r={r} />)}
          </div>
        )}
    </section>
  );
}

function RoomRow({ n, r }: { n: N; r: Room }) {
  const here = n.crew?.id === r.id;
  return (
    <button className={`room-row ${r.live ? 'is-live' : ''} ${here ? 'here' : ''}`} onClick={() => n.openCrew(r.id)} data-film="room-row">
      <img className="rr-av" src="/art/v2/nakama-mascot.webp" alt="" />
      <span className="rr-main">
        <b>{r.name}</b>
        <small>{r.members} member{r.members === 1 ? '' : 's'} · {r.calls} call{r.calls === 1 ? '' : 's'}{r.readOnlyDemo ? ' · preview' : ''}</small>
      </span>
      {r.live ? (
        <span className="rr-live"><TokenLogo sym="BTC" size={18} />{callTitle({ setup: { direction: r.live.direction, cadence: r.live.cadence, move60s: null, move5m: null }, strike: r.live.strike, upper: r.live.upper ?? undefined }).replace('BTC ', '')}<i className="mono">{n.clock(r.live.expiryMs)}</i></span>
      ) : <span className="rr-idle">no live call</span>}
      <span className="rr-go">{here ? 'OPEN' : 'JOIN'}</span>
    </button>
  );
}

export { TapButton };
