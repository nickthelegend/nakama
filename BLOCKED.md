# Inputs needed from Nick

- `TATUM_API_KEY` for required production chain reads, simulation, and order verification. The only live read test so far used the visible `NAKAMA_DEV_SUI_RPC` development override.
- Walrus Memory mainnet account ID and delegate key: `MEMWAL_MAINNET_ACCOUNT_ID` and `MEMWAL_MAINNET_KEY`. Without them, recall and writes report setup required, so the real memory feedback loop remains untested.
- Two or three member Sui wallets with a few native USDC each, Predict accounts funded, and SUI for gas. Each owner must connect and sign their own order. No live order, fill, payout, or settlement has been executed or verified yet.
- `OPENROUTER_API_KEY` in the deployment environment for the optional recalled-memory recap.

Live mints remain disabled until `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC` is set. The dry-run is operational without this setting.
