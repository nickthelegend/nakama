# Nakama 仲間

Your crew's live BTC calls, one tap to join. Crew and member records are recalled from Walrus Memory. Each member signs their own DeepBook Predict queued order in their Sui wallet.

## Demo signer (recording only)

For the recorded headless mainnet demo, set `DEMO_SIGNER=I_UNDERSTAND_SERVER_HOLDS_KEYS` and put Sui `suiprivkey…` strings in `DEMO_MEMBER_A_KEY` and `DEMO_MEMBER_B_KEY` in this repo's gitignored `.env`. The wallet picker then offers **Demo signer (server-held key)** for the two members. A persistent badge identifies the connected wallet as a server-held demo key using real mainnet funds.

This is a custodial demo wallet: the server holds both keys, and each account is funded with a small amount from the hub. It is off by default. The server signs only its own prepared transaction bytes for the matching member within 60 seconds; preview crews cannot sign, and `/execute` still requires the existing mainnet write gate. Never use these demo keys as personal wallets or expose this server to untrusted clients during recording.

## Run

```sh
pnpm install
cp .env.example .env
# Fill credentials in .env, then:
pnpm dev
```

Open <http://localhost:5173>. Set `NAKAMA_PORT` and `NAKAMA_VITE_PORT` to use other ports; Vite proxies `/api` to the matching server port. Create a crew, copy the invite URL, connect each member's Sui wallet and join. A member posts a call on one of the live BTC/USD 1m or 5m markets. The card shows a countdown, who joined, similar crew results and recalled Walrus blob links. A member presses the join button to get a Predict quote and transaction simulation. With `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`, the wallet signs and the server sends the signed transaction through Tatum. Without that exact value, the flow ends after simulation and clearly says dry-run only. A funded Predict account is required for an accepted enqueue; native USDC in a wallet alone is insufficient.

Predict admits a new one-sided bet only while its win probability is inside the 15–50% entry band. `GET /odds` and `GET /calls/:id/odds` read the live pricer for a strike. The composer shows the odds under the strike and disables **Post** outside the band, and `POST /crews/:id/calls` refuses such calls. The live call card polls its odds every 8 seconds, draws the band, and shows **Entry closed** once the strike drifts out, before anyone taps into a refusal.

The server stores crew state in gitignored `data/crews.json`. It writes membership, settled calls, member results and a playbook after every five settled calls to Walrus Memory mainnet. Crew and member namespaces are `nakama-v1:crew:<crewId>` and `nakama-v1:member:<address>`. Writes run at most 30 per minute; the wrapper backs off on 429. Calls have a setup record, and the composer pre-fills from a recalled hot setup. The crew recap asks OpenRouter to summarize recalled memory only.

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

Art generated with ChatGPT (image generation), directed in [docs/ART.md](docs/ART.md); source PNGs stay out of git and the web app ships WebP copies in `packages/web/public/art/`.
