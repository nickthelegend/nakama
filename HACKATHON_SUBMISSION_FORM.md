# Nakama: submission form answers

Event: **Total Recall: Tatum x Walrus Memory** (https://recall-tatum-walrus.vercel.app). Deadline **Nov 10 2026 17:00 UTC** (22:30 IST).

Every answer below describes what runs today. Anything that has not happened on mainnet yet is marked **PENDING**, with what unblocks it.

## Project name

Nakama (仲間, Japanese for "crew" or "companions")

## Track

03 Consumer Finance Apps

## One-liner

Your friends call short BTC moves, and you join with one tap. Each person signs their own small bet, and the crew remembers what worked.

## Description

Nakama is a group-chat-style app for a small crew of friends who make short-term Bitcoin calls together. One member posts a call, for example "BTC above $73,766 in the next 5 minutes, holding the 5m low". The call card shows a countdown, the live market odds and who has joined. Every other member taps once to join with their own money. Their own Sui wallet signs their own DeepBook Predict order, so nobody holds anyone else's funds.

Nakama checks Predict's live odds before a call goes up. Predict only accepts a new one-sided bet while its win probability is between 15% and 50%. The composer shows the odds for the typed strike and disables Post outside that band, and the server refuses such calls too. The call card re-reads the odds every 8 seconds and switches to "Entry closed" when the price drifts out, so no member taps into a refusal.

After the market settles, Nakama writes the outcome to Walrus Memory: the call, each member's result, and every five calls a crew playbook. The next time a similar setup comes up, it recalls the crew's record for that setup and the member's own record. It uses them to suggest a stake size, flag cold setups and pre-fill the composer with the crew's best setup.

**Status today.** Mainnet market reads, odds checks, quotes and transaction dry-runs work. The full write path (fund a Predict account, join a call with a real queued order, verify the receipt) has been proven on a **local fork of Sui mainnet** only. **PENDING:** a signed crew round on mainnet runs in the funded live run on Nov 10. The hub holds 26.28 USDC and 2.26 SUI. Each demo member gets 2.5 USDC and 0.2 SUI, and the run is `packages/server/scripts/live-run.ts`, rehearsed on the fork at those amounts. **Walrus Memory is live: 15 Nakama memories on mainnet** (Nov 9, 22:45 UTC). They come from crew `aa3e80a3` ("Public desk"): 3 membership memories, plus the 12 settled Predict trades of its three public members, written as their result memories.

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
- write an optional crew recap with an LLM (OpenRouter), which is told to use only the recalled facts.

Writes are capped at 30 a minute and back off on HTTP 429. Mainnet blobs took over 60 s to certify, so each write waits up to 300 s.

**Live on mainnet (Nov 9):** 15 memories in `nakama-v1:crew:aa3e80a3` (3) and three `nakama-v1:member:<address>` namespaces (7, 4 and 1). They were counted with `packages/core/scripts/walrus-count.ts` against the relayer's namespace list. The funded run adds a real crew's joins, call, results and, every five settled calls, a playbook.

## How it uses Tatum

The server's chain client uses **Tatum's native Sui gRPC gateway** (`sui-mainnet-grpc.gateway.tatum.io:443`). The API key stays on the server. Sui JSON-RPC is deprecated, so Nakama doesn't use it.

- **Reads through Tatum:** reference gas price, objects and Predict market state, and `getTransaction` to verify a member's enqueue receipt before Nakama registers the order (`POST /calls/:id/orders`).
- **Transactions through Tatum:** `SimulateTransaction` for the one-tap quote and dry-run, and `ExecuteTransaction` to send the member's signed bytes (`POST /execute`, live only with `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC`).
- Tatum's free plan allows 3 requests a second, so one process-wide limiter spaces calls 400 ms apart and retries 429s with backoff.
- **Exception:** Tatum's gateway refuses `LedgerService/ListEvents` (`PERMISSION_DENIED`). Event scans for member history and the fill/settlement watcher therefore use the public Sui fullnode over gRPC, and the code labels that source.

**Verified on Nov 9 2026:** through Tatum, `getReferenceGasPrice` returned 100, and `getTransaction` returned a historical Predict transaction that Nakama decoded into a queued fill. **PENDING:**
- In that first smoke test, simulation through Tatum returned HTTP 429. The rate limiter was added afterwards, and quotes through Tatum need re-checking with it.
- The recorded demo and film ran through the public fullnode, and the UI shows the badge "dev RPC (not Tatum)".
- Sending a transaction through Tatum has not been exercised on mainnet or on the fork.

## Tech stack

- TypeScript pnpm monorepo: `packages/core` (chain client, Predict helpers, memory policy, history decoder), `packages/server` (Node HTTP API, watcher, demo signer), `packages/web` (React 19 + Vite).
- Sui: `@mysten/sui` 2.37 gRPC client, `@mysten/deepbook-v3/predict` 2.8.1 (`planMint`, `enqueuePlan`, `waitForOutcome`), `@mysten/dapp-kit-react` wallet connection.
- Tatum Sui gRPC gateway (`@grpc/grpc-js`, `@protobuf-ts/grpc-transport`).
- Walrus Memory: `@mysten-incubation/memwal`, mainnet relayer.
- Optional OpenRouter recap (free Nemotron model by default).
- Tests: `pnpm test` 5/5 (memory policy, plus trade decoding from saved real mainnet queue-event payloads); `pnpm test:live` reads live mainnet. See [TESTING.md](TESTING.md).

## Repository

`https://github.com/nickthelegend/nakama`: **PENDING**. The repo has no remote yet, and the event requires it to be public. It goes public after a secret scan and Nick's yes.

## Demo video

`videos/nakama/nakama-film-v2.mp4` (in the grokbot workspace). **PENDING:** public upload link. It shows real mainnet reads and dry-runs with two public Predict addresses in a read-only preview crew, and labels them as such. Nothing is signed or sent in it.

## Tatum account ID

`<TATUM_ACCOUNT_ID>`: **Nick fills.**

## MEMWAL_AGENT_ID

`0xd2ca3cbe1bd663a5fe7df7c14590451bbc712255cfee59966b0b8413cdaa335a`

This is the Walrus Memory account ID. The code reads it as `MEMWAL_MAINNET_ACCOUNT_ID`. It is public and on chain: the relayer's `GET /config` gives package `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`, and its `account::DelegateKeyAdded` events list Nakama's delegate key (label "3") under this account. The owner is `0x0cff6ac3b0396c3b449de58472dcf9cfd55f0bb2aefaca92c43315de128c7e93`. One account serves Nakama, Eidolon and Yojimbo, and each app signs with its own delegate key.

## Team

Nivesh Gajengi (Nick), GitHub `nickthelegend`. Solo entry.

## Blog post

[docs/BLOG.md](docs/BLOG.md). **PENDING:** publish it on a public URL and paste the link here.

## Social post (bonus)

Drafts in [POST.md](POST.md). **PENDING:** Nick posts on X and/or LinkedIn.

## AI and tool disclosure

- **Claude (Anthropic):** planning, code review, UI and styling, documentation, film edit and copy.
- **Codex (OpenAI):** wrote much of the TypeScript from reviewed briefs.
- **ChatGPT image generation:** the crew art, stickers, onboarding slides, title card and social images (prompts in [docs/ART.md](docs/ART.md)).
- **Chatterbox:** the synthetic voiceover in the film.
- The film is cut from a one-take recording of the real app against mainnet (chapters in `videos/round2/nakama-raw.md`). Its numbers come from the app's live reads and dry-runs.
