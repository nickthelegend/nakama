# Nakama: submission form answers

Event: **Total Recall: Tatum x Walrus Memory** (https://recall-tatum-walrus.vercel.app). Deadline **Nov 10 2026 17:00 UTC** (22:30 IST).

Every answer below describes what runs today. Anything that has not happened on mainnet yet is marked **PENDING**, with what unblocks it.

## Project name

Nakama (仲間, Japanese for "crew" or "companions")

## Track

03 Consumer Finance Apps

## One-liner

A friendly crew wallet: start a crew, invite friends by link or QR, and when someone calls a short BTC move on DeepBook Predict, each friend taps in with 2 USDC from their own wallet. The crew remembers what worked on Walrus Memory.

## Description

Nakama is a friendly crew wallet for a small group of friends who make short Bitcoin calls together. BTC is DeepBook Predict's only underlying, so every call is a 1-minute or 5-minute BTC up/down market.

**Crew first.** You create a public or private crew, invite friends by link or QR code, or browse the public rooms lobby. One member posts a call, for example "BTC above $73,766 in the next 5 minutes". The call card shows a countdown, the live odds and who has tapped in. Each friend taps in with 2 USDC from their own wallet, and their own wallet signs their own Predict order, so nobody holds anyone else's funds.

Nakama checks Predict's live odds before a call goes up. Predict only accepts a new one-sided bet while its win probability is between 15% and 50%. The composer disables Post outside that band, the server refuses such calls too, and the call card re-reads the odds every 8 seconds and switches to "Entry closed" when the price drifts out.

After the market settles, Nakama writes the outcome to Walrus Memory: the call, each member's result, and every five calls a crew playbook. Next time a similar setup comes up, it recalls the crew's record and the member's own record to suggest a stake, flag cold setups and pre-fill the composer. Claude Haiku (`claude-haiku-5-5`) writes the crew recap from the recalled facts only.

**The phone app** (`packages/mobile`, Expo) creates its own Sui wallet in secure storage, shows a deposit QR, joins a crew by live QR, a QR in a photo or a pasted invite, opens a full-screen crew room, and notifies you when a crewmate calls.

**Status today.**
- **Web live in dry-run** at https://nakama.201-18-198-162.sslip.io and https://nakama-two-weld.vercel.app: live mainnet markets, odds, quotes and dry-runs through Tatum, and Walrus Memory writes on. The server never signs or sends a Sui transaction.
- **Android APK** at https://nakama.201-18-198-162.sslip.io/download/nakama.apk: a debug-signed sideload, **not yet installed on a device**.
- **On a LOCAL FORK of Sui mainnet** (no real funds): the web write path (fund, join, verify) and a tap **signed on the phone** (deposit `GZXecpbAynjKE8yDYhM2fcM4GkpSPctWzNorp73c2uMg`, tap `93zriKw1QZCJvkuurmZiHUHgYP5xYkW5GVEXGRyU3co7`). These digests are fork-only, not on Suiscan.
- **Walrus Memory is live on mainnet:** 15 memories from crew `aa3e80a3` ("Public desk"), plus the hosted "Night Owls" crew's membership blobs.
- **PENDING:** any signed crew round on mainnet with real funds. None has been sent.

## How it uses Walrus Memory

Nakama uses `@mysten-incubation/memwal` against the mainnet relayer `https://relayer.memory.walrus.xyz`, with two namespaces:

- **Crew memory, `nakama-v1:crew:<crewId>`:**
  - a `membership` record when someone joins;
  - a `call` record when a call settles: the setup (1m or 5m market, direction, strike distance, the previous minute's move, hour UTC), the caller's reason, whether it hit, and each joiner's size, P&L and fill digest;
  - a `playbook` record every five settled calls, ranking the crew's best and worst setups by win rate.
- **Member records, `nakama-v1:member:<address>`:** one `result` per settled order (size, hit, P&L).

**Recall.** When a call is posted or a member taps, Nakama recalls up to 40 memories with a query built from the current setup. It uses them to:

- show the crew's record for similar setups, with links to the recalled Walrus blobs;
- mark a setup **cold** after 3 or more similar calls with under 40% wins;
- suggest a stake: the member's average size × a confidence factor from their hit rate, × 1.5 on a crew win streak of 3 or more, between 2 and 10 USDC;
- pre-fill the composer from the crew's best-performing setup (at least 2 calls);
- write a crew recap with Claude Haiku (`claude-haiku-5-5`, cached per crew and call), which is told to use only the recalled facts. OpenRouter is the fallback without an Anthropic key.

Writes are capped at 30 a minute and back off on HTTP 429. Mainnet blobs took over 60 s to certify, so each write waits up to 300 s.

**Live on mainnet (Nov 9):** 15 memories in `nakama-v1:crew:aa3e80a3` (3) and three `nakama-v1:member:<address>` namespaces (7, 4 and 1). They were counted with `packages/core/scripts/walrus-count.ts` against the relayer's namespace list.

**Hosted crew (Nov 10):** the hosted server writes a membership memory when someone joins a crew. The public crew "Night Owls" (`e8175e6a`, 2 members) has its membership blobs on Walrus mainnet, for example [`uZZrsaNEiVnXIkFyNjjSzOUfDUcSz6NKM0OBnfJIr5s`](https://walruscan.com/mainnet/blob/uZZrsaNEiVnXIkFyNjjSzOUfDUcSz6NKM0OBnfJIr5s) and [`bPSbylWd_GYS54oYAcYlAihx24xMMQALY8GOAeILwOc`](https://walruscan.com/mainnet/blob/bPSbylWd_GYS54oYAcYlAihx24xMMQALY8GOAeILwOc). Settled calls, results and playbooks from a real-funds round are **PENDING** with that round.

## How it uses Tatum

The server's chain client uses **Tatum's native Sui gRPC gateway** (`sui-mainnet-grpc.gateway.tatum.io:443`). The API key stays on the server. Sui JSON-RPC is deprecated, so Nakama doesn't use it.

- **Reads through Tatum:** reference gas price, objects and Predict market state, and `getTransaction` to verify a member's enqueue receipt before Nakama registers the order (`POST /calls/:id/orders`).
- **Transactions through Tatum:** `SimulateTransaction` for the one-tap quote and dry-run, and `ExecuteTransaction` to send the member's signed bytes (`POST /execute`, live only with `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`).
- Tatum's free plan allows 3 requests a second, so one process-wide limiter spaces calls 400 ms apart and retries 429s with backoff.
- **Exception:** Tatum's gateway refuses `LedgerService/ListEvents` (`PERMISSION_DENIED`). Event scans for member history and the fill/settlement watcher therefore use the public Sui fullnode over gRPC, and the code labels that source.

**Verified on Nov 9 2026:** through Tatum, `getReferenceGasPrice` returned 100, and `getTransaction` returned a historical Predict transaction that Nakama decoded into a queued fill. In that first smoke test, simulation through Tatum returned HTTP 429; the rate limiter was added afterwards.

**Hosted, Nov 10:** the VPS server answers `/status` with `rpc: "Tatum"` and `mainnetWrites: false`, and `/markets` returned live BTC markets through it (checked 14:20 UTC).

**PENDING:** sending a signed transaction through Tatum has not been exercised on mainnet.

## Tech stack

- TypeScript pnpm monorepo: `packages/core` (chain client, Predict helpers, memory policy, history decoder), `packages/server` (Node HTTP API, watcher, demo signer), `packages/web` (React 19 + Vite).
- Sui: `@mysten/sui` 2.37 gRPC client, `@mysten/deepbook-v3/predict` 2.8.1 (`planMint`, `enqueuePlan`, `waitForOutcome`), `@mysten/dapp-kit-react` wallet connection.
- Tatum Sui gRPC gateway (`@grpc/grpc-js`, `@protobuf-ts/grpc-transport`).
- Walrus Memory: `@mysten-incubation/memwal`, mainnet relayer.
- Crew recap: Claude Haiku (`claude-haiku-5-5`) when `ANTHROPIC_API_KEY` is set (`a6a4b8c`); OpenRouter fallback.
- Mobile: `packages/mobile`, Expo SDK 58 (`expo-secure-store` wallet, `expo-camera` and `expo-image-picker` QR join, local notifications).
- Deploy: Docker image behind nginx and Traefik on a VPS with dry-run flags forced off; static web build on Vercel.
- Tests: `pnpm test` 7/7 (core 5: memory policy, plus trade decoding from saved real mainnet queue-event payloads; server 2; run Nov 10); `pnpm test:live` reads live mainnet. See [TESTING.md](TESTING.md).

## Repository

https://github.com/nickthelegend/nakama (secret scan passed Nov 10; Nick approved making it public. **Still private as of Nov 10, 14:20 UTC**: flip to public before submitting).

## Demo video

- Web film: `videos/nakama/nakama-film-v6.mp4` (3:12, grokbot workspace). Link: **Nick fills** (Drive).
- Phone film: `videos/nakama/mobile/nakama-ios.mp4` (1:27), the Expo app in the iOS Simulator. Link: **Nick fills** (Drive).

## Tatum account ID

`6af1b0a07614eea902da0ee6` (Nick's Tatum account, given Nov 10).

## MEMWAL_AGENT_ID

`326be0c1ae3b463eb9eed08e2fd3e3092966a2db297be77810e2229769a1dc46`

This is the public half of Nakama's own Walrus Memory delegate key (the form asks for the agent's delegate public key; the dashboard at memory.walrus.xyz lists it under Delegate keys).

Account ID (SUI): `0xd2ca3cbe1bd663a5fe7df7c14590451bbc712255cfee59966b0b8413cdaa335a`. This is the Walrus Memory account ID. The code reads it as `MEMWAL_MAINNET_ACCOUNT_ID`. It is public and on chain: the relayer's `GET /config` gives package `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`, and its `account::DelegateKeyAdded` events list Nakama's delegate key (label "3") under this account. The owner is `0x0cff6ac3b0396c3b449de58472dcf9cfd55f0bb2aefaca92c43315de128c7e93`. One account serves Nakama, Eidolon and Yojimbo, and each app signs with its own delegate key.

## Team

Nivesh Gajengi (Nick), GitHub `nickthelegend`. Solo entry.

## Blog post

https://github.com/nickthelegend/nakama/blob/main/docs/BLOG.md

## Social post (bonus)

Drafts in [POST.md](POST.md). **PENDING:** Nick posts on X and/or LinkedIn.

## AI and tool disclosure

- **Claude (Anthropic):** planning, code review, UI and styling, documentation, film edit and copy.
- **Codex (OpenAI):** wrote much of the TypeScript from reviewed briefs.
- **ChatGPT image generation:** the crew art, stickers, onboarding slides, title card and social images (prompts in [docs/ART.md](docs/ART.md)).
- **Chatterbox:** the synthetic voiceover in the film.
- **In the product:** Claude Haiku (`claude-haiku-5-5`) writes the crew recap from recalled Walrus facts only. It never places or sizes a bet.
- The films show the real app; program output is not edited. Fork scenes are labelled LOCAL FORK.
