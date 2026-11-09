# Testing — 2026-11-09

## Tatum native gRPC migration (Nov 9 2026)

- `pnpm -r build` passed for core, server and web; `pnpm test` passed 5/5.
- Started the server with the repository `.env` on port 8794. `GET /status` reported `rpc: "Tatum"` and `mainnetWrites: false`. Stopped the server by PID after the checks.
- Tatum gRPC `getReferenceGasPrice` returned 100. `getTransaction` returned a historical transaction with events, effects and sender; the Predict SDK decoded one queued fill from it.
- **Gateway blockers:** Tatum denied `LedgerService/ListEvents` with `PERMISSION_DENIED` (`gRPC method not allowed`). `GET /markets` and a 2 USDC `planMint` quote both failed because `TransactionExecutionService/SimulateTransaction` returned HTTP 429 / `UNAVAILABLE`. History and settlement scans therefore cannot complete through this Tatum gateway, and the required quote/dry-run smoke check did not pass. No transaction was submitted.
- The public gRPC-web development override still returned live markets during the quote check. Sui JSON-RPC is deprecated, so the app no longer uses its client or proxy.

- `pnpm build`: passed for core, server and web. Vite emitted its existing large-chunk warning; the build completed.
- `pnpm test`: **5/5 passed**. Three policy tests remain green; two tests use saved, real mainnet queue event BCS payloads to verify trade assembly, account isolation, strike, P&L, and order/fill/payout digests.
- `NAKAMA_DEV_SUI_RPC=https://fullnode.mainnet.sui.io:443 pnpm test:live`: passed. Read **3** active BTC markets in delayed mode, obtained a 2 USDC quote, and decoded **7** recent trades with fill and payout digests for a public demo address. No transaction was submitted.
- Server on **8793** and Vite on **5183**, using environment overrides: `/status` reported `dev RPC (not Tatum)` and dry-run mode; `/markets` returned **4** active markets on one read. The API walkthrough created **1** preview crew, joined **2** public addresses, posted **1** call, and received **2** successful mainnet simulations with `transaction: null`.
- Fresh private-window UI walkthrough: created **1** `preview crew`, joined both public addresses through the view-as switcher, posted **1** live 5-minute BTC call, and saw **2** `Dry-run success` messages. Each showed 2.00 USDC total debit, a 0.02 USDC fee, and `No order submitted`. The board showed decoded on-chain records for both members.

The UI walkthrough used `0xa9eb…c79c` and `0x96ed…ccd2` from [docs/DEMO-ADDRESSES.md](docs/DEMO-ADDRESSES.md). A previous call hit a real `EOrderFailsLimits` admission abort after the market moved; the subsequent fresh call simulated successfully for both addresses. These are time-sensitive live quotes, not fixed fixtures. The history endpoint scans at most 1,000 recent events of each queue type and marks a truncated result `complete: false`.

## Round-2 judging pass (Nov 9 2026)
- `pnpm test`: 5/5 passed; `pnpm -r build` passed.
- Checked by hand against mainnet through the dev RPC: `GET /calls/:id/odds` returned 25.9% (in band) for a near strike and 0.005% (out of band) for a far one. `GET /odds` and `POST /crews/:id/calls` refused a $76,000 strike ("outside the 15–50% entry band"). At 375 px the composer shows the red hint, Post is disabled, and there is no horizontal overflow.
