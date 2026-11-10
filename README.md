# Nakama 仲間

**Make small Bitcoin calls with your friends, as a crew.** One friend posts a call ("BTC above $73,766 in 5 minutes"), and everyone else joins with one tap. Each person signs their own small bet from their own wallet, so nobody holds anyone else's money. After each round, the crew's results go into Walrus Memory, and next time Nakama recalls what worked for this crew to suggest a stake and warn about setups that keep losing. (Market reads and dry-runs are live on mainnet today. **Walrus Memory is live with 15 Nakama memories on mainnet**: a crew of three public Predict traders, their joins and their settled trades. Real signed rounds are **PENDING** the funded mainnet run, see the status table.)

Built for **Total Recall (Tatum x Walrus Memory)**, track **03 Consumer Finance Apps**, on Sui mainnet with DeepBook Predict. Submission answers: [HACKATHON_SUBMISSION_FORM.md](HACKATHON_SUBMISSION_FORM.md). Blog post: [docs/BLOG.md](docs/BLOG.md).

## Status: live today vs pending keys

| Piece | Today | What unblocks it |
|---|---|---|
| Live BTC markets, odds and the 15–50% entry-band check | **Live** on Sui mainnet | – |
| One-tap quote and transaction dry-run | **Live** on mainnet, through the public fullnode (UI badge "dev RPC (not Tatum)") | Re-check through Tatum with the new rate limiter; the first Tatum smoke test got HTTP 429 on simulation |
| Tatum gRPC reads | **Verified Nov 9**: gas price, plus `getTransaction` decoded into a Predict fill | – |
| Member history from on-chain fills and payouts | **Live** (event scans use the public fullnode, because Tatum's gateway refuses `ListEvents`) | – |
| Funding a Predict account, joining a call with a real queued order, verifying the receipt | **LOCAL FORK only** ([docs/FORK.md](docs/FORK.md)) | **PENDING:** hub funding (40 USDC + 2.5 SUI to `0xf5887bcf…1f11`). One signed crew round on mainnet needs about 6 USDC + 0.6 SUI of it for the two demo members, who are unfunded today |
| Fills, settlement and payouts recorded by the watcher | **Not proven anywhere.** The fork has no Predict keeper and a frozen clock | **PENDING:** a real mainnet round that the keeper fills and the market settles |
| Sending a signed transaction through Tatum | **Not exercised** | **PENDING:** the same mainnet round |
| Walrus Memory writes and recall | **Live: 15 memories on mainnet** (Nov 9). Crew `aa3e80a3` ("Public desk"): 3 memberships, plus 12 settled Predict trades of its three public members written as their result memories (`POST /crews/:id/remember-history`). Counted with `packages/core/scripts/walrus-count.ts` | The funded run adds a real crew's joins, call, results and playbook. Memories are written when members join and when calls settle |
| LLM crew recap | Built, off without a key | `OPENROUTER_API_KEY` |
| Public repo and film link | **PENDING** | Secret scan and Nick's yes; film upload |
| Tatum account ID (form), published blog and post | **PENDING** | Nick |

## Try it

You need Node.js and pnpm 10. The read-only walkthrough needs no keys and no wallet.

```sh
pnpm install
cp .env.example .env
# Read-only, no keys: point the server at the public Sui fullnode (shown in the UI as "dev RPC (not Tatum)")
NAKAMA_DEV_SUI_RPC=https://fullnode.mainnet.sui.io:443 pnpm dev
# With Tatum: set TATUM_API_KEY in .env instead and run pnpm dev
```

1. Open `http://localhost:5173/?as=0xa9eb57bfae500797f04c9802d468c34151e60a29470464f9f9d13b322275c79c&as=0x96ed1d73783b195ea2b9bcf9447c9a871b326ea41271f9dd3113b4dee62eccd2`. These are two public Predict traders from [docs/DEMO-ADDRESSES.md](docs/DEMO-ADDRESSES.md), not our wallets. The browser never signs in this mode.
2. Create a crew (it's labelled **preview crew**). Join as the first address, switch to the second and join again.
3. Post a call on a live BTC 1m or 5m market. Type a far strike to see the composer refuse it (outside the 15–50% band), then a near one.
4. Tap in as each member. You get a real mainnet quote and dry-run: "Dry-run success … 2.00 USDC including 0.02 fee. No order submitted."
5. Scroll to the crew board. Each member's record is decoded from their on-chain Predict fills and payouts, labelled **from on-chain history**.

Live signing needs `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`, a member wallet with a funded Predict account, and `TATUM_API_KEY`. See [Run](#run). The mainnet run plan (funding, order sizes, returning funds) is in the build workspace's `MAINNET-RUNBOOK.md`, outside this repo.

## Proof

**Sui mainnet: reads and dry-runs only.** Nakama has sent no transaction on mainnet.

| What | Result | Where |
|---|---|---|
| Tatum gRPC `getReferenceGasPrice` | 100 | [TESTING.md](TESTING.md), Nov 9 |
| Tatum gRPC `getTransaction` | A historical Predict transaction, decoded into one queued fill | [TESTING.md](TESTING.md), Nov 9 |
| `pnpm test:live` (public fullnode) | 3 active BTC markets, a 2 USDC quote, 7 recent trades decoded with fill and payout digests | [TESTING.md](TESTING.md) |
| UI walkthrough, two members | 2 × "Dry-run success", 2.00 USDC debit, 0.02 USDC fee, no order submitted | [TESTING.md](TESTING.md); raw take `videos/round2/nakama-raw.mp4` |
| Entry-band check | 25.9% (in band) for a near strike, 0.005% (out) for a far one; a $76,000 strike was refused | [TESTING.md](TESTING.md) |
| Decoded public fills (other traders' trades, read by Nakama) | [HdAZr7bC…8fPp](https://suiscan.xyz/mainnet/tx/HdAZr7bCEQyuaaq4eFBU29ad1V6BWuZPYSxhRTGt8fPp), [BNFnd7fh…LGB](https://suiscan.xyz/mainnet/tx/BNFnd7fhctRdqLDUzNTXcpfpeMFBfdqkJuj2oe2yBLGB), [GVwMyPLY…mYVC](https://suiscan.xyz/mainnet/tx/GVwMyPLY8kFGz6oUmmTVmuA3b3VCgrXcpGLbNGPxmYVC) | [docs/DEMO-ADDRESSES.md](docs/DEMO-ADDRESSES.md) |
| Walrus Memory blobs | **15 on mainnet** (Nov 9, 22:45 UTC): `nakama-v1:crew:aa3e80a3` 3, `nakama-v1:member:0x7c925046…486e` 7, `nakama-v1:member:0xa4134442…abfd` 4, `nakama-v1:member:0x4ed0d81b…e528` 1 | Walrus mainnet relayer |

**Walrus Memory on mainnet: live, 15 memories.**

| What | Result |
|---|---|
| Account ID (public, on chain) | `0xd2ca3cbe1bd663a5fe7df7c14590451bbc712255cfee59966b0b8413cdaa335a`, owner `0x0cff6ac3b0396c3b449de58472dcf9cfd55f0bb2aefaca92c43315de128c7e93` |
| How it was found | On chain, not from a dashboard. The relayer's `GET https://relayer.memory.walrus.xyz/config` gives package `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`. Its `account::DelegateKeyAdded` events list Nakama's delegate key (label "3") under that account |
| Delegate key | Nakama signs with its own delegate key. `POST /api/stats` on the mainnet relayer returned the owner above |
| Memories stored | **0.** They need the funded mainnet run |
| Write wait | Mainnet blobs took over 60 s to certify, so each write now waits up to 300 s (`872371c`) |

**LOCAL FORK of Sui mainnet (checkpoint 343353046): fork-only digests.** These exist only on a local fork. They are **not on Suiscan** and moved no real funds. They show that the write path executes real Move code.

| Step (LOCAL FORK) | Digest (LOCAL FORK only) |
|---|---|
| Member A: create Predict account and deposit 3 USDC via `/fund` → `/execute` | `JD3F22K55KwzYXCvpvAXhALAuaFG1YwkBMkjFiCheHe5` |
| Member B: same | `FX9XvNkePjk74N7wLeg8LArqNfbryvpGaecnpHGdwt7j` |
| Member A joins the call for 2 USDC; `/orders` verified it | `x8aX5UYfHud5rbE6VTWRggnBTucBn6MppEPTYcEjhYB` |
| Member B joins the call for 2 USDC; `/orders` verified it | `YBwMh1mxQQbtTnP3YxZG5hxfixfKCHdrcU5J6j5F3iX` |

The fork could not show fills, settlement, payouts, Walrus writes or sending through Tatum. The full table and its limits are in [docs/FORK.md](docs/FORK.md).

## Film

`videos/nakama/nakama-film-v2.mp4`, in the grokbot workspace and **not public yet** (PENDING upload). It shows real mainnet reads and dry-runs with two public addresses in a labelled read-only preview crew. Nothing is signed or sent, and the recording shows "dev RPC (not Tatum)" and "Setup required" for Walrus Memory.

## How it works (technical)

Your crew's live BTC calls, one tap to join. Crew and member records are recalled from Walrus Memory. Its delegate key is set and authenticates, and 15 memories are stored on mainnet (see the status table). Each member signs their own DeepBook Predict queued order in their Sui wallet.

## Demo signer (recording only)

For the recorded headless mainnet demo, set `DEMO_SIGNER=I_UNDERSTAND_SERVER_HOLDS_KEYS` and put Sui `suiprivkey…` strings in `DEMO_MEMBER_A_KEY` and `DEMO_MEMBER_B_KEY` in this repo's gitignored `.env`. The wallet picker then offers **Demo signer (server-held key)** for the two members. A persistent badge identifies the connected wallet as a server-held demo key using real mainnet funds.

This is a custodial demo wallet: the server holds both keys, and each account is funded with a small amount from the hub. It is off by default. The server signs only its own prepared transaction bytes for the matching member within 60 seconds; preview crews cannot sign, and `/execute` still requires the existing mainnet write gate. Never use these demo keys as personal wallets or expose this server to untrusted clients during recording.

The mainnet demo members exist: A `0xff89f27517a58d07c7ac4fb61b67188b4d120575f8165d52d66c8e84a3672ed2` and B `0x77cac45835174e0cdbb4f361e3e007dfb1704a8840a15c3f48a6ff1a9aba13d4`. Both are unfunded until the hub is funded (see [BLOCKED.md](BLOCKED.md)).

## Run

```sh
pnpm install
cp .env.example .env
# Fill credentials in .env, then:
pnpm dev
```

Open <http://localhost:5173>: the landing page is `/`, the lobby `/app`, the crew room `/room` and the scoreboard `/board` (invite links `/?crew=<id>` open the lobby). Set `NAKAMA_PORT` and `NAKAMA_VITE_PORT` to use other ports; Vite proxies `/api` to the matching server port. Create a crew, copy the invite URL, connect each member's Sui wallet and join. A member posts a call on one of the live BTC/USD 1m or 5m markets. The card shows a countdown, who joined, similar crew results and recalled Walrus blob links. A member presses the join button to get a Predict quote and transaction simulation. With `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`, the wallet signs and the server sends the signed transaction through Tatum. Without that exact value, the flow ends after simulation and clearly says dry-run only. A funded Predict account is required for an accepted enqueue; native USDC in a wallet alone is insufficient.

Predict admits a new one-sided bet only while its win probability is inside the 15–50% entry band. `GET /odds` and `GET /calls/:id/odds` read the live pricer for a strike. The composer shows the odds under the strike and disables **Post** outside the band, and `POST /crews/:id/calls` refuses such calls. The live call card polls its odds every 8 seconds, draws the band, and shows **Entry closed** once the strike drifts out, before anyone taps into a refusal.

The server stores crew state in gitignored `data/crews.json`. It writes membership, settled calls, member results and a playbook after every five settled calls to Walrus Memory mainnet. Each write waits up to 300 s, because mainnet blobs took over 60 s to certify. Crew and member namespaces are `nakama-v1:crew:<crewId>` and `nakama-v1:member:<address>`. Writes run at most 30 per minute; the wrapper backs off on 429. Calls have a setup record, and the composer pre-fills from a recalled hot setup. The crew recap asks OpenRouter to summarize recalled memory only.

## API

- `POST /crews` `{name}`; `POST /crews/:id/join` `{address}`; `GET /crews/:id`.
- `GET /crews/:id/composer` and `POST /crews/:id/calls` `{caller,marketId,direction,strike,upper?,why}`.
- `GET /calls/:id/suggestion?address=...` and `POST /calls/:id/plan` `{address,size?}` for a quote and dry-run.
- In live mode, the wallet signs the prepared transaction, then `POST /execute` submits its signed bytes and signature; `POST /calls/:id/orders` `{address,digest}` verifies it through Tatum and registers it.
- `GET /members/:address/history` scans recent mainnet Predict queue fills and settlement payouts and returns decoded trades, transaction digests, and a wins/calls/streak record. The response includes scan counts and `complete`; `complete: false` means the bounded recent-event window is not an all-time record.
- `GET /events` streams state notifications; `GET /markets` and `GET /status` expose live state and setup.

Outside the opt-in demo signer below, the server holds no member private keys. Its chain client uses Tatum's native Sui gRPC gateway with the API key kept server side; Sui JSON-RPC has been deprecated. The browser wallet client uses the public Sui gRPC-web fullnode for wallet operations. `NAKAMA_DEV_SUI_RPC` enables a visible gRPC development override when Tatum is absent. Default server chain access fails closed with `Setup required: TATUM_API_KEY`. Tatum must allow `LedgerService/ListEvents` and `TransactionExecutionService/SimulateTransaction` for history, watcher scans, markets and quotes to work; gateway permission or rate-limit errors are returned rather than treated as successful reads.

## Demo signer (recording only)

The demo signer is off by default. For a recorded mainnet session, set `DEMO_SIGNER=I_UNDERSTAND_SERVER_HOLDS_KEYS` and put `DEMO_MEMBER_A_KEY` and `DEMO_MEMBER_B_KEY` in this repo's gitignored `.env`. These are server-held Sui private keys for demo members funded with small amounts from the hub. Anyone who can access the running server's signing endpoint can ask it to sign a transaction the server recently prepared for one of those members; use it only in a controlled recording environment.

The wallet picker then offers **Demo signer (server-held key)**. While connected, a fixed badge says **Demo signer · server-held demo key · real mainnet funds** and must remain visible in the recording. `GET /demo-signer` exposes only account labels and addresses; `POST /demo-signer/sign` signs exact transaction bytes prepared for the same address in the last 60 seconds. The existing mainnet write flag, preview-crew restriction, and `/execute` checks still apply. Each Predict order starts at 2 USDC because the 0.02 USDC fee and whole-lot rounding make smaller orders fail. Unset `DEMO_SIGNER` after recording.


## Read-only walkthrough

Open `/?as=<64-hex-Sui-address>` without connecting a wallet. Repeat `as` up to four times to populate the address switcher, or paste a public address into the field. The active address can create a crew, join it, post a call and request a one-tap plan simulation. The browser never signs in this mode; a connected wallet always takes precedence. Crews created without a wallet are stored with `readOnlyDemo: true`, labelled **preview crew**, and cannot submit an order even if mainnet writes are enabled later. The server still reads real mainnet markets and simulates against real Predict account state. Use the verified public examples in [docs/DEMO-ADDRESSES.md](docs/DEMO-ADDRESSES.md); they are not Nick's wallets.

When Walrus Memory credentials are absent, the crew board displays each member's recent on-chain Predict record and example fill/payout links, labelled **from on-chain history**. When Memory is configured, the Memory-derived suggestion and record remain Memory-derived. Preview calls and joins are local crew data; they are not chain transactions. A successful dry-run remains subject to live market admission, so a moved price can require posting a fresh call.

## Source credit

The Tatum-backed Sui client, Predict market and plan helpers, and Walrus Memory wrapper were adapted from `../eidolon/packages/core` in this workspace. Nakama adds crew and member memory schemas (`NAKAMA_V1`), sizing, streaks, and the collaborative flow. DeepBook Predict uses `@mysten/deepbook-v3/predict` 2.8.1 with `getConfig('mainnet')`, `planMint`, `enqueuePlan`, and `waitForOutcome`.

## Art

Art generated with ChatGPT (image generation), directed in [docs/ART.md](docs/ART.md); source PNGs stay out of git and the web app ships WebP copies in `packages/web/public/art/`. BTC, SUI and USDC logos are from [@web3icons/core](https://github.com/0xa3k5/web3icons) (MIT), bundled into the app.

## AI and art disclosure

- **Claude (Anthropic):** planning, code review, UI and styling, documentation, film edit and copy.
- **Codex (OpenAI):** wrote much of the TypeScript from reviewed briefs.
- **ChatGPT image generation:** all crew art, stickers, onboarding slides, the title card and social images. Prompts are in [docs/ART.md](docs/ART.md).
- **Chatterbox:** the synthetic voiceover in the film.

No users, testimonials or results in this repo are invented. The two addresses in the walkthrough are public mainnet traders, labelled as such.
