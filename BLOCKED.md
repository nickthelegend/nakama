# Inputs needed from Nick

- Hub funding: 40 USDC and 2.5 SUI to the hub `0xf5887bcfaa178fbcc29f560afce15734e13989955100f9a6b6154c34a79c1f11`.
- The demo signer members exist and are unfunded: A `0xff89f27517a58d07c7ac4fb61b67188b4d120575f8165d52d66c8e84a3672ed2` and B `0x77cac45835174e0cdbb4f361e3e007dfb1704a8840a15c3f48a6ff1a9aba13d4`. Each needs a few native USDC in a funded Predict account and SUI for gas, from the hub. Each owner signs their own order. No live order, fill, payout, or settlement has been executed or verified yet.
- The Tatum account ID for the submission form.
- Making the repo public, and publishing the blog and the social post.
- `OPENROUTER_API_KEY` in the deployment environment for the optional recalled-memory recap.

Done: Tatum reads are live, and Nakama's Walrus Memory delegate key authenticates to the mainnet relayer. Walrus is not a blocker. Its memories are written by the funded mainnet run, so the memory feedback loop stays untested until then.

Live mints remain disabled until `NAKAMA_ALLOW_MAINNET=I_ACKNOWLEDGE_REAL_USDC` is set. The dry-run is operational without this setting.
