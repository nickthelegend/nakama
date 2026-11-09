# Nakama: a crew that remembers its calls

*Nivesh Gajengi (Nick), for Total Recall: Tatum x Walrus Memory, track 03 Consumer Finance Apps. Draft, Nov 9 2026.*

## What it does

Short-term Bitcoin bets are a lonely habit. Friends argue about these calls in group chats, but the chat doesn't place the bet and doesn't remember who was right.

Nakama (仲間, "crew") turns that group chat into the product. A crew shares an invite link. One member posts a call on a live BTC/USD 1-minute or 5-minute market on DeepBook Predict, for example "BTC above $73,766, holding the 5m low". The card shows a countdown, live odds, who has joined and how similar calls went before. Everyone else joins with one tap.

Each member signs their own Predict order from their own Sui wallet. Outside a clearly labelled demo-recording mode, Nakama never holds anyone's keys. In a consumer finance app, "your friend can't spend your money" is the first feature.

The second feature came from a failure. In an early recording, Predict refused member B's tap: BTC had moved and the strike's odds had fallen to 11.8%. Predict only admits a new one-sided bet between 15% and 50% odds. Now the composer shows live odds under the strike and won't post outside that band, the server refuses such calls too, and the call card re-reads the odds every 8 seconds and shows "Entry closed" once the price drifts out.

## How it uses Tatum

Nakama's server talks to Sui through **Tatum's native Sui gRPC gateway** (Sui's JSON-RPC is deprecated). Market and object reads, the gas price, simulation for the one-tap quote, and sending a member's signed bytes all use one Tatum client, with the key kept on the server. When a member says "I joined", Nakama fetches the transaction through Tatum and decodes the enqueue receipt before registering the order.

Two lessons from the integration:

- **Tatum's gateway refuses `LedgerService/ListEvents`,** so event scans (member history, the fill and settlement watcher) use the public Sui fullnode, labelled as such.
- **The free plan allows 3 requests a second.** Our first smoke test hit HTTP 429 on simulation, so one limiter now spaces Tatum calls 400 ms apart and backs off on 429.

Verified through Tatum so far: the gas price, and a historical Predict transaction decoded into a queued fill. Quotes through Tatum still need re-checking with the limiter. The recorded demo ran on the public fullnode, and the app's badge says so.

## How it uses Walrus Memory

Nakama keeps two kinds of memory on Walrus Memory mainnet:

- **Crew memory** (`nakama-v1:crew:<crewId>`): who joined, every settled call with its setup (market length, direction, strike distance, whether the previous minute was red or green, hour of day), the caller's reason, whether it hit and what each joiner staked and made. Every five settled calls it also writes a **playbook**, the crew's best and worst setups ranked by win rate.
- **Member records** (`nakama-v1:member:<address>`): one result per settled order.

When a call goes up, Nakama recalls up to 40 memories matching its setup and shows the crew's record, with links to the recalled Walrus blobs.

## How it learns over time

This is the part that is **not live yet**. The loop has four steps:

1. **Remember outcomes, not opinions.** Nakama only writes a call to memory after the market settles, with the real result and each member's fill digest.
2. **Size from your own record.** A member's suggested stake starts from their average size and is scaled by their hit rate, clamped between 0.5× and 1.25×. A crew on a win streak of 3 or more gets a 1.5× multiplier. The result always stays between 2 and 10 USDC.
3. **Warn about cold setups.** If the crew has made 3 or more similar calls with under 40% wins, the setup is flagged cold before anyone joins.
4. **Reuse what works.** The composer pre-fills from the crew's best setup that has at least two calls behind it. An optional LLM recap summarizes the crew's recent run, using only the recalled Walrus facts.

The honest status: **there are 0 Nakama memories on Walrus mainnet today.** The Memory account ID is pending, and no real signed round has happened on mainnet; that needs our hub wallet funded. The write path (fund a Predict account, join with a real queued order, verify the receipt) has run on a local fork of Sui mainnet with real Move execution and no real money. The fork has no Predict keeper and a frozen clock, so fills, settlement and payouts couldn't be shown there. Until memory exists, the crew board shows each member's record decoded from public on-chain Predict history, labelled that way.

The plan to meet the event's minimum of 10 memories is small and concrete: one crew, two members (2 membership records), three settled calls (3 call records and 6 member results). That makes 11 memories, and the first five settled calls produce the first playbook.

## What's next

Fund the hub, run one real two-member round on mainnet through Tatum, let it settle, and write the first memories. We'll update this post with the digests and blob IDs when that happens.

Code: `<repo link, PENDING public>`. Film: `<film link, PENDING upload>`.

*Built with Claude and Codex for code and docs, ChatGPT image generation for the art, and Chatterbox for the film's voice.*
