# Testing — 2026-11-09

- `pnpm build`: passed for core, server and web. Vite warned about a large JS chunk; build succeeded.
- `pnpm test`: 3 fixture tests passed. Different recalled histories change both hot setup prefill and member size; three consecutive crew wins apply ×1.5.
- `NAKAMA_DEV_SUI_RPC=https://fullnode.mainnet.sui.io:443 pnpm test:live`: passed. Read 4 BTC markets; Predict mode `delayed`; a 2 USDC plan quoted 4.59 USDC potential payout and a 0.02 USDC order fee. The unfunded example owner was refused for fee; no order was submitted.
- `pnpm dev` with the same development RPC override: served Vite on port 5173 and server on port 8787. HTTP smoke check created 1 crew, joined 2 distinct funded mainnet addresses found in recent Predict events, posted 1 call, and received 2 successful Predict transaction simulations in `dry-run only` mode. No signing, mint, fill, settlement or Walrus write was performed.

The HTTP smoke addresses were public chain addresses used only to validate quote and simulation. They do not replace two connected member wallets for a live demonstration. The local smoke crew was removed afterward. A separate path check confirmed a repo-root `.env` is loaded and crew state writes to repo-root `data/`; its temporary files were removed.
