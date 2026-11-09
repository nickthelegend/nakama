# Nakama on a local fork of Sui mainnet

This rehearsal proves Nakama's mainnet write path against a **LOCAL FORK of Sui mainnet**, with no real funds, using two members. Each member creates and funds a Predict account through `/fund`. Member A posts a call, and each member joins it with a real queued order through `/calls/:id/plan` + `/execute`. `/calls/:id/orders` then verifies each enqueue receipt. Every digest below exists only on the local fork. None of them is on Suiscan.

## Fork mode

Set `NAKAMA_ENV_FILE=<repo>/.env.fork`, which contains `NAKAMA_SUI_FORK_RPC=http://127.0.0.1:9796`. Only a loopback address is accepted, and fork mode refuses to start if `NAKAMA_ALLOW_MAINNET` or `TATUM_API_KEY` is also set.

- `/status` reports `rpc: "LOCAL FORK of Sui mainnet @ checkpoint N"` plus a `fork` object, and `mainnetWrites` stays `false`.
- Writes send only with `NAKAMA_ALLOW_FORK_WRITES=LOCAL_FORK_ONLY`, and plans are labelled `LOCAL FORK writes (not mainnet)`.
- Crews go to `data-fork/`.

**New route.** `POST /fund {address, amount, create}` builds and simulates a Predict deposit (with account creation when `create` is true), for the member to sign. `/execute` accepts these bytes for 60 seconds, just like a prepared order. Before this route, a member had no way to fund a Predict account from inside Nakama. The web app doesn't call it yet.

Keys `NAKAMA_MEMBER_A_KEY` and `NAKAMA_MEMBER_B_KEY` live in the gitignored `.env.fork`. They are fork-only and stand in for the members' browser wallets.

## Run

```sh
../yojimbo/scripts/fork-apps-rehearsal.sh        # fresh fork, hub, wallets, Eidolon and Nakama rehearsals
cd packages/server && NAKAMA_ENV_FILE=$PWD/../../.env.fork tsx src/index.ts
cd packages/server && tsx scripts/fork-rehearsal.ts
cd packages/server && tsx scripts/return-funds.ts --keys-file ../../.env.fork --var NAKAMA_MEMBER_A_KEY --to <hub address>
```

## Recorded run: forked at checkpoint 343353046

Member A `0x9ec06fa3a854256a4b0ecf8c3c341d734b5ff2b5e6de82af21c2b1bebe374771`, member B `0x748a71a6692a442f16e671012a856fb717a5644b81b822e29610510284ba0315`. Call `05411352`: BTC UP above 74436 on market `0x154f10ba…3108`, expiring 12:15 UTC.

| Step | Digest |
|---|---|
| Hub → A: 0.5 SUI and 3 USDC | `BzQ7uv9Bavtca8LwLj4LiC877acSGs8BZjvAmC6bbUC6` |
| Hub → B: 0.5 SUI and 3 USDC | `EjEEe8r1MCzjBxsezzCTQvJyftNDxM9eKAFppmyor9xC` |
| A: `/fund` (create account and deposit 3 USDC), then `/execute` | `JD3F22K55KwzYXCvpvAXhALAuaFG1YwkBMkjFiCheHe5` |
| B: `/fund` (create account and deposit 3 USDC), then `/execute` | `FX9XvNkePjk74N7wLeg8LArqNfbryvpGaecnpHGdwt7j` |
| A joins for 2 USDC (fee 0.02, potential payout 4.64); `/orders` verified record 2 | `x8aX5UYfHud5rbE6VTWRggnBTucBn6MppEPTYcEjhYB` |
| B joins for 2 USDC; `/orders` verified record 3 | `YBwMh1mxQQbtTnP3YxZG5hxfixfKCHdrcU5J6j5F3iX` |
| A `return-funds`: withdraw 1 USDC, then return it with the remaining SUI | `FzZhw6px4Nt5TugtN2ipXM2KiTvGM66DydMjuA3xWLjE`, `73LTaCD2TYRCYkJ6GLzT3NhSn1FTWoYMi6UxzCFRvFuP` |
| B `return-funds` | `AZXSngTpkThAP8mRhzkYFJbAHiFYrmgfc5oEfkKTrbqf`, `HSnsYATWnz7hfNmy5ptXwky23Ufn3mcEnnn9Lrb4q3iq` |

Gas on the fork came to about 0.011 SUI per Predict transaction.

## What the fork cannot show

- **No fills, no settlement, no payout memory.** The fork has no Predict keeper, and its clock stays at the fork checkpoint. Orders stay `enqueued`, and the call stays `live`. The 2 USDC escrowed in each order stays inside Predict until mainnet fills and settles it or refunds it. Run `return-funds` again after that.
- **No Walrus.** The call shows `Setup required: MEMWAL_MAINNET_KEY`, and no crew or member memory is written.
- **Wall-clock pricing.** The SDK checks quotes and cutoffs against wall-clock time, while the chain checks against the frozen fork clock. The rehearsal must finish before the newest market at the fork checkpoint closes.
- **Minimum size.** Size 1 fails (a 0.98 premium after the fee), and 1.05 fails at about 0.35 odds (whole lots stay under 1 USDC). 2 USDC works.
- **Not exercised:** sending through Tatum.
