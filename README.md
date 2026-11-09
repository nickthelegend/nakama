# Nakama 仲間

Your crew's live BTC calls, one tap to join. Crew and member records are recalled from Walrus Memory. Each member signs their own DeepBook Predict queued order in their Sui wallet.

## Run

```sh
pnpm install
cp .env.example .env
# Fill credentials in .env, then:
pnpm dev
```

Open <http://localhost:5173>. Create a crew, copy the invite URL, connect each member's Sui wallet and join. A member posts a call on one of the live BTC/USD 1m or 5m markets. The card shows a countdown, who joined, similar crew results and recalled Walrus blob links. A member presses the join button to get a Predict quote and transaction simulation. With `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`, the wallet signs and the server sends the signed transaction through Tatum. Without that exact value, the flow ends after simulation and clearly says dry-run only. A funded Predict account is required for an accepted enqueue; native USDC in a wallet alone is insufficient.

The server stores crew state in gitignored `data/crews.json`. It writes membership, settled calls, member results and a playbook after every five settled calls to Walrus Memory mainnet. Crew and member namespaces are `nakama-v1:crew:<crewId>` and `nakama-v1:member:<address>`. Writes run at most 30 per minute; the wrapper backs off on 429. Calls have a setup record, and the composer pre-fills from a recalled hot setup. The crew recap asks OpenRouter to summarize recalled memory only.

## API

- `POST /crews` `{name}`; `POST /crews/:id/join` `{address}`; `GET /crews/:id`.
- `GET /crews/:id/composer` and `POST /crews/:id/calls` `{caller,marketId,direction,strike,upper?,why}`.
- `GET /calls/:id/suggestion?address=...` and `POST /calls/:id/plan` `{address,size?}` for a quote and dry-run.
- In live mode, the wallet signs the prepared transaction, then `POST /execute` submits its signed bytes and signature; `POST /calls/:id/orders` `{address,digest}` verifies it through Tatum and registers it.
- `GET /events` streams state notifications; `GET /markets` and `GET /status` expose live state and setup.

The server holds no member private keys. The browser wallet client routes its chain RPC through the server's Tatum proxy so the API key remains server side. `NAKAMA_DEV_SUI_RPC` enables a visible development override when Tatum is absent. Default chain access fails closed with `Setup required: TATUM_API_KEY`.

## Source credit

The Tatum-backed Sui client, Predict market and plan helpers, and Walrus Memory wrapper were adapted from `../eidolon/packages/core` in this workspace. Nakama adds crew and member memory schemas (`NAKAMA_V1`), sizing, streaks, and the collaborative flow. DeepBook Predict uses `@mysten/deepbook-v3/predict` 2.8.1 with `getConfig('mainnet')`, `planMint`, `enqueuePlan`, and `waitForOutcome`.

## Art

Art generated with ChatGPT (image generation), directed in [docs/ART.md](docs/ART.md); source PNGs stay out of git and the web app ships WebP copies in `packages/web/public/art/`.
